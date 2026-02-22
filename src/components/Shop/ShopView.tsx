import { useState, useCallback } from 'react';
import { useCityStore } from '../../stores/cityStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { HOUSE_TYPES, HOUSE_TYPE_LIST } from '../../config/houseTypes';
import { spriteUrl, spriteAnimatedUrl, PLAYER_POKEMON_ID } from '../../config/pokemon';
import { PokeCenterScene } from './PokeCenterScene';
import { CalendarModule } from '../Modules/CalendarModule';
import { TasksModule } from '../Modules/TasksModule';
import { NotesModule } from '../Modules/NotesModule';
import { TimeTrackerModule } from '../Modules/TimeTrackerModule';
import { HabitsModule } from '../Modules/HabitsModule';
import { TravelModule } from '../Modules/TravelModule';
import { HealthModule } from '../Modules/HealthModule';
import { ShoppingModule } from '../Modules/ShoppingModule';
import type { HouseModuleType, Resident } from '../../types';

const MODULE_MAP: Record<string, React.FC<{ resident: Resident }>> = {
  calendar: CalendarModule,
  tasks: TasksModule,
  notes: NotesModule,
  timetracker: TimeTrackerModule,
  habits: HabitsModule,
  travel: TravelModule,
  health: HealthModule,
  shopping: ShoppingModule,
};

export function ShopView() {
  const [menuOpen, setMenuOpen] = useState(false);
  const selectedAgentId = useUIStore(s => s.selectedAgentId);
  const selectAgent = useUIStore(s => s.selectAgent);
  const clearAgent = useUIStore(s => s.clearAgent);
  const addToast = useUIStore(s => s.addToast);
  const logout = useAuthStore(s => s.logout);

  const houses = useCityStore(s => s.houses);
  const residents = useCityStore(s => s.residents);
  const addResident = useCityStore(s => s.addResident);
  const removeResident = useCityStore(s => s.removeResident);
  const findOrCreateHouse = useCityStore(s => s.findOrCreateHouse);

  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);
  const [addingAgent, setAddingAgent] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentType, setNewAgentType] = useState<HouseModuleType>('tasks');

  const selectedAgent = residents.find(r => r.id === selectedAgentId);
  const hoveredAgent = residents.find(r => r.id === hoveredAgentId);
  const detailAgent = hoveredAgent;

  const getAgentHouseType = (r: Resident) => {
    const house = houses.find(h => h.id === r.houseId);
    return house ? HOUSE_TYPES[house.type] : null;
  };

  const getModuleComponent = () => {
    if (!selectedAgent) return null;
    const house = houses.find(h => h.id === selectedAgent.houseId);
    if (!house) return null;
    return MODULE_MAP[house.type] ?? null;
  };

  const ModuleComponent = getModuleComponent();

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

  const handleCloseMenu = () => {
    setMenuOpen(false);
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
      {/* ─── Three.js isometric scene (canvas background) ─── */}
      <PokeCenterScene dimmed={menuOpen} />

      {/* ─── DOM overlays on top of canvas ─── */}
      <div className={`pokecenter__ui${menuOpen ? ' pokecenter__ui--dim' : ''}`}>
        {/* Shopkeeper (Pikachu) — DOM overlay positioned over the 3D counter */}
        <div
          className="pokecenter__keeper"
          onClick={() => !menuOpen && setMenuOpen(true)}
        >
          <img
            src={spriteAnimatedUrl(PLAYER_POKEMON_ID)}
            alt="Shopkeeper"
            className="pokecenter__keeper-sprite"
          />
          <div className="pokecenter__bubble">{speechText}</div>
        </div>

        {!menuOpen && (
          <div className="pokecenter__interact">
            ▲ Click the shopkeeper
          </div>
        )}
      </div>

      {/* ─── Shop panel overlay ─── */}
      {menuOpen && (
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
                {selectedAgent ? selectedAgent.name : 'AGENTS'}
              </span>
              <button className="shop-panel__close" onClick={handleCloseMenu}>✕</button>
            </div>

            <div className="shop-panel__body">
              {!selectedAgent ? (
                <>
                  <div className="shop-panel__list">
                    {residents.map(r => {
                      const ht = getAgentHouseType(r);
                      return (
                        <div
                          key={r.id}
                          className="shop-panel__row"
                          onClick={() => selectAgent(r.id)}
                          onMouseEnter={() => setHoveredAgentId(r.id)}
                          onMouseLeave={() => setHoveredAgentId(null)}
                        >
                          <img src={spriteUrl(r.emoji)} alt={r.name} className="shop-panel__row-sprite" />
                          <span className="shop-panel__row-name">{r.name}</span>
                          {ht && (
                            <span className="shop-panel__row-badge" style={{ background: ht.color }}>
                              {ht.label}
                            </span>
                          )}
                          <span className="shop-panel__row-arrow">▸</span>
                        </div>
                      );
                    })}
                    {residents.length === 0 && !addingAgent && (
                      <div className="mod-empty">No agents yet. Add one to get started!</div>
                    )}
                    {addingAgent ? (
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
                        <button className="mod-btn" onClick={handleAddAgent}>Add</button>
                        <button className="mod-btn mod-btn--danger" onClick={() => setAddingAgent(false)}>✕</button>
                      </div>
                    ) : (
                      <button className="shop-panel__add-btn" onClick={() => setAddingAgent(true)}>+ Add Agent</button>
                    )}
                  </div>
                  {detailAgent && (
                    <div className="shop-panel__detail">
                      <img src={spriteUrl(detailAgent.emoji)} alt="" className="shop-panel__detail-sprite" />
                      <div className="shop-panel__detail-info">
                        <div className="shop-panel__detail-name">{detailAgent.name}</div>
                        <div className="shop-panel__detail-role">{detailAgent.role}</div>
                        <div className="shop-panel__detail-bio">{detailAgent.bio}</div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="shop-panel__agent-bar">
                    <div className="resident-panel__avatar" style={{ background: selectedAgent.avatarBg }}>
                      <img src={spriteUrl(selectedAgent.emoji)} alt={selectedAgent.name} className="resident-panel__sprite" />
                    </div>
                    <div>
                      <div className="resident-panel__name">{selectedAgent.name}</div>
                      <div className="resident-panel__role">{selectedAgent.role}</div>
                    </div>
                    <div style={{ flex: 1 }} />
                    <button className="resident-panel__delete" onClick={() => handleRemoveAgent(selectedAgent.id)}>Remove</button>
                  </div>
                  <div className="module-container">
                    {ModuleComponent && <ModuleComponent resident={selectedAgent} />}
                  </div>
                </>
              )}
            </div>

            <div className="shop-panel__footer">
              <span className="shop-panel__stats">🏠 {houses.length} &nbsp; 👤 {residents.length}</span>
              <div style={{ flex: 1 }} />
              <button className="mod-btn mod-btn--danger mod-btn--sm" onClick={logout}>Logout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
