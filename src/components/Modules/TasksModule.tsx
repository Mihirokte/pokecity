import { useState, useMemo, useCallback } from 'react';
import type { Resident, Task } from '../../types';
import { useCityStore } from '../../stores/cityStore';
import { useUIStore } from '../../stores/uiStore';
import { SheetsService } from '../../services/sheetsService';

interface TasksModuleProps {
  resident: Resident;
}

type FilterTab = 'all' | 'backlog' | 'inProgress' | 'done';

const PRIORITY_OPTIONS: Task['priority'][] = ['low', 'normal', 'high', 'urgent'];
const STATUS_OPTIONS: Task['status'][] = ['backlog', 'inProgress', 'done'];

const STATUS_LABELS: Record<Task['status'], string> = {
  backlog: 'Backlog',
  inProgress: 'In Progress',
  done: 'Done',
};

const PRIORITY_LABELS: Record<Task['priority'], string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

const STATUS_CYCLE: Record<Task['status'], Task['status']> = {
  backlog: 'inProgress',
  inProgress: 'done',
  done: 'backlog',
};

const emptyForm = (): Omit<Task, 'id' | 'residentId' | 'createdAt' | 'updatedAt'> => ({
  title: '',
  priority: 'normal',
  status: 'backlog',
  dueDate: '',
  notes: '',
  parentId: '',
  projectName: '',
  tags: '',
});

function getLocalDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false;
  return task.dueDate < getLocalDate();
}

