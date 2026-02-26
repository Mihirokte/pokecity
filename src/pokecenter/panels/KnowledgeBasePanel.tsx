import { usePokecenterStore } from '../pokecenterStore';
import { C, pf } from '../gba-theme';
import { PanelShell, SectionTitle } from './PanelShell';

interface Props {
  onClose: () => void;
}

export function KnowledgeBasePanel({ onClose }: Props) {
  const entries = usePokecenterStore(s => s.knowledgeEntries);
  return (
    <PanelShell title="📚 KNOWLEDGE BASE" onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{
          width: 48, height: 48,
          background: `url(https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png) center/contain no-repeat`,
          imageRendering: 'pixelated',
          border: `2px solid ${C.panelBorder}`,
          flexShrink: 0,
        }} />
        <div>
          <div style={{ ...pf(9), color: C.textLight, marginBottom: 4 }}>SCOUT'S LIBRARY</div>
          <div style={{ ...pf(7), color: 'rgba(255,255,255,0.6)' }}>
            {entries.length} entries compiled
          </div>
        </div>
      </div>

      <SectionTitle>── COMPILED ENTRIES ──</SectionTitle>
      {entries.length === 0 ? (
        <div style={{ ...pf(8), color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 20, lineHeight: 2 }}>
          No entries yet. Run Scout to fetch and index knowledge from your configured sources.
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          {entries.map(entry => (
            <div key={entry.id} style={{
              border: `1px solid rgba(255,255,255,0.1)`,
              padding: 8, marginBottom: 6, background: '#081418',
            }}>
              <div style={{ ...pf(8), color: C.textLight, marginBottom: 4 }}>{entry.title}</div>
              <div style={{ ...pf(6), color: C.statusBlue, marginBottom: 2 }}>Source: {entry.source}</div>
              <div style={{ ...pf(7), color: 'rgba(255,255,255,0.6)' }}>{entry.contentSummary}</div>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
