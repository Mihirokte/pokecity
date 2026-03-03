import { useState, useMemo, useCallback } from 'react';
import type { Resident, Task } from '../../types';
import { badgeUrl, MODULE_BADGE_IDS } from '../../config/pokemon';
import { useCityStore } from '../../stores/cityStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { SheetsService } from '../../services/sheetsService';

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

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

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
});

function getLocalDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false;
  return task.dueDate < getLocalDate();
}

function formatTime(t: string): string {
  if (!t) return '';
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${ampm}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ─── Google Calendar helpers ───

async function createGcalEvent(
  token: string,
  task: Task,
): Promise<string> {
  const isAllDay = !task.dueTime;
  const body: Record<string, unknown> = {
    summary: task.title,
    description: task.notes || undefined,
  };
  if (isAllDay) {
    // All-day event: date only
    body.start = { date: task.dueDate };
    // End date is exclusive in GCal, so next day
    const end = new Date(task.dueDate + 'T00:00:00');
    end.setDate(end.getDate() + 1);
    body.end = { date: getLocalDate(end) };
  } else {
    const startDt = `${task.dueDate}T${task.dueTime}:00`;
    const endDate = new Date(startDt);
    endDate.setHours(endDate.getHours() + 1);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    body.start = { dateTime: startDt, timeZone: tz };
    body.end = {
      dateTime: endDate.toISOString().replace('Z', '').slice(0, 19),
      timeZone: tz,
    };
  }
  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error('Failed to create GCal event');
  const data = await res.json();
  return data.id as string;
}

async function updateGcalEvent(
  token: string,
  eventId: string,
  task: Task,
): Promise<void> {
  const isAllDay = !task.dueTime;
  const body: Record<string, unknown> = {
    summary: task.title,
    description: task.notes || undefined,
  };
  if (isAllDay) {
    body.start = { date: task.dueDate };
    const end = new Date(task.dueDate + 'T00:00:00');
    end.setDate(end.getDate() + 1);
    body.end = { date: getLocalDate(end) };
  } else {
    const startDt = `${task.dueDate}T${task.dueTime}:00`;
    const endDate = new Date(startDt);
    endDate.setHours(endDate.getHours() + 1);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    body.start = { dateTime: startDt, timeZone: tz };
    body.end = {
      dateTime: endDate.toISOString().replace('Z', '').slice(0, 19),
      timeZone: tz,
    };
  }
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error('Failed to update GCal event');
}

async function deleteGcalEvent(
  token: string,
  eventId: string,
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  // 204 = deleted, 410 = already gone — both OK
  if (!res.ok && res.status !== 410) throw new Error('Failed to delete GCal event');
}

// ─── Component ───

export function TasksModule({ resident }: TasksModuleProps) {
  const moduleData = useCityStore(s => s.moduleData);
  const setModuleData = useCityStore(s => s.setModuleData);
  const addToast = useUIStore(s => s.addToast);
  const accessToken = useAuthStore(s => s.accessToken);

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [pushingGcal, setPushingGcal] = useState<string | null>(null);

  // Calendar view state
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
    return list;
  }, [tasks, activeTab, viewMode, selectedDate]);

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

      // Auto-update GCal event if synced
      if (updated.gcalEventId && updated.dueDate && accessToken) {
        try {
          await updateGcalEvent(accessToken, updated.gcalEventId, updated);
        } catch {
          addToast('GCal sync failed', 'error');
        }
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
  }, [form, editingId, moduleData.tasks, resident.id, setModuleData, addToast, accessToken]);

  const handleDelete = useCallback(async (task: Task) => {
    const prev = moduleData.tasks;
    setModuleData('tasks', prev.filter(t => t.id !== task.id));
    addToast('Task deleted', 'success');

    try {
      await SheetsService.deleteRow('Tasks', task.id);
    } catch {
      setModuleData('tasks', prev);
      addToast('Failed to sync deletion', 'error');
    }

    // Auto-delete GCal event if synced
    if (task.gcalEventId && accessToken) {
      try {
        await deleteGcalEvent(accessToken, task.gcalEventId);
      } catch {
        // silent — event may already be gone
      }
    }
  }, [moduleData.tasks, setModuleData, addToast, accessToken]);

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

    // Auto-update GCal if synced
    if (updated.gcalEventId && updated.dueDate && accessToken) {
      try {
        await updateGcalEvent(accessToken, updated.gcalEventId, updated);
      } catch {
        // silent
      }
    }
  }, [moduleData.tasks, setModuleData, addToast, accessToken]);

  const pushToGcal = useCallback(async (task: Task) => {
    if (!accessToken || !task.dueDate) return;
    setPushingGcal(task.id);

    try {
      const prev = moduleData.tasks;
      let gcalEventId = task.gcalEventId;

      if (gcalEventId) {
        // Update existing
        await updateGcalEvent(accessToken, gcalEventId, task);
        addToast('GCal event updated', 'success');
      } else {
        // Create new
        gcalEventId = await createGcalEvent(accessToken, task);
        addToast('Pushed to Google Calendar', 'success');
      }

      const updated: Task = { ...task, gcalEventId, updatedAt: new Date().toISOString() };
      const next = prev.map(t => (t.id === task.id ? updated : t));
      setModuleData('tasks', next);

      try {
        await SheetsService.update('Tasks', updated);
      } catch {
        setModuleData('tasks', prev);
        addToast('Failed to sync GCal ID', 'error');
      }
    } catch {
      addToast('GCal push failed', 'error');
    } finally {
      setPushingGcal(null);
    }
  }, [accessToken, moduleData.tasks, setModuleData, addToast]);

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
      if (t.dueDate) {
        map[t.dueDate] = (map[t.dueDate] || 0) + 1;
      }
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

  // ─── Render ───

  const renderTask = (task: Task) => {
    const overdue = isOverdue(task);
    const isDone = task.status === 'done';
    const isSynced = !!task.gcalEventId;
    const isPushing = pushingGcal === task.id;

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
                <span style={{ color: '#a29bfe' }}>
                  {task.tags}
                </span>
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
            <button className="mod-btn mod-btn--sm" onClick={() => openEdit(task)}>Edit</button>
            <button className="mod-btn mod-btn--sm mod-btn--danger" onClick={() => handleDelete(task)}>Del</button>
          </div>
        </div>
      </div>
    );
  };

  const renderCalendar = () => (
    <div style={{ marginBottom: 12 }}>
      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button className="mod-btn mod-btn--sm" onClick={prevMonth}>&lt;</button>
        <span style={{ fontSize: 11, fontWeight: 600 }}>{MONTH_NAMES[calMonth]} {calYear}</span>
        <button className="mod-btn mod-btn--sm" onClick={nextMonth}>&gt;</button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center', marginBottom: 4 }}>
        {DAY_LABELS.map(d => (
          <div key={d} style={{ fontSize: 8, color: '#6c7a89', padding: '2px 0' }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
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
                    <div key={idx} style={{
                      width: 4, height: 4, borderRadius: '50%',
                      background: '#818cf8',
                    }} />
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
      <div className="mod-header">
        <span className="mod-header__title-wrap">
          <img src={badgeUrl(MODULE_BADGE_IDS.tasks)} alt="" className="pokecity-badge pokecity-badge--mod" />
          <span className="mod-title">Tasks</span>
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
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
        </div>
      </div>

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

      {!showForm && filtered.map(renderTask)}
    </div>
  );
}
