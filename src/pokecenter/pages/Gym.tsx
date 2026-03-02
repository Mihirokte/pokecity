import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
  treadmin: number;
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
  {
    id: 'rest', label: 'Rest / Recovery', type: 'rest', color: '#6c757d', emoji: '😴',
    treadmin: 20, preStretchMin: 15, postStretchMin: 0,
    preStretches: ['Light walk 20 min', 'Hip circles (10 each)', 'Shoulder rolls (10)', 'Cat-cow (10)', 'World\'s greatest stretch (5 each)', 'Pigeon pose (30s each)', 'Lying quad stretch (30s each)', 'Child\'s pose (60s)'],
    postStretches: [],
    exercises: [],
  },
  {
    id: 'push1', label: 'Push A — Chest / Shoulders / Triceps', type: 'push', color: '#e74c3c', emoji: '🔴',
    treadmin: 10, preStretchMin: 5, postStretchMin: 5,
    preStretches: ['Arm circles forward 20s', 'Arm circles backward 20s', 'Chest opener stretch 20s', 'Shoulder cross-body 20s each', 'Band pull-aparts 15 reps', 'Push-up shoulder taps 10'],
    postStretches: ['Doorway chest stretch 30s', 'Overhead tricep stretch 30s each', 'Cross-body shoulder 30s each', 'Sleeper stretch 30s each'],
    exercises: [
      { name: 'Bench Press', sets: 4, reps: '6-8', unit: 'kg' },
      { name: 'Incline DB Press', sets: 4, reps: '8-12', unit: 'kg' },
      { name: 'Cable Fly', sets: 3, reps: '12-15', unit: 'kg' },
      { name: 'Overhead Press', sets: 4, reps: '8-12', unit: 'kg' },
      { name: 'Lateral Raise', sets: 4, reps: '12-15', unit: 'kg' },
      { name: 'Tricep Pushdown', sets: 3, reps: '12-15', unit: 'kg' },
    ],
  },
  {
    id: 'pull1', label: 'Pull A — Back / Biceps', type: 'pull', color: '#3498db', emoji: '🔵',
    treadmin: 10, preStretchMin: 5, postStretchMin: 5,
    preStretches: ['Arm circles 20s each', 'Band pull-aparts 15 reps', 'Cat-cow 10 reps', 'Bodyweight hip hinge 10', 'Dead hang 20s', 'Wrist circles 10 each direction'],
    postStretches: ['Lat stretch on bar 30s each', 'Child\'s pose 45s', 'Bicep wall stretch 30s each', 'Thoracic rotation 10 each'],
    exercises: [
      { name: 'Deadlift', sets: 4, reps: '5', unit: 'kg' },
      { name: 'Pull-ups', sets: 4, reps: '8-12', unit: 'reps' },
      { name: 'Barbell Row', sets: 4, reps: '8-12', unit: 'kg' },
      { name: 'Seated Cable Row', sets: 3, reps: '12-15', unit: 'kg' },
      { name: 'Face Pull', sets: 3, reps: '15-20', unit: 'kg' },
      { name: 'Barbell Curl', sets: 3, reps: '10-12', unit: 'kg' },
    ],
  },
  {
    id: 'legs1', label: 'Legs A — Quads / Hams / Glutes', type: 'legs', color: '#2ecc71', emoji: '🟢',
    treadmin: 10, preStretchMin: 7, postStretchMin: 10,
    preStretches: ['Leg swings forward 10 each', 'Leg swings lateral 10 each', 'Hip circles 10 each', 'Bodyweight squat 10', 'Reverse lunge 5 each', 'Walking quad pull 5 each', 'Sumo squat hold 30s'],
    postStretches: ['Pigeon pose 45s each', 'Standing quad stretch 30s each', 'Standing hamstring 30s each', 'Hip flexor lunge 30s each', 'Seated figure-4 30s each', 'Calf stretch on wall 30s each'],
    exercises: [
      { name: 'Squat', sets: 4, reps: '6-8', unit: 'kg' },
      { name: 'Romanian Deadlift', sets: 4, reps: '8-12', unit: 'kg' },
      { name: 'Leg Press', sets: 3, reps: '10-15', unit: 'kg' },
      { name: 'Leg Curl', sets: 3, reps: '12-15', unit: 'kg' },
      { name: 'Leg Extension', sets: 3, reps: '15', unit: 'kg' },
      { name: 'Standing Calf Raise', sets: 4, reps: '15-20', unit: 'kg' },
    ],
  },
  {
    id: 'push2', label: 'Push B — Volume / Shoulders', type: 'push', color: '#e74c3c', emoji: '🔴',
    treadmin: 10, preStretchMin: 5, postStretchMin: 5,
    preStretches: ['Arm circles forward 20s', 'Arm circles backward 20s', 'Chest opener stretch 20s', 'Band pull-aparts 15 reps', 'Inchworm push-up 5', 'Shoulder rotations 10 each'],
    postStretches: ['Doorway chest stretch 30s', 'Overhead tricep stretch 30s each', 'Cross-body shoulder 30s each', 'Neck rolls 30s'],
    exercises: [
      { name: 'Incline BB Press', sets: 4, reps: '8-12', unit: 'kg' },
      { name: 'Flat DB Press', sets: 4, reps: '10-12', unit: 'kg' },
      { name: 'Cable Crossover', sets: 3, reps: '15', unit: 'kg' },
      { name: 'DB Shoulder Press', sets: 4, reps: '10-12', unit: 'kg' },
      { name: 'Cable Lateral Raise', sets: 3, reps: '15-20', unit: 'kg' },
      { name: 'Overhead Tricep Ext', sets: 3, reps: '12-15', unit: 'kg' },
    ],
  },
  {
    id: 'pull2', label: 'Pull B — Back Width / Biceps', type: 'pull', color: '#3498db', emoji: '🔵',
    treadmin: 10, preStretchMin: 5, postStretchMin: 5,
    preStretches: ['Dead hang 20s', 'Arm circles 20s each', 'Cat-cow 10 reps', 'Band pull-aparts 15 reps', 'Bodyweight hip hinge 10', 'Wrist figure-eights 10s'],
    postStretches: ['Lat stretch on bar 30s each', 'Child\'s pose 45s', 'Bicep wall stretch 30s each', 'Upper back foam roll 60s'],
    exercises: [
      { name: 'Weighted Pull-ups', sets: 4, reps: '6-10', unit: 'kg' },
      { name: 'T-Bar Row', sets: 4, reps: '10-12', unit: 'kg' },
      { name: 'Single-arm DB Row', sets: 3, reps: '12-15', unit: 'kg' },
      { name: 'Lat Pulldown', sets: 3, reps: '12-15', unit: 'kg' },
      { name: 'Rope Face Pull', sets: 3, reps: '20', unit: 'kg' },
      { name: 'Incline Curl', sets: 3, reps: '12', unit: 'kg' },
    ],
  },
  {
    id: 'legs2', label: 'Legs B — Glutes / Volume', type: 'legs', color: '#2ecc71', emoji: '🟢',
    treadmin: 10, preStretchMin: 7, postStretchMin: 10,
    preStretches: ['Leg swings forward 10 each', 'Leg swings lateral 10 each', 'Hip circles 10 each', 'Glute bridge 10', 'Clamshells 10 each', 'Lateral band walk 10 each', 'Deep squat hold 30s'],
    postStretches: ['Pigeon pose 45s each', 'Standing quad stretch 30s each', 'Lying glute stretch 30s each', 'Hip flexor lunge 30s each', 'Butterfly stretch 30s', 'Calf stretch on wall 30s each'],
    exercises: [
      { name: 'Hack Squat', sets: 4, reps: '8-12', unit: 'kg' },
      { name: 'Hip Thrust', sets: 4, reps: '12-15', unit: 'kg' },
      { name: 'Lunges', sets: 3, reps: '12/leg', unit: 'kg' },
      { name: 'Nordic Curl', sets: 3, reps: '8-10', unit: 'reps' },
      { name: 'Seated Leg Curl', sets: 3, reps: '15', unit: 'kg' },
      { name: 'Seated Calf Raise', sets: 4, reps: '20', unit: 'kg' },
    ],
  },
];

