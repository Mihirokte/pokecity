import { useState, useMemo, useCallback } from 'react';
import type { Resident, CalendarEvent } from '../../types';
import { useCityStore } from '../../stores/cityStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { SheetsService } from '../../services/sheetsService';

interface CalendarModuleProps {
  resident: Resident;
}

const RECURRENCE_OPTIONS = ['none', 'daily', 'weekly', 'monthly', 'yearly'] as const;

const COLOR_OPTIONS = [
  '#ff6b6b', '#feca57', '#48dbfb', '#50c878',
  '#ff9ff3', '#a29bfe', '#ffcd75', '#8b9bb4',
];

const emptyForm = (): Omit<CalendarEvent, 'id' | 'residentId' | 'createdAt' | 'updatedAt'> => ({
  title: '',
  startDate: getLocalDate(),
  endDate: getLocalDate(),
  startTime: '09:00',
  endTime: '10:00',
  allDay: 'false',
  location: '',
  description: '',
  color: COLOR_OPTIONS[0],
  recurrence: 'none',
});

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getLocalDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function CalendarModule({ resident }: CalendarModuleProps) {
  const moduleData = useCityStore(s => s.moduleData);
  const setModuleData = useCityStore(s => s.setModuleData);
  const addToast = useUIStore(s => s.addToast);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [syncing, setSyncing] = useState(false);

  const events = useMemo(
    () => moduleData.calendarEvents.filter(e => e.residentId === resident.id),
    [moduleData.calendarEvents, resident.id],
  );

  const grouped = useMemo(() => {
    const today = getLocalDate();
    const todayEvents: CalendarEvent[] = [];
    const upcoming: CalendarEvent[] = [];
    const past: CalendarEvent[] = [];

    for (const evt of events) {
      if (evt.startDate <= today && evt.endDate >= today) {
        todayEvents.push(evt);
      } else if (evt.startDate > today) {
        upcoming.push(evt);
      } else {
        past.push(evt);
      }
    }

    todayEvents.sort((a, b) => a.startTime.localeCompare(b.startTime));
    upcoming.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.startTime.localeCompare(b.startTime));
    past.sort((a, b) => b.startDate.localeCompare(a.startDate));

    return { todayEvents, upcoming, past };
  }, [events]);

  const updateField = useCallback(<K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }, []);

  const openEdit = useCallback((evt: CalendarEvent) => {
    setEditingId(evt.id);
    setForm({
      title: evt.title,
      startDate: evt.startDate,
      endDate: evt.endDate,
      startTime: evt.startTime,
      endTime: evt.endTime,
      allDay: evt.allDay,
      location: evt.location,
      description: evt.description,
      color: evt.color,
      recurrence: evt.recurrence,
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
    const allEvents = moduleData.calendarEvents;

    const prev = allEvents;

    if (editingId) {
      const updated: CalendarEvent = {
        id: editingId,
        residentId: resident.id,
        ...form,
        createdAt: allEvents.find(e => e.id === editingId)?.createdAt ?? now,
        updatedAt: now,
      };

      const next = allEvents.map(e => (e.id === editingId ? updated : e));
      setModuleData('calendarEvents', next);
      setShowForm(false);
      setEditingId(null);
      addToast('Event updated', 'success');

      try {
        await SheetsService.update('CalendarEvents', updated);
      } catch {
        setModuleData('calendarEvents', prev);
        addToast('Failed to sync update', 'error');
      }
    } else {
      const newEvent: CalendarEvent = {
        id: `evt_${crypto.randomUUID()}`,
        residentId: resident.id,
        ...form,
        createdAt: now,
        updatedAt: now,
      };

      setModuleData('calendarEvents', [...allEvents, newEvent]);
      setShowForm(false);
      addToast('Event created', 'success');

      try {
        await SheetsService.append('CalendarEvents', newEvent);
      } catch {
        setModuleData('calendarEvents', prev);
        addToast('Failed to sync event', 'error');
      }
    }
  }, [form, editingId, moduleData.calendarEvents, resident.id, setModuleData, addToast]);

  const handleDelete = useCallback(async (id: string) => {
    const prev = moduleData.calendarEvents;
    setModuleData('calendarEvents', prev.filter(e => e.id !== id));
    addToast('Event deleted', 'success');

    try {
      await SheetsService.deleteRow('CalendarEvents', id);
    } catch {
      setModuleData('calendarEvents', prev);
      addToast('Failed to sync deletion', 'error');
    }
  }, [moduleData.calendarEvents, setModuleData, addToast]);

  const handleGoogleSync = useCallback(async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) { addToast('Not authenticated', 'error'); return; }

    setSyncing(true);
    try {
      // Fetch next 60 days of events from Google Calendar (primary calendar, no birthdays)
      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(now.getTime() + 60 * 86400000).toISOString();
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=100`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Google Calendar API error: ${res.status}`);
      const data = await res.json();

      const gcalEvents: CalendarEvent[] = (data.items ?? [])
        .filter((item: { status?: string }) => item.status !== 'cancelled')
        .map((item: { id?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string }; summary?: string; location?: string; description?: string }) => {
          const start = item.start?.dateTime ?? item.start?.date ?? '';
          const end = item.end?.dateTime ?? item.end?.date ?? '';
          const isAllDay = !item.start?.dateTime;
          const startDate = isAllDay ? start : start.slice(0, 10);
          const endDate = isAllDay
            ? new Date(new Date(end).getTime() - 86400000).toISOString().slice(0, 10)
            : end.slice(0, 10);

          return {
            id: `gcal_${item.id}`,
            residentId: resident.id,
            title: item.summary ?? '(No title)',
            startDate,
            endDate,
            startTime: isAllDay ? '' : start.slice(11, 16),
            endTime: isAllDay ? '' : end.slice(11, 16),
            allDay: isAllDay ? 'true' : 'false',
            location: item.location ?? '',
            description: item.description?.slice(0, 200) ?? '',
            color: '#4a90d9',
            recurrence: 'none',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as CalendarEvent;
        });

      // Keep other residents' events + this resident's manual events, replace gcal events
      const otherEvents = moduleData.calendarEvents.filter(e => e.residentId !== resident.id);
      const myManualEvents = moduleData.calendarEvents.filter(e => e.residentId === resident.id && !e.id.startsWith('gcal_'));
      setModuleData('calendarEvents', [...otherEvents, ...myManualEvents, ...gcalEvents]);

      addToast(`Synced ${gcalEvents.length} events from Google Calendar`, 'success');
    } catch (e: unknown) {
      console.error('Google Calendar sync error:', e);
      addToast('Failed to sync Google Calendar', 'error');
    } finally {
      setSyncing(false);
    }
  }, [moduleData.calendarEvents, resident.id, setModuleData, addToast]);

  const renderEvent = (evt: CalendarEvent) => (
    <div className="mod-card" key={evt.id} style={{ borderLeft: `3px solid ${evt.color || '#ffcd75'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <strong style={{ fontSize: 10 }}>{evt.title}</strong>
            {evt.recurrence && evt.recurrence !== 'none' && (
              <span style={{
                fontSize: 7,
                background: 'rgba(255,205,117,.15)',
                color: '#ffcd75',
                padding: '2px 6px',
                borderRadius: 3,
              }}>
                {evt.recurrence}
              </span>
            )}
          </div>
          <div style={{ fontSize: 8, color: '#8b9bb4', marginBottom: 2 }}>
            {formatDate(evt.startDate)}
            {evt.endDate && evt.endDate !== evt.startDate && ` - ${formatDate(evt.endDate)}`}
          </div>
          {evt.allDay !== 'true' && (evt.startTime || evt.endTime) && (
            <div style={{ fontSize: 8, color: '#8b9bb4' }}>
              {evt.startTime}{evt.endTime ? ` - ${evt.endTime}` : ''}
            </div>
          )}
          {evt.allDay === 'true' && (
            <div style={{ fontSize: 8, color: '#a29bfe' }}>All day</div>
          )}
          {evt.location && (
            <div style={{ fontSize: 8, color: '#8b9bb4', marginTop: 2 }}>{evt.location}</div>
          )}
          {evt.description && (
            <div style={{ fontSize: 8, color: '#6c7a89', marginTop: 2 }}>{evt.description}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button className="mod-btn mod-btn--sm" onClick={() => openEdit(evt)}>Edit</button>
          <button className="mod-btn mod-btn--sm mod-btn--danger" onClick={() => handleDelete(evt.id)}>Del</button>
        </div>
      </div>
    </div>
  );

  const renderGroup = (label: string, items: CalendarEvent[]) => {
    if (items.length === 0) return null;
    return (
      <div key={label} style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 8, color: '#8b9bb4', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
          {label}
        </div>
        {items.map(renderEvent)}
      </div>
    );
  };

  return (
    <div>
      <div className="mod-header">
        <span className="mod-title">Calendar</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="mod-btn mod-btn--sm" onClick={handleGoogleSync} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Google Sync'}
          </button>
          <button className="mod-btn" onClick={openCreate}>+ Event</button>
        </div>
      </div>

      {showForm && (
        <div className="mod-form">
          <label>
            Title
            <input
              type="text"
              value={form.title}
              onChange={e => updateField('title', e.target.value)}
              placeholder="Event title"
            />
          </label>

          <div className="mod-form-row">
            <label style={{ flex: 1 }}>
              Start Date
              <input
                type="date"
                value={form.startDate}
                onChange={e => updateField('startDate', e.target.value)}
              />
            </label>
            <label style={{ flex: 1 }}>
              End Date
              <input
                type="date"
                value={form.endDate}
                onChange={e => updateField('endDate', e.target.value)}
              />
            </label>
          </div>

          <div className="mod-form-row">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <div
                className={`checkbox${form.allDay === 'true' ? ' checked' : ''}`}
                onClick={() => updateField('allDay', form.allDay === 'true' ? 'false' : 'true')}
              >
                {form.allDay === 'true' && '\u2713'}
              </div>
              All Day
            </label>
          </div>

          {form.allDay !== 'true' && (
            <div className="mod-form-row">
              <label style={{ flex: 1 }}>
                Start Time
                <input
                  type="time"
                  value={form.startTime}
                  onChange={e => updateField('startTime', e.target.value)}
                />
              </label>
              <label style={{ flex: 1 }}>
                End Time
                <input
                  type="time"
                  value={form.endTime}
                  onChange={e => updateField('endTime', e.target.value)}
                />
              </label>
            </div>
          )}

          <label>
            Location
            <input
              type="text"
              value={form.location}
              onChange={e => updateField('location', e.target.value)}
              placeholder="Optional location"
            />
          </label>

          <label>
            Description
            <textarea
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </label>

          <label>
            Recurrence
            <select
              value={form.recurrence}
              onChange={e => updateField('recurrence', e.target.value)}
            >
              {RECURRENCE_OPTIONS.map(opt => (
                <option key={opt} value={opt}>
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Color
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              {COLOR_OPTIONS.map(c => (
                <div
                  key={c}
                  onClick={() => updateField('color', c)}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: c,
                    cursor: 'pointer',
                    border: form.color === c ? '2px solid #fff' : '2px solid transparent',
                    transition: 'border-color .15s',
                  }}
                />
              ))}
            </div>
          </label>

          <div className="mod-form-actions">
            <button className="mod-btn" onClick={cancelForm}>Cancel</button>
            <button className="mod-btn" onClick={handleSave}>
              {editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {!showForm && events.length === 0 && (
        <div className="mod-empty">No events yet. Create one to get started.</div>
      )}

      {!showForm && (
        <>
          {renderGroup('Today', grouped.todayEvents)}
          {renderGroup('Upcoming', grouped.upcoming)}
          {renderGroup('Past', grouped.past)}
        </>
      )}
    </div>
  );
}
