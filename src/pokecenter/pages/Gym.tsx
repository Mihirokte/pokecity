import { useState, useMemo } from 'react';
import { useCityStore } from '../../stores/cityStore';
import { SheetsService } from '../../services/sheetsService';
import { useUIStore } from '../../stores/uiStore';
import { PageHeader } from '../components/PageHeader';
import type { HealthMetric } from '../../types';

// ── Types ──────────────────────────────────────────────────────────────────────
interface ExerciseDef {
  name: string;
  sets: number;
  reps: string;
  unit: 'kg' | 'reps';
}

interface WorkoutDay {
  id: string;
  label: string;
  type: 'push' | 'pull' | 'legs' | 'rest';
  color: string;
  emoji: string;
  treadmin: number;   // suggested treadmill minutes
  preStretchMin: number;
  postStretchMin: number;
  preStretches: string[];
  postStretches: string[];
  exercises: ExerciseDef[];
}

interface SetLog { reps: number; set: number; workoutDay: string; }
function parseNotes(notes: string): Partial<SetLog> {
  try { return JSON.parse(notes); } catch { return {}; }
}

// ── PPL 7-Day Program ─────────────────────────────────────────────────────────
const PPL: WorkoutDay[] = [
  // index 0 = Rest (Sunday)
  {
    id: 'rest', label: 'Rest / Recovery', type: 'rest', color: '#6c757d', emoji: '😴',
    treadmin: 20, preStretchMin: 15, postStretchMin: 0,
    preStretches: ['Light walk 20 min', 'Hip circles (10 each)', 'Shoulder rolls (10)', 'Cat-cow (10)', 'World\'s greatest stretch (5 each)', 'Pigeon pose (30s each)', 'Lying quad stretch (30s each)', 'Child\'s pose (60s)'],
    postStretches: [],
    exercises: [],
  },
  // index 1 = Push A (Monday)
  {
    id: 'push1', label: 'Push A — Chest / Shoulders / Triceps', type: 'push', color: '#e74c3c', emoji: '🔴',
    treadmin: 10, preStretchMin: 5, postStretchMin: 5,
    preStretches: ['Arm circles forward 20s', 'Arm circles backward 20s', 'Chest opener stretch 20s', 'Shoulder cross-body 20s each', 'Band pull-aparts 15 reps', 'Push-up shoulder taps 10'],
    postStretches: ['Doorway chest stretch 30s', 'Overhead tricep stretch 30s each', 'Cross-body shoulder 30s each', 'Sleeper stretch 30s each'],
    exercises: [
      { name: 'Bench Press',         sets: 4, reps: '6-8',   unit: 'kg' },
      { name: 'Incline DB Press',    sets: 4, reps: '8-12',  unit: 'kg' },
      { name: 'Cable Fly',           sets: 3, reps: '12-15', unit: 'kg' },
      { name: 'Overhead Press',      sets: 4, reps: '8-12',  unit: 'kg' },
      { name: 'Lateral Raise',       sets: 4, reps: '12-15', unit: 'kg' },
      { name: 'Tricep Pushdown',     sets: 3, reps: '12-15', unit: 'kg' },
      { name: 'Skull Crushers',      sets: 3, reps: '10-12', unit: 'kg' },
    ],
  },
  // index 2 = Pull A (Tuesday)
  {
    id: 'pull1', label: 'Pull A — Back / Biceps', type: 'pull', color: '#3498db', emoji: '🔵',
    treadmin: 10, preStretchMin: 5, postStretchMin: 5,
    preStretches: ['Arm circles 20s each', 'Band pull-aparts 15 reps', 'Cat-cow 10 reps', 'Hip hinge bodyweight 10', 'Dead hang 20s', 'Wrist circles 10 each direction'],
    postStretches: ['Lat stretch on bar 30s each', 'Child\'s pose 45s', 'Bicep wall stretch 30s each', 'Thoracic rotation 10 each'],
    exercises: [
      { name: 'Deadlift',            sets: 4, reps: '5',     unit: 'kg' },
      { name: 'Pull-ups',            sets: 4, reps: '8-12',  unit: 'reps' },
      { name: 'Barbell Row',         sets: 4, reps: '8-12',  unit: 'kg' },
      { name: 'Seated Cable Row',    sets: 3, reps: '12-15', unit: 'kg' },
      { name: 'Face Pull',           sets: 3, reps: '15-20', unit: 'kg' },
      { name: 'Barbell Curl',        sets: 3, reps: '10-12', unit: 'kg' },
      { name: 'Hammer Curl',         sets: 3, reps: '12-15', unit: 'kg' },
    ],
  },
  // index 3 = Legs A (Wednesday)
  {
    id: 'legs1', label: 'Legs A — Quads / Hams / Glutes', type: 'legs', color: '#2ecc71', emoji: '🟢',
    treadmin: 10, preStretchMin: 7, postStretchMin: 10,
    preStretches: ['Leg swings forward 10 each', 'Leg swings lateral 10 each', 'Hip circles 10 each', 'Bodyweight squat 10', 'Reverse lunge 5 each', 'Walking quad pull 5 each', 'Sumo squat hold 30s'],
    postStretches: ['Pigeon pose 45s each', 'Standing quad stretch 30s each', 'Standing hamstring 30s each', 'Hip flexor lunge 30s each', 'Seated figure-4 30s each', 'Calf stretch on wall 30s each'],
    exercises: [
      { name: 'Squat',               sets: 4, reps: '6-8',   unit: 'kg' },
      { name: 'Romanian Deadlift',   sets: 4, reps: '8-12',  unit: 'kg' },
      { name: 'Leg Press',           sets: 3, reps: '10-15', unit: 'kg' },
      { name: 'Leg Curl',            sets: 3, reps: '12-15', unit: 'kg' },
      { name: 'Leg Extension',       sets: 3, reps: '15',    unit: 'kg' },
      { name: 'Standing Calf Raise', sets: 4, reps: '15-20', unit: 'kg' },
    ],
  },
  // index 4 = Push B (Thursday)
  {
    id: 'push2', label: 'Push B — Volume / Shoulders', type: 'push', color: '#e74c3c', emoji: '🔴',
    treadmin: 10, preStretchMin: 5, postStretchMin: 5,
    preStretches: ['Arm circles forward 20s', 'Arm circles backward 20s', 'Chest opener stretch 20s', 'Band pull-aparts 15 reps', 'Inchworm push-up 5', 'Shoulder rotations 10 each'],
    postStretches: ['Doorway chest stretch 30s', 'Overhead tricep stretch 30s each', 'Cross-body shoulder 30s each', 'Neck rolls 30s'],
    exercises: [
      { name: 'Incline BB Press',    sets: 4, reps: '8-12',  unit: 'kg' },
      { name: 'Flat DB Press',       sets: 4, reps: '10-12', unit: 'kg' },
      { name: 'Cable Crossover',     sets: 3, reps: '15',    unit: 'kg' },
      { name: 'DB Shoulder Press',   sets: 4, reps: '10-12', unit: 'kg' },
      { name: 'Cable Lateral Raise', sets: 3, reps: '15-20', unit: 'kg' },
      { name: 'Overhead Tricep Ext', sets: 3, reps: '12-15', unit: 'kg' },
      { name: 'Tricep Dips',         sets: 3, reps: 'AMRAP', unit: 'reps' },
    ],
  },
  // index 5 = Pull B (Friday)
  {
    id: 'pull2', label: 'Pull B — Back Width / Biceps', type: 'pull', color: '#3498db', emoji: '🔵',
    treadmin: 10, preStretchMin: 5, postStretchMin: 5,
    preStretches: ['Dead hang 20s', 'Arm circles 20s each', 'Cat-cow 10 reps', 'Band pull-aparts 15 reps', 'Bodyweight hip hinge 10', 'Wrist figure-eights 10s'],
    postStretches: ['Lat stretch on bar 30s each', 'Child\'s pose 45s', 'Bicep wall stretch 30s each', 'Upper back foam roll 60s'],
    exercises: [
      { name: 'Weighted Pull-ups',   sets: 4, reps: '6-10',  unit: 'kg' },
      { name: 'T-Bar Row',           sets: 4, reps: '10-12', unit: 'kg' },
      { name: 'Single-arm DB Row',   sets: 3, reps: '12-15', unit: 'kg' },
      { name: 'Lat Pulldown',        sets: 3, reps: '12-15', unit: 'kg' },
      { name: 'Rope Face Pull',      sets: 3, reps: '20',    unit: 'kg' },
      { name: 'Incline Curl',        sets: 3, reps: '12',    unit: 'kg' },
      { name: 'Cable Curl',          sets: 3, reps: '15',    unit: 'kg' },
    ],
  },
  // index 6 = Legs B (Saturday)
  {
    id: 'legs2', label: 'Legs B — Glutes / Volume', type: 'legs', color: '#2ecc71', emoji: '🟢',
    treadmin: 10, preStretchMin: 7, postStretchMin: 10,
    preStretches: ['Leg swings forward 10 each', 'Leg swings lateral 10 each', 'Hip circles 10 each', 'Glute bridge 10', 'Clamshells 10 each', 'Lateral band walk 10 each', 'Deep squat hold 30s'],
    postStretches: ['Pigeon pose 45s each', 'Standing quad stretch 30s each', 'Lying glute stretch 30s each', 'Hip flexor lunge 30s each', 'Butterfly stretch 30s', 'Calf stretch on wall 30s each'],
    exercises: [
      { name: 'Hack Squat',          sets: 4, reps: '8-12',  unit: 'kg' },
      { name: 'Hip Thrust',          sets: 4, reps: '12-15', unit: 'kg' },
      { name: 'Lunges',              sets: 3, reps: '12/leg', unit: 'kg' },
      { name: 'Nordic Curl',         sets: 3, reps: '8-10',  unit: 'reps' },
      { name: 'Seated Leg Curl',     sets: 3, reps: '15',    unit: 'kg' },
      { name: 'Seated Calf Raise',   sets: 4, reps: '20',    unit: 'kg' },
    ],
  },
];

