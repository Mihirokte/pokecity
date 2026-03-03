import { useState, useMemo, useCallback } from 'react';
import { useCityStore } from '../../stores/cityStore';
import { useUIStore } from '../../stores/uiStore';
import { SheetsService } from '../../services/sheetsService';
import { badgeUrl, MODULE_BADGE_IDS } from '../../config/pokemon';
import type { Resident, HealthMetric } from '../../types';

const METRIC_TYPES = ['weight', 'reps', 'sets', 'duration', 'distance', 'calories', 'custom'] as const;

const METRIC_LABELS: Record<string, string> = {
  weight: 'Weight',
  reps: 'Reps',
  sets: 'Sets',
  duration: 'Duration',
  distance: 'Distance',
  calories: 'Calories',
  custom: 'Custom',
};

const PRESETS: { label: string; metricType: string; unit: string }[] = [
  { label: 'Weight (kg)', metricType: 'weight', unit: 'kg' },
  { label: 'Reps', metricType: 'reps', unit: 'reps' },
  { label: 'Duration (min)', metricType: 'duration', unit: 'min' },
  { label: 'Distance (km)', metricType: 'distance', unit: 'km' },
];

interface HealthForm {
  date: string;
  metricType: string;
  value: string;
  unit: string;
  notes: string;
}

const emptyForm = (metricType: string): HealthForm => ({
  date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })(),
  metricType,
  value: '',
  unit: '',
  notes: '',
});

