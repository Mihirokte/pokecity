import type { ReactNode } from 'react';
import { C, pf, gbaPanelStyle } from '../gba-theme';

// Shared panel wrapper — every overlay uses this
export function PanelShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 150,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      ...gbaPanelStyle,
    }}>
      {/* Title bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px',
        borderBottom: `3px solid ${C.panelBorder}`,
        background: C.panelBgLight,
        flexShrink: 0,
      }}>
        <span style={{ ...pf(10), color: C.textLight }}>{title}</span>
        <button className="gba-btn" onClick={onClose} style={{ fontSize: 8, padding: '4px 8px' }}>✕ CLOSE</button>
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px' }} className="gba-scrollbar">
        {children}
      </div>
    </div>
  );
}

// GBA section divider
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{
      ...pf(8), color: C.textLight,
      borderTop: `2px solid ${C.panelBorderDim}`,
      borderBottom: `2px solid ${C.panelBorderDim}`,
      padding: '6px 0', marginBottom: 10, marginTop: 6,
      textAlign: 'center',
    }}>
      {children}
    </div>
  );
}

// Progress bar
export function ProgressBar({ value, color, height = 10 }: { value: number; color?: string; height?: number }) {
  const barColor = color || (value >= 100 ? C.statusGreen : C.statusYellow);
  return (
    <div style={{ width: '100%', height, background: '#102030', border: `2px solid ${C.panelBorder}` }}>
      <div style={{
        width: `${Math.min(100, Math.max(0, value))}%`,
        height: '100%',
        background: barColor,
        transition: 'width 0.5s',
      }} />
    </div>
  );
}

// Status dot
export function StatusDot({ status, size = 8 }: { status: string; size?: number }) {
  const color = status === 'running' ? C.statusGreen :
                status === 'stopped' || status === 'error' ? C.statusRed :
                status === 'completed' ? C.statusWhite : C.statusBlue;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color,
      boxShadow: `0 0 4px ${color}`,
      animation: status === 'running' ? 'ledPulse 1.5s ease infinite' : 'none',
      flexShrink: 0,
    }} />
  );
}