// Sun=0 → index 0(rest), Mon=1 → 1(push1), Tue=2 → 2(pull1), Wed=3 → 3(legs1),
// Thu=4 → 4(push2), Fri=5 → 5(pull2), Sat=6 → 6(legs2)
const DOW_TO_IDX = [0, 1, 2, 3, 4, 5, 6];

const TODAY_DATE = new Date().toISOString().split('T')[0];
const TODAY_DOW = new Date().getDay();

// ── Component ─────────────────────────────────────────────────────────────────
type ViewType = 'today' | 'program' | 'history';

export function Gym() {
  const healthMetrics = useCityStore(s => s.moduleData.healthMetrics);
  const setModuleData = useCityStore(s => s.setModuleData);
  const addToast = useUIStore(s => s.addToast);

  const [view, setView] = useState<ViewType>('today');
  const [selectedDate, setSelectedDate] = useState(TODAY_DATE);
  const [programDayIdx, setProgramDayIdx] = useState(DOW_TO_IDX[TODAY_DOW]);

  // Per-exercise input state (ephemeral)
  const [setInputs, setSetInputs] = useState<Record<string, { weight: string; reps: string }>>({});
  // Treadmill input
  const [treadDuration, setTreadDuration] = useState('10');
  const [treadDistance, setTreadDistance] = useState('');
  // History exercise filter
  const [histEx, setHistEx] = useState('Bench Press');

  // Determine workout for selected date
  const selectedDow = new Date(selectedDate + 'T12:00:00').getDay();
  const workout = PPL[DOW_TO_IDX[selectedDow]];

  // Metrics for selected date
  const dayMetrics = useMemo(
    () => healthMetrics.filter(m => m.date === selectedDate),
    [healthMetrics, selectedDate]
  );

  const treadmillEntry = dayMetrics.find(m => m.metricType === '__treadmill__');
  const preStretchDone = dayMetrics.some(m => m.metricType === '__pre_stretch__');
  const postStretchDone = dayMetrics.some(m => m.metricType === '__post_stretch__');
  const workoutDone = dayMetrics.some(m => m.metricType === '__workout_complete__');

  // Weekly completions
  const thisMonday = (() => {
    const d = new Date();
    const diff = d.getDay() === 0 ? 6 : d.getDay() - 1;
    d.setDate(d.getDate() - diff);
    return d.toISOString().split('T')[0];
  })();
  const weeklyCount = healthMetrics.filter(
    m => m.metricType === '__workout_complete__' && m.date >= thisMonday
  ).length;

  // Sets for a given exercise on the selected date
  const getSets = (name: string) =>
    dayMetrics
      .filter(m => m.metricType === name)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  // Log a metric
  const log = (metricType: string, value: number, unit: string, extra: object = {}) => {
    const m: HealthMetric = {
      id: `hm_${crypto.randomUUID()}`,
      residentId: '',
      date: selectedDate,
      metricType,
      value: String(value),
      unit,
      notes: JSON.stringify(extra),
      createdAt: new Date().toISOString(),
    };
    setModuleData('healthMetrics', [...healthMetrics, m]);
    SheetsService.append('HealthMetrics', m).catch(() => addToast('Sync failed', 'error'));
  };

  const deleteMetric = (id: string) => {
    setModuleData('healthMetrics', healthMetrics.filter(m => m.id !== id));
    SheetsService.deleteRow('HealthMetrics', id).catch(() => addToast('Sync failed', 'error'));
  };

  // Log a set for an exercise
  const logSet = (ex: ExerciseDef) => {
    const inp = setInputs[ex.name] || { weight: '', reps: '' };
    const existingSets = getSets(ex.name);
    const setNum = existingSets.length + 1;
    if (ex.unit === 'kg') {
      const w = parseFloat(inp.weight);
      const r = parseInt(inp.reps);
      if (isNaN(w) || isNaN(r) || r <= 0) { addToast('Enter weight and reps', 'error'); return; }
      log(ex.name, w, 'kg', { reps: r, set: setNum, workoutDay: workout.id });
    } else {
      const r = parseInt(inp.reps);
      if (isNaN(r) || r <= 0) { addToast('Enter rep count', 'error'); return; }
      log(ex.name, r, 'reps', { set: setNum, workoutDay: workout.id });
    }
    // Keep same values for next set convenience
    setSetInputs(prev => ({ ...prev, [ex.name]: inp }));
    addToast(`Set ${setNum} logged ✓`, 'success');
  };

  // Exercise names that have been logged (for history selector)
  const loggedExercises = useMemo(() => {
    const s = new Set(
      healthMetrics
        .filter(m => !m.metricType.startsWith('__'))
        .map(m => m.metricType)
    );
    // Add all PPL exercises so history always shows them
    PPL.forEach(day => day.exercises.forEach(ex => s.add(ex.name)));
    return Array.from(s).sort();
  }, [healthMetrics]);

  // History metrics for selected exercise
  const histMetrics = useMemo(() =>
    healthMetrics
      .filter(m => m.metricType === histEx)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [healthMetrics, histEx]
  );

  // Group history by date for sparkline
  const histByDate = useMemo(() => {
    const groups: Record<string, HealthMetric[]> = {};
    histMetrics.forEach(m => { (groups[m.date] ??= []).push(m); });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [histMetrics]);

  const sparkData = histByDate.slice(0, 14).reverse().map(([date, sets]) => {
    const maxW = Math.max(...sets.map(s => parseFloat(s.value) || 0));
    const totalReps = sets.reduce((acc, s) => acc + (parseNotes(s.notes).reps ?? (parseFloat(s.value) || 0)), 0);
    const vol = sets.reduce((acc, s) => {
      const n = parseNotes(s.notes);
      return acc + (parseFloat(s.value) || 0) * (n.reps ?? 1);
    }, 0);
    return { date, maxW, totalReps, vol };
  });
  const maxSpark = Math.max(...sparkData.map(s => s.maxW), 1);

  // Personal records
  const prs = useMemo(() => {
    const records: Record<string, { weight: number; date: string }> = {};
    histMetrics.forEach(m => {
      const w = parseFloat(m.value);
      if (!records[m.metricType] || w > records[m.metricType].weight) {
        records[m.metricType] = { weight: w, date: m.date };
      }
    });
    return records[histEx];
  }, [histMetrics, histEx]);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const totalSetsToday = workout.exercises.reduce((acc, ex) => acc + getSets(ex.name).length, 0);
  const totalSetsTarget = workout.exercises.reduce((acc, ex) => acc + ex.sets, 0);

  return (
    <>
      <PageHeader
        title="Gym"
        description={`${weeklyCount}/6 workouts this week`}
      />

      {/* Week strip */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 20 }}>
        {dayNames.map((d, i) => {
          const w = PPL[DOW_TO_IDX[i]];
          const isToday = i === TODAY_DOW;
          const done = healthMetrics.some(m => {
            const mDow = new Date(m.date + 'T12:00:00').getDay();
            return mDow === i && m.metricType === '__workout_complete__'
              && m.date >= thisMonday && m.date <= TODAY_DATE;
          });
          return (
            <div key={i} style={{
              flex: 1, textAlign: 'center', padding: '6px 2px',
              border: `2px solid ${isToday ? w.color : 'transparent'}`,
              borderRadius: 8,
              background: done ? `${w.color}22` : isToday ? `${w.color}11` : 'var(--bg-2)',
              cursor: 'pointer',
            }} onClick={() => {
              setView('today');
              // Set selected date to this weekday's date
              const now = new Date();
              const diff = i - now.getDay();
              const target = new Date(now);
              target.setDate(now.getDate() + diff);
              setSelectedDate(target.toISOString().split('T')[0]);
            }}>
              <div style={{ fontSize: 11, color: isToday ? w.color : 'var(--text-muted)', fontWeight: isToday ? 700 : 400 }}>{d}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>{w.type === 'rest' ? 'Rest' : w.id.replace(/\d/, ' ').trim()}</div>
              {done && <div style={{ fontSize: 8, color: w.color }}>✓</div>}
            </div>
          );
        })}
      </div>

      {/* Nav tabs */}
      <div className="tabs">
        {(['today', 'program', 'history'] as ViewType[]).map(v => (
          <button key={v} className={`tab ${view === v ? 'tab--active' : ''}`} onClick={() => setView(v)}>
            {v === 'today' ? "Today's Workout" : v === 'program' ? 'Program' : 'History'}
          </button>
        ))}
      </div>

      {/* ──────────── TODAY VIEW ──────────── */}
      {view === 'today' && (
        <div>
          {/* Date + workout header */}
          <div className="card" style={{ marginBottom: 16, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: workout.color }}>
                {workout.emoji} {workout.label}
              </div>
              {workout.type !== 'rest' && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                  {totalSetsToday}/{totalSetsTarget} sets logged
                  {workoutDone && <span style={{ color: '#2ecc71', marginLeft: 8 }}>✓ Complete</span>}
                </div>
              )}
            </div>
            <input
              type="date"
              className="form-input"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ width: 'auto', fontSize: 13 }}
            />
          </div>

          {/* Treadmill warm-up */}
          <div className="card" style={{ marginBottom: 12, borderLeft: `3px solid #f39c12` }}>
            <div className="section__title" style={{ marginBottom: 10 }}>
              🏃 Treadmill Warm-up
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>
                {workout.treadmin} min recommended
              </span>
              {treadmillEntry && (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#2ecc71' }}>
                  ✓ {treadmillEntry.value} min{treadmillEntry.notes ? (() => { try { const n = JSON.parse(treadmillEntry.notes); return n.distance ? ` · ${n.distance} km` : ''; } catch { return ''; } })() : ''}
                </span>
              )}
            </div>
            {!treadmillEntry ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Duration (min)"
                  value={treadDuration}
                  onChange={e => setTreadDuration(e.target.value)}
                  style={{ width: 140 }}
                />
                <input
                  type="number"
                  className="form-input"
                  placeholder="Distance km (opt)"
                  value={treadDistance}
                  onChange={e => setTreadDistance(e.target.value)}
                  style={{ width: 160 }}
                />
                {[5, 10, 15, 20].map(t => (
                  <button key={t} className="btn btn--secondary btn--sm" onClick={() => setTreadDuration(String(t))}>{t}m</button>
                ))}
                <button className="btn btn--primary btn--sm" onClick={() => {
                  const d = parseFloat(treadDuration);
                  if (isNaN(d)) return;
                  const extra: { workoutDay: string; distance?: number } = { workoutDay: workout.id };
                  if (treadDistance) extra.distance = parseFloat(treadDistance);
                  log('__treadmill__', d, 'min', extra);
                  addToast('Treadmill logged ✓', 'success');
                }}>Log</button>
              </div>
            ) : (
              <button className="btn btn--ghost btn--sm" onClick={() => deleteMetric(treadmillEntry.id)} style={{ fontSize: 11 }}>
                undo
              </button>
            )}
          </div>

          {/* Pre-stretch */}
          <div className="card" style={{ marginBottom: 12, borderLeft: `3px solid #9b59b6` }}>
            <div className="section__title" style={{ marginBottom: 10 }}>
              🧘 Pre-workout Stretches
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>
                ~{workout.preStretchMin} min dynamic
              </span>
              {preStretchDone && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#2ecc71' }}>✓ Done</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
              {workout.preStretches.map((s, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 6 }}>
                  <span style={{ color: 'var(--text-muted)', minWidth: 16 }}>{i + 1}.</span>
                  {s}
                </div>
              ))}
            </div>
            {!preStretchDone ? (
              <button className="btn btn--secondary btn--sm" onClick={() => {
                log('__pre_stretch__', workout.preStretchMin, 'min', { workoutDay: workout.id });
                addToast('Pre-stretch logged ✓', 'success');
              }}>Mark Done</button>
            ) : (
              <button className="btn btn--ghost btn--sm" onClick={() => {
                const e = dayMetrics.find(m => m.metricType === '__pre_stretch__');
                if (e) deleteMetric(e.id);
              }} style={{ fontSize: 11 }}>undo</button>
            )}
          </div>

          {/* Exercises */}
          {workout.type === 'rest' ? (
            <div className="empty-state">
              <div className="empty-state__icon">😴</div>
              <div className="empty-state__text">Rest Day</div>
              <div className="empty-state__sub">Recovery is where the gains happen. Light walk + full stretch above.</div>
            </div>
          ) : (
            <>
              <div className="section__title">💪 Exercises</div>
              {workout.exercises.map(ex => {
                const sets = getSets(ex.name);
                const inp = setInputs[ex.name] || { weight: '', reps: '' };
                const lastSet = sets[sets.length - 1];
                const lastWeight = lastSet ? lastSet.value : '';
                const lastReps = lastSet ? String(parseNotes(lastSet.notes).reps ?? lastSet.value) : '';
                const done = sets.length >= ex.sets;
                return (
                  <div key={ex.name} className="card" style={{
                    marginBottom: 10, padding: '14px 16px',
                    borderLeft: `3px solid ${done ? '#2ecc71' : workout.color}`,
                    opacity: done ? 0.85 : 1,
                  }}>
                    {/* Exercise header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{ex.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                          {ex.sets} × {ex.reps} {ex.unit === 'kg' ? 'kg' : 'reps'}
                        </span>
                      </div>
                      <span style={{
                        fontSize: 12, fontWeight: 700,
                        color: done ? '#2ecc71' : sets.length > 0 ? '#f39c12' : 'var(--text-muted)',
                      }}>
                        {sets.length}/{ex.sets} sets {done ? '✓' : ''}
                      </span>
                    </div>

                    {/* Logged sets chips */}
                    {sets.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                        {sets.map((s, i) => {
                          const n = parseNotes(s.notes);
                          const label = ex.unit === 'kg'
                            ? `${s.value}kg × ${n.reps ?? '?'}`
                            : `${s.value} reps`;
                          return (
                            <div key={s.id} style={{
                              display: 'flex', alignItems: 'center', gap: 3,
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid var(--border-0)',
                              borderRadius: 6, padding: '2px 8px', fontSize: 11,
                            }}>
                              <span style={{ color: 'var(--text-muted)', marginRight: 2 }}>{i + 1}.</span>
                              <span style={{ fontWeight: 600 }}>{label}</span>
                              <button
                                onClick={() => deleteMetric(s.id)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: '0 0 0 4px', fontSize: 10, lineHeight: 1 }}
                              >×</button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Log next set */}
                    {!done && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {ex.unit === 'kg' && (
                          <input
                            type="number"
                            className="form-input"
                            placeholder={lastWeight || 'Weight kg'}
                            value={inp.weight}
                            onChange={e => setSetInputs(p => ({ ...p, [ex.name]: { ...inp, weight: e.target.value } }))}
                            style={{ width: 110 }}
                            onKeyDown={e => e.key === 'Enter' && logSet(ex)}
                          />
                        )}
                        <input
                          type="number"
                          className="form-input"
                          placeholder={lastReps || 'Reps'}
                          value={inp.reps}
                          onChange={e => setSetInputs(p => ({ ...p, [ex.name]: { ...inp, reps: e.target.value } }))}
                          style={{ width: 90 }}
                          onKeyDown={e => e.key === 'Enter' && logSet(ex)}
                        />
                        <button className="btn btn--primary btn--sm" onClick={() => logSet(ex)}>
                          Log Set {sets.length + 1}
                        </button>
                        {/* Quick-fill last set */}
                        {lastWeight && ex.unit === 'kg' && (
                          <button className="btn btn--secondary btn--sm" onClick={() => {
                            setSetInputs(p => ({ ...p, [ex.name]: { weight: lastWeight, reps: lastReps } }));
                          }}>
                            Same as last
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* Post-stretch */}
          {workout.postStretches.length > 0 && (
            <div className="card" style={{ marginBottom: 12, borderLeft: `3px solid #9b59b6` }}>
              <div className="section__title" style={{ marginBottom: 10 }}>
                🧘 Post-workout Stretches
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>
                  ~{workout.postStretchMin} min static
                </span>
                {postStretchDone && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#2ecc71' }}>✓ Done</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                {workout.postStretches.map((s, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 6 }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: 16 }}>{i + 1}.</span>
                    {s}
                  </div>
                ))}
              </div>
              {!postStretchDone ? (
                <button className="btn btn--secondary btn--sm" onClick={() => {
                  log('__post_stretch__', workout.postStretchMin, 'min', { workoutDay: workout.id });
                  addToast('Post-stretch logged ✓', 'success');
                }}>Mark Done</button>
              ) : (
                <button className="btn btn--ghost btn--sm" onClick={() => {
                  const e = dayMetrics.find(m => m.metricType === '__post_stretch__');
                  if (e) deleteMetric(e.id);
                }} style={{ fontSize: 11 }}>undo</button>
              )}
            </div>
          )}

          {/* Complete workout */}
          {workout.type !== 'rest' && (
            <div style={{ marginTop: 16, marginBottom: 32 }}>
              {!workoutDone ? (
                <button
                  className="btn btn--primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, background: workout.color }}
                  onClick={() => {
                    log('__workout_complete__', 1, 'session', { workoutDay: workout.id, setsLogged: totalSetsToday });
                    addToast('Workout complete! Great work 💪', 'success');
                  }}
                >
                  ✓ Complete Workout ({totalSetsToday}/{totalSetsTarget} sets)
                </button>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px', color: '#2ecc71', fontSize: 15, fontWeight: 600 }}>
                  🏆 Workout Complete! {totalSetsToday} sets logged
                  <div>
                    <button className="btn btn--ghost btn--sm" onClick={() => {
                      const e = dayMetrics.find(m => m.metricType === '__workout_complete__');
                      if (e) deleteMetric(e.id);
                    }} style={{ fontSize: 11, marginTop: 4 }}>undo</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ──────────── PROGRAM VIEW ──────────── */}
      {view === 'program' && (
        <div>
          {/* Day selector */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
            {PPL.map((w, i) => (
              <button
                key={i}
                className={`btn btn--sm ${programDayIdx === i ? 'btn--primary' : 'btn--secondary'}`}
                style={programDayIdx === i ? { background: w.color } : {}}
                onClick={() => setProgramDayIdx(i)}
              >
                {i === 0 ? 'Sun/Rest' : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i - 1]} · {w.id.replace('1', ' A').replace('2', ' B').replace('rest', 'Rest').toUpperCase()}
              </button>
            ))}
          </div>

          {/* Selected day details */}
          {(() => {
            const w = PPL[programDayIdx];
            return (
              <div>
                <div className="card" style={{ marginBottom: 16, borderLeft: `3px solid ${w.color}` }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: w.color, marginBottom: 4 }}>{w.emoji} {w.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    🏃 {w.treadmin}m treadmill · 🧘 {w.preStretchMin}m pre-stretch · 🧘 {w.postStretchMin}m post-stretch
                  </div>
                </div>

                {w.exercises.length > 0 ? (
                  <>
                    <div className="section__title">Exercises</div>
                    <div className="card" style={{ padding: 0, marginBottom: 16 }}>
                      {w.exercises.map((ex, i) => (
                        <div key={ex.name} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 16px', borderBottom: i < w.exercises.length - 1 ? '1px solid var(--border-0)' : 'none',
                        }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: 12, minWidth: 20 }}>{i + 1}.</span>
                          <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{ex.name}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ex.sets} × {ex.reps}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ex.unit}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}

                <div className="section__title">Pre-workout Stretches</div>
                <div className="card" style={{ marginBottom: 16 }}>
                  {w.preStretches.map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '4px 0', display: 'flex', gap: 8 }}>
                      <span style={{ color: 'var(--text-muted)', minWidth: 20 }}>{i + 1}.</span>{s}
                    </div>
                  ))}
                </div>

                {w.postStretches.length > 0 && (
                  <>
                    <div className="section__title">Post-workout Stretches</div>
                    <div className="card">
                      {w.postStretches.map((s, i) => (
                        <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '4px 0', display: 'flex', gap: 8 }}>
                          <span style={{ color: 'var(--text-muted)', minWidth: 20 }}>{i + 1}.</span>{s}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ──────────── HISTORY VIEW ──────────── */}
      {view === 'history' && (
        <div>
          {/* Exercise picker */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section__title" style={{ marginBottom: 10 }}>Exercise</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {loggedExercises.map(ex => (
                <button
                  key={ex}
                  className={`btn btn--sm ${histEx === ex ? 'btn--primary' : 'btn--secondary'}`}
                  onClick={() => setHistEx(ex)}
                  style={{ fontSize: 11 }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* PR card */}
          {prs && (
            <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid #f39c12' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Personal Record</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#f39c12' }}>
                {prs.weight}{histMetrics[0]?.unit ? ` ${histMetrics[0].unit}` : ''}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{prs.date}</div>
            </div>
          )}

          {/* Sparkline */}
          {sparkData.length > 1 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="section__title" style={{ marginBottom: 8 }}>Weight Trend (last {sparkData.length} sessions)</div>
              <div className="sparkline-modern" style={{ height: 64 }}>
                {sparkData.map((d, i) => (
                  <div
                    key={i}
                    className="sparkline-modern__bar"
                    style={{ height: `${(d.maxW / maxSpark) * 100}%` }}
                    title={`${d.date}: ${d.maxW}kg max · ${d.totalReps} total reps`}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--text-muted)' }}>
                <span>{sparkData[0]?.date}</span>
                <span>{sparkData[sparkData.length - 1]?.date}</span>
              </div>
            </div>
          )}

          {/* Session history */}
          <div className="section__title">{histEx} — All Sessions ({histByDate.length})</div>
          {histByDate.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">🏋️</div>
              <div className="empty-state__text">No data for {histEx}</div>
              <div className="empty-state__sub">Log sets in Today's Workout to see history</div>
            </div>
          ) : (
            histByDate.slice(0, 20).map(([date, sets]) => {
              const maxW = Math.max(...sets.map(s => parseFloat(s.value) || 0));
              const totalVol = sets.reduce((acc, s) => {
                const n = parseNotes(s.notes);
                return acc + (parseFloat(s.value) || 0) * (n.reps ?? 1);
              }, 0);
              return (
                <div key={date} className="card" style={{ marginBottom: 8, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{date}</span>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{sets.length} sets</span>
                      <span style={{ color: '#f39c12' }}>max {maxW}{sets[0]?.unit}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{totalVol.toFixed(0)} vol</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {sets.map((s, i) => {
                      const n = parseNotes(s.notes);
                      const label = s.unit === 'kg'
                        ? `${s.value}kg × ${n.reps ?? '?'}`
                        : `${s.value} reps`;
                      return (
                        <div key={s.id} style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border-0)',
                          borderRadius: 5, padding: '2px 8px',
                          fontSize: 11, display: 'flex', gap: 4, alignItems: 'center',
                        }}>
                          <span style={{ color: 'var(--text-muted)' }}>{i + 1}.</span>
                          <span style={{ fontWeight: 600 }}>{label}</span>
                          <button
                            onClick={() => deleteMetric(s.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: 0, fontSize: 10 }}
                          >×</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </>
  );
}
