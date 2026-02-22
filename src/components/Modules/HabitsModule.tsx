import { useState, useCallback, useMemo } from 'react';
import { useCityStore } from '../../stores/cityStore';
import { useUIStore } from '../../stores/uiStore';
import { SheetsService } from '../../services/sheetsService';
import type { Resident, Habit } from '../../types';

interface HabitsModuleProps {
  resident: Resident;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseHistory(habit: Habit): string[] {
  try {
    const parsed = JSON.parse(habit.completionHistory);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isDueToday(habit: Habit): boolean {
  const day = new Date().getDay(); // 0=Sun ... 6=Sat
  switch (habit.frequency) {
    case 'daily':
    case 'custom':
      return true;
    case 'weekdays':
      return day >= 1 && day <= 5;
    case 'weekly':
      return day === 1;
    default:
      return true;
  }
}

function calcStreak(history: string[]): number {
  if (history.length === 0) return 0;
  const sorted = [...new Set(history)].sort().reverse();
  const today = todayStr();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Streak must start from today or yesterday
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.round(diff) === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function getHeatmapLevel(ratio: number): string {
  if (ratio <= 0) return '';
  if (ratio <= 0.25) return 'heatmap__cell--l1';
  if (ratio <= 0.5) return 'heatmap__cell--l2';
  if (ratio <= 0.75) return 'heatmap__cell--l3';
  return 'heatmap__cell--l4';
}

export function HabitsModule({ resident }: HabitsModuleProps) {
  const habits = useCityStore(s => s.moduleData.habits);
  const setModuleData = useCityStore(s => s.setModuleData);
  const addToast = useUIStore(s => s.addToast);

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formFrequency, setFormFrequency] = useState<Habit['frequency']>('daily');

  const myHabits = useMemo(
    () => habits.filter(h => h.residentId === resident.id),
    [habits, resident.id],
  );

  const dueToday = useMemo(() => myHabits.filter(isDueToday), [myHabits]);

  const today = todayStr();

  // ── Heatmap: 90-day grid ──
  const heatmapData = useMemo(() => {
    const days: { date: string; level: string }[] = [];
    const now = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateStr = d.toISOString().slice(0, 10);
      // Count how many habits were completed on this day vs how many were due
      let completed = 0;
      let total = 0;
      for (const h of myHabits) {
        // Only count habits that existed by this date
        if (h.createdAt.slice(0, 10) > dateStr) continue;
        total++;
        const hist = parseHistory(h);
        if (hist.includes(dateStr)) completed++;
      }
      const ratio = total > 0 ? completed / total : 0;
      days.push({ date: dateStr, level: getHeatmapLevel(ratio) });
    }
    return days;
  }, [myHabits]);

  // ── Toggle completion ──
  const toggleToday = useCallback(
    (habit: Habit) => {
      const history = parseHistory(habit);
      const isCompleted = history.includes(today);
      const newHistory = isCompleted
        ? history.filter(d => d !== today)
        : [...history, today];

      const streak = calcStreak(newHistory);
      const prevLongest = parseInt(habit.longestStreak, 10) || 0;
      const longest = Math.max(streak, prevLongest);

      const updated: Habit = {
        ...habit,
        completionHistory: JSON.stringify(newHistory),
        currentStreak: String(streak),
        longestStreak: String(longest),
        updatedAt: new Date().toISOString(),
      };

      // Optimistic update
      const next = habits.map(h => (h.id === habit.id ? updated : h));
      setModuleData('habits', next);

      SheetsService.update('Habits', updated).catch(() => {
        addToast('Failed to save habit', 'error');
      });
    },
    [habits, today, setModuleData, addToast],
  );

  // ── Create ──
  const handleCreate = useCallback(() => {
    const name = formName.trim();
    if (!name) return;

    const now = new Date().toISOString();
    const habit: Habit = {
      id: `hab_${Date.now()}`,
      residentId: resident.id,
      name,
      frequency: formFrequency,
      currentStreak: '0',
      longestStreak: '0',
      completionHistory: '[]',
      createdAt: now,
      updatedAt: now,
    };

    setModuleData('habits', [...habits, habit]);
    setFormName('');
    setFormFrequency('daily');
    setShowForm(false);
    addToast('Habit created', 'success');

    SheetsService.append('Habits', habit).catch(() => {
      addToast('Failed to save habit', 'error');
    });
  }, [formName, formFrequency, resident.id, habits, setModuleData, addToast]);

  // ── Delete ──
  const handleDelete = useCallback(
    (id: string) => {
      setModuleData('habits', habits.filter(h => h.id !== id));
      addToast('Habit deleted', 'info');

      SheetsService.deleteRow('Habits', id).catch(() => {
        addToast('Failed to delete habit', 'error');
      });
    },
    [habits, setModuleData, addToast],
  );

  return (
    <div>
      {/* Header */}
      <div className="mod-header">
        <span className="mod-title">Habits</span>
        <button className="mod-btn mod-btn--sm" onClick={() => setShowForm(f => !f)}>
          {showForm ? 'Cancel' : '+ New Habit'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mod-form">
          <label>
            Name
            <input
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="e.g. Meditate"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
          </label>
          <label>
            Frequency
            <select
              value={formFrequency}
              onChange={e => setFormFrequency(e.target.value as Habit['frequency'])}
            >
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <div className="mod-form-actions">
            <button className="mod-btn" onClick={handleCreate}>Create</button>
          </div>
        </div>
      )}

      {/* Daily check-in */}
      {dueToday.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 9, color: '#8b9bb4', marginBottom: 6 }}>Due Today</div>
          {dueToday.map(habit => {
            const history = parseHistory(habit);
            const completed = history.includes(today);
            return (
              <div className="mod-card" key={habit.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  className={`checkbox${completed ? ' checked' : ''}`}
                  onClick={() => toggleToday(habit)}
                >
                  {completed ? '\u2713' : ''}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#e0e8f0' }}>{habit.name}</div>
                  <div style={{ fontSize: 8, color: '#8b9bb4' }}>
                    Streak: {habit.currentStreak} day{habit.currentStreak !== '1' ? 's' : ''} | Best: {habit.longestStreak}
                  </div>
                </div>
                <span style={{ fontSize: 8, color: '#8b9bb4', textTransform: 'capitalize' }}>
                  {habit.frequency}
                </span>
                <button className="mod-btn mod-btn--danger mod-btn--sm" onClick={() => handleDelete(habit.id)}>
                  Del
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* All habits (not due today) */}
      {myHabits.length > dueToday.length && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 9, color: '#8b9bb4', marginBottom: 6 }}>All Habits</div>
          {myHabits
            .filter(h => !isDueToday(h))
            .map(habit => (
              <div className="mod-card" key={habit.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#e0e8f0' }}>{habit.name}</div>
                  <div style={{ fontSize: 8, color: '#8b9bb4' }}>
                    Streak: {habit.currentStreak} | Best: {habit.longestStreak} | {habit.frequency}
                  </div>
                </div>
                <button className="mod-btn mod-btn--danger mod-btn--sm" onClick={() => handleDelete(habit.id)}>
                  Del
                </button>
              </div>
            ))}
        </div>
      )}

      {myHabits.length === 0 && !showForm && (
        <div className="mod-empty">No habits yet. Create one to start tracking!</div>
      )}

      {/* Heatmap */}
      {myHabits.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 9, color: '#8b9bb4', marginBottom: 6 }}>90-Day Activity</div>
          <div className="heatmap">
            {heatmapData.map(cell => (
              <div
                key={cell.date}
                className={`heatmap__cell${cell.level ? ` ${cell.level}` : ''}`}
                title={cell.date}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
