import { useState, useRef } from 'react';
import { useCityStore } from '../../stores/cityStore';
import { SheetsService } from '../../services/sheetsService';
import { useUIStore } from '../../stores/uiStore';
import { PageHeader } from '../components/PageHeader';
import type { TripPlan, TripLeg, PackingItem } from '../../types';

export function Travel() {
  const tripPlans = useCityStore(s => s.moduleData.tripPlans);
  const setModuleData = useCityStore(s => s.setModuleData);
  const addToast = useUIStore(s => s.addToast);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [tripName, setTripName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const now = useMemo(() => Date.now(), []);

  const getDaysUntil = (dateStr: string) => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr).getTime() - now) / 86400000);
    return diff;
  };

  const parseLegs = (legsJson: string): TripLeg[] => {
    try { return JSON.parse(legsJson) || []; } catch { return []; }
  };

  const parsePacking = (packingJson: string): PackingItem[] => {
    try { return JSON.parse(packingJson) || []; } catch { return []; }
  };

  const addTrip = () => {
    if (!tripName.trim()) return;
    const trip: TripPlan = {
      id: `trip_${crypto.randomUUID()}`,
      residentId: '',
      tripName: tripName.trim(),
      startDate,
      endDate,
      destination: destination.trim(),
      legs: '[]',
      packingList: '[]',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setModuleData('tripPlans', [...tripPlans, trip]);
    SheetsService.append('TripPlans', trip).catch(() => addToast('Sync failed', 'error'));
    setTripName('');
    setDestination('');
    setStartDate('');
    setEndDate('');
    setShowForm(false);
    addToast('Trip created', 'success');
  };

  const deleteTrip = (id: string) => {
    setModuleData('tripPlans', tripPlans.filter(t => t.id !== id));
    SheetsService.deleteRow('TripPlans', id).catch(() => addToast('Sync failed', 'error'));
  };

  const togglePacking = (tripId: string, itemIndex: number) => {
    const updated = tripPlans.map(trip => {
      if (trip.id !== tripId) return trip;
      const items = parsePacking(trip.packingList);
      items[itemIndex] = { ...items[itemIndex], packed: !items[itemIndex].packed };
      return { ...trip, packingList: JSON.stringify(items), updatedAt: new Date().toISOString() };
    });
    setModuleData('tripPlans', updated);
    const trip = updated.find(t => t.id === tripId);
    if (trip) SheetsService.update('TripPlans', trip).catch(() => addToast('Sync failed', 'error'));
  };

  // Sort: upcoming first
  const sorted = [...tripPlans].sort((a, b) => (a.startDate || 'z').localeCompare(b.startDate || 'z'));

  return (
    <>
      <PageHeader
        title="Travel"
        description={`${tripPlans.length} trip plans`}
        actions={
          <button className="btn btn--primary" onClick={() => setShowForm(!showForm)}>
            + New Trip
          </button>
        }
      />

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="form-group">
            <label className="form-label">Trip Name</label>
            <input className="form-input" value={tripName} onChange={e => setTripName(e.target.value)} placeholder="Summer Vacation" />
          </div>
          <div className="form-group">
            <label className="form-label">Destination</label>
            <input className="form-input" value={destination} onChange={e => setDestination(e.target.value)} placeholder="Tokyo, Japan" />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Start Date</label>
              <input className="form-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">End Date</label>
              <input className="form-input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn--secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn--primary" onClick={addTrip}>Create</button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">&#x2708;</div>
          <div className="empty-state__text">No trips planned</div>
          <div className="empty-state__sub">Plan your next adventure</div>
        </div>
      ) : (
        sorted.map(trip => {
          const days = getDaysUntil(trip.startDate);
          const legs = parseLegs(trip.legs);
          const packing = parsePacking(trip.packingList);
          const isExpanded = expandedId === trip.id;

          return (
            <div key={trip.id} className="trip-card">
              <div className="trip-card__header" onClick={() => setExpandedId(isExpanded ? null : trip.id)} style={{ cursor: 'pointer' }}>
                <div>
                  <div className="trip-card__name">{trip.tripName}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {trip.destination} {trip.startDate && `\u2022 ${trip.startDate} to ${trip.endDate}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {days !== null && days >= 0 && (
                    <div className="trip-card__countdown">
                      {days === 0 ? 'Today!' : `${days} days`}
                    </div>
                  )}
                  {days !== null && days < 0 && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Completed</span>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginTop: 16 }}>
                  {legs.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div className="section__title">Itinerary</div>
                      <div className="timeline-modern">
                        {legs.map((leg, i) => (
                          <div key={i} className="timeline-modern__item">
                            <div className="timeline-modern__item-title">{leg.from} &rarr; {leg.to}</div>
                            <div className="timeline-modern__item-sub">
                              {leg.transport} {leg.date && `\u2022 ${leg.date}`} {leg.details && `\u2022 ${leg.details}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {packing.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div className="section__title">
                        Packing List ({packing.filter(p => p.packed).length}/{packing.length})
                      </div>
                      {packing.map((item, i) => (
                        <div key={i} className="shopping-item">
                          <button
                            className={`shopping-item__check ${item.packed ? 'shopping-item__check--checked' : ''}`}
                            onClick={() => togglePacking(trip.id, i)}
                          >
                            {item.packed ? '\u2713' : ''}
                          </button>
                          <span className={`shopping-item__name ${item.packed ? 'shopping-item__name--checked' : ''}`}>
                            {item.item}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn--danger btn--sm" onClick={() => deleteTrip(trip.id)}>
                      Delete Trip
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </>
  );
}
