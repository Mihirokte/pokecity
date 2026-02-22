import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useCityStore } from '../../stores/cityStore';
import { useUIStore } from '../../stores/uiStore';
import { SheetsService } from '../../services/sheetsService';
import type { Resident, TimeEntry } from '../../types';

interface TimeTrackerModuleProps {
  resident: Resident;
}

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TimeTrackerModule({ resident }: TimeTrackerModuleProps) {
  const timeEntries = useCityStore(s => s.moduleData.timeEntries);
  const setModuleData = useCityStore(s => s.setModuleData);
  const addToast = useUIStore(s => s.addToast);

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timerDesc, setTimerDesc] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerStartRef = useRef<number | null>(null);
  const pausedAccumRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pomodoro
  const [pomodoroEnabled, setPomodoroEnabled] = useState(false);
  const POMODORO_SECONDS = 25 * 60;

  // Manual entry
  const [showManual, setShowManual] = useState(false);
  const [manualDate, setManualDate] = useState(todayStr());
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');
  const [manualDesc, setManualDesc] = useState('');

  // Tab
  const [tab, setTab] = useState<'timer' | 'log'>('timer');

  const residentEntries = useMemo(
    () => timeEntries.filter(e => e.residentId === resident.id),
    [timeEntries, resident.id],
  );

  const todayEntries = useMemo(() => {
    const today = todayStr();
    return residentEntries.filter(e => e.date === today);
  }, [residentEntries]);

  const dailyTotal = useMemo(
    () => todayEntries.reduce((sum, e) => sum + parseInt(e.durationMinutes || '0', 10), 0),
    [todayEntries],
  );

  // Timer tick
  useEffect(() => {
    if (timerRunning && !timerPaused) {
      intervalRef.current = setInterval(() => {
        if (timerStartRef.current !== null) {
          const now = Date.now();
          const secs = Math.floor((now - timerStartRef.current) / 1000) + pausedAccumRef.current;
          setElapsedSeconds(secs);
        }
      }, 250);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning, timerPaused]);

  // Pomodoro auto-stop
  useEffect(() => {
    if (pomodoroEnabled && timerRunning && elapsedSeconds >= POMODORO_SECONDS) {
      handleStopTimer();
      addToast('Pomodoro complete!', 'success');
    }
  }, [elapsedSeconds, pomodoroEnabled, timerRunning]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartTimer = useCallback(() => {
    timerStartRef.current = Date.now();
    pausedAccumRef.current = 0;
    setElapsedSeconds(0);
    setTimerRunning(true);
    setTimerPaused(false);
  }, []);

  const handlePauseTimer = useCallback(() => {
    if (timerPaused) {
      // Resume
      timerStartRef.current = Date.now();
      setTimerPaused(false);
    } else {
      // Pause
      if (timerStartRef.current !== null) {
        pausedAccumRef.current += Math.floor((Date.now() - timerStartRef.current) / 1000);
      }
      timerStartRef.current = null;
      setTimerPaused(true);
    }
  }, [timerPaused]);

  const handleStopTimer = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const duration = elapsedSeconds;
    const durationMinutes = Math.max(1, Math.round(duration / 60));
    const now = new Date();
    const startTime = new Date(now.getTime() - duration * 1000);

    const entry: TimeEntry = {
      id: `time_${Date.now()}`,
      residentId: resident.id,
      taskRef: '',
      description: timerDesc || 'Untitled session',
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      durationMinutes: String(durationMinutes),
      date: todayStr(),
      createdAt: now.toISOString(),
    };

    // Reset timer
    setTimerRunning(false);
    setTimerPaused(false);
    setElapsedSeconds(0);
    timerStartRef.current = null;
    pausedAccumRef.current = 0;
    setTimerDesc('');

    // Optimistic update
    const updated = [...timeEntries, entry];
    setModuleData('timeEntries', updated);

    try {
      await SheetsService.append('TimeEntries', entry);
      addToast('Time entry saved', 'success');
    } catch {
      setModuleData('timeEntries', timeEntries);
      addToast('Failed to save time entry', 'error');
    }
  }, [elapsedSeconds, timerDesc, resident.id, timeEntries, setModuleData, addToast]);

  const handleManualEntry = useCallback(async () => {
    if (!manualStart || !manualEnd) {
      addToast('Start and end times are required', 'error');
      return;
    }

    const startDate = new Date(`${manualDate}T${manualStart}`);
    const endDate = new Date(`${manualDate}T${manualEnd}`);
    const diffMs = endDate.getTime() - startDate.getTime();

    if (diffMs <= 0) {
      addToast('End time must be after start time', 'error');
      return;
    }

    const durationMinutes = Math.round(diffMs / 60000);

    const entry: TimeEntry = {
      id: `time_${Date.now()}`,
      residentId: resident.id,
      taskRef: '',
      description: manualDesc || 'Manual entry',
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      durationMinutes: String(durationMinutes),
      date: manualDate,
      createdAt: new Date().toISOString(),
    };

    // Optimistic update
    const updated = [...timeEntries, entry];
    setModuleData('timeEntries', updated);
    setShowManual(false);
    setManualStart('');
    setManualEnd('');
    setManualDesc('');
    setManualDate(todayStr());

    try {
      await SheetsService.append('TimeEntries', entry);
      addToast('Manual entry added', 'success');
    } catch {
      setModuleData('timeEntries', timeEntries);
      addToast('Failed to add manual entry', 'error');
    }
  }, [manualDate, manualStart, manualEnd, manualDesc, resident.id, timeEntries, setModuleData, addToast]);

  const handleDelete = useCallback(
    async (entryId: string) => {
      const prev = timeEntries;
      setModuleData('timeEntries', timeEntries.filter(e => e.id !== entryId));

      try {
        await SheetsService.deleteRow('TimeEntries', entryId);
        addToast('Entry deleted', 'info');
      } catch {
        setModuleData('timeEntries', prev);
        addToast('Failed to delete entry', 'error');
      }
    },
    [timeEntries, setModuleData, addToast],
  );

  const pomodoroProgress = pomodoroEnabled
    ? Math.min(100, Math.round((elapsedSeconds / POMODORO_SECONDS) * 100))
    : 0;

  function formatTimeRange(start: string, end: string): string {
    const fmt = (iso: string) => {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    return `${fmt(start)} - ${fmt(end)}`;
  }

  return (
    <div>
      {/* Tabs */}
      <div className="mod-tabs">
        <button
          className={`mod-tab${tab === 'timer' ? ' active' : ''}`}
          onClick={() => setTab('timer')}
        >
          Timer
        </button>
        <button
          className={`mod-tab${tab === 'log' ? ' active' : ''}`}
          onClick={() => setTab('log')}
        >
          Today's Log
        </button>
      </div>

      {/* ── Timer Tab ── */}
      {tab === 'timer' && (
        <div>
          {/* Timer display */}
          <div className="timer-display">{formatElapsed(elapsedSeconds)}</div>

          {/* Pomodoro toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div
              className={`checkbox${pomodoroEnabled ? ' checked' : ''}`}
              onClick={() => setPomodoroEnabled(!pomodoroEnabled)}
            >
              {pomodoroEnabled ? 'X' : '\u00A0'}
            </div>
            <span style={{ fontSize: 10, color: '#c0cbdc' }}>Pomodoro (25 min)</span>
          </div>

          {/* Pomodoro progress */}
          {pomodoroEnabled && timerRunning && (
            <div style={{ marginBottom: 8 }}>
              <div
                style={{
                  background: 'rgba(255,255,255,.08)',
                  borderRadius: 4,
                  height: 10,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${pomodoroProgress}%`,
                    height: '100%',
                    background: pomodoroProgress >= 100 ? '#50c878' : '#ffcd75',
                    transition: 'width 0.3s',
                  }}
                />
              </div>
              <div style={{ fontSize: 8, color: '#8b9bb4', textAlign: 'center', marginTop: 2 }}>
                {pomodoroProgress}%
              </div>
            </div>
          )}

          {/* Description input */}
          <div style={{ marginBottom: 8 }}>
            <input
              value={timerDesc}
              onChange={e => setTimerDesc(e.target.value)}
              placeholder="What are you working on?"
              style={{ width: '100%' }}
              disabled={timerRunning}
            />
          </div>

          {/* Timer controls */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {!timerRunning ? (
              <button className="mod-btn" onClick={handleStartTimer}>
                Start
              </button>
            ) : (
              <>
                <button className="mod-btn" onClick={handlePauseTimer}>
                  {timerPaused ? 'Resume' : 'Pause'}
                </button>
                <button className="mod-btn mod-btn--danger" onClick={handleStopTimer}>
                  Stop
                </button>
              </>
            )}
          </div>

          {/* Manual entry toggle */}
          <div style={{ marginBottom: 8 }}>
            <button
              className="mod-btn mod-btn--sm"
              onClick={() => setShowManual(!showManual)}
            >
              {showManual ? 'Hide Manual Entry' : '+ Manual Entry'}
            </button>
          </div>

          {/* Manual entry form */}
          {showManual && (
            <div className="mod-form">
              <div className="mod-form-row">
                <div style={{ flex: 1 }}>
                  <label>Date</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={e => setManualDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="mod-form-row">
                <div style={{ flex: 1 }}>
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={manualStart}
                    onChange={e => setManualStart(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label>End Time</label>
                  <input
                    type="time"
                    value={manualEnd}
                    onChange={e => setManualEnd(e.target.value)}
                  />
                </div>
              </div>
              <label>Description</label>
              <input
                value={manualDesc}
                onChange={e => setManualDesc(e.target.value)}
                placeholder="What did you work on?"
              />
              <div className="mod-form-actions">
                <button className="mod-btn" onClick={handleManualEntry}>
                  Add Entry
                </button>
                <button
                  className="mod-btn mod-btn--danger"
                  onClick={() => setShowManual(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Today's Log Tab ── */}
      {tab === 'log' && (
        <div>
          <div className="mod-header">
            <span className="mod-title">Today's Log</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#ffcd75' }}>
              Total: {dailyTotal} min
            </span>
          </div>

          {todayEntries.length === 0 ? (
            <div className="mod-empty">No entries today. Start a timer!</div>
          ) : (
            todayEntries.map(entry => (
              <div key={entry.id} className="mod-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{entry.description}</strong>
                  <span style={{ fontSize: 9, color: '#ffcd75' }}>
                    {entry.durationMinutes} min
                  </span>
                </div>
                <div style={{ fontSize: 9, color: '#8b9bb4', marginTop: 2 }}>
                  {formatTimeRange(entry.startTime, entry.endTime)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    className="mod-btn mod-btn--danger mod-btn--sm"
                    onClick={() => handleDelete(entry.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