export function GymModule({ resident }: { resident: Resident }) {
  const moduleData = useCityStore(s => s.moduleData);
  const setModuleData = useCityStore(s => s.setModuleData);
  const addToast = useUIStore(s => s.addToast);

  const [activeType, setActiveType] = useState<string>('weight');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HealthForm>(emptyForm('weight'));

  const allMetrics = moduleData.healthMetrics;
  const residentMetrics = useMemo(
    () => allMetrics.filter(m => m.residentId === resident.id),
    [allMetrics, resident.id],
  );

  const filteredMetrics = useMemo(
    () =>
      residentMetrics
        .filter(m => m.metricType === activeType)
        .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : b.createdAt > a.createdAt ? 1 : -1)),
    [residentMetrics, activeType],
  );

  const latestValue = filteredMetrics[0] ?? null;

  // Last 14 data points for sparkline (oldest to newest)
  const sparklineData = useMemo(() => {
    const recent = filteredMetrics.slice(0, 14).reverse();
    return recent.map(m => parseFloat(m.value) || 0);
  }, [filteredMetrics]);

  const sparklineMax = useMemo(
    () => Math.max(...sparklineData, 1),
    [sparklineData],
  );

  const handleTabChange = useCallback((type: string) => {
    setActiveType(type);
    setForm(emptyForm(type));
    setShowForm(false);
  }, []);

  const handlePreset = useCallback((preset: { metricType: string; unit: string }) => {
    setActiveType(preset.metricType);
    setForm({
      ...emptyForm(preset.metricType),
      unit: preset.unit,
    });
    setShowForm(true);
  }, []);

  const updateField = useCallback(
    <K extends keyof HealthForm>(key: K, value: HealthForm[K]) => {
      setForm(prev => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleEdit = useCallback((m: HealthMetric) => {
    setEditingId(m.id);
    setForm({
      date: m.date,
      metricType: m.metricType,
      value: m.value,
      unit: m.unit ?? '',
      notes: m.notes ?? '',
    });
    setActiveType(m.metricType);
    setShowForm(true);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!form.value.trim()) {
      addToast('Value is required', 'error');
      return;
    }

    if (editingId) {
      const existing = allMetrics.find(m => m.id === editingId);
      if (!existing) {
        setEditingId(null);
        setShowForm(false);
        return;
      }
      const updated: HealthMetric = {
        ...existing,
        date: form.date,
        metricType: form.metricType,
        value: form.value.trim(),
        unit: form.unit.trim(),
        notes: form.notes.trim(),
      };
      const updatedList = allMetrics.map(m => m.id === editingId ? updated : m);
      setModuleData('healthMetrics', updatedList);
      setForm(emptyForm(activeType));
      setShowForm(false);
      setEditingId(null);
      addToast('Metric updated', 'success');
      try {
        await SheetsService.update('HealthMetrics', updated);
      } catch {
        setModuleData('healthMetrics', allMetrics);
        addToast('Failed to update metric', 'error');
      }
      return;
    }

    const entry: HealthMetric = {
      id: `health_${crypto.randomUUID()}`,
      residentId: resident.id,
      date: form.date,
      metricType: form.metricType,
      value: form.value.trim(),
      unit: form.unit.trim(),
      notes: form.notes.trim(),
      createdAt: new Date().toISOString(),
    };

    setModuleData('healthMetrics', [...allMetrics, entry]);
    setForm(emptyForm(activeType));
    setShowForm(false);
    addToast('Metric logged', 'success');

    try {
      await SheetsService.append('HealthMetrics', entry);
    } catch {
      setModuleData('healthMetrics', allMetrics);
      addToast('Failed to save metric', 'error');
    }
  }, [form, resident.id, allMetrics, activeType, editingId, setModuleData, addToast]);

  const handleDelete = useCallback(async (id: string) => {
    const prev = allMetrics;
    // Optimistic update
    setModuleData('healthMetrics', allMetrics.filter(m => m.id !== id));
    addToast('Metric deleted', 'info');

    try {
      await SheetsService.deleteRow('HealthMetrics', id);
    } catch {
      setModuleData('healthMetrics', prev);
      addToast('Failed to delete metric', 'error');
    }
  }, [allMetrics, setModuleData, addToast]);

  return (
    <div>
      {/* Header */}
      <div className="mod-header">
        <span className="mod-header__title-wrap">
          <img src={badgeUrl(MODULE_BADGE_IDS.gym)} alt="" className="pokecity-badge pokecity-badge--mod" />
          <span className="mod-title">Gym</span>
        </span>
        <button className="mod-btn mod-btn--sm" onClick={() => { setEditingId(null); setForm(emptyForm(activeType)); setShowForm(!showForm); }}>
          {showForm ? 'Cancel' : '+ Log'}
        </button>
      </div>

      {/* Metric type tabs */}
      <div className="mod-tabs">
        {METRIC_TYPES.map(type => (
          <button
            key={type}
            className={`mod-tab${activeType === type ? ' active' : ''}`}
            onClick={() => handleTabChange(type)}
          >
            {METRIC_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Quick-add presets */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {PRESETS.map(p => (
          <button key={p.metricType} className="mod-btn mod-btn--sm" onClick={() => handlePreset(p)}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Latest value card */}
      {latestValue ? (
        <div className="mod-card" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: '#8b9bb4', marginBottom: 4 }}>
            Latest {METRIC_LABELS[activeType]}
          </div>
          <div style={{ fontSize: 18, color: '#ffcd75', fontFamily: 'dogicabold' }}>
            {latestValue.value} <span style={{ fontSize: 10, color: '#8b9bb4' }}>{latestValue.unit}</span>
          </div>
          <div style={{ fontSize: 8, color: '#8b9bb4', marginTop: 4 }}>
            {latestValue.date}{latestValue.notes ? ` \u2014 ${latestValue.notes}` : ''}
          </div>
        </div>
      ) : (
        <div className="mod-empty">No {METRIC_LABELS[activeType]} entries yet.</div>
      )}

      {/* Sparkline */}
      {sparklineData.length > 1 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 8, color: '#8b9bb4', marginBottom: 4 }}>Last {sparklineData.length} readings</div>
          <div className="sparkline">
            {sparklineData.map((val, i) => (
              <div
                key={i}
                className="sparkline__bar"
                style={{ height: `${(val / sparklineMax) * 100}%` }}
                title={String(val)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inline form */}
      {showForm && (
        <div className="mod-form" style={{ marginBottom: 12 }}>
          <div className="mod-form-row">
            <label>
              Date
              <input
                type="date"
                value={form.date}
                onChange={e => updateField('date', e.target.value)}
              />
            </label>
            <label>
              Type
              <select
                value={form.metricType}
                onChange={e => { updateField('metricType', e.target.value); setActiveType(e.target.value); }}
              >
                {METRIC_TYPES.map(t => (
                  <option key={t} value={t}>{METRIC_LABELS[t]}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="mod-form-row">
            <label>
              Value
              <input
                type="text"
                placeholder="e.g. 72"
                value={form.value}
                onChange={e => updateField('value', e.target.value)}
              />
            </label>
            <label>
              Unit
              <input
                type="text"
                placeholder="e.g. kg"
                value={form.unit}
                onChange={e => updateField('unit', e.target.value)}
              />
            </label>
          </div>
          <label>
            Notes
            <input
              type="text"
              placeholder="Optional notes..."
              value={form.notes}
              onChange={e => updateField('notes', e.target.value)}
            />
          </label>
          <div className="mod-form-actions">
            <button className="mod-btn" onClick={handleCreate}>{editingId ? 'Update' : 'Save'}</button>
            <button className="mod-btn mod-btn--danger" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* History list */}
      {filteredMetrics.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: '#8b9bb4', marginBottom: 6 }}>History</div>
          {filteredMetrics.map(m => (
            <div key={m.id} className="mod-card" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10 }}>
                  <strong>{m.value}</strong> <span style={{ color: '#8b9bb4' }}>{m.unit}</span>
                </div>
                <div style={{ fontSize: 8, color: '#8b9bb4' }}>
                  {m.date}{m.notes ? ` \u2014 ${m.notes}` : ''}
                </div>
              </div>
              <button className="mod-btn mod-btn--sm" onClick={() => handleEdit(m)}>Edit</button>
              <button className="mod-btn mod-btn--danger mod-btn--sm" onClick={() => handleDelete(m.id)}>
                Del
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
