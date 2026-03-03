import { useState } from 'react';
import { useCityStore } from '../../stores/cityStore';
import { SheetsService } from '../../services/sheetsService';
import { useUIStore } from '../../stores/uiStore';
import { PageHeader } from '../components/PageHeader';
import type { HealthMetric } from '../../types';

const METRIC_TYPES = ['Weight', 'Bench Press', 'Squat', 'Deadlift', 'Running', 'Pull-ups', 'Push-ups'];
const PRESET_VALUES: Record<string, { values: number[]; unit: string }> = {
  'Weight': { values: [60, 65, 70, 75, 80], unit: 'kg' },
  'Bench Press': { values: [40, 50, 60, 70, 80], unit: 'kg' },
  'Squat': { values: [60, 80, 100, 120, 140], unit: 'kg' },
  'Deadlift': { values: [80, 100, 120, 140, 160], unit: 'kg' },
  'Running': { values: [1, 2, 3, 5, 10], unit: 'km' },
  'Pull-ups': { values: [5, 8, 10, 12, 15], unit: 'reps' },
  'Push-ups': { values: [10, 20, 30, 40, 50], unit: 'reps' },
};

export function Gym() {
  const healthMetrics = useCityStore(s => s.moduleData.healthMetrics);
  const setModuleData = useCityStore(s => s.setModuleData);
  const addToast = useUIStore(s => s.addToast);

  const [activeType, setActiveType] = useState(METRIC_TYPES[0]);
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('kg');

  const typeMetrics = healthMetrics
    .filter(m => m.metricType === activeType)
    .sort((a, b) => b.date.localeCompare(a.date));

  const addMetric = (val?: number) => {
    const numVal = val ?? parseFloat(value);
    if (isNaN(numVal)) return;

    const metric: HealthMetric = {
      id: `hm_${crypto.randomUUID()}`,
      residentId: '',
      date: new Date().toISOString().split('T')[0],
      metricType: activeType,
      value: String(numVal),
      unit: val ? (PRESET_VALUES[activeType]?.unit || unit) : unit,
      notes: '',
      createdAt: new Date().toISOString(),
    };
    setModuleData('healthMetrics', [...healthMetrics, metric]);
    SheetsService.append('HealthMetrics', metric).catch(() => addToast('Sync failed', 'error'));
    setValue('');
    addToast('Metric logged', 'success');
  };

  const deleteMetric = (id: string) => {
    setModuleData('healthMetrics', healthMetrics.filter(m => m.id !== id));
    SheetsService.deleteRow('HealthMetrics', id).catch(() => addToast('Sync failed', 'error'));
  };

  // Sparkline data: last 14 entries
  const sparkData = typeMetrics.slice(0, 14).reverse();
  const maxVal = Math.max(...sparkData.map(m => parseFloat(m.value) || 0), 1);

  const presets = PRESET_VALUES[activeType];

  return (
    <>
      <PageHeader
        title="Gym"
        description={`${healthMetrics.length} total entries logged`}
      />

      <div className="tabs">
        {METRIC_TYPES.map(type => (
          <button
            key={type}
            className={`tab ${activeType === type ? 'tab--active' : ''}`}
            onClick={() => { setActiveType(type); setUnit(PRESET_VALUES[type]?.unit || 'kg'); }}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Sparkline */}
      {sparkData.length > 1 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="section__title">Trend</div>
          <div className="sparkline-modern">
            {sparkData.map((m, i) => (
              <div
                key={i}
                className="sparkline-modern__bar"
                style={{ height: `${(parseFloat(m.value) / maxVal) * 100}%` }}
                title={`${m.date}: ${m.value} ${m.unit}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Quick Add */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section__title">Log {activeType}</div>
        <div className="metric-input-row">
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <input
              className="form-input"
              type="number"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Value"
              onKeyDown={e => e.key === 'Enter' && addMetric()}
            />
          </div>
          <div className="form-group" style={{ width: 80, marginBottom: 0 }}>
            <input className="form-input" value={unit} onChange={e => setUnit(e.target.value)} placeholder="unit" />
          </div>
          <button className="btn btn--primary" onClick={() => addMetric()}>Log</button>
        </div>

        {presets && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {presets.values.map(v => (
              <button key={v} className="btn btn--secondary btn--sm" onClick={() => addMetric(v)}>
                {v} {presets.unit}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div className="section">
        <div className="section__title">History ({typeMetrics.length})</div>
        {typeMetrics.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">&#x1F3CB;</div>
            <div className="empty-state__text">No entries for {activeType}</div>
            <div className="empty-state__sub">Log your first entry above</div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            {typeMetrics.slice(0, 20).map(metric => (
              <div key={metric.id} className="metric-entry">
                <span className="metric-entry__date">{metric.date}</span>
                <span className="metric-entry__value">{metric.value}</span>
                <span className="metric-entry__unit">{metric.unit}</span>
                <span style={{ flex: 1 }} />
                <button className="btn btn--ghost btn--sm" onClick={() => deleteMetric(metric.id)}>&#x2715;</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
