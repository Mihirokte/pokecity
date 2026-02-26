import { useState, useMemo } from 'react';
import { useCityStore } from '../../stores/cityStore';
import { C, pf } from '../gba-theme';
import { PanelShell, SectionTitle } from './PanelShell';

interface Props {
  onClose: () => void;
}

export function CalendarPanel({ onClose }: Props) {
  const calendarEvents = useCityStore(s => s.moduleData.calendarEvents);
  const [dayOffset, setDayOffset] = useState(0);

  const targetDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    return d;
  }, [dayOffset]);

  const dateStr = targetDate.toISOString().split('T')[0];
  const dayLabel = dayOffset === 0 ? 'TODAY' : dayOffset === 1 ? 'TOMORROW' : dayOffset === -1 ? 'YESTERDAY' : dateStr;
  const dateDisplay = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const dayEvents = useMemo(() => {
    return calendarEvents
      .filter(e => e.startDate === dateStr)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }, [calendarEvents, dateStr]);

  // Next day events for preview
  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextDateStr = nextDate.toISOString().split('T')[0];
  const nextDayEvents = calendarEvents.filter(e => e.startDate === nextDateStr);

  const colorMap: Record<string, string> = {
    blue: '#58A8F8', red: '#F84848', green: '#48D848', purple: '#A878F8',
    orange: '#F8A848', yellow: '#F8D030', pink: '#F888B8', teal: '#48D8B8',
  };

  return (
    <PanelShell title="📅 CALENDAR SYNC" onClose={onClose}>
      {/* Date display */}
      <div style={{
        ...pf(10), color: C.textLight, textAlign: 'center', marginBottom: 12,
      }}>
        {dayLabel} ({dateDisplay})
      </div>

      <SectionTitle>── {dayLabel} ──</SectionTitle>
      {dayEvents.length === 0 ? (
        <div style={{ ...pf(8), color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 20 }}>
          No events scheduled.
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          {dayEvents.map(event => {
            const color = colorMap[event.color] || C.statusBlue;
            const duration = event.startTime && event.endTime
              ? (() => {
                  const [sh, sm] = event.startTime.split(':').map(Number);
                  const [eh, em] = event.endTime.split(':').map(Number);
                  return `${(eh * 60 + em) - (sh * 60 + sm)} min`;
                })()
              : event.allDay === 'true' ? 'All day' : '';
            return (
              <div key={event.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '8px 4px',
                borderBottom: `1px solid rgba(255,255,255,0.1)`,
              }}>
                {/* Time */}
                <div style={{ ...pf(8), color: C.textLight, width: 50, flexShrink: 0 }}>
                  {event.allDay === 'true' ? '—' : (event.startTime || '??:??')}
                </div>
                {/* Color bar */}
                <div style={{ width: 4, height: 24, background: color, flexShrink: 0, marginTop: 2 }} />
                {/* Event details */}
                <div style={{ flex: 1 }}>
                  <div style={{ ...pf(8), color: C.textLight }}>{event.title}</div>
                  {duration && <div style={{ ...pf(6), color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>[{duration}]</div>}
                  {event.location && <div style={{ ...pf(6), color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>📍 {event.location}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Next day preview */}
      <SectionTitle>── {dayOffset === 0 ? 'TOMORROW' : 'NEXT DAY'} ──</SectionTitle>
      <div style={{ ...pf(7), color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
        {nextDayEvents.length} event{nextDayEvents.length !== 1 ? 's' : ''} scheduled
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="gba-btn" onClick={() => setDayOffset(d => d - 1)}>◄ PREV</button>
        <button className="gba-btn" onClick={() => setDayOffset(0)}>TODAY</button>
        <button className="gba-btn" onClick={() => setDayOffset(d => d + 1)}>NEXT ►</button>
      </div>
    </PanelShell>
  );
}
