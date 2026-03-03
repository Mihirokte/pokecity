import { useState, useCallback, useRef } from 'react';
import { useCityStore } from '../../stores/cityStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { HOUSE_TYPES, HOUSE_TYPE_LIST } from '../../config/houseTypes';
import { spriteArtworkUrl, PLAYER_POKEMON_ID, badgeUrl, HEADER_BADGE_ID, MODULE_BADGE_IDS } from '../../config/pokemon';
import type { HouseModuleType, House, Resident } from '../../types';
import { CityPanel } from './CityPanel';
import { AboutMePanel } from './AboutMePanel';
import { CatanCityScene } from '../Landing/CatanCityScene';
import '../../styles/city.css';

interface SelectedEntry {
  resident: Resident;
  house: House;
}

export function CityView() {
  const houses = useCityStore(s => s.houses);
  const residents = useCityStore(s => s.residents);
  const cityName = useCityStore(s => s.cityName);
  const findOrCreateHouse = useCityStore(s => s.findOrCreateHouse);
  const addResident = useCityStore(s => s.addResident);
  const logout = useAuthStore(s => s.logout);
  const addToast = useUIStore(s => s.addToast);
  const resetHouseTypes = useCityStore(s => s.resetHouseTypes);

  const [selected, setSelected] = useState<SelectedEntry | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAboutMe, setShowAboutMe] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentType, setNewAgentType] = useState<HouseModuleType>('tasks');
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [moveTargetHex, setMoveTargetHex] = useState<number | null>(null);

  const updateHousePosition = useCityStore(s => s.updateHousePosition);
  const loadAllData = useCityStore(s => s.loadAllData);
  const [resettingAll, setResettingAll] = useState(false);
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
      const house = await findOrCreateHouse(newAgentType);
      await addResident(house.id, newAgentName.trim());
      setNewAgentName('');
      setShowAddForm(false);
      addToast('New resident joined the city!', 'success');
      focusHeader();
    } finally {
      setAdding(false);
    }
  }, [newAgentName, newAgentType, adding, findOrCreateHouse, addResident, addToast, focusHeader]);

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
        {entries.length > 0 && (
          <nav aria-label="Residents" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {entries.map(({ resident, house }) => (
              <button
                key={resident.id}
                type="button"
                className="city-header__resident-btn"
                onClick={() => setSelected({ resident, house })}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected({ resident, house }); } }}
                aria-label={`Open ${resident.name}'s ${house.name}`}
                aria-pressed={selected?.resident.id === resident.id}
                style={{ fontSize: 9, padding: '4px 8px' }}
              >
                {resident.name}
              </button>
            ))}
          </nav>
        )}
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
              await loadAllData();
              addToast('Data reloaded. UI refreshed.', 'success');
              focusHeader();
            } catch {
              addToast('Failed to reload data.', 'error');
            } finally {
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
