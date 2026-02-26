// ── GBA Pokémon Center Color Palette ──
export const C = {
  floorLight: '#F8F0D0',
  floorDark: '#E8E0C0',
  wall: '#A08870',
  wallDark: '#8B7355',
  wallAccent: '#C8B898',
  desk: '#B0522D',
  deskLight: '#C8683E',
  deskTop: '#D07848',
  pcScreen: '#78C850',
  pcScreenBlue: '#30A7D7',
  pcBody: '#C8C8C8',
  pcBodyDark: '#A0A0A0',
  dialogBg: '#F8F8F8',
  dialogBorder: '#484848',
  dialogBorderOuter: '#282828',
  menuHighlight: '#3078F8',
  text: '#383838',
  textLight: '#F8F8F8',
  healPink: '#F85888',
  healPinkDark: '#D04868',
  plantGreen: '#5DBE5D',
  plantDark: '#3D8E3D',
  plantPot: '#C07040',
  statusGreen: '#48D848',
  statusRed: '#F84848',
  statusYellow: '#F8D030',
  statusBlue: '#58A8F8',
  statusWhite: '#F0F0F0',
  panelBg: '#0F2027',
  panelBgLight: '#1A3A4A',
  panelBorder: '#F8F8F8',
  panelBorderDim: '#607880',
  matDark: '#785030',
  matLight: '#A07050',
  doorFrame: '#787878',
  doorGlass: '#A8D8F0',
  black: '#000000',
  white: '#FFFFFF',
  pokeball: '#F83030',
  pokeballWhite: '#F0F0F0',
  priorityLow: '#48D848',
  priorityNormal: '#58A8F8',
  priorityHigh: '#F8D030',
  priorityUrgent: '#F84848',
} as const;

// ── Tile constants ──
export const TILE = 32;
export const MAP_W = 20;
export const MAP_H = 16;

// ── Pixel font helper ──
export const pf = (size = 10): React.CSSProperties => ({
  fontFamily: '"Press Start 2P", monospace',
  fontSize: size,
  lineHeight: size < 10 ? 1.4 : 1.8,
  imageRendering: 'pixelated' as const,
});

// ── Status helpers ──
export const statusColor = (status: string) => {
  switch (status) {
    case 'running': return C.statusGreen;
    case 'stopped': case 'error': return C.statusRed;
    case 'completed': return C.statusWhite;
    case 'idle': return C.statusBlue;
    default: return C.statusBlue;
  }
};

export const statusLabel = (status: string) => {
  switch (status) {
    case 'running': return 'RUNNING';
    case 'stopped': return 'STOPPED';
    case 'error': return 'ERROR';
    case 'completed': return 'COMPLETE';
    case 'idle': return 'IDLE';
    default: return 'UNKNOWN';
  }
};

// ── GBA panel border style (reusable) ──
export const gbaPanelStyle: React.CSSProperties = {
  background: C.panelBg,
  border: `4px solid ${C.panelBorder}`,
  boxShadow: `inset 2px 2px 0 ${C.panelBgLight}, inset -2px -2px 0 #081418`,
};

export const gbaDialogStyle: React.CSSProperties = {
  background: C.dialogBg,
  border: `4px solid ${C.dialogBorder}`,
  boxShadow: `0 0 0 2px ${C.dialogBorderOuter}, inset 2px 2px 0 #eee, inset -1px -1px 0 #ccc`,
};

// ── Shared CSS injected once ──
export const GBA_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

.pokecenter * { box-sizing: border-box; }

@keyframes ledPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
@keyframes ledBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.15; }
}
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}
@keyframes healGlow {
  0% { box-shadow: 0 0 4px ${C.healPink}; }
  50% { box-shadow: 0 0 16px ${C.healPink}, 0 0 32px ${C.healPinkDark}; }
  100% { box-shadow: 0 0 4px ${C.healPink}; }
}
@keyframes walkBob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}
@keyframes triangleBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
@keyframes progressPulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

.gba-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  padding: 8px 12px;
  border: 3px solid ${C.panelBorder};
  background: ${C.panelBgLight};
  color: ${C.textLight};
  cursor: pointer;
  image-rendering: pixelated;
  transition: background 0.1s;
  outline: none;
}
.gba-btn:hover, .gba-btn:focus {
  background: ${C.menuHighlight};
}
.gba-btn:active {
  background: ${C.panelBg};
}
.gba-btn[disabled] {
  opacity: 0.4;
  cursor: not-allowed;
}
.gba-btn[disabled]:hover {
  background: ${C.panelBgLight};
}

.gba-scrollbar::-webkit-scrollbar { width: 8px; }
.gba-scrollbar::-webkit-scrollbar-track { background: ${C.panelBg}; }
.gba-scrollbar::-webkit-scrollbar-thumb { background: ${C.panelBorderDim}; border: 1px solid ${C.panelBg}; }

.gba-input {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  padding: 8px 10px;
  border: 3px solid ${C.panelBorder};
  background: #081418;
  color: ${C.textLight};
  outline: none;
  width: 100%;
}
.gba-input:focus {
  border-color: ${C.menuHighlight};
}
.gba-input::placeholder {
  color: ${C.panelBorderDim};
}

.gba-textarea {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  padding: 8px 10px;
  border: 3px solid ${C.panelBorder};
  background: #081418;
  color: ${C.textLight};
  outline: none;
  width: 100%;
  resize: vertical;
  line-height: 1.8;
}
.gba-textarea:focus {
  border-color: ${C.menuHighlight};
}

.gba-select {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  padding: 6px 8px;
  border: 3px solid ${C.panelBorder};
  background: #081418;
  color: ${C.textLight};
  outline: none;
  cursor: pointer;
}
`;