const DOW_TO_IDX = [0, 1, 2, 3, 4, 5, 6];
const TODAY_DATE = new Date().toISOString().split('T')[0];
const TODAY_DOW = new Date().getDay();

// ── Quick Value Buttons ───────────────────────────────────────────────────────
const QUICK_WEIGHTS = [20, 30, 40, 50, 60, 70, 80];
const QUICK_REPS = [6, 8, 10, 12, 15, 20];

// ── Haptic Feedback Helper ───────────────────────────────────────────────────
function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'light') {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    const durations = { light: 10, medium: 20, heavy: 40 };
    navigator.vibrate(durations[type]);
  }
}

// ── Reusable Components ─────────────────────────────────────────────────────

// Compact input with quick buttons
function QuickInput({ 
  value, 
  onChange, 
  placeholder, 
  unit,
  quickValues,
  onQuickSelect,
  onEnter,
  inputMode = 'numeric'
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  unit?: string;
  quickValues?: number[];
  onQuickSelect?: (v: number) => void;
  onEnter?: () => void;
  inputMode?: 'numeric' | 'text';
}) {
  const [showQuick, setShowQuick] = useState(false);
  
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type={inputMode === 'numeric' ? 'number' : 'text'}
          inputMode={inputMode}
          className="form-input"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onEnter?.()}
          style={{ 
            width: '100%', 
            minWidth: 0,
            padding: '8px 10px',
            fontSize: 15,
            height: 40,
          }}
        />
        {quickValues && quickValues.length > 0 && (
          <button
            type="button"
            onClick={() => setShowQuick(!showQuick)}
            style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--border-0)',
              borderRadius: 8,
              padding: '8px 6px',
              color: 'var(--text-muted)',
              fontSize: 11,
              cursor: 'pointer',
              minWidth: 32,
              height: 40,
            }}
          >
            ⚡
          </button>
        )}
      </div>
      {showQuick && quickValues && (
        <div style={{
          display: 'flex',
          gap: 4,
          flexWrap: 'wrap',
          marginTop: 6,
          padding: 8,
          background: 'var(--bg-2)',
          borderRadius: 8,
        }}>
          {quickValues.map(v => (
            <button
              key={v}
              type="button"
              onClick={() => {
                onQuickSelect?.(v);
                setShowQuick(false);
                triggerHaptic('light');
              }}
              style={{
                background: value === String(v) ? 'var(--primary)' : 'var(--bg-1)',
                border: '1px solid var(--border-0)',
                borderRadius: 6,
                padding: '4px 10px',
                color: value === String(v) ? '#fff' : 'var(--text-primary)',
                fontSize: 13,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {v}{unit || ''}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Exercise card with compact logging
function ExerciseCard({ 
  exercise, 
  sets, 
  lastValues,
  onLogSet,
  onDeleteSet,
  color 
}: { 
  exercise: ExerciseDef;
  sets: HealthMetric[];
  lastValues: { weight: string; reps: string };
  onLogSet: (weight: string, reps: string) => void;
  onDeleteSet: (id: string) => void;
  color: string;
}) {
  const [weight, setWeight] = useState(lastValues.weight);
  const [reps, setReps] = useState(lastValues.reps);
  const done = sets.length >= exercise.sets;
  
  // Auto-fill from last set
  useEffect(() => {
    if (!weight && lastValues.weight) setWeight(lastValues.weight);
    if (!reps && lastValues.reps) setReps(lastValues.reps);
  }, [lastValues]);

  const handleLog = () => {
    if (!weight && exercise.unit === 'kg') return;
    if (!reps) return;
    onLogSet(weight, reps);
    triggerHaptic('medium');
  };

  return (
    <div style={{
background: 'var(--bg-1)',
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      borderLeft: `3px solid ${done ? '#2ecc71' : color}`,
      opacity: done ? 0.85 : 1,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{exercise.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {exercise.sets} × {exercise.reps} {exercise.unit === 'kg' ? 'kg' : 'reps'}
          </div>
        </div>
        <div style={{
          background: done ? '#2ecc71' : sets.length > 0 ? '#f39c12' : 'var(--bg-2)',
          color: '#fff',
          padding: '4px 10px',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 700,
        }}>
          {sets.length}/{exercise.sets}
        </div>
      </div>

      {/* Set chips */}
      {sets.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
          {sets.map((s, i) => {
            const n = parseNotes(s.notes);
            const label = exercise.unit === 'kg'
              ? `${s.value}kg × ${n.reps ?? '?'}`
              : `${s.value} reps`;
            return (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-0)',
                borderRadius: 8, padding: '4px 8px', fontSize: 12,
              }}>
                <span style={{ color: 'var(--text-muted)' }}>{i + 1}.</span>
                <span style={{ fontWeight: 600 }}>{label}</span>
                <button
                  onClick={() => onDeleteSet(s.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: 0, cursor: 'pointer', fontSize: 14 }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick log inputs */}
      {!done && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
          {exercise.unit === 'kg' && (
            <QuickInput
              value={weight}
              onChange={setWeight}
              placeholder="kg"
              unit="kg"
              quickValues={QUICK_WEIGHTS}
              onQuickSelect={v => setWeight(String(v))}
              onEnter={handleLog}
            />
          )}
          <QuickInput
            value={reps}
            onChange={setReps}
            placeholder="Reps"
            quickValues={QUICK_REPS}
            onQuickSelect={v => setReps(String(v))}
            onEnter={handleLog}
          />
          <button
            onClick={handleLog}
            disabled={!reps || (exercise.unit === 'kg' && !weight)}
            style={{
              background: (!reps || (exercise.unit === 'kg' && !weight)) ? 'var(--bg-2)' : 'var(--primary)',
              border: 'none',
              borderRadius: 10,
              padding: '0 16px',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              minWidth: 70,
              height: 40,
              transition: 'transform 0.1s',
            }}
          >
            ✓ Log
          </button>
        </div>
      )}

      {/* Same as last button */}
      {!done && lastValues.weight && exercise.unit === 'kg' && (
        <button
          onClick={() => { setWeight(lastValues.weight); setReps(lastValues.reps); triggerHaptic('light'); }}
          style={{
            background: 'none',
            border: '1px dashed var(--border-0)',
            borderRadius: 6,
            padding: '4px 8px',
            marginTop: 8,
            color: 'var(--text-muted)',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          ↺ Same as last ({lastValues.weight}kg × {lastValues.reps})
        </button>
      )}
    </div>
  );
}

// Compact stretch card
function StretchCard({ 
  title, 
  stretches, 
  done, 
  onToggle,
  color 
}: { 
  title: string;
  stretches: string[];
  done: boolean;
  onToggle: () => void;
  color: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: 'var(--bg-1)',
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      borderLeft: `3px solid ${done ? '#2ecc71' : color}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>
          {title}
          {done && <span style={{ color: '#2ecc71', marginLeft: 8 }}>✓ Done</span>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'var(--bg-2)',
              border: 'none',
              borderRadius: 6,
              padding: '4px 10px',
              color: 'var(--text-muted)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {expanded ? 'Hide' : 'Show'}
          </button>
          <button
            onClick={() => { onToggle(); triggerHaptic(done ? 'light' : 'medium'); }}
            style={{
              background: done ? 'var(--bg-2)' : color,
              border: 'none',
              borderRadius: 6,
              padding: '4px 12px',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {done ? 'Undo' : 'Done'}
          </button>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {stretches.map((s, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 6 }}>
              <span style={{ color: 'var(--text-muted)', minWidth: 16 }}>{i + 1}.</span>
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Treadmill quick log
function TreadmillCard({ 
  logged, 
  onLog, 
  onDelete,
  defaultDuration = 10 
}: { 
  logged: HealthMetric | undefined;
  onLog: (duration: number, distance?: number) => void;
  onDelete: () => void;
  defaultDuration?: number;
}) {
  const [duration, setDuration] = useState(String(defaultDuration));

  return (
    <div style={{
      background: 'var(--bg-1)',
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      borderLeft: '3px solid #f39c12',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>🏃 Treadmill</div>
        {logged && (
          <span style={{ color: '#2ecc71', fontSize: 12 }}>
            ✓ {logged.value} min
          </span>
        )}
      </div>
      
      {!logged ? (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <QuickInput
            value={duration}
            onChange={setDuration}
            placeholder="min"
            quickValues={[5, 10, 15, 20, 30]}
            onQuickSelect={v => setDuration(String(v))}
          />
          <button
            onClick={() => { onLog(parseInt(duration)); triggerHaptic('medium'); }}
            style={{
              background: '#f39c12',
              border: 'none',
              borderRadius: 10,
              padding: '0 14px',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              height: 40,
            }}
          >
            Log
          </button>
        </div>
      ) : (
        <button
          onClick={() => { onDelete(); triggerHaptic('light'); }}
          style={{
            background: 'none',
            border: '1px solid var(--border-0)',
            borderRadius: 6,
            padding: '4px 10px',
            color: 'var(--text-muted)',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          Undo
        </button>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
type ViewType = 'today' | 'program' | 'history';

export function Gym() {
  const healthMetrics = useCityStore(s => s.moduleData.healthMetrics);
  const setModuleData = useCityStore(s => s.setModuleData);
  const addToast = useUIStore(s => s.addToast);

  const [view, setView] = useState<ViewType>('today');
  const [selectedDate, setSelectedDate] = useState(TODAY_DATE);
  const [programDayIdx, setProgramDayIdx] = useState(DOW_TO_IDX[TODAY_DOW]);
  
  // Quick inputs per exercise (ephemeral)
  const [, setSetInputs] = useState<Record<string, { weight: string; reps: string }>>({});
  
  // History exercise filter
  const [histEx, setHistEx] = useState('Bench Press');

  // Rest timer state
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer effect
  useEffect(() => {
    if (restTimer && restTimeLeft > 0) {
      timerRef.current = setInterval(() => {
        setRestTimeLeft(t => {
          if (t <= 1) {
            triggerHaptic('heavy');
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [restTimer, restTimeLeft]);

  const startRestTimer = (seconds: number = 90) => {
    setRestTimer(seconds);
    setRestTimeLeft(seconds);
  };

  const stopRestTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRestTimer(null);
    setRestTimeLeft(0);
  };

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
  const getSets = useCallback((name: string) =>
    dayMetrics
      .filter(m => m.metricType === name)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [dayMetrics]
  );

  // Get last logged values for an exercise (for quick fill)
  const getLastValues = useCallback((name: string) => {
    const allForEx = healthMetrics.filter(m => m.metricType === name);
    if (allForEx.length === 0) return { weight: '', reps: '' };
    const last = allForEx.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const n = parseNotes(last.notes);
    return { weight: last.value, reps: String(n.reps ?? '') };
  }, [healthMetrics]);

  // Log a metric
  const log = useCallback((metricType: string, value: number, unit: string, extra: object = {}) => {
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
  }, [selectedDate, healthMetrics, setModuleData, addToast]);

  const deleteMetric = useCallback((id: string) => {
    setModuleData('healthMetrics', healthMetrics.filter(m => m.id !== id));
    SheetsService.deleteRow('HealthMetrics', id).catch(() => addToast('Sync failed', 'error'));
  }, [healthMetrics, setModuleData, addToast]);

  // Log a set for an exercise
  const logSet = useCallback((ex: ExerciseDef, weight: string, reps: string) => {
    const existingSets = getSets(ex.name);
    const setNum = existingSets.length + 1;
    
    if (ex.unit === 'kg') {
      const w = parseFloat(weight);
      const r = parseInt(reps);
      if (isNaN(w) || isNaN(r) || r <= 0) { addToast('Enter weight and reps', 'error'); return; }
      log(ex.name, w, 'kg', { reps: r, set: setNum, workoutDay: workout.id });
    } else {
      const r = parseInt(reps);
      if (isNaN(r) || r <= 0) { addToast('Enter rep count', 'error'); return; }
      log(ex.name, r, 'reps', { set: setNum, workoutDay: workout.id });
    }
    
    // Auto-start rest timer
    startRestTimer();
    
    // Keep same values for next set
    setSetInputs(prev => ({ ...prev, [ex.name]: { weight, reps } }));
    addToast(`Set ${setNum} logged ✓`, 'success');
  }, [getSets, workout.id, log, addToast]);

  // Exercise names that have been logged
  const loggedExercises = useMemo(() => {
    const s = new Set(
      healthMetrics
        .filter(m => !m.metricType.startsWith('__'))
        .map(m => m.metricType)
    );
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

  // Group history by date
  const histByDate = useMemo(() => {
    const groups: Record<string, HealthMetric[]> = {};
    histMetrics.forEach(m => { (groups[m.date] ??= []).push(m); });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [histMetrics]);

  const sparkData = histByDate.slice(0, 14).reverse().map(([date, sets]) => {
    const maxW = Math.max(...sets.map(s => parseFloat(s.value) || 0));
    const totalReps = sets.reduce((acc, s) => acc + (parseNotes(s.notes).reps ?? (parseFloat(s.value) || 0)), 0);
    return { date, maxW, totalReps };
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

      {/* Rest Timer Overlay */}
      {restTimeLeft > 0 && (
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '10px 16px',
          marginBottom: 12,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
        }}>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>
            ⏱️ Rest: {Math.floor(restTimeLeft / 60)}:{(restTimeLeft % 60).toString().padStart(2, '0')}
          </div>
          <button
            onClick={stopRestTimer}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: 6,
              padding: '4px 12px',
              color: '#fff',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Skip
          </button>
        </div>
      )}

      {/* Week strip */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
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
              flex: 1, textAlign: 'center', padding: '8px 4px',
              border: `2px solid ${isToday ? w.color : 'transparent'}`,
              borderRadius: 10,
              background: done ? `${w.color}22` : isToday ? `${w.color}11` : 'var(--bg-2)',
              cursor: 'pointer',
              minHeight: 54,
            }} onClick={() => {
              setView('today');
              const now = new Date();
              const diff = i - now.getDay();
              const target = new Date(now);
              target.setDate(now.getDate() + diff);
              setSelectedDate(target.toISOString().split('T')[0]);
            }}>
              <div style={{ fontSize: 11, color: isToday ? w.color : 'var(--text-muted)', fontWeight: isToday ? 700 : 400 }}>{d}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                {w.type === 'rest' ? 'Rest' : w.id.replace(/\d/, ' ').trim()}
              </div>
              {done && <div style={{ fontSize: 10, color: w.color, marginTop: 2 }}>✓</div>}
            </div>
          );
        })}
      </div>

      {/* Nav tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {(['today', 'program', 'history'] as ViewType[]).map(v => (
          <button key={v} className={`tab ${view === v ? 'tab--active' : ''}`} onClick={() => setView(v)}>
            {v === 'today' ? "Today's" : v === 'program' ? 'Program' : 'History'}
          </button>
        ))}
      </div>

      {/* ──────────── TODAY VIEW ──────────── */}
      {view === 'today' && (
        <div>
          {/* Workout header */}
          <div style={{ 
            background: 'var(--bg-1)', 
            borderRadius: 16, 
            padding: '14px 16px', 
            marginBottom: 12,
            borderLeft: `3px solid ${workout.color}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17, color: workout.color }}>
                  {workout.emoji} {workout.label}
                </div>
                {workout.type !== 'rest' && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {totalSetsToday}/{totalSetsTarget} sets
                    {workoutDone && <span style={{ color: '#2ecc71', marginLeft: 8 }}>✓ Complete</span>}
                  </div>
                )}
              </div>
              <input
                type="date"
                className="form-input"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ width: 'auto', fontSize: 12, padding: '6px 8px' }}
              />
            </div>
          </div>

          {/* Treadmill */}
          <TreadmillCard
            logged={treadmillEntry}
            onLog={(d, dist) => log('__treadmill__', d, 'min', { workoutDay: workout.id, distance: dist })}
            onDelete={() => treadmillEntry && deleteMetric(treadmillEntry.id)}
          />

          {/* Pre-stretch */}
          <StretchCard
            title="🧘 Pre-workout Stretches"
            stretches={workout.preStretches}
            done={preStretchDone}
            onToggle={() => preStretchDone 
              ? deleteMetric(dayMetrics.find(m => m.metricType === '__pre_stretch__')?.id || '')
              : log('__pre_stretch__', workout.preStretchMin, 'min', { workoutDay: workout.id })
            }
            color="#9b59b6"
          />

          {/* Exercises */}
          {workout.type === 'rest' ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>😴</div>
              <div style={{ fontWeight: 600 }}>Rest Day</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Recovery is where the gains happen.</div>
            </div>
          ) : (
            workout.exercises.map(ex => (
              <ExerciseCard
                key={ex.name}
                exercise={ex}
                sets={getSets(ex.name)}
                lastValues={getLastValues(ex.name)}
                onLogSet={(w, r) => logSet(ex, w, r)}
                onDeleteSet={deleteMetric}
                color={workout.color}
              />
            ))
          )}

          {/* Post-stretch */}
          {workout.postStretches.length > 0 && (
            <StretchCard
              title="🧘 Post-workout Stretches"
              stretches={workout.postStretches}
              done={postStretchDone}
              onToggle={() => postStretchDone
                ? deleteMetric(dayMetrics.find(m => m.metricType === '__post_stretch__')?.id || '')
                : log('__post_stretch__', workout.postStretchMin, 'min', { workoutDay: workout.id })
              }
              color="#9b59b6"
            />
          )}

          {/* Complete workout button */}
          {workout.type !== 'rest' && (
            <div style={{ marginTop: 16, marginBottom: 24 }}>
              {!workoutDone ? (
                <button
                  onClick={() => {
                    log('__workout_complete__', 1, 'session', { workoutDay: workout.id, setsLogged: totalSetsToday });
                    addToast('Workout complete! Great work 💪', 'success');
                    triggerHaptic('heavy');
                  }}
                  style={{
                    width: '100%',
                    background: workout.color,
                    border: 'none',
                    borderRadius: 14,
                    padding: '14px',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: 'pointer',
                    boxShadow: `0 4px 15px ${workout.color}40`,
                  }}
                >
                  ✓ Complete Workout ({totalSetsToday}/{totalSetsTarget})
                </button>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: 16, 
                  background: '#2ecc71',
                  borderRadius: 14,
                  color: '#fff',
                }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>🏆 Workout Complete!</div>
                  <button
                    onClick={() => deleteMetric(dayMetrics.find(m => m.metricType === '__workout_complete__')?.id || '')}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      borderRadius: 6,
                      padding: '4px 12px',
                      color: '#fff',
                      fontSize: 12,
                      marginTop: 8,
                      cursor: 'pointer',
                    }}
                  >
                    Undo
                  </button>
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
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
            {PPL.map((w, i) => (
              <button
                key={i}
                onClick={() => setProgramDayIdx(i)}
                style={{
                  background: programDayIdx === i ? w.color : 'var(--bg-2)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: programDayIdx === i ? '#fff' : 'var(--text-primary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {i === 0 ? 'Sun' : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i - 1]}
              </button>
            ))}
          </div>

          {/* Selected day details */}
          {(() => {
            const w = PPL[programDayIdx];
            return (
              <div>
                <div style={{ 
                  background: 'var(--bg-1)', 
                  borderRadius: 14, 
                  padding: 14, 
                  marginBottom: 12,
                  borderLeft: `3px solid ${w.color}`,
                }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: w.color, marginBottom: 4 }}>
                    {w.emoji} {w.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    🏃 {w.treadmin}m · 🧘 {w.preStretchMin + w.postStretchMin}m stretch
                  </div>
                </div>

                {w.exercises.length > 0 && (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Exercises</div>
                    {w.exercises.map((ex, i) => (
                      <div key={ex.name} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 12px',
                        background: 'var(--bg-1)',
                        borderRadius: 10,
                        marginBottom: 6,
                      }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 12, minWidth: 20 }}>{i + 1}.</span>
                        <span style={{ flex: 1, fontSize: 14 }}>{ex.name}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ex.sets} × {ex.reps}</span>
                      </div>
                    ))}
                  </>
                )}

                {w.preStretches.length > 0 && (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, marginTop: 12 }}>Pre-workout</div>
                    <div style={{ background: 'var(--bg-1)', borderRadius: 10, padding: 12 }}>
                      {w.preStretches.map((s, i) => (
                        <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '3px 0' }}>
                          {i + 1}. {s}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {w.postStretches.length > 0 && (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, marginTop: 12 }}>Post-workout</div>
                    <div style={{ background: 'var(--bg-1)', borderRadius: 10, padding: 12 }}>
                      {w.postStretches.map((s, i) => (
                        <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '3px 0' }}>
                          {i + 1}. {s}
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
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Exercise</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {loggedExercises.map(ex => (
                <button
                  key={ex}
                  onClick={() => setHistEx(ex)}
                  style={{
                    background: histEx === ex ? 'var(--primary)' : 'var(--bg-2)',
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 12px',
                    color: histEx === ex ? '#fff' : 'var(--text-primary)',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* PR card */}
          {prs && (
            <div style={{ 
              background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
              borderRadius: 14, 
              padding: 14, 
              marginBottom: 12,
              color: '#fff',
            }}>
              <div style={{ fontSize: 11, opacity: 0.8 }}>Personal Record</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{prs.weight}{histMetrics[0]?.unit || 'kg'}</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>{prs.date}</div>
            </div>
          )}

          {/* Sparkline */}
          {sparkData.length > 1 && (
            <div style={{ background: 'var(--bg-1)', borderRadius: 14, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Weight Trend</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 60 }}>
                {sparkData.map((d, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      background: 'var(--primary)',
                      borderRadius: 2,
                      height: `${(d.maxW / maxSpark) * 100}%`,
                      minHeight: 4,
                    }}
                    title={`${d.date}: ${d.maxW}kg`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Session history */}
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            {histEx} — {histByDate.length} sessions
          </div>
          
          {histByDate.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>��️</div>
              <div>No data yet</div>
            </div>
          ) : (
            histByDate.slice(0, 15).map(([date, sets]) => {
              const maxW = Math.max(...sets.map(s => parseFloat(s.value) || 0));
              return (
                <div key={date} style={{
                  background: 'var(--bg-1)',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{date}</span>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {sets.length} sets · max {maxW}{sets[0]?.unit}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {sets.map((s, i) => {
                      const n = parseNotes(s.notes);
                      const label = s.unit === 'kg' ? `${s.value}kg × ${n.reps ?? '?'}` : `${s.value} reps`;
                      return (
                        <div key={s.id} style={{
                          background: 'var(--bg-2)',
                          borderRadius: 6,
                          padding: '3px 8px',
                          fontSize: 11,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}>
                          <span style={{ color: 'var(--text-muted)' }}>{i + 1}.</span>
                          <span>{label}</span>
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
