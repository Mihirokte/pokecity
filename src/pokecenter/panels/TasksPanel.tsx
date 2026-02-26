import { useState, useMemo } from 'react';
import { useCityStore } from '../../stores/cityStore';
import { SheetsService } from '../../services/sheetsService';
import type { Task } from '../../types';
import { C, pf } from '../gba-theme';
import { PanelShell, SectionTitle } from './PanelShell';

interface Props {
  onClose: () => void;
}

type Filter = 'all' | 'today' | 'overdue' | 'done' | 'backlog';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: C.priorityUrgent,
  high: C.priorityHigh,
  normal: C.priorityNormal,
  low: C.priorityLow,
};

export function TasksPanel({ onClose }: Props) {
  const tasks = useCityStore(s => s.moduleData.tasks);
  const setModuleData = useCityStore(s => s.setModuleData);
  const [filter, setFilter] = useState<Filter>('all');
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Task['priority']>('normal');
  const [newDueDate, setNewDueDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const filtered = useMemo(() => {
    switch (filter) {
      case 'today': return tasks.filter(t => t.dueDate === today && t.status !== 'done');
      case 'overdue': return tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done');
      case 'done': return tasks.filter(t => t.status === 'done');
      case 'backlog': return tasks.filter(t => t.status === 'backlog');
      default: return tasks;
    }
  }, [tasks, filter, today]);

  const todayCount = tasks.filter(t => t.dueDate === today && t.status !== 'done').length;
  const overdueCount = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done').length;

  const addTask = () => {
    if (!newTitle.trim()) return;
    const task: Task = {
      id: `task_${crypto.randomUUID()}`,
      residentId: '',
      title: newTitle.trim(),
      priority: newPriority,
      status: 'backlog',
      dueDate: newDueDate,
      notes: '',
      parentId: '',
      projectName: '',
      tags: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setModuleData('tasks', [...tasks, task]);
    SheetsService.append('Tasks', task).catch(() => {});
    setNewTitle('');
    setNewDueDate('');
    setShowForm(false);
  };

  const cycleStatus = (task: Task) => {
    const order: Task['status'][] = ['backlog', 'inProgress', 'done'];
    const idx = order.indexOf(task.status);
    const next = order[(idx + 1) % order.length];
    const updated = { ...task, status: next, updatedAt: new Date().toISOString() };
    if (next === 'done') updated.updatedAt = new Date().toISOString();
    setModuleData('tasks', tasks.map(t => t.id === task.id ? updated : t));
    SheetsService.update('Tasks', updated).catch(() => {});
  };

  const deleteTask = (id: string) => {
    setModuleData('tasks', tasks.filter(t => t.id !== id));
    SheetsService.deleteRow('Tasks', id).catch(() => {});
    setEditingId(null);
  };

  return (
    <PanelShell title="📋 TASKMASTER — MACHAMP" onClose={onClose}>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
        {([
          ['all', 'ALL'],
          ['today', `TODAY (${todayCount})`],
          ['overdue', `OVERDUE (${overdueCount})`],
          ['done', 'DONE'],
          ['backlog', 'BACKLOG'],
        ] as const).map(([key, label]) => (
          <button key={key} className="gba-btn" style={{
            fontSize: 7, padding: '5px 8px',
            background: filter === key ? C.menuHighlight : C.panelBgLight,
          }} onClick={() => setFilter(key as Filter)}>
            {label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div style={{ ...pf(8), color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 20 }}>
          No tasks in this view.
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          {filtered.map(task => {
            const isOverdue = task.dueDate && task.dueDate < today && task.status !== 'done';
            const isEditing = editingId === task.id;
            return (
              <div key={task.id} style={{
                borderBottom: `1px solid rgba(255,255,255,0.1)`,
                padding: '6px 4px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {/* Status checkbox */}
                  <span
                    style={{ ...pf(10), color: C.textLight, cursor: 'pointer', flexShrink: 0 }}
                    onClick={() => cycleStatus(task)}
                  >
                    {task.status === 'done' ? '☑' : task.status === 'inProgress' ? '◧' : '☐'}
                  </span>
                  {/* Title */}
                  <span style={{
                    ...pf(8),
                    color: task.status === 'done' ? 'rgba(255,255,255,0.4)' : C.textLight,
                    textDecoration: task.status === 'done' ? 'line-through' : 'none',
                    flex: 1,
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    cursor: 'pointer',
                  }} onClick={() => setEditingId(isEditing ? null : task.id)}>
                    {task.title}
                  </span>
                  {/* Priority badge */}
                  <span style={{
                    ...pf(6), color: PRIORITY_COLORS[task.priority] || C.textLight,
                    flexShrink: 0,
                  }}>
                    {task.priority.toUpperCase()}
                  </span>
                  {/* Due date */}
                  {task.dueDate && (
                    <span style={{
                      ...pf(6),
                      color: isOverdue ? C.statusRed : 'rgba(255,255,255,0.5)',
                      flexShrink: 0,
                    }}>
                      {task.dueDate === today ? 'Today' : task.dueDate}
                    </span>
                  )}
                </div>
                {/* Expanded detail */}
                {isEditing && (
                  <div style={{ marginTop: 6, marginLeft: 20, padding: 8, border: `1px solid ${C.panelBorderDim}`, background: '#081418' }}>
                    <div style={{ ...pf(7), color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                      Status: {task.status} | Priority: {task.priority}
                    </div>
                    {task.notes && <div style={{ ...pf(7), color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{task.notes}</div>}
                    {task.projectName && <div style={{ ...pf(6), color: C.statusBlue, marginBottom: 4 }}>Project: {task.projectName}</div>}
                    <button className="gba-btn" style={{ fontSize: 7, padding: '4px 8px', marginTop: 4 }}
                      onClick={() => deleteTask(task.id)}>
                      🗑 DELETE
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add task form */}
      {showForm ? (
        <div style={{ border: `2px solid ${C.panelBorder}`, padding: 10, marginBottom: 12, background: '#081418' }}>
          <SectionTitle>── NEW TASK ──</SectionTitle>
          <div style={{ marginBottom: 8 }}>
            <div style={{ ...pf(7), color: C.textLight, marginBottom: 4 }}>Title:</div>
            <input
              className="gba-input"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Task title..."
              onKeyDown={e => { if (e.key === 'Enter') addTask(); }}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ ...pf(7), color: C.textLight, marginBottom: 4 }}>Priority:</div>
              <select className="gba-select" value={newPriority} onChange={e => setNewPriority(e.target.value as Task['priority'])}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...pf(7), color: C.textLight, marginBottom: 4 }}>Due:</div>
              <input className="gba-input" type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="gba-btn" onClick={addTask}>✓ ADD</button>
            <button className="gba-btn" onClick={() => setShowForm(false)}>✕ CANCEL</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="gba-btn" onClick={() => setShowForm(true)}>+ NEW TASK</button>
        </div>
      )}
    </PanelShell>
  );
}
