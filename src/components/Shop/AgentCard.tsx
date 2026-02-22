import { useMemo } from 'react';
import { useCityStore } from '../../stores/cityStore';
import { HOUSE_TYPES } from '../../config/houseTypes';
import { spriteAnimatedUrl } from '../../config/pokemon';
import type { Resident, House } from '../../types';

interface AgentCardProps {
  resident: Resident;
  house: House;
  onClick: () => void;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ── Mini widget: Calendar ── */
function CalendarWidget({ residentId }: { residentId: string }) {
  const events = useCityStore(s => s.moduleData.calendarEvents);
  const myEvents = useMemo(() => events.filter(e => e.residentId === residentId), [events, residentId]);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const today = now.getDate();

  const eventDates = new Set(myEvents.map(e => {
    const d = new Date(e.startDate);
    return d.getMonth() === month && d.getFullYear() === year ? d.getDate() : -1;
  }).filter(d => d > 0));

  const cells: { day: number; hasEvent: boolean; isToday: boolean }[] = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: 0, hasEvent: false, isToday: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, hasEvent: eventDates.has(d), isToday: d === today });

  const monthName = now.toLocaleString('en', { month: 'short' });

  return (
    <div className="dash-widget dash-widget--calendar">
      <div className="dash-widget__label">{monthName} {year}</div>
      <div className="dash-cal">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="dash-cal__head">{d}</div>
        ))}
        {cells.map((c, i) => (
          <div key={i} className={`dash-cal__day${c.isToday ? ' dash-cal__day--today' : ''}${c.hasEvent ? ' dash-cal__day--event' : ''}`}>
            {c.day > 0 ? c.day : ''}
          </div>
        ))}
      </div>
      <div className="dash-widget__stat">{myEvents.length} event{myEvents.length !== 1 ? 's' : ''}</div>
    </div>
  );
}

/* ── Mini widget: Tasks ── */
function TasksWidget({ residentId }: { residentId: string }) {
  const tasks = useCityStore(s => s.moduleData.tasks);
  const myTasks = useMemo(() => tasks.filter(t => t.residentId === residentId), [tasks, residentId]);

  const done = myTasks.filter(t => t.status === 'done').length;
  const inProgress = myTasks.filter(t => t.status === 'inProgress').length;
  const backlog = myTasks.filter(t => t.status === 'backlog').length;
  const total = myTasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="dash-widget dash-widget--tasks">
      <div className="dash-tasks__bar">
        {done > 0 && <div className="dash-tasks__seg dash-tasks__seg--done" style={{ flex: done }} />}
        {inProgress > 0 && <div className="dash-tasks__seg dash-tasks__seg--prog" style={{ flex: inProgress }} />}
        {backlog > 0 && <div className="dash-tasks__seg dash-tasks__seg--back" style={{ flex: backlog }} />}
        {total === 0 && <div className="dash-tasks__seg dash-tasks__seg--empty" style={{ flex: 1 }} />}
      </div>
      <div className="dash-tasks__legend">
        <span className="dash-tasks__dot" style={{ background: '#50c878' }} />{done}
        <span className="dash-tasks__dot" style={{ background: '#48dbfb' }} />{inProgress}
        <span className="dash-tasks__dot" style={{ background: '#8b9bb4' }} />{backlog}
      </div>
      <div className="dash-widget__stat">{pct}% done</div>
    </div>
  );
}

/* ── Mini widget: Notes ── */
function NotesWidget({ residentId }: { residentId: string }) {
  const notes = useCityStore(s => s.moduleData.notes);
  const myNotes = useMemo(() => notes.filter(n => n.residentId === residentId), [notes, residentId]);
  const latest = myNotes.length > 0 ? myNotes[myNotes.length - 1] : null;

  return (
    <div className="dash-widget dash-widget--notes">
      <div className="dash-notes__stack">
        {[2, 1, 0].map(i => (
          <div key={i} className="dash-notes__page" style={{ transform: `rotate(${(i - 1) * 3}deg) translateY(${i * -2}px)` }}>
            {i === 0 && latest && (
              <div className="dash-notes__preview">{latest.title || 'Untitled'}</div>
            )}
          </div>
        ))}
      </div>
      <div className="dash-widget__stat">{myNotes.length} note{myNotes.length !== 1 ? 's' : ''}</div>
    </div>
  );
}

