import { useState, useCallback, useMemo, useEffect } from 'react';
import { useCityStore } from '../../stores/cityStore';
import { useUIStore } from '../../stores/uiStore';
import { SheetsService } from '../../services/sheetsService';
import { badgeUrl, MODULE_BADGE_IDS } from '../../config/pokemon';
import type { Resident, TripPlan, TripLeg, PackingItem } from '../../types';

interface TravelModuleProps {
  resident: Resident;
}

function parseLegs(trip: TripPlan): TripLeg[] {
  try {
    const parsed = JSON.parse(trip.legs);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parsePacking(trip: TripPlan): PackingItem[] {
  try {
    const parsed = JSON.parse(trip.packingList);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function daysRemaining(endDate: string): number | null {
  if (!endDate) return null;
  const end = new Date(endDate + 'T23:59:59');
  const now = new Date();
  if (end < now) return null;
  return Math.ceil((end.getTime() - now.getTime()) / 86400000);
}

const TRANSPORT_LABELS: Record<TripLeg['transport'], string> = {
  flight: 'Flight',
  train: 'Train',
  car: 'Car',
  bus: 'Bus',
  ferry: 'Ferry',
  other: 'Other',
};

export function TravelModule({ resident }: TravelModuleProps) {
  const tripPlans = useCityStore(s => s.moduleData.tripPlans);
  const setModuleData = useCityStore(s => s.setModuleData);
  const addCityXP = useCityStore(s => s.addCityXP);
  const addToast = useUIStore(s => s.addToast);

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDest, setFormDest] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'packing'>('itinerary');

  // Leg form state
  const [legFrom, setLegFrom] = useState('');
  const [legTo, setLegTo] = useState('');
  const [legDate, setLegDate] = useState('');
  const [legTransport, setLegTransport] = useState<TripLeg['transport']>('flight');
  const [legDetails, setLegDetails] = useState('');

  // Packing quick-add
  const [packingInput, setPackingInput] = useState('');
  // Trip notes inline edit (save on blur)
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editingNotesValue, setEditingNotesValue] = useState('');

  const myTrips = useMemo(
    () => tripPlans.filter(t => t.residentId === resident.id),
    [tripPlans, resident.id],
  );

  // Reset leg/packing form when switching trips
  /* eslint-disable react-hooks/set-state-in-effect -- reset form when selected trip changes */
  useEffect(() => {
    setLegFrom('');
    setLegTo('');
    setLegDate('');
    setLegTransport('flight');
    setLegDetails('');
    setPackingInput('');
  }, [expandedId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Helper to persist a trip update ──
  const updateTrip = useCallback(
    (updated: TripPlan) => {
      const prev = tripPlans;
      const next = prev.map(t => (t.id === updated.id ? updated : t));
      setModuleData('tripPlans', next);

      SheetsService.update('TripPlans', updated).catch(() => {
        setModuleData('tripPlans', prev);
        addToast('Failed to save trip', 'error');
      });
    },
    [tripPlans, setModuleData, addToast],
  );

  // ── Create trip ──
  const handleCreate = useCallback(() => {
    const name = formName.trim();
    const dest = formDest.trim();
    if (!name || !dest || !formStart || !formEnd) return;

    const now = new Date().toISOString();
    const trip: TripPlan = {
      id: `trip_${crypto.randomUUID()}`,
      residentId: resident.id,
      tripName: name,
      startDate: formStart,
      endDate: formEnd,
      destination: dest,
      legs: '[]',
      packingList: '[]',
      notes: '',
      createdAt: now,
      updatedAt: now,
    };

    const prev = tripPlans;
    setModuleData('tripPlans', [...tripPlans, trip]);
    setFormName('');
    setFormDest('');
    setFormStart('');
    setFormEnd('');
    setShowForm(false);
    addToast('Trip created', 'success');
    addCityXP(15, 'travel');

    SheetsService.append('TripPlans', trip).catch(() => {
      setModuleData('tripPlans', prev);
      addToast('Failed to save trip', 'error');
    });
  }, [formName, formDest, formStart, formEnd, resident.id, tripPlans, setModuleData, addToast, addCityXP]);

  // ── Delete trip ──
  const handleDelete = useCallback(
    (id: string) => {
      const prev = tripPlans;
      setModuleData('tripPlans', tripPlans.filter(t => t.id !== id));
      if (expandedId === id) setExpandedId(null);
      addToast('Trip deleted', 'info');

      SheetsService.deleteRow('TripPlans', id).catch(() => {
        setModuleData('tripPlans', prev);
        addToast('Failed to delete trip', 'error');
      });
    },
    [tripPlans, expandedId, setModuleData, addToast],
  );

  // ── Add leg ──
  const handleAddLeg = useCallback(
    (trip: TripPlan) => {
      if (!legFrom.trim() || !legTo.trim()) return;
      const legs = parseLegs(trip);
      const newLeg: TripLeg = {
        from: legFrom.trim(),
        to: legTo.trim(),
        date: legDate,
        transport: legTransport,
        details: legDetails.trim(),
      };
      const updated: TripPlan = {
        ...trip,
        legs: JSON.stringify([...legs, newLeg]),
        updatedAt: new Date().toISOString(),
      };
      updateTrip(updated);
      setLegFrom('');
      setLegTo('');
      setLegDate('');
      setLegTransport('flight');
      setLegDetails('');
    },
    [legFrom, legTo, legDate, legTransport, legDetails, updateTrip],
  );

  // ── Toggle packing item ──
  const togglePacked = useCallback(
    (trip: TripPlan, index: number) => {
      const items = parsePacking(trip);
      items[index] = { ...items[index], packed: !items[index].packed };
      const updated: TripPlan = {
        ...trip,
        packingList: JSON.stringify(items),
        updatedAt: new Date().toISOString(),
      };
      updateTrip(updated);
    },
    [updateTrip],
  );

  // ── Quick-add packing item ──
  const handleAddPackingItem = useCallback(
    (trip: TripPlan) => {
      const item = packingInput.trim();
      if (!item) return;
      const items = parsePacking(trip);
      const newItem: PackingItem = { item, packed: false };
      const updated: TripPlan = {
        ...trip,
        packingList: JSON.stringify([...items, newItem]),
        updatedAt: new Date().toISOString(),
      };
      updateTrip(updated);
      setPackingInput('');
    },
    [packingInput, updateTrip],
  );

  // ── Clear all packed items ──
  const clearPacked = useCallback(
    (trip: TripPlan) => {
      const items = parsePacking(trip).filter(i => !i.packed);
      const updated: TripPlan = {
        ...trip,
        packingList: JSON.stringify(items),
        updatedAt: new Date().toISOString(),
      };
      updateTrip(updated);
    },
    [updateTrip],
  );

  return (
    <div>
      {/* Header */}
      <div className="mod-header">
        <span className="mod-header__title-wrap">
          <img src={badgeUrl(MODULE_BADGE_IDS.travel)} alt="" className="pokecity-badge pokecity-badge--mod" />
          <span className="mod-title">Travel</span>
        </span>
        <button className="mod-btn mod-btn--sm" onClick={() => setShowForm(f => !f)}>
          {showForm ? 'Cancel' : '+ New Trip'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mod-form">
          <label>
            Trip Name
            <input
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="e.g. Tokyo Adventure"
            />
          </label>
          <label>
            Destination
            <input
              value={formDest}
              onChange={e => setFormDest(e.target.value)}
              placeholder="e.g. Tokyo, Japan"
            />
          </label>
          <div className="mod-form-row">
            <label style={{ flex: 1 }}>
              Start Date
              <input type="date" value={formStart} onChange={e => setFormStart(e.target.value)} />
            </label>
            <label style={{ flex: 1 }}>
              End Date
              <input type="date" value={formEnd} onChange={e => setFormEnd(e.target.value)} />
            </label>
          </div>
          <div className="mod-form-actions">
            <button className="mod-btn" onClick={handleCreate}>Create Trip</button>
          </div>
        </div>
      )}

      {/* Trip cards */}
      {myTrips.length === 0 && !showForm && (
        <div className="mod-empty">No trips planned. Start by creating one!</div>
      )}

      {myTrips.map(trip => {
        const isExpanded = expandedId === trip.id;
        const remaining = daysRemaining(trip.endDate);
        const legs = parseLegs(trip);
        const packingItems = parsePacking(trip);
        const packedCount = packingItems.filter(i => i.packed).length;

        return (
          <div className="mod-card" key={trip.id}>
            {/* Card header (accordion toggle) */}
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
              onClick={() => {
                setExpandedId(isExpanded ? null : trip.id);
                setActiveTab('itinerary');
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: '#e0e8f0' }}>{trip.tripName}</div>
                <div style={{ fontSize: 8, color: '#8b9bb4' }}>
                  {trip.destination} | {trip.startDate} to {trip.endDate}
                </div>
              </div>
              {remaining !== null && (
                <span style={{ fontSize: 8, color: '#ffcd75' }}>
                  {remaining} day{remaining !== 1 ? 's' : ''} left
                </span>
              )}
              <button
                className="mod-btn mod-btn--danger mod-btn--sm"
                onClick={e => { e.stopPropagation(); handleDelete(trip.id); }}
              >
                Del
              </button>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div style={{ marginTop: 12 }}>
                {/* Trip notes (view/edit, save on blur) */}
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 8, color: '#8b9bb4', display: 'block', marginBottom: 4 }}>Notes</label>
                  <textarea
                    value={editingNotesId === trip.id ? editingNotesValue : (trip.notes ?? '')}
                    onFocus={() => {
                      setEditingNotesId(trip.id);
                      setEditingNotesValue(trip.notes ?? '');
                    }}
                    onChange={e => setEditingNotesValue(e.target.value)}
                    onBlur={() => {
                      if (editingNotesId === trip.id && (trip.notes ?? '') !== editingNotesValue) {
                        updateTrip({ ...trip, notes: editingNotesValue });
                      }
                      setEditingNotesId(null);
                    }}
                    placeholder="Trip notes, reminders..."
                    rows={2}
                    style={{ width: '100%', resize: 'vertical', fontSize: 9 }}
                  />
                </div>
                {/* Tabs */}
                <div className="mod-tabs">
                  <div
                    className={`mod-tab${activeTab === 'itinerary' ? ' active' : ''}`}
                    onClick={() => setActiveTab('itinerary')}
                  >
                    Itinerary ({legs.length})
                  </div>
                  <div
                    className={`mod-tab${activeTab === 'packing' ? ' active' : ''}`}
                    onClick={() => setActiveTab('packing')}
                  >
                    Packing ({packedCount}/{packingItems.length})
                  </div>
                </div>

                {/* ── Itinerary Tab ── */}
                {activeTab === 'itinerary' && (
                  <div style={{ marginTop: 8 }}>
                    {legs.length > 0 && (
                      <div className="timeline">
                        {legs.map((leg, i) => (
                          <div className="timeline__item" key={i}>
                            <div style={{ fontSize: 9, color: '#ffcd75' }}>
                              {TRANSPORT_LABELS[leg.transport]}{leg.date ? ` \u2014 ${leg.date}` : ''}
                            </div>
                            <div style={{ fontSize: 10, color: '#e0e8f0' }}>
                              {leg.from} \u2192 {leg.to}
                            </div>
                            {leg.details && (
                              <div style={{ fontSize: 8, color: '#8b9bb4' }}>{leg.details}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {legs.length === 0 && (
                      <div style={{ fontSize: 8, color: '#8b9bb4', marginBottom: 8 }}>
                        No legs added yet.
                      </div>
                    )}

                    {/* Add leg form */}
                    <div className="mod-form" style={{ marginTop: 8 }}>
                      <div className="mod-form-row">
                        <label style={{ flex: 1 }}>
                          From
                          <input value={legFrom} onChange={e => setLegFrom(e.target.value)} placeholder="City A" />
                        </label>
                        <label style={{ flex: 1 }}>
                          To
                          <input value={legTo} onChange={e => setLegTo(e.target.value)} placeholder="City B" />
                        </label>
                      </div>
                      <div className="mod-form-row">
                        <label style={{ flex: 1 }}>
                          Date
                          <input type="date" value={legDate} onChange={e => setLegDate(e.target.value)} />
                        </label>
                        <label style={{ flex: 1 }}>
                          Transport
                          <select value={legTransport} onChange={e => setLegTransport(e.target.value as TripLeg['transport'])}>
                            <option value="flight">Flight</option>
                            <option value="train">Train</option>
                            <option value="car">Car</option>
                            <option value="bus">Bus</option>
                            <option value="ferry">Ferry</option>
                            <option value="other">Other</option>
                          </select>
                        </label>
                      </div>
                      <label>
                        Details
                        <input
                          value={legDetails}
                          onChange={e => setLegDetails(e.target.value)}
                          placeholder="Flight #, seat, etc."
                        />
                      </label>
                      <div className="mod-form-actions">
                        <button className="mod-btn mod-btn--sm" onClick={() => handleAddLeg(trip)}>
                          Add Leg
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Packing Tab ── */}
                {activeTab === 'packing' && (
                  <div style={{ marginTop: 8 }}>
                    {/* Quick-add */}
                    <div className="mod-form-row" style={{ marginBottom: 8 }}>
                      <input
                        style={{ flex: 1 }}
                        value={packingInput}
                        onChange={e => setPackingInput(e.target.value)}
                        placeholder="Add item..."
                        onKeyDown={e => e.key === 'Enter' && handleAddPackingItem(trip)}
                      />
                      <button className="mod-btn mod-btn--sm" onClick={() => handleAddPackingItem(trip)}>
                        Add
                      </button>
                    </div>

                    {/* Packing items */}
                    {packingItems.map((pi, i) => (
                      <div
                        key={i}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}
                      >
                        <div
                          className={`checkbox${pi.packed ? ' checked' : ''}`}
                          onClick={() => togglePacked(trip, i)}
                        >
                          {pi.packed ? '\u2713' : ''}
                        </div>
                        <span
                          style={{
                            fontSize: 9,
                            color: pi.packed ? '#8b9bb4' : '#e0e8f0',
                            textDecoration: pi.packed ? 'line-through' : 'none',
                          }}
                        >
                          {pi.item}
                        </span>
                      </div>
                    ))}

                    {packingItems.length === 0 && (
                      <div style={{ fontSize: 8, color: '#8b9bb4' }}>No items in packing list.</div>
                    )}

                    {/* Clear packed */}
                    {packedCount > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <button className="mod-btn mod-btn--danger mod-btn--sm" onClick={() => clearPacked(trip)}>
                          Clear Packed ({packedCount})
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