export function TasksModule({ resident }: TasksModuleProps) {
  const moduleData = useCityStore(s => s.moduleData);
  const setModuleData = useCityStore(s => s.setModuleData);
  const addToast = useUIStore(s => s.addToast);

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const tasks = useMemo(
    () => moduleData.tasks.filter(t => t.residentId === resident.id),
    [moduleData.tasks, resident.id],
  );

  const filtered = useMemo(() => {
    if (activeTab === 'all') return tasks;
    return tasks.filter(t => t.status === activeTab);
  }, [tasks, activeTab]);

  const updateField = useCallback(<K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }, []);

  const openEdit = useCallback((task: Task) => {
    setEditingId(task.id);
    setForm({
      title: task.title,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
      notes: task.notes,
      parentId: task.parentId,
      projectName: task.projectName,
      tags: task.tags,
    });
    setShowForm(true);
  }, []);

  const cancelForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) {
      addToast('Title is required', 'error');
      return;
    }

    const now = new Date().toISOString();
    const allTasks = moduleData.tasks;

    const prev = allTasks;

    if (editingId) {
      const updated: Task = {
        id: editingId,
        residentId: resident.id,
        ...form,
        createdAt: allTasks.find(t => t.id === editingId)?.createdAt ?? now,
        updatedAt: now,
      };

      const next = allTasks.map(t => (t.id === editingId ? updated : t));
      setModuleData('tasks', next);
      setShowForm(false);
      setEditingId(null);
      addToast('Task updated', 'success');

      try {
        await SheetsService.update('Tasks', updated);
      } catch {
        setModuleData('tasks', prev);
        addToast('Failed to sync update', 'error');
      }
    } else {
      const newTask: Task = {
        id: `task_${crypto.randomUUID()}`,
        residentId: resident.id,
        ...form,
        createdAt: now,
        updatedAt: now,
      };

      setModuleData('tasks', [...allTasks, newTask]);
      setShowForm(false);
      addToast('Task created', 'success');

      try {
        await SheetsService.append('Tasks', newTask);
      } catch {
        setModuleData('tasks', prev);
        addToast('Failed to sync task', 'error');
      }
    }
  }, [form, editingId, moduleData.tasks, resident.id, setModuleData, addToast]);

  const handleDelete = useCallback(async (id: string) => {
    const prev = moduleData.tasks;
    setModuleData('tasks', prev.filter(t => t.id !== id));
    addToast('Task deleted', 'success');

    try {
      await SheetsService.deleteRow('Tasks', id);
    } catch {
      setModuleData('tasks', prev);
      addToast('Failed to sync deletion', 'error');
    }
  }, [moduleData.tasks, setModuleData, addToast]);

  const cycleStatus = useCallback(async (task: Task) => {
    const nextStatus = STATUS_CYCLE[task.status];
    const now = new Date().toISOString();
    const updated: Task = { ...task, status: nextStatus, updatedAt: now };

    const prev = moduleData.tasks;
    const next = prev.map(t => (t.id === task.id ? updated : t));
    setModuleData('tasks', next);
    addToast(`Status: ${STATUS_LABELS[nextStatus]}`, 'info');

    try {
      await SheetsService.update('Tasks', updated);
    } catch {
      setModuleData('tasks', prev);
      addToast('Failed to sync status', 'error');
    }
  }, [moduleData.tasks, setModuleData, addToast]);

  const tabCounts = useMemo(() => ({
    all: tasks.length,
    backlog: tasks.filter(t => t.status === 'backlog').length,
    inProgress: tasks.filter(t => t.status === 'inProgress').length,
    done: tasks.filter(t => t.status === 'done').length,
  }), [tasks]);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: `All (${tabCounts.all})` },
    { key: 'backlog', label: `Backlog (${tabCounts.backlog})` },
    { key: 'inProgress', label: `In Progress (${tabCounts.inProgress})` },
    { key: 'done', label: `Done (${tabCounts.done})` },
  ];

  const renderTask = (task: Task) => {
    const overdue = isOverdue(task);
    const isDone = task.status === 'done';

    return (
      <div
        className="mod-card"
        key={task.id}
        style={overdue ? { borderLeft: '3px solid #ff6b6b' } : undefined}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div
            className={`checkbox${isDone ? ' checked' : ''}`}
            onClick={() => cycleStatus(task)}
            title={`Click to change status (currently ${STATUS_LABELS[task.status]})`}
          >
            {isDone && '\u2713'}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span
                className={`priority--${task.priority}`}
                title={PRIORITY_LABELS[task.priority]}
                style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block', flexShrink: 0 }}
              />
              <strong style={{
                fontSize: 10,
                textDecoration: isDone ? 'line-through' : 'none',
                opacity: isDone ? 0.6 : 1,
              }}>
                {task.title}
              </strong>
              <span className={`status-badge status--${task.status}`}>
                {STATUS_LABELS[task.status]}
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 8, color: '#8b9bb4' }}>
              {task.projectName && (
                <span style={{ background: 'rgba(255,255,255,.06)', padding: '1px 6px', borderRadius: 3 }}>
                  {task.projectName}
                </span>
              )}
              {task.dueDate && (
                <span style={{ color: overdue ? '#ff6b6b' : '#8b9bb4' }}>
                  Due: {task.dueDate}
                  {overdue && ' (overdue)'}
                </span>
              )}
              {task.tags && (
                <span style={{ color: '#a29bfe' }}>
                  {task.tags}
                </span>
              )}
            </div>

            {task.notes && (
              <div style={{ fontSize: 8, color: '#6c7a89', marginTop: 4 }}>{task.notes}</div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button className="mod-btn mod-btn--sm" onClick={() => openEdit(task)}>Edit</button>
            <button className="mod-btn mod-btn--sm mod-btn--danger" onClick={() => handleDelete(task.id)}>Del</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mod-header">
        <span className="mod-title">Tasks</span>
        <button className="mod-btn" onClick={openCreate}>+ Task</button>
      </div>

      <div className="mod-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`mod-tab${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="mod-form">
          <label>
            Title
            <input
              type="text"
              value={form.title}
              onChange={e => updateField('title', e.target.value)}
              placeholder="Task title"
            />
          </label>

          <div className="mod-form-row">
            <label style={{ flex: 1 }}>
              Priority
              <select
                value={form.priority}
                onChange={e => updateField('priority', e.target.value as Task['priority'])}
              >
                {PRIORITY_OPTIONS.map(p => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </label>
            <label style={{ flex: 1 }}>
              Status
              <select
                value={form.status}
                onChange={e => updateField('status', e.target.value as Task['status'])}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Due Date
            <input
              type="date"
              value={form.dueDate}
              onChange={e => updateField('dueDate', e.target.value)}
            />
          </label>

          <label>
            Project Name
            <input
              type="text"
              value={form.projectName}
              onChange={e => updateField('projectName', e.target.value)}
              placeholder="Optional project"
            />
          </label>

          <label>
            Tags
            <input
              type="text"
              value={form.tags}
              onChange={e => updateField('tags', e.target.value)}
              placeholder="Comma-separated tags"
            />
          </label>

          <label>
            Notes
            <textarea
              value={form.notes}
              onChange={e => updateField('notes', e.target.value)}
              placeholder="Optional notes"
              rows={3}
            />
          </label>

          <div className="mod-form-actions">
            <button className="mod-btn" onClick={cancelForm}>Cancel</button>
            <button className="mod-btn" onClick={handleSave}>
              {editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {!showForm && filtered.length === 0 && (
        <div className="mod-empty">
          {tasks.length === 0
            ? 'No tasks yet. Create one to get started.'
            : `No ${activeTab === 'all' ? '' : STATUS_LABELS[activeTab as Task['status']].toLowerCase() + ' '}tasks.`}
        </div>
      )}

      {!showForm && filtered.map(renderTask)}
    </div>
  );
}
