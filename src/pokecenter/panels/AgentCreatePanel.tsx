import { C, pf } from '../gba-theme';
import { PanelShell, SectionTitle } from './PanelShell';

interface Props {
  onClose: () => void;
}

export function AgentCreatePanel({ onClose }: Props) {
  return (
    <PanelShell title="🆕 CREATE NEW AGENT" onClose={onClose}>
      <div style={{ textAlign: 'center', padding: '20px 10px' }}>
        <div style={{
          width: 96, height: 96, margin: '0 auto 16px',
          background: `url(https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png) center/contain no-repeat`,
          imageRendering: 'pixelated',
          border: `2px solid ${C.panelBorder}`,
        }} />

        <div style={{ ...pf(9), color: C.textLight, marginBottom: 12, lineHeight: 2 }}>
          This feature is under construction!
        </div>
        <div style={{ ...pf(8), color: 'rgba(255,255,255,0.7)', lineHeight: 2, marginBottom: 20 }}>
          The Professor is still researching new agent types. Check back soon!
        </div>

        <SectionTitle>── PLANNED FEATURES ──</SectionTitle>
        <div style={{ textAlign: 'left', marginBottom: 20 }}>
          {[
            'Custom agent name & Pokemon avatar',
            'Agent type selection',
            'Data source configuration',
            'Schedule & trigger setup',
          ].map((f, i) => (
            <div key={i} style={{ ...pf(7), color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
              ► {f}
            </div>
          ))}
        </div>

        <button className="gba-btn" onClick={onClose} style={{ padding: '10px 20px' }}>
          GOT IT
        </button>
      </div>
    </PanelShell>
  );
}
