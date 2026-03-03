import { useState, useMemo, useCallback, type ReactNode } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Resident, Task } from '../../types';
import { useCityStore } from '../../stores/cityStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { useModuleSync } from '../../hooks/useModuleSync';
import { SheetsService } from '../../services/sheetsService';
import { createGcalEvent, updateGcalEvent, deleteGcalEvent } from '../../services/gcalService';
import { ModuleHeader } from '../ui/ModuleHeader';
import { Checkbox } from '../ui/Checkbox';
import {
  getLocalDate,
  formatTime,
  daysInMonth,
  firstDayOfMonth,
  MONTH_NAMES,
  DAY_LABELS,
} from '../../utils/dateUtils';

interface TasksModuleProps {
  resident: Resident;
}

type FilterTab = 'all' | 'backlog' | 'inProgress' | 'done';
type ViewMode = 'list' | 'calendar';

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
  dueTime: '',
  notes: '',
  parentId: '',
  projectName: '',
  tags: '',
  gcalEventId: '',
  sortOrder: '',
});

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false;
  return task.dueDate < getLocalDate();
}

// ─── Sortable row (defined outside TasksModule to avoid re-creation on each render) ───

interface SortableTaskRowProps {
  task: Task;
  isSubtask: boolean;
  renderTask: (task: Task, isSubtask: boolean, dragHandle?: ReactNode) => ReactNode;
}

function SortableTaskRow({ task, isSubtask, renderTask }: SortableTaskRowProps) {
  const { setNodeRef, transform, transition, attributes, listeners } = useSortable({ id: task.id });
  const handle = (
    <button
      type="button"
      className="mod-btn mod-btn--sm task-drag-handle"
      {...attributes}
      {...listeners}
      title="Drag to reorder"
      style={{
        cursor: 'grab',
        touchAction: 'none',
        flexShrink: 0,
        padding: '4px 8px',
        fontSize: 9,
        lineHeight: 1,
        minWidth: 48,
      }}
      onPointerDown={e => e.stopPropagation()}
    >
      <span aria-hidden style={{ opacity: 0.9 }}>≡</span> Move
    </button>
  );
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      {renderTask(task, isSubtask, handle)}
    </div>
  );
}

// ─── Component ───