/* ── Mini widget: Travel ── */
function TravelWidget({ residentId }: { residentId: string }) {
  const trips = useCityStore(s => s.moduleData.tripPlans);
  const myTrips = useMemo(() => trips.filter(t => t.residentId === residentId), [trips, residentId]);

  const today = todayStr();
  const upcoming = myTrips
    .filter(t => t.startDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const next = upcoming[0] ?? null;

  const daysUntil = next ? Math.ceil((new Date(next.startDate).getTime() - Date.now()) / 86400000) : null;

  return (
    <div className="dash-widget dash-widget--travel">
      {next ? (
        <>
          <div className="dash-travel__dest">{next.destination || next.tripName}</div>
          <div className="dash-travel__countdown">
            <span className="dash-travel__days">{daysUntil}</span>
            <span className="dash-travel__label">days away</span>
          </div>
        </>
      ) : (
        <div className="dash-travel__none">No trips planned</div>
      )}
      <div className="dash-widget__stat">{myTrips.length} trip{myTrips.length !== 1 ? 's' : ''}</div>
    </div>
  );
}

/* ── Mini widget: Health ── */
function HealthWidget({ residentId }: { residentId: string }) {
  const metrics = useCityStore(s => s.moduleData.healthMetrics);
  const myMetrics = useMemo(() => metrics.filter(m => m.residentId === residentId), [metrics, residentId]);

  const latest = myMetrics.length > 0 ? myMetrics[myMetrics.length - 1] : null;

  // Last 7 entries sparkline
  const recent = myMetrics.slice(-7);
  const values = recent.map(m => parseFloat(m.value) || 0);
  const max = Math.max(...values, 1);

  return (
    <div className="dash-widget dash-widget--health">
      {latest ? (
        <div className="dash-health__latest">
          <div className="dash-health__value">{latest.value}</div>
          <div className="dash-health__type">{latest.metricType} {latest.unit}</div>
        </div>
      ) : (
        <div className="dash-health__none">No data yet</div>
      )}
      {values.length > 1 && (
        <div className="dash-health__spark">
          {values.map((v, i) => (
            <div key={i} className="dash-health__bar" style={{ height: `${Math.max(8, (v / max) * 100)}%` }} />
          ))}
        </div>
      )}
      <div className="dash-widget__stat">{myMetrics.length} record{myMetrics.length !== 1 ? 's' : ''}</div>
    </div>
  );
}

/* ── Mini widget: Shopping ── */
function ShoppingWidget({ residentId }: { residentId: string }) {
  const items = useCityStore(s => s.moduleData.shoppingItems);
  const myItems = useMemo(() => items.filter(i => i.residentId === residentId), [items, residentId]);

  const checked = myItems.filter(i => i.checked === 'true').length;
  const total = myItems.length;
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;

  // Group by list
  const lists = [...new Set(myItems.map(i => i.listName || 'General'))];

  return (
    <div className="dash-widget dash-widget--shopping">
      <div className="dash-shop__lists">
        {lists.slice(0, 3).map(name => (
          <div key={name} className="dash-shop__list-pill">{name}</div>
        ))}
        {lists.length === 0 && <div className="dash-shop__list-pill">No lists</div>}
      </div>
      <div className="dash-shop__progress">
        <div className="dash-shop__track">
          <div className="dash-shop__fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="dash-shop__count">{checked}/{total}</span>
      </div>
      <div className="dash-widget__stat">{pct}% checked</div>
    </div>
  );
}

/* ── Widget map ── */
const WIDGET_MAP: Record<string, React.FC<{ residentId: string }>> = {
  calendar: CalendarWidget,
  tasks: TasksWidget,
  notes: NotesWidget,
  travel: TravelWidget,
  gym: HealthWidget,
  shopping: ShoppingWidget,
};

/* ── Main card component ── */
export function AgentCard({ resident, house, onClick }: AgentCardProps) {
  const ht = HOUSE_TYPES[house.type];
  const Widget = WIDGET_MAP[house.type];

  return (
    <div className="dash-card" onClick={onClick} style={{ '--card-accent': ht.color } as React.CSSProperties}>
      <div className="dash-card__top">
        <img
          src={spriteAnimatedUrl(resident.emoji)}
          alt={resident.name}
          className="dash-card__sprite"
        />
        <div className="dash-card__info">
          <div className="dash-card__name">{resident.name}</div>
          <div className="dash-card__badge" style={{ background: ht.color }}>{ht.label}</div>
        </div>
      </div>
      <div className="dash-card__widget">
        {Widget && <Widget residentId={resident.id} />}
      </div>
    </div>
  );
}
