import { useState } from 'react';
import { useCityStore } from '../../stores/cityStore';
import { SheetsService } from '../../services/sheetsService';
import { useUIStore } from '../../stores/uiStore';
import { PageHeader } from '../components/PageHeader';
import type { CalendarEvent } from '../../types';

const EVENT_COLORS = ['#818cf8', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6'];

export function Calendar() {
  const calendarEvents = useCityStore(s => s.moduleData.calendarEvents);
  const setModuleData = useCityStore(s => s.setModuleData);
  const addToast = useUIStore(s => s.addToast);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [color, setColor] = useState(EVENT_COLORS[0]);

  // Navigate days
  const navigateDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const dayEvents = calendarEvents
    .filter(e => e.startDate === selectedDate)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const addEvent = () => {
    if (!title.trim()) return;
    const event: CalendarEvent = {
      id: `cal_${crypto.randomUUID()}`,
      residentId: '',
      title: title.trim(),
      startDate: selectedDate,
      endDate: selectedDate,
      startTime,
      endTime,
      allDay: 'false',
      location: '',
      description: '',
      color,
      recurrence: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setModuleData('calendarEvents', [...calendarEvents, event]);
    SheetsService.append('CalendarEvents', event).catch(() => addToast('Sync failed', 'error'));
    setTitle('');
    setShowForm(false);
    addToast('Event added', 'success');
  };

  const deleteEvent = (id: string) => {
    setModuleData('calendarEvents', calendarEvents.filter(e => e.id !== id));
    SheetsService.deleteRow('CalendarEvents', id).catch(() => addToast('Sync failed', 'error'));
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <>
      <PageHeader
        title="Calendar"
        description={`${calendarEvents.length} total events`}
        actions={
          <button className="btn btn--primary" onClick={() => setShowForm(!showForm)}>
            + Add Event
          </button>
        }
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button className="btn btn--secondary" onClick={() => navigateDay(-1)}>&larr;</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{formatDate(selectedDate)}</div>
          {isToday && <span style={{ fontSize: 11, color: 'var(--accent)' }}>Today</span>}
        </div>
        <button className="btn btn--secondary" onClick={() => navigateDay(1)}>&rarr;</button>
        {!isToday && (
          <button className="btn btn--ghost btn--sm" onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}>
            Today
          </button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Start</label>
              <input className="form-input" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">End</label>
              <input className="form-input" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {EVENT_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 24, height: 24, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                    outline: color === c ? '2px solid var(--text-primary)' : 'none', outlineOffset: 2,
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn--secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn--primary" onClick={addEvent}>Add</button>
          </div>
        </div>
      )}

      {dayEvents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">&#x1F4C5;</div>
          <div className="empty-state__text">No events on this day</div>
          <div className="empty-state__sub">Click "+ Add Event" to schedule something</div>
        </div>
      ) : (
        dayEvents.map(event => (
          <div key={event.id} className="event-bar" style={{ borderLeftColor: event.color || 'var(--accent)' }}>
            <span className="event-bar__time">
              {event.allDay === 'true' ? 'All day' : `${event.startTime} - ${event.endTime}`}
            </span>
            <span className="event-bar__title">{event.title}</span>
            <button className="btn btn--ghost btn--sm" onClick={() => deleteEvent(event.id)}>&#x2715;</button>
          </div>
        ))
      )}
    </>
  );
}