export function TasksModule({ resident }: TasksModuleProps) {
  const moduleData = useCityStore(s => s.moduleData);
  const setModuleData = useCityStore(s => s.setModuleData);
  const addToast = useUIStore(s => s.addToast);
  const accessToken = useAuthStore(s => s.accessToken);
  const sync = useModuleSync();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [pushingGcal, setPushingGcal] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const tasks = useMemo(
    () => moduleData.tasks.filter(t => t.residentId === resident.id),
    [moduleData.tasks, resident.id],
  );

  const filtered = useMemo(() => {
    let list = tasks;
    if (viewMode === 'list' && activeTab !== 'all') {
      list = list.filter(t => t.status === activeTab);
    }
    if (viewMode === 'calendar' && selectedDate) {
      list = list.filter(t => t.dueDate === selectedDate);
    }
    const byOrder = (a: Task, b: Task) => {
      const na = parseFloat(a.sortOrder ?? '') || 999999;
      const nb = parseFloat(b.sortOrder ?? '') || 999999;
      return na - nb || (a.createdAt > b.createdAt ? 1 : -1);
    };
    return [...list].sort(byOrder);
  }, [tasks, activeTab, viewMode, selectedDate]);

  /** Tree order: root tasks then each root's children, sorted by sortOrder */
  const taskTreeList = useMemo(() => {
    const byOrder = (a: Task, b: Task) => {
      const na = parseFloat(a.sortOrder ?? '') || 999999;
      const nb = parseFloat(b.sortOrder ?? '') || 999999;
      return na - nb || (a.createdAt > b.createdAt ? 1 : -1);
    };
    const roots = filtered.filter(t => !t.parentId || t.parentId === '').sort(byOrder);
    return roots.flatMap(r => [
      r,
      ...filtered.filter(t => t.parentId === r.id).sort(byOrder),
    ]);
  }, [filtered]);

  const updateField = useCallback(<K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }, []);

  const openCreateSubtask = useCallback((parentTask: Task) => {
    setEditingId(null);
    setForm({ ...emptyForm(), parentId: parentTask.id });
    setShowForm(true);
  }, []);

  const openEdit = useCallback((task: Task) => {
    setEditingId(task.id);
    setForm({
      title: task.title,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
      dueTime: task.dueTime || '',
      notes: task.notes,
      parentId: task.parentId,
      projectName: task.projectName,
      tags: task.tags,
      gcalEventId: task.gcalEventId || '',
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

    if (editingId) {
      const updated: Task = {
        id: editingId,
        residentId: resident.id,
        ...form,
        createdAt: allTasks.find(t => t.id === editingId)?.createdAt ?? now,
        updatedAt: now,
      };

      setShowForm(false);
      setEditingId(null);
      addToast('Task updated', 'success');
      await sync('tasks', allTasks, allTasks.map(t => (t.id === editingId ? updated : t)),
        () => SheetsService.update('Tasks', updated), 'Failed to sync update');

      if (updated.gcalEventId && updated.dueDate && accessToken) {
        try {
          await updateGcalEvent(accessToken, updated.gcalEventId, updated);
        } catch {
          addToast('GCal sync failed', 'error');
        }
      }
    } else {
      const residentTasks = allTasks.filter(t => t.residentId === resident.id);
      const newTask: Task = {
        id: `task_${crypto.randomUUID()}`,
        residentId: resident.id,
        ...form,
        sortOrder: String(residentTasks.length),
        createdAt: now,
        updatedAt: now,
      };

      setShowForm(false);
      addToast('Task created', 'success');
      await sync('tasks', allTasks, [...allTasks, newTask],
        () => SheetsService.append('Tasks', newTask), 'Failed to sync task');
    }
  }, [form, editingId, moduleData.tasks, resident.id, sync, addToast, accessToken]);

  const handleDelete = useCallback(async (task: Task) => {
    addToast('Task deleted', 'success');
    await sync('tasks', moduleData.tasks, moduleData.tasks.filter(t => t.id !== task.id),
      () => SheetsService.deleteRow('Tasks', task.id), 'Failed to sync deletion');

    if (task.gcalEventId && accessToken) {
      try {
        await deleteGcalEvent(accessToken, task.gcalEventId);
      } catch {
        // silent — event may already be gone
      }
    }
  }, [moduleData.tasks, sync, addToast, accessToken]);

  const cycleStatus = useCallback(async (task: Task) => {
    const nextStatus = STATUS_CYCLE[task.status];
    const now = new Date().toISOString();
    const updated: Task = { ...task, status: nextStatus, updatedAt: now };

    addToast(`Status: ${STATUS_LABELS[nextStatus]}`, 'info');
    await sync('tasks', moduleData.tasks, moduleData.tasks.map(t => (t.id === task.id ? updated : t)),
      () => SheetsService.update('Tasks', updated), 'Failed to sync status');

    if (updated.gcalEventId && updated.dueDate && accessToken) {
      try {
        await updateGcalEvent(accessToken, updated.gcalEventId, updated);
      } catch {
        // silent
      }
    }
  }, [moduleData.tasks, sync, addToast, accessToken]);

  const pushToGcal = useCallback(async (task: Task) => {
    if (!accessToken || !task.dueDate) return;
    setPushingGcal(task.id);

    try {
      const prev = moduleData.tasks;
      let gcalEventId = task.gcalEventId;

      if (gcalEventId) {
        await updateGcalEvent(accessToken, gcalEventId, task);
        addToast('GCal event updated', 'success');
      } else {
        gcalEventId = await createGcalEvent(accessToken, task);
        addToast('Pushed to Google Calendar', 'success');
      }

      const updated: Task = { ...task, gcalEventId, updatedAt: new Date().toISOString() };
      await sync('tasks', prev, prev.map(t => (t.id === task.id ? updated : t)),
        () => SheetsService.update('Tasks', updated), 'Failed to sync GCal ID');
    } catch {
      addToast('GCal push failed', 'error');
    } finally {
      setPushingGcal(null);
    }
  }, [accessToken, moduleData.tasks, sync, addToast]);

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

  // ─── Calendar grid data ───
  const calDays = useMemo(() => {
    const total = daysInMonth(calYear, calMonth);
    const offset = firstDayOfMonth(calYear, calMonth);
    const cells: (number | null)[] = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    return cells;
  }, [calYear, calMonth]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of tasks) {
      if (t.dueDate) map[t.dueDate] = (map[t.dueDate] || 0) + 1;
    }
    return map;
  }, [tasks]);

  const todayStr = getLocalDate();

  const prevMonth = useCallback(() => {
    setCalMonth(m => {
      if (m === 0) { setCalYear(y => y - 1); return 11; }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setCalMonth(m => {
      if (m === 11) { setCalYear(y => y + 1); return 0; }
      return m + 1;
    });
  }, []);

  const handleDateClick = useCallback((dateStr: string) => {
    setSelectedDate(prev => prev === dateStr ? null : dateStr);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 100, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = taskTreeList.findIndex(t => t.id === active.id);
      const newIndex = taskTreeList.findIndex(t => t.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const newOrder = arrayMove(taskTreeList, oldIndex, newIndex);
      const now = new Date().toISOString();
      const prev = moduleData.tasks;
      const updatedTasks = prev.map(t => {
        const idx = newOrder.findIndex(x => x.id === t.id);
        if (idx === -1) return t;
        return { ...t, sortOrder: String(idx), updatedAt: now };
      });
      setModuleData('tasks', updatedTasks);
      try {
        for (const task of newOrder) {
          const u = updatedTasks.find(t => t.id === task.id)!;
          if (u.sortOrder !== (prev.find(t => t.id === task.id)?.sortOrder ?? '')) {
            await SheetsService.update('Tasks', u);
          }
        }
      } catch {
        setModuleData('tasks', prev);
        addToast('Failed to save order', 'error');
      }
    },
    [taskTreeList, moduleData.tasks, setModuleData, addToast],
  );

  // ─── Render helpers ───

  const renderTask = useCallback((task: Task, isSubtask = false, dragHandle?: ReactNode) => {
    const overdue = isOverdue(task);
    const isDone = task.status === 'done';
    const isSynced = !!task.gcalEventId;
    const isPushing = pushingGcal === task.id;

    return (
      <div
        className="mod-card"
        key={task.id}
        style={{
          ...(overdue ? { borderLeft: '3px solid #ff6b6b' } : {}),
          ...(isSubtask ? { marginLeft: 20, borderLeft: '2px solid rgba(255,255,255,0.1)' } : {}),
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <Checkbox
            checked={isDone}
            onChange={() => cycleStatus(task)}
            title={`Click to change status (currently ${STATUS_LABELS[task.status]})`}
          />
          {dragHandle}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
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
              {isSynced && (
                <span style={{
                  fontSize: 7,
                  background: 'rgba(59,130,246,.15)',
                  color: '#60a5fa',
                  padding: '1px 5px',
                  borderRadius: 3,
                  fontWeight: 600,
                }}>
                  GCal
                </span>
              )}
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
                  {task.dueTime && ` ${formatTime(task.dueTime)}`}
                  {overdue && ' (overdue)'}
                </span>
              )}
              {task.tags && (
                <span style={{ color: '#a29bfe' }}>{task.tags}</span>
              )}
            </div>

            {task.notes && (
              <div style={{ fontSize: 8, color: '#6c7a89', marginTop: 4 }}>{task.notes}</div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap' }}>
            {task.dueDate && (
              <button
                className="mod-btn mod-btn--sm"
                onClick={() => pushToGcal(task)}
                disabled={isPushing}
                title={isSynced ? 'Update GCal event' : 'Push to Google Calendar'}
              >
                {isPushing ? '...' : isSynced ? '\u21bb GCal' : '\u2192 GCal'}
              </button>
            )}
            {!isSubtask && (
              <button className="mod-btn mod-btn--sm" onClick={() => openCreateSubtask(task)} title="Add subtask">
                + Sub
              </button>
            )}
            <button className="mod-btn mod-btn--sm" onClick={() => openEdit(task)}>Edit</button>
            <button className="mod-btn mod-btn--sm mod-btn--danger" onClick={() => handleDelete(task)}>Del</button>
          </div>
        </div>
      </div>
    );
  }, [pushingGcal, cycleStatus, openCreateSubtask, openEdit, handleDelete, pushToGcal]);

  const renderCalendar = () => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button className="mod-btn mod-btn--sm" onClick={prevMonth}>&lt;</button>
        <span style={{ fontSize: 11, fontWeight: 600 }}>{MONTH_NAMES[calMonth]} {calYear}</span>
        <button className="mod-btn mod-btn--sm" onClick={nextMonth}>&gt;</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center', marginBottom: 4 }}>
        {DAY_LABELS.map(d => (
          <div key={d} style={{ fontSize: 8, color: '#6c7a89', padding: '2px 0' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {calDays.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const count = tasksByDate[dateStr] || 0;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;

          return (
            <div
              key={dateStr}
              className="task-cal-day"
              onClick={() => handleDateClick(dateStr)}
              style={{
                textAlign: 'center',
                padding: '4px 2px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 9,
                fontWeight: isToday ? 700 : 400,
                background: isSelected
                  ? 'rgba(99,102,241,.25)'
                  : isToday
                    ? 'rgba(234,179,8,.12)'
                    : 'transparent',
                color: isToday ? '#eab308' : isSelected ? '#a5b4fc' : '#c0c8d8',
                border: isSelected ? '1px solid rgba(99,102,241,.4)' : '1px solid transparent',
              }}
            >
              {day}
              {count > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2 }}>
                  {Array.from({ length: Math.min(count, 3) }).map((_, idx) => (
                    <div key={idx} style={{ width: 4, height: 4, borderRadius: '50%', background: '#818cf8' }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div style={{ fontSize: 9, color: '#8b9bb4', marginTop: 8, textAlign: 'center' }}>
          Showing tasks for {selectedDate}
          <button
            className="mod-btn mod-btn--sm"
            onClick={() => setSelectedDate(null)}
            style={{ marginLeft: 8 }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <ModuleHeader moduleType="tasks" title="Tasks">
        <button
          className="mod-btn"
          onClick={() => {
            setViewMode(v => v === 'list' ? 'calendar' : 'list');
            setSelectedDate(null);
          }}
        >
          {viewMode === 'list' ? 'Calendar' : 'List'}
        </button>
        <button className="mod-btn" onClick={openCreate}>+ Task</button>
      </ModuleHeader>

      {viewMode === 'list' && (
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
      )}

      {viewMode === 'calendar' && renderCalendar()}

      {showForm && (
        <div className="mod-form">
          {form.parentId && (
            <div style={{ fontSize: 9, color: '#8b9bb4', marginBottom: 8 }}>
              Subtask of: <strong>{tasks.find(t => t.id === form.parentId)?.title ?? 'Task'}</strong>
              <button type="button" className="mod-btn mod-btn--sm" onClick={() => updateField('parentId', '')} style={{ marginLeft: 8 }}>Clear</button>
            </div>
          )}
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
              <select value={form.priority} onChange={e => updateField('priority', e.target.value as Task['priority'])}>
                {PRIORITY_OPTIONS.map(p => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </label>
            <label style={{ flex: 1 }}>
              Status
              <select value={form.status} onChange={e => updateField('status', e.target.value as Task['status'])}>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mod-form-row">
            <label style={{ flex: 1 }}>
              Due Date
              <input
                type="date"
                value={form.dueDate}
                onChange={e => {
                  updateField('dueDate', e.target.value);
                  if (!e.target.value) updateField('dueTime', '');
                }}
              />
            </label>
            <label style={{ flex: 1 }}>
              Time
              <input
                type="time"
                value={form.dueTime}
                onChange={e => updateField('dueTime', e.target.value)}
                disabled={!form.dueDate}
              />
            </label>
          </div>

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
          {viewMode === 'calendar' && selectedDate
            ? `No tasks due on ${selectedDate}.`
            : tasks.length === 0
              ? 'No tasks yet. Create one to get started.'
              : `No ${activeTab === 'all' ? '' : STATUS_LABELS[activeTab as Task['status']].toLowerCase() + ' '}tasks.`}
        </div>
      )}

      {!showForm && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={taskTreeList.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {taskTreeList.map(task => (
              <SortableTaskRow
                key={task.id}
                task={task}
                isSubtask={!!(task.parentId && task.parentId !== '')}
                renderTask={renderTask}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
