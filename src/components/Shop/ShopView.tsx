import { useState, useCallback, useEffect } from 'react';
import { useCityStore } from '../../stores/cityStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { HOUSE_TYPES, HOUSE_TYPE_LIST } from '../../config/houseTypes';
import { spriteAnimatedUrl, spriteArtworkUrl, PLAYER_POKEMON_ID } from '../../config/pokemon';
import { AgentCard } from './AgentCard';
import { CalendarModule } from '../Modules/CalendarModule';
import { TasksModule } from '../Modules/TasksModule';
import { NotesModule } from '../Modules/NotesModule';
import { TravelModule } from '../Modules/TravelModule';
import { GymModule } from '../Modules/GymModule';
import { ShoppingModule } from '../Modules/ShoppingModule';
import type { HouseModuleType, Resident } from '../../types';

const MODULE_MAP: Record<string, React.FC<{ resident: Resident }>> = {
  calendar: CalendarModule,
  tasks: TasksModule,
  notes: NotesModule,
  travel: TravelModule,
  gym: GymModule,
  shopping: ShoppingModule,
};

export function ShopView() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pokeballOpen, setPokeballOpen] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [syncInput, setSyncInput] = useState('');
  const [syncing, setSyncing] = useState(false);
  const selectedAgentId = useUIStore(s => s.selectedAgentId);
  const selectAgent = useUIStore(s => s.selectAgent);
  const clearAgent = useUIStore(s => s.clearAgent);
  const addToast = useUIStore(s => s.addToast);
  const logout = useAuthStore(s => s.logout);
  const spreadsheetId = useAuthStore(s => s.spreadsheetId);
  const setSpreadsheet = useAuthStore(s => s.setSpreadsheet);

  const houses = useCityStore(s => s.houses);
  const residents = useCityStore(s => s.residents);
  const addResident = useCityStore(s => s.addResident);
  const removeResident = useCityStore(s => s.removeResident);
  const updateResident = useCityStore(s => s.updateResident);
  const findOrCreateHouse = useCityStore(s => s.findOrCreateHouse);

  const [addingAgent, setAddingAgent] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentType, setNewAgentType] = useState<HouseModuleType>('tasks');
  const [editingField, setEditingField] = useState<'name' | 'role' | null>(null);
  const [editValue, setEditValue] = useState('');

  const selectedAgent = residents.find(r => r.id === selectedAgentId);

  const getAgentHouseType = (r: Resident) => {
    const house = houses.find(h => h.id === r.houseId);
    return house ? HOUSE_TYPES[house.type] : null;
  };

  const getAgentHouse = (r: Resident) => houses.find(h => h.id === r.houseId) ?? null;

  const getModuleComponent = () => {
    if (!selectedAgent) return null;
    const house = houses.find(h => h.id === selectedAgent.houseId);
    if (!house) return null;
    return MODULE_MAP[house.type] ?? null;
  };

  const ModuleComponent = getModuleComponent();

  /* ── Pokeball open sequence ── */
  const handleOpen = useCallback(() => {
    setMenuOpen(true);
    setPokeballOpen(true);
    setShowPanel(false);
  }, []);

  useEffect(() => {
    if (!pokeballOpen) return;
    const timer = setTimeout(() => {
      setShowPanel(true);
      // Let panel fade in, then hide pokeball
      setTimeout(() => setPokeballOpen(false), 300);
    }, 700);
    return () => clearTimeout(timer);
  }, [pokeballOpen]);

  const handleAddAgent = useCallback(async () => {
    if (!newAgentName.trim()) return;
    const house = await findOrCreateHouse(newAgentType);
    await addResident(house.id, newAgentName.trim());
    setNewAgentName('');
    setAddingAgent(false);
    addToast('Agent joined the team!', 'success');
  }, [newAgentName, newAgentType, findOrCreateHouse, addResident, addToast]);

  const handleRemoveAgent = useCallback((id: string) => {
    removeResident(id);
    clearAgent();
    addToast('Agent removed', 'info');
  }, [removeResident, clearAgent, addToast]);

  const handleLinkDevice = useCallback(async () => {
    const id = syncInput.trim();
    if (!id) return;
    setSyncing(true);
    try {
      // Verify the spreadsheet exists by fetching its metadata
      const token = useAuthStore.getState().accessToken;
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=spreadsheetId,sheets.properties`,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
      );
      if (!res.ok) throw new Error('Spreadsheet not found');
      const data = await res.json();
      const gids: Record<string, number> = {};
      for (const sheet of data.sheets ?? []) {
        gids[sheet.properties.title] = sheet.properties.sheetId;
      }
      setSpreadsheet(data.spreadsheetId, gids);
      // Reload data from the linked spreadsheet
      setTimeout(() => window.location.reload(), 300);
    } catch {
      addToast('Invalid spreadsheet ID', 'error');
    } finally {
      setSyncing(false);
    }
  }, [syncInput, setSpreadsheet, addToast]);

  const startEdit = useCallback((field: 'name' | 'role', value: string) => {
    setEditingField(field);
    setEditValue(value);
  }, []);

  const saveEdit = useCallback(() => {
    if (!selectedAgent || !editingField || !editValue.trim()) {
      setEditingField(null);
      return;
    }
    updateResident(selectedAgent.id, { [editingField]: editValue.trim() });
    setEditingField(null);
    addToast(`${editingField === 'name' ? 'Name' : 'Role'} updated`, 'success');
  }, [selectedAgent, editingField, editValue, updateResident, addToast]);

  const handleCloseMenu = () => {
    setMenuOpen(false);
    setPokeballOpen(false);
    setShowPanel(false);
    clearAgent();
    setAddingAgent(false);
  };

  const speechText = menuOpen
    ? (selectedAgent
        ? `Working on ${getAgentHouseType(selectedAgent)?.label?.toLowerCase() ?? 'stuff'}!`
        : 'Pick an agent!')
    : 'Welcome! Talk to me!';

  return (
    <div className="pokecenter">
      {/* ── Pikachu + speech bubble ── */}
      <div className={`pokecenter__hero${menuOpen ? ' pokecenter__hero--dim' : ''}`}>
        <div
          className="pokecenter__keeper"
          onClick={() => !menuOpen && handleOpen()}
        >
          <img
            src={spriteArtworkUrl(PLAYER_POKEMON_ID)}
            alt="Pikachu"
            className="pokecenter__keeper-sprite"
          />
          <div className="pokecenter__bubble">{speechText}</div>
        </div>
      </div>

      {/* ── Pokeball open transition ── */}
      {menuOpen && pokeballOpen && (
        <div className="pokeball-transition">
          <div className={`pokeball-transition__top${showPanel ? ' pokeball-transition__top--open' : ''}`} />
          <div className="pokeball-transition__center">
            <div className="pokeball-transition__button" />
          </div>
          <div className={`pokeball-transition__bottom${showPanel ? ' pokeball-transition__bottom--open' : ''}`} />
        </div>
      )}

      {/* ── Dashboard panel ── */}
      {menuOpen && showPanel && (
        <div
          className="shop-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseMenu(); }}
        >
          <div className="shop-panel">
            <div className="shop-panel__header">
              {selectedAgent && (
                <button className="shop-panel__back" onClick={clearAgent}>←</button>
              )}
              <span className="shop-panel__title">
                {selectedAgent ? selectedAgent.name : 'DASHBOARD'}
              </span>
              <button className="shop-panel__close" onClick={handleCloseMenu}>✕</button>
            </div>

            <div className="shop-panel__body">
              {!selectedAgent ? (
                <>
                  <div className="dash-grid">
                    {residents.map(r => {
                      const house = getAgentHouse(r);
                      if (!house) return null;
                      return (
                        <AgentCard
                          key={r.id}
                          resident={r}
                          house={house}
                          onClick={() => selectAgent(r.id)}
                        />
                      );
                    })}

                    {addingAgent ? (
                      <div className="dash-card dash-card--add-form">
                        <div className="shop-panel__add-form">
                          <select value={newAgentType} onChange={e => setNewAgentType(e.target.value as HouseModuleType)}>
                            {HOUSE_TYPE_LIST.map(ht => (
                              <option key={ht.type} value={ht.type}>{ht.label}</option>
                            ))}
                          </select>
                          <input
                            autoFocus placeholder="Agent name..." value={newAgentName}
                            onChange={e => setNewAgentName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddAgent()}
                          />
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="mod-btn" onClick={handleAddAgent}>Add</button>
                            <button className="mod-btn mod-btn--danger" onClick={() => setAddingAgent(false)}>Cancel</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="dash-card dash-card--add" onClick={() => setAddingAgent(true)}>
                        <div className="dash-card__add-icon">+</div>
                        <div className="dash-card__add-label">Add Agent</div>
                      </div>
                    )}
                  </div>

                  {residents.length === 0 && !addingAgent && (
                    <div className="mod-empty" style={{ marginTop: 40 }}>No agents yet. Add one to get started!</div>
                  )}
                </>
              ) : (
                <>
                  <div className="shop-panel__agent-bar">
                    <img
                      src={spriteAnimatedUrl(selectedAgent.emoji)}
                      alt={selectedAgent.name}
                      className="shop-panel__agent-sprite"
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editingField === 'name' ? (
                        <input
                          autoFocus
                          className="agent-edit-input"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={e => e.key === 'Enter' && saveEdit()}
                        />
                      ) : (
                        <div className="resident-panel__name" onClick={() => startEdit('name', selectedAgent.name)} style={{ cursor: 'pointer' }}>
                          {selectedAgent.name}
                        </div>
                      )}
                      {editingField === 'role' ? (
                        <input
                          autoFocus
                          className="agent-edit-input agent-edit-input--sm"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={e => e.key === 'Enter' && saveEdit()}
                        />
                      ) : (
                        <div className="resident-panel__role" onClick={() => startEdit('role', selectedAgent.role)} style={{ cursor: 'pointer' }}>
                          {selectedAgent.role}
                        </div>
                      )}
                    </div>
                    <button className="resident-panel__delete" onClick={() => handleRemoveAgent(selectedAgent.id)}>Remove</button>
                  </div>
                  <div className="module-container">
                    {ModuleComponent && <ModuleComponent resident={selectedAgent} />}
                  </div>
                </>
              )}
            </div>

            <div className="shop-panel__footer">
              <span className="shop-panel__stats">Houses: {houses.length} &nbsp; Agents: {residents.length}</span>
              <div style={{ flex: 1 }} />
              <button className="mod-btn mod-btn--sm" onClick={() => setShowSync(true)}>Sync</button>
              <button className="mod-btn mod-btn--danger mod-btn--sm" onClick={logout}>Logout</button>
            </div>

            {/* ── Sync modal ── */}
            {showSync && (
              <div className="sync-modal-overlay" onClick={() => setShowSync(false)}>
                <div className="sync-modal" onClick={e => e.stopPropagation()}>
                  <div className="sync-modal__title">Link Devices</div>
                  <div className="sync-modal__section">
                    <div className="sync-modal__label">Your Spreadsheet ID</div>
                    <div className="sync-modal__id"
                      onClick={() => {
                        try {
                          navigator.clipboard.writeText(spreadsheetId ?? '');
                          addToast('Copied!', 'success');
                        } catch {
                          addToast('Failed to copy — use manual selection', 'error');
                        }
                      }}
                    >
                      {spreadsheetId ?? 'None'}
                    </div>
                    <div className="sync-modal__hint">Tap to copy. Share this ID with your other device.</div>
                  </div>
                  <div className="sync-modal__section">
                    <div className="sync-modal__label">Link to another device</div>
                    <input
                      className="sync-modal__input"
                      placeholder="Paste spreadsheet ID..."
                      value={syncInput}
                      onChange={e => setSyncInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleLinkDevice()}
                    />
                    <button
                      className="mod-btn"
                      style={{ width: '100%', marginTop: 8 }}
                      onClick={handleLinkDevice}
                      disabled={syncing || !syncInput.trim()}
                    >
                      {syncing ? 'Linking...' : 'Link'}
                    </button>
                  </div>
                  <button className="sync-modal__close" onClick={() => setShowSync(false)}>Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
