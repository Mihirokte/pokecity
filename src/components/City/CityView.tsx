import { useState, useCallback, useRef } from 'react';
import { useCityStore, xpForLevel } from '../../stores/cityStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { SheetsService } from '../../services/sheetsService';
import { SAMPLE_SPREADSHEET_ID } from '../../data/sampleData';
import { HOUSE_TYPES, HOUSE_TYPE_LIST } from '../../config/houseTypes';
import { spriteArtworkUrl, PLAYER_POKEMON_ID, badgeUrl, HEADER_BADGE_ID, MODULE_BADGE_IDS } from '../../config/pokemon';
import type { HouseModuleType, House, Resident, SheetName, Task, CalendarEvent, Note } from '../../types';
import { CityPanel } from './CityPanel';
import { AboutMePanel } from './AboutMePanel';
import { CatanCityScene } from '../Landing/CatanCityScene';
import '../../styles/city.css';

interface SelectedEntry {
  resident: Resident;
  house: House;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export function CityView() {
  const houses = useCityStore(s => s.houses);
  const residents = useCityStore(s => s.residents);
  const cityName = useCityStore(s => s.cityName);
  const cityProgress = useCityStore(s => s.cityProgress);
  const moduleData = useCityStore(s => s.moduleData);
  const placeHouse = useCityStore(s => s.placeHouse);
  const addResident = useCityStore(s => s.addResident);
  const setSpriteStyle = useCityStore(s => s.setSpriteStyle);
  const setModuleData = useCityStore(s => s.setModuleData);
  const addCityXP = useCityStore(s => s.addCityXP);
  const logout = useAuthStore(s => s.logout);
  const addToast = useUIStore(s => s.addToast);
  const resetHouseTypes = useCityStore(s => s.resetHouseTypes);

  const today = todayStr();
  const eventsToday = moduleData.calendarEvents.filter(
    e => e.startDate <= today && (e.endDate || e.startDate) >= today
  ).length;
  const tasksDueToday = moduleData.tasks.filter(
    t => t.dueDate === today && t.status !== 'done'
  ).length;
  const goals = cityProgress.dailyGoals ?? { date: today, task: false, calendarNote: false, gymShop: false, bonusGiven: false };
  const goalsForToday = goals.date === today ? goals : { date: today, task: false, calendarNote: false, gymShop: false, bonusGiven: false };

  const [selected, setSelected] = useState<SelectedEntry | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAboutMe, setShowAboutMe] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentType, setNewAgentType] = useState<HouseModuleType>('tasks');
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [moveTargetHex, setMoveTargetHex] = useState<number | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickType, setQuickType] = useState<'task' | 'event' | 'note'>('task');
  const [quickResidentId, setQuickResidentId] = useState('');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDate, setQuickDate] = useState(today);
  const [quickAllDay, setQuickAllDay] = useState(true);
  const [quickSaving, setQuickSaving] = useState(false);

  const updateHousePosition = useCityStore(s => s.updateHousePosition);
  const spreadsheetId = useAuthStore(s => s.spreadsheetId);
  const [resettingAll, setResettingAll] = useState(false);

  const sheetsToClearOnReset: SheetName[] = [
    'CalendarEvents', 'Tasks', 'Notes', 'TripPlans', 'HealthMetrics', 'ShoppingItems',
    'Residents', 'Houses',
  ];
  const headerRef = useRef<HTMLDivElement>(null);
  const focusHeader = useCallback(() => {
    requestAnimationFrame(() => {
      const first = headerRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea');
      first?.focus();
    });
  }, []);

  const handleAddAgent = useCallback(async () => {
    if (!newAgentName.trim() || adding) return;
    setAdding(true);
    try {
      const house = await placeHouse(newAgentType);
      await addResident(house.id, newAgentName.trim());
      setNewAgentName('');
      setShowAddForm(false);
      addToast('New resident joined the city!', 'success');
      focusHeader();
    } finally {
      setAdding(false);
    }
  }, [newAgentName, newAgentType, adding, placeHouse, addResident, addToast, focusHeader]);

  // Build list: one entry per resident with their house
  const entries = residents
    .map(r => {
      const house = houses.find(h => h.id === r.houseId);
      return house ? { resident: r, house } : null;
    })
    .filter((e): e is { resident: Resident; house: House } => e !== null);

  return (
    <div className="city-view">
      {/* ── Floating Header HUD ── */}
      <header ref={headerRef} className="city-header city-header--hud" tabIndex={-1}>
        <div className="city-header__brand">
          <img src={badgeUrl(HEADER_BADGE_ID)} alt="" className="pokecity-badge pokecity-badge--header" />
          <div className="city-header__name">{cityName}</div>
        </div>
        <span className="city-header__sep">|</span>
        <div className="city-header__stats">
          {entries.length} resident{entries.length !== 1 ? 's' : ''}
        </div>
        <div className="city-header__progress" title={`${cityProgress.cityXP} XP · Level ${cityProgress.cityLevel}`}>
          <span className="city-header__level">Lv.{cityProgress.cityLevel}</span>
          <span className="city-header__xp">{cityProgress.cityXP} XP</span>
          {cityProgress.dailyStreak > 0 && (
            <span className="city-header__streak">{cityProgress.dailyStreak}d</span>
          )}
          <div className="city-header__xp-bar" role="progressbar" aria-valuenow={cityProgress.cityXP} aria-valuemin={xpForLevel(cityProgress.cityLevel)} aria-valuemax={xpForLevel(cityProgress.cityLevel + 1)}>
            <div
              className="city-header__xp-fill"
              style={{
                width: `${Math.min(100, (cityProgress.cityXP - xpForLevel(cityProgress.cityLevel)) / Math.max(1, xpForLevel(cityProgress.cityLevel + 1) - xpForLevel(cityProgress.cityLevel)) * 100)}%`,
              }}
            />
          </div>
        </div>
        <div className="city-header__daily-goals" title="Daily goals: 1 task, 1 event/note, 1 workout/shop">
          <span className={`city-header__goal ${goalsForToday.task ? 'city-header__goal--done' : ''}`} aria-label={goalsForToday.task ? 'Task done' : 'Complete 1 task'}>✓</span>
          <span className={`city-header__goal ${goalsForToday.calendarNote ? 'city-header__goal--done' : ''}`} aria-label={goalsForToday.calendarNote ? 'Event/note done' : 'Add 1 event or note'}>📅</span>
          <span className={`city-header__goal ${goalsForToday.gymShop ? 'city-header__goal--done' : ''}`} aria-label={goalsForToday.gymShop ? 'Workout/shop done' : 'Log workout or check 1 shop item'}>💪</span>
        </div>
        <div className="city-header__today" title="Events and tasks due today">
          Today: {eventsToday} event{eventsToday !== 1 ? 's' : ''}, {tasksDueToday} task{tasksDueToday !== 1 ? 's' : ''} due
        </div>
        <button
          type="button"
          className="city-header__reset-btn"
          title="Toggle board sprites (2D vs 3D standee)"
          onClick={() => setSpriteStyle(cityProgress.spriteStyle === '3d' ? '2d' : '3d')}
        >
          {cityProgress.spriteStyle === '3d' ? '3D' : '2D'}
        </button>
        <button
          type="button"
          className="city-header__reset-btn"
          title="Quick add a task, event, or note"
          onClick={() => {
            const first = entries[0]?.resident.id ?? '';
            setQuickResidentId(first);
            setQuickTitle('');
            setQuickDate(today);
            setQuickAllDay(true);
            setQuickType('task');
            setShowQuickAdd(true);
          }}
          disabled={entries.length === 0}
        >
          + QUICK
        </button>
        <div className="city-header__spacer" />
        <button
          type="button"
          className="city-header__reset-btn"
          onClick={async () => {
            if (resettingAll) return;
            setResettingAll(true);
            setSelected(null);
            setShowAddForm(false);
            setMoveTargetHex(null);
            try {
              if (spreadsheetId && spreadsheetId !== SAMPLE_SPREADSHEET_ID) {
                for (const sheet of sheetsToClearOnReset) {
                  await SheetsService.clearDataRows(sheet);
                }
                addToast('Spreadsheet and agents cleared. Refreshing…', 'success');
              } else {
                addToast('Refreshing…', 'success');
              }
              window.location.reload();
            } catch {
              addToast('Failed to clear spreadsheet.', 'error');
              setResettingAll(false);
            }
          }}
          disabled={resettingAll}
          title="Reload all data from sheet and refresh UI"
        >
          {resettingAll ? '…' : 'RESET ALL'}
        </button>
        <button
          type="button"
          className="city-header__reset-btn"
          onClick={async () => {
            if (resetting) return;
            setResetting(true);
            try {
              const count = await resetHouseTypes('tasks');
              addToast(count > 0 ? `Reset ${count} house type(s) to Tasks.` : 'All house types are already valid.', count > 0 ? 'success' : 'info');
            } catch {
              addToast('Failed to reset house types.', 'error');
            } finally {
              setResetting(false);
            }
          }}
          disabled={resetting}
          title="Map any invalid house type to Tasks"
        >
          {resetting ? '…' : 'RESET TYPES'}
        </button>
        <button
          type="button"
          className="city-header__about-btn"
          onClick={() => setShowAboutMe(true)}
        >
          ABOUT
        </button>
        <button className="city-header__auth-btn" onClick={logout}>
          LOGOUT
        </button>
      </header>

      {/* Top-right: compact resident list (50% opacity block below header) */}
      {entries.length > 0 && (
        <div className="city-resident-block" aria-label="Residents">
          <div className="city-resident-block__inner">
            {entries.map(({ resident, house }) => (
              <button
                key={resident.id}
                type="button"
                className="city-resident-block__item"
                onClick={() => setSelected({ resident, house })}
                aria-label={`Open ${resident.name}`}
              >
                {resident.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty State (no residents yet) ── */}
      {entries.length === 0 && !showAddForm && (
        <div className="city-empty city-empty--hud">
          <img
            src={spriteArtworkUrl(PLAYER_POKEMON_ID)}
            alt="Pikachu"
            className="city-empty__sprite"
          />
          <div className="city-empty__title">YOUR CITY IS EMPTY!</div>
          <div className="city-empty__sub">
            Add your first resident to build your city.
          </div>
          <button
            className="city-btn city-btn--primary"
            style={{ marginTop: 8 }}
            onClick={() => setShowAddForm(true)}
          >
            + ADD RESIDENT
          </button>
        </div>
      )}

      {/* ── 3D Catan City (behind header and sidebar; z-index kept low so panel stays on top) ── */}
      <div className="city-view__scene">
        <CatanCityScene
          entries={entries}
          onSelectResident={(resident, house) => setSelected({ resident, house })}
          onAddAgent={() => setShowAddForm(true)}
          onEmptyTileClick={(hexIndex) => setMoveTargetHex(hexIndex)}
          panelOpen={selected !== null}
          spriteStyle={cityProgress.spriteStyle}
        />
      </div>

      {/* ── Move agent to tile (after clicking empty hex) ── */}
      {moveTargetHex !== null && (
        <div
          className="city-add-overlay"
          onClick={e => { if (e.target === e.currentTarget) setMoveTargetHex(null); }}
        >
          <div className="city-add-panel" onClick={e => e.stopPropagation()}>
            <div className="city-add-panel__title">Move agent to tile {moveTargetHex + 1}</div>
            <p style={{ fontFamily: 'Dogica, monospace', fontSize: 10, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>
              Choose which resident to move here:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {entries.map(({ resident, house }) => (
                <button
                  key={resident.id}
                  type="button"
                  className="city-btn city-btn--secondary"
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => {
                    updateHousePosition(house.id, moveTargetHex);
                    setMoveTargetHex(null);
                    addToast(`${resident.name} moved to tile ${moveTargetHex + 1}`, 'success');
                  }}
                >
                  Move {resident.name} here
                </button>
              ))}
            </div>
            <button
              type="button"
              className="city-btn city-btn--secondary"
              style={{ marginTop: 12 }}
              onClick={() => setMoveTargetHex(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Quick Add Modal ── */}
      {showQuickAdd && (
        <div
          className="city-add-overlay"
          onClick={e => { if (e.target === e.currentTarget) setShowQuickAdd(false); }}
        >
          <div className="city-add-panel" onClick={e => e.stopPropagation()}>
            <div className="city-add-panel__title">+ QUICK ADD</div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button
                type="button"
                className={`city-btn city-btn--secondary${quickType === 'task' ? ' city-btn--primary' : ''}`}
                onClick={() => setQuickType('task')}
              >
                TASK
              </button>
              <button
                type="button"
                className={`city-btn city-btn--secondary${quickType === 'event' ? ' city-btn--primary' : ''}`}
                onClick={() => setQuickType('event')}
              >
                EVENT
              </button>
              <button
                type="button"
                className={`city-btn city-btn--secondary${quickType === 'note' ? ' city-btn--primary' : ''}`}
                onClick={() => setQuickType('note')}
              >
                NOTE
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              <div style={{ fontFamily: 'Dogica, monospace', fontSize: 9, color: '#FFD700', letterSpacing: '0.06em' }}>
                ASSIGN TO RESIDENT
              </div>
              <select
                className="city-add-panel__input"
                value={quickResidentId}
                onChange={(e) => setQuickResidentId(e.target.value)}
              >
                {entries.map(({ resident, house }) => (
                  <option key={resident.id} value={resident.id}>
                    {resident.name} — {HOUSE_TYPES[house.type].label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontFamily: 'Dogica, monospace', fontSize: 9, color: '#FFD700', letterSpacing: '0.06em' }}>
                TITLE
              </div>
              <input
                className="city-add-panel__input"
                placeholder={quickType === 'task' ? 'New task...' : quickType === 'event' ? 'New event...' : 'New note...'}
                value={quickTitle}
                autoFocus
                onChange={(e) => setQuickTitle(e.target.value)}
              />
            </div>

            {(quickType === 'task' || quickType === 'event') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                <div style={{ fontFamily: 'Dogica, monospace', fontSize: 9, color: '#FFD700', letterSpacing: '0.06em' }}>
                  {quickType === 'task' ? 'DUE DATE' : 'DATE'}
                </div>
                <input
                  className="city-add-panel__input"
                  type="date"
                  value={quickDate}
                  onChange={(e) => setQuickDate(e.target.value)}
                />
                {quickType === 'event' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'VT323, monospace', color: 'rgba(255,255,255,0.7)' }}>
                    <input
                      type="checkbox"
                      checked={quickAllDay}
                      onChange={(e) => setQuickAllDay(e.target.checked)}
                    />
                    All day
                  </label>
                )}
              </div>
            )}

            <div className="city-add-panel__actions" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="city-btn city-btn--primary"
                disabled={quickSaving || !quickTitle.trim() || !quickResidentId}
                onClick={async () => {
                  if (quickSaving) return;
                  const title = quickTitle.trim();
                  if (!title) return;
                  const resident = residents.find(r => r.id === quickResidentId);
                  if (!resident) { addToast('Resident not found', 'error'); return; }

                  setQuickSaving(true);
                  const now = new Date().toISOString();

                  try {
                    if (quickType === 'task') {
                      const prev = moduleData.tasks;
                      const task: Task = {
                        id: `task_${crypto.randomUUID()}`,
                        residentId: resident.id,
                        title,
                        priority: 'normal',
                        status: 'backlog',
                        dueDate: quickDate || '',
                        notes: '',
                        parentId: '',
                        projectName: '',
                        tags: '',
                        createdAt: now,
                        updatedAt: now,
                        dueTime: '',
                        gcalEventId: '',
                        sortOrder: '',
                      };
                      setModuleData('tasks', [...prev, task]);
                      try {
                        await SheetsService.append('Tasks', task);
                        setShowQuickAdd(false);
                        addToast('Task created', 'success');
                        focusHeader();
                      } catch {
                        setModuleData('tasks', prev);
                        throw new Error('sync');
                      }
                    } else if (quickType === 'event') {
                      const prev = moduleData.calendarEvents;
                      const evt: CalendarEvent = {
                        id: `evt_${crypto.randomUUID()}`,
                        residentId: resident.id,
                        title,
                        startDate: quickDate || today,
                        endDate: quickDate || today,
                        startTime: '09:00',
                        endTime: '10:00',
                        allDay: quickAllDay ? 'true' : 'false',
                        location: '',
                        description: '',
                        color: '#ff6b6b',
                        recurrence: 'none',
                        createdAt: now,
                        updatedAt: now,
                      };
                      setModuleData('calendarEvents', [...prev, evt]);
                      try {
                        await SheetsService.append('CalendarEvents', evt);
                        addCityXP(5, 'calendar');
                        setShowQuickAdd(false);
                        addToast('Event created', 'success');
                        focusHeader();
                      } catch {
                        setModuleData('calendarEvents', prev);
                        throw new Error('sync');
                      }
                    } else {
                      const prev = moduleData.notes;
                      const note: Note = {
                        id: `note_${crypto.randomUUID()}`,
                        residentId: resident.id,
                        title,
                        content: '',
                        tags: '',
                        version: '1',
                        createdAt: now,
                        updatedAt: now,
                      };
                      setModuleData('notes', [...prev, note]);
                      try {
                        await SheetsService.append('Notes', note);
                        addCityXP(5, 'note');
                        setShowQuickAdd(false);
                        addToast('Note created', 'success');
                        focusHeader();
                      } catch {
                        setModuleData('notes', prev);
                        throw new Error('sync');
                      }
                    }
                  } catch {
                    addToast('Failed to sync quick add', 'error');
                  } finally {
                    setQuickSaving(false);
                  }
                }}
              >
                {quickSaving ? 'SAVING...' : '✓ SAVE'}
              </button>
              <button
                type="button"
                className="city-btn city-btn--secondary"
                onClick={() => { setShowQuickAdd(false); focusHeader(); }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Agent Modal ── */}
      {showAddForm && (
        <div
          className="city-add-overlay"
          onClick={e => { if (e.target === e.currentTarget) setShowAddForm(false); }}
        >
          <div className="city-add-panel">
            <div className="city-add-panel__title">▶ CHOOSE A MODULE TYPE</div>

            <div className="city-add-panel__types">
              {HOUSE_TYPE_LIST.map(ht => (
                <button
                  key={ht.type}
                  className={`city-type-btn${newAgentType === ht.type ? ' city-type-btn--selected' : ''}`}
                  style={{ '--type-color': ht.color } as React.CSSProperties}
                  onClick={() => setNewAgentType(ht.type)}
                >
                  <img src={badgeUrl(MODULE_BADGE_IDS[ht.type] ?? 1)} alt="" className="pokecity-badge pokecity-badge--sm" />
                  <span className="city-type-btn__emoji">{ht.emoji}</span>
                  <span className="city-type-btn__label">{ht.label.toUpperCase()}</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontFamily: 'Dogica, monospace', fontSize: 9, color: '#FFD700', letterSpacing: '0.06em' }}>
                RESIDENT NAME
              </div>
              <input
                className="city-add-panel__input"
                placeholder="Enter name..."
                value={newAgentName}
                autoFocus
                onChange={e => setNewAgentName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddAgent()}
                style={{ width: '100%' }}
              />
            </div>

            <div className="city-add-panel__actions">
              <button
                className="city-btn city-btn--primary"
                onClick={handleAddAgent}
                disabled={!newAgentName.trim() || adding}
              >
                {adding ? 'ADDING...' : '✓ ADD RESIDENT'}
              </button>
              <button
                className="city-btn city-btn--secondary"
                onClick={() => { setShowAddForm(false); setNewAgentName(''); focusHeader(); }}
              >
                CANCEL
              </button>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${HOUSE_TYPES[newAgentType].color}33`,
              borderRadius: 2,
            }}>
              <span style={{ fontSize: 20 }}>{HOUSE_TYPES[newAgentType].emoji}</span>
              <div>
                <div style={{ fontFamily: 'Dogica, monospace', fontSize: 9, color: HOUSE_TYPES[newAgentType].color }}>
                  {HOUSE_TYPES[newAgentType].label.toUpperCase()}
                </div>
                <div style={{ fontFamily: 'VT323, monospace', fontSize: 15, color: 'rgba(255,255,255,0.6)' }}>
                  {HOUSE_TYPES[newAgentType].description}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── City Panel (module view — slides up over the 3D city) ── */}
      {selected && (
        <CityPanel
          resident={selected.resident}
          house={selected.house}
          onClose={() => { setSelected(null); focusHeader(); }}
        />
      )}

      {/* ── About Me (LinkedIn-style profile panel) ── */}
      {showAboutMe && (
        <AboutMePanel onClose={() => setShowAboutMe(false)} />
      )}
    </div>
  );
}
