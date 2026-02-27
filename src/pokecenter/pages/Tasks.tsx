import { useState } from 'react';
import { useCityStore } from '../../stores/cityStore';
import { SheetsService } from '../../services/sheetsService';
import { useUIStore } from '../../stores/uiStore';
import { PageHeader } from '../components/PageHeader';
import type { Task } from '../../types';

type FilterStatus = 'all' | 'backlog' | 'inProgress' | 'done';
type FilterPriority = 'all' | 'low' | 'normal' | 'high' | 'urgent';

const STATUS_CYCLE: Record<string, Task['status']> = {
  backlog: 'inProgress',
  inProgress: 'done',
  done: 'backlog',
};

export function Tasks() {
  const tasks = useCityStore(s => s.moduleData.tasks);
  const setModuleData = useCityStore(s => s.setModuleData);
  const addToast = useUIStore(s => s.addToast);

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('normal');
  const [dueDate, setDueDate] = useState('');

  const filtered = tasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  });

  // Sort: urgent first, then by due date
  const sorted = [...filtered].sort((a, b) => {
    const pOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    const pa = pOrder[a.priority] ?? 2;
    const pb = pOrder[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;
    return (a.dueDate || 'z').localeCompare(b.dueDate || 'z');
  });

  const cycleStatus = (task: Task) => {
    const newStatus = STATUS_CYCLE[task.status] || 'backlog';
    const updated = tasks.map(t => t.id === task.id ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t);
    setModuleData('tasks', updated as Task[]);
    const updatedTask = updated.find(t => t.id === task.id);
    if (updatedTask) SheetsService.update('Tasks', updatedTask).catch(() => addToast('Sync failed', 'error'));
  };

  const addTask = () => {
    if (!title.trim()) return;
    const task: Task = {
      id: `task_${crypto.randomUUID()}`,
      residentId: '',
      title: title.trim(),
      priority,
      status: 'backlog',
      dueDate,
      notes: '',
      parentId: '',
      projectName: '',
      tags: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueTime: '',
      gcalEventId: '',
    };
    setModuleData('tasks', [...tasks, task]);
    SheetsService.append('Tasks', task).catch(() => addToast('Sync failed', 'error'));
    setTitle('');
    setPriority('normal');
    setDueDate('');
    setShowForm(false);
    addToast('Task created', 'success');
  };

  const deleteTask = (id: string) => {
    setModuleData('tasks', tasks.filter(t => t.id !== id));
    SheetsService.deleteRow('Tasks', id).catch(() => addToast('Sync failed', 'error'));
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <>
      <PageHeader
        title="Tasks"
        description={`${tasks.filter(t => t.status !== 'done').length} active tasks`}
        actions={
          <button className="btn btn--primary" onClick={() => setShowForm(!showForm)}>
            + New Task
          </button>
        }
      />

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              className="form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              onKeyDown={e => e.key === 'Enter' && addTask()}
            />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Priority</label>
              <select className="form-input" value={priority} onChange={e => setPriority(e.target.value as Task['priority'])}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Due Date</label>
              <input className="form-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn--secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn--primary" onClick={addTask}>Create</button>
          </div>
        </div>
      )}

      <div className="tabs">
        {(['all', 'backlog', 'inProgress', 'done'] as FilterStatus[]).map(s => (
          <button
            key={s}
            className={`tab ${filterStatus === s ? 'tab--active' : ''}`}
            onClick={() => setFilterStatus(s)}
          >
            {s === 'all' ? 'All' : s === 'inProgress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['all', 'urgent', 'high', 'normal', 'low'] as FilterPriority[]).map(p => (
          <button
            key={p}
            className={`btn btn--sm ${filterPriority === p ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setFilterPriority(p)}
          >
            {p === 'all' ? 'All Priorities' : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {sorted.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">&#x2611;</div>
            <div className="empty-state__text">No tasks found</div>
            <div className="empty-state__sub">Create a task to get started</div>
          </div>
        ) : (
          sorted.map(task => {
            const isOverdue = task.dueDate && task.dueDate < today && task.status !== 'done';
            return (
              <div key={task.id} className="list-item">
                <button
                  className={`task-status task-status--${task.status}`}
                  onClick={() => cycleStatus(task)}
                  title="Click to cycle status"
                >
                  {task.status === 'done' ? '\u2713' : task.status === 'inProgress' ? '\u25B6' : '\u25CB'}
                </button>
                <span className={`priority-badge priority-badge--${task.priority}`}>
                  {task.priority}
                </span>
                <span style={{
                  flex: 1,
                  fontSize: 13,
                  color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)',
                  textDecoration: task.status === 'done' ? 'line-through' : 'none',
                }}>
                  {task.title}
                </span>
                {task.dueDate && (
                  <span style={{ fontSize: 11, color: isOverdue ? 'var(--red)' : 'var(--text-muted)' }}>
                    {task.dueDate}
                  </span>
                )}
                <button className="btn btn--ghost btn--sm" onClick={() => deleteTask(task.id)}>
                  &#x2715;
                </button>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
