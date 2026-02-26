import React, { useState, useReducer, useEffect, useRef, useCallback, useMemo } from 'react';

// ============================================================
// 🎮 POKÉCENTER AGENT HUB — GBA-Authentic Agent Dashboard
// ============================================================

// ── COLOR PALETTE (GBA Pokémon Center) ──
const C = {
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
  panelBg: '#184860',
  panelBgLight: '#206078',
  panelBorder: '#F8F8F8',
  matDark: '#785030',
  matLight: '#A07050',
  doorFrame: '#787878',
  doorGlass: '#A8D8F0',
  black: '#000000',
  white: '#FFFFFF',
  pokeball: '#F83030',
  pokeballWhite: '#F0F0F0',
};

// ── TILE SIZE ──
const TILE = 32;
const MAP_W = 20;
const MAP_H = 16;

// ── TILE TYPES ──
const T = {
  FLOOR: 0,
  WALL: 1,
  WALL_DECO: 2,
  PC: 3,
  DESK: 4,
  NURSE: 5,
  HEAL: 6,
  PLANT: 7,
  BENCH: 8,
  MAT: 9,
  DOOR: 10,
  FLOOR_ALT: 11,
  POKEBALL_WALL: 12,
  SHELF: 13,
  POSTER: 14,
  BULLETIN: 15,
};

// ── MAP DATA (20×16) ──
// Row 0-1: Back wall, Row 2: PCs, Row 3: space behind PCs
// Row 4-6: open floor + heal machine, Row 7-8: desk + nurse
// Row 9-12: lobby, Row 13: decorations, Row 14: lobby, Row 15: mat+doors
const MAP = [
  // Row 0: Top wall
  [1,1,1,1,1,1,1,13,1,12,12,1,13,1,1,1,1,1,1,1],
  // Row 1: Wall with posters/shelves
  [1,14,1,1,1,1,1,13,1,12,12,1,13,1,1,1,15,1,1,1],
  // Row 2: PCs along wall
  [1,3,1,3,1,3,1,1,1,1,1,1,1,3,1,3,1,3,1,1],
  // Row 3: Space in front of PCs
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 4: Open floor + heal machine area
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,6,1],
  // Row 5: Open floor
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 6: Open floor
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 7: Reception desk
  [0,0,0,0,0,0,4,4,4,4,4,4,4,4,0,0,0,0,0,0],
  // Row 8: Nurse Joy behind desk
  [0,0,0,0,0,0,4,4,5,5,5,4,4,4,0,0,0,0,0,0],
  // Row 9: Open floor
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 10: Open floor
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 11: Open floor
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 12: Decorations row
  [0,7,0,0,0,0,0,0,0,0,0,0,0,0,7,0,8,8,0,0],
  // Row 13: Open floor
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 14: Mat area
  [0,0,0,0,0,0,0,0,9,9,9,9,0,0,0,0,0,0,0,0],
  // Row 15: Doors
  [1,1,1,1,1,1,1,10,10,10,10,10,10,1,1,1,1,1,1,1],
];

// ── COLLISION MAP (true = blocked) ──
const isBlocked = (x, y) => {
  if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return true;
  const tile = MAP[y][x];
  return [T.WALL, T.WALL_DECO, T.PC, T.DESK, T.NURSE, T.HEAL, T.BENCH, T.POKEBALL_WALL, T.SHELF, T.POSTER, T.BULLETIN, T.DOOR].includes(tile);
};

// ── INTERACTION MAP ──
const getInteraction = (x, y, dir) => {
  // Check tile the player is facing
  const fx = x + (dir === 'left' ? -1 : dir === 'right' ? 1 : 0);
  const fy = y + (dir === 'up' ? -1 : dir === 'down' ? 1 : 0);
  if (fx < 0 || fx >= MAP_W || fy < 0 || fy >= MAP_H) return null;
  const tile = MAP[fy][fx];
  if (tile === T.PC) {
    // Find which agent PC this is
    const pcPositions = [];
    for (let r = 0; r < MAP_H; r++) {
      for (let c = 0; c < MAP_W; c++) {
        if (MAP[r][c] === T.PC) pcPositions.push({ x: c, y: r });
      }
    }
    const idx = pcPositions.findIndex(p => p.x === fx && p.y === fy);
    if (idx >= 0) return { type: 'pc', agentIndex: idx };
  }
  if (tile === T.NURSE || tile === T.DESK) return { type: 'reception' };
  if (tile === T.HEAL) return { type: 'heal' };
  if (tile === T.PLANT) return { type: 'plant' };
  if (tile === T.BENCH) return { type: 'bench' };
  if (tile === T.POSTER) return { type: 'poster' };
  if (tile === T.BULLETIN) return { type: 'bulletin' };
  if (tile === T.DOOR) return { type: 'door' };
  return null;
};

// ── DEFAULT AGENTS ──
const defaultAgents = [
  {
    id: 'agent_1', name: 'Scout', pokemon: 'Eevee', pokemonId: 133,
    type: 'Knowledge Fetcher', typeIcon: '🔍',
    status: 'completed', description: 'Fetches and indexes information from configured sources.',
    lastRun: '2 hours ago', progress: 100, isRunOnce: true,
    logs: [
      { time: '14:30', message: 'Starting fetch from 3 sources...' },
      { time: '14:32', message: 'Fetched 24 documents from source A' },
      { time: '14:33', message: 'Indexing complete. 24/24 processed.' },
    ],
  },
  {
    id: 'agent_2', name: 'Taskmaster', pokemon: 'Machamp', pokemonId: 68,
    type: 'Task Manager', typeIcon: '📋',
    status: 'running', description: 'Manages daily tasks and priorities. Syncs with task board and calendar.',
    lastRun: '5 min ago', progress: 78, isRunOnce: false,
    logs: [
      { time: '14:32', message: 'Synced 12 tasks from board' },
      { time: '14:33', message: 'Updated 3 priority items' },
      { time: '14:35', message: 'Scheduled 2 reminders' },
    ],
  },
  {
    id: 'agent_3', name: 'Scribe', pokemon: 'Alakazam', pokemonId: 65,
    type: 'Writer', typeIcon: '✍️',
    status: 'idle', description: 'Generates documents, reports, and content on demand.',
    lastRun: '1 day ago', progress: 0, isRunOnce: false,
    logs: [
      { time: '09:00', message: 'Standing by for writing tasks.' },
    ],
  },
  {
    id: 'agent_4', name: 'Sentinel', pokemon: 'Umbreon', pokemonId: 197,
    type: 'Monitor', typeIcon: '🛡️',
    status: 'running', description: 'Watches for changes across configured sources and sends alerts.',
    lastRun: '1 min ago', progress: 55, isRunOnce: false,
    logs: [
      { time: '14:30', message: 'Monitoring 5 sources...' },
      { time: '14:34', message: 'Change detected in source B' },
      { time: '14:35', message: 'Alert dispatched.' },
    ],
  },
  {
    id: 'agent_5', name: 'Courier', pokemon: 'Pidgeot', pokemonId: 18,
    type: 'Messenger', typeIcon: '📨',
    status: 'idle', description: 'Handles notifications, messages, and communication routing.',
    lastRun: '3 hours ago', progress: 0, isRunOnce: false,
    logs: [
      { time: '11:00', message: 'All messages delivered. Standing by.' },
    ],
  },
  {
    id: 'agent_6', name: 'Analyst', pokemon: 'Metagross', pokemonId: 376,
    type: 'Data Cruncher', typeIcon: '📊',
    status: 'running', description: 'Processes data from Google Sheets and generates insights.',
    lastRun: '2 min ago', progress: 65, isRunOnce: false,
    logs: [
      { time: '14:28', message: 'Processing 1,200 rows...' },
      { time: '14:32', message: '800/1200 rows processed' },
      { time: '14:35', message: 'Generating summary report...' },
    ],
  },
];

// ── AGENT REDUCER ──
function agentReducer(state, action) {
  switch (action.type) {
    case 'START_AGENT':
      return state.map(a => a.id === action.id ? { ...a, status: 'running', progress: a.progress >= 100 ? 0 : a.progress } : a);
    case 'STOP_AGENT':
      return state.map(a => a.id === action.id ? { ...a, status: 'stopped' } : a);
    case 'COMPLETE_AGENT':
      return state.map(a => a.id === action.id ? { ...a, status: 'completed', progress: 100 } : a);
    case 'UPDATE_PROGRESS':
      return state.map(a => a.id === action.id ? { ...a, progress: Math.min(100, a.progress + action.amount) } : a);
    case 'ADD_LOG':
      return state.map(a => a.id === action.id ? { ...a, logs: [...a.logs, action.log], lastRun: 'just now' } : a);
    case 'SET_STATUS':
      return state.map(a => a.id === action.id ? { ...a, status: action.status } : a);
    default:
      return state;
  }
}

// ── STATUS HELPERS ──
const statusColor = (status) => {
  switch (status) {
    case 'running': return C.statusGreen;
    case 'stopped': return C.statusRed;
    case 'error': return C.statusRed;
    case 'completed': return C.statusWhite;
    case 'idle': return C.statusBlue;
    default: return C.statusBlue;
  }
};
const statusLabel = (status) => {
  switch (status) {
    case 'running': return 'RUNNING';
    case 'stopped': return 'STOPPED';
    case 'error': return 'ERROR';
    case 'completed': return 'COMPLETE';
    case 'idle': return 'IDLE';
    default: return 'UNKNOWN';
  }
};

// ── PIXEL FONT STYLE ──
const pf = (size = 10) => ({
  fontFamily: '"Press Start 2P", monospace',
  fontSize: size,
  lineHeight: size < 10 ? '1.4' : '1.8',
  color: C.text,
  imageRendering: 'pixelated',
});

// ============================================================
// 🎮 MAIN COMPONENT
// ============================================================
export default function PokecenterHub() {
  // ── STATE ──
  const [playerPos, setPlayerPos] = useState({ x: 10, y: 13 });
  const [playerDir, setPlayerDir] = useState('up');
  const [isWalking, setIsWalking] = useState(false);
  const [walkFrame, setWalkFrame] = useState(0);
  const [agents, dispatch] = useReducer(agentReducer, defaultAgents);
  const [activePanel, setActivePanel] = useState(null); // null | 'reception' | agent id
  const [dialogue, setDialogue] = useState(null);
  const [dialogueIdx, setDialogueIdx] = useState(0);
  const [dialogueComplete, setDialogueComplete] = useState(false);
  const [menuSelection, setMenuSelection] = useState(0);
  const [showConfirm, setShowConfirm] = useState(null);
  const [confirmIdx, setConfirmIdx] = useState(0);
  const [showLogs, setShowLogs] = useState(false);
  const [agentPanelTab, setAgentPanelTab] = useState(0); // 0=info, 1=logs
  const [healAnimating, setHealAnimating] = useState(false);

  const moveTimerRef = useRef(null);
  const dialogueTimerRef = useRef(null);
  const containerRef = useRef(null);

  // ── FIND PC POSITIONS ──
  const pcPositions = useMemo(() => {
    const pcs = [];
    for (let r = 0; r < MAP_H; r++) {
      for (let c = 0; c < MAP_W; c++) {
        if (MAP[r][c] === T.PC) pcs.push({ x: c, y: r });
      }
    }
    return pcs;
  }, []);

  // ── TYPEWRITER DIALOGUE ──
  const showDialogue = useCallback((text, onDone) => {
    setDialogue({ text, full: text, displayed: '', onDone });
    setDialogueIdx(0);
    setDialogueComplete(false);
  }, []);

  useEffect(() => {
    if (!dialogue || dialogueComplete) return;
    if (dialogueIdx >= dialogue.full.length) {
      setDialogueComplete(true);
      setDialogue(d => d ? { ...d, displayed: d.full } : null);
      return;
    }
    dialogueTimerRef.current = setTimeout(() => {
      setDialogue(d => d ? { ...d, displayed: d.full.slice(0, dialogueIdx + 1) } : null);
      setDialogueIdx(i => i + 1);
    }, 28);
    return () => clearTimeout(dialogueTimerRef.current);
  }, [dialogue, dialogueIdx, dialogueComplete]);

  const advanceDialogue = useCallback(() => {
    if (!dialogue) return;
    if (!dialogueComplete) {
      // Skip to end
      setDialogue(d => d ? { ...d, displayed: d.full } : null);
      setDialogueIdx(dialogue.full.length);
      setDialogueComplete(true);
    } else {
      const cb = dialogue.onDone;
      setDialogue(null);
      setDialogueIdx(0);
      setDialogueComplete(false);
      if (cb) cb();
    }
  }, [dialogue, dialogueComplete]);

  // ── SIMULATE AGENT PROGRESS ──
  useEffect(() => {
    const iv = setInterval(() => {
      agents.forEach(a => {
        if (a.status === 'running' && a.progress < 100) {
          const inc = Math.random() * 2 + 0.5;
          dispatch({ type: 'UPDATE_PROGRESS', id: a.id, amount: inc });
          // Occasional log entry
          if (Math.random() < 0.05) {
            const now = new Date();
            const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
            const msgs = [
              'Processing data batch...',
              'Syncing updates...',
              'Running analysis...',
              'Checking sources...',
              'Indexing new entries...',
              'Optimizing results...',
            ];
            dispatch({ type: 'ADD_LOG', id: a.id, log: { time, message: msgs[Math.floor(Math.random()*msgs.length)] } });
          }
        }
        // Auto-complete running agents at 100%
        if (a.status === 'running' && a.progress >= 100) {
          dispatch({ type: 'COMPLETE_AGENT', id: a.id });
          const now = new Date();
          const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
          dispatch({ type: 'ADD_LOG', id: a.id, log: { time, message: 'Task completed successfully!' } });
        }
      });
    }, 1500);
    return () => clearInterval(iv);
  }, [agents]);

  // ── MOVEMENT ──
  const movePlayer = useCallback((dir) => {
    if (activePanel || dialogue) return;
    setPlayerDir(dir);
    const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    const nx = playerPos.x + dx;
    const ny = playerPos.y + dy;
    if (!isBlocked(nx, ny)) {
      setPlayerPos({ x: nx, y: ny });
      setIsWalking(true);
      setWalkFrame(f => (f + 1) % 2);
      clearTimeout(moveTimerRef.current);
      moveTimerRef.current = setTimeout(() => setIsWalking(false), 180);
    }
  }, [playerPos, activePanel, dialogue]);

  // ── INTERACT ──
  const interact = useCallback(() => {
    if (showConfirm) {
      // Handle confirm dialog
      if (confirmIdx === 0) { // YES
        const agent = agents.find(a => a.id === showConfirm.agentId);
        if (showConfirm.action === 'stop' && agent) {
          dispatch({ type: 'STOP_AGENT', id: agent.id });
          const now = new Date();
          const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
          dispatch({ type: 'ADD_LOG', id: agent.id, log: { time, message: 'Agent stopped by trainer.' } });
        }
      }
      setShowConfirm(null);
      setConfirmIdx(0);
      return;
    }

    if (dialogue) {
      advanceDialogue();
      return;
    }

    if (activePanel) return;

    const interaction = getInteraction(playerPos.x, playerPos.y, playerDir);
    if (!interaction) return;

    switch (interaction.type) {
      case 'reception':
        showDialogue("Welcome to the POKECENTER CONTROL HUB! Let me show you the status of all your agents.", () => {
          setActivePanel('reception');
        });
        break;
      case 'pc': {
        const agent = agents[interaction.agentIndex];
        if (agent) {
          showDialogue(`Accessing ${agent.name.toUpperCase()}'s terminal... ${agent.pokemon} is on standby.`, () => {
            setActivePanel(agent.id);
            setAgentPanelTab(0);
            setShowLogs(false);
          });
        } else {
          showDialogue("This PC is empty. No agent assigned yet.");
        }
        break;
      }
      case 'heal':
        showDialogue("The HEALING MACHINE hums softly... All agent systems refreshed!", () => {
          setHealAnimating(true);
          setTimeout(() => setHealAnimating(false), 2000);
          agents.forEach(a => {
            if (a.status === 'stopped' || a.status === 'error') {
              dispatch({ type: 'SET_STATUS', id: a.id, status: 'idle' });
            }
          });
        });
        break;
      case 'plant':
        showDialogue("A nice potted plant. It adds some life to the center.");
        break;
      case 'bench':
        showDialogue("A bench for waiting trainers. Looks comfy.");
        break;
      case 'poster':
        showDialogue("A poster reads: 'Keep your agents healthy! Regular maintenance is key.'");
        break;
      case 'bulletin':
        showDialogue("The bulletin board has various notices... 'Agent Tips: Always check logs before restarting!'");
        break;
      case 'door':
        showDialogue("The automatic doors. You can't leave while agents are running... just kidding!");
        break;
      default:
        break;
    }
  }, [playerPos, playerDir, activePanel, dialogue, agents, showDialogue, advanceDialogue, showConfirm, confirmIdx]);

  // ── KEYBOARD INPUT ──
  useEffect(() => {
    const handleKey = (e) => {
      // Global escape
      if (e.key === 'Escape' || e.key === 'x' || e.key === 'X') {
        if (showConfirm) { setShowConfirm(null); setConfirmIdx(0); return; }
        if (activePanel) { setActivePanel(null); setShowLogs(false); setAgentPanelTab(0); return; }
        if (dialogue) { setDialogue(null); setDialogueIdx(0); setDialogueComplete(false); return; }
        return;
      }

      // Confirm dialog navigation
      if (showConfirm) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'w' || e.key === 's') {
          setConfirmIdx(i => i === 0 ? 1 : 0);
        }
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'z' || e.key === 'Z') {
          interact();
        }
        return;
      }

      // Dialogue
      if (dialogue) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'z' || e.key === 'Z') {
          interact();
        }
        return;
      }

      // Panel open — no movement
      if (activePanel) {
        return;
      }

      // Movement
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { movePlayer('up'); return; }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { movePlayer('down'); return; }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { movePlayer('left'); return; }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { movePlayer('right'); return; }

      // Interact
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'z' || e.key === 'Z') {
        interact();
        return;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [movePlayer, interact, activePanel, dialogue, showConfirm]);

  // Focus container on mount
  useEffect(() => {
    if (containerRef.current) containerRef.current.focus();
  }, []);

  // ── AGENT PANEL ACTIONS ──
  const handleAgentAction = (agent, action) => {
    switch (action) {
      case 'run':
        dispatch({ type: 'START_AGENT', id: agent.id });
        dispatch({ type: 'ADD_LOG', id: agent.id, log: { time: getNow(), message: 'Agent started by trainer.' } });
        break;
      case 'stop':
        setShowConfirm({ agentId: agent.id, action: 'stop', text: `Stop ${agent.name.toUpperCase()}?` });
        setConfirmIdx(0);
        break;
      case 'logs':
        setAgentPanelTab(1);
        break;
      case 'config':
        showDialogue("Configuration coming soon, Trainer! Check back later.");
        break;
      default: break;
    }
  };

  const getNow = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  // ── AGENT STATUS COUNTS ──
  const statusCounts = useMemo(() => {
    const counts = { running: 0, stopped: 0, idle: 0, completed: 0, error: 0 };
    agents.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1; });
    return counts;
  }, [agents]);

  // ============================================================
  // 🎨 RENDER
  // ============================================================
  return (
    <>
      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #000; overflow: hidden; }
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
        .gba-btn {
          font-family: 'Press Start 2P', monospace;
          font-size: 9px;
          padding: 8px 12px;
          border: 3px solid ${C.panelBorder};
          background: ${C.panelBg};
          color: ${C.textLight};
          cursor: pointer;
          image-rendering: pixelated;
          transition: background 0.1s;
        }
        .gba-btn:hover {
          background: ${C.menuHighlight};
        }
        .gba-btn:active {
          background: ${C.panelBgLight};
        }
        .gba-btn[disabled] {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .gba-scrollbar::-webkit-scrollbar { width: 8px; }
        .gba-scrollbar::-webkit-scrollbar-track { background: ${C.panelBg}; }
        .gba-scrollbar::-webkit-scrollbar-thumb { background: ${C.panelBorder}; border: 1px solid ${C.panelBg}; }
      `}</style>

      <div
        ref={containerRef}
        tabIndex={0}
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          overflow: 'hidden',
          outline: 'none',
        }}
      >
        {/* GBA Screen Frame */}
        <div style={{
          width: MAP_W * TILE,
          height: MAP_H * TILE + 130,
          background: '#181818',
          borderRadius: 8,
          border: '4px solid #333',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 0 40px rgba(0,0,0,0.8), inset 0 0 2px #444',
        }}>
          {/* ── MAP VIEWPORT ── */}
          <div style={{
            width: MAP_W * TILE,
            height: MAP_H * TILE,
            position: 'relative',
            overflow: 'hidden',
            imageRendering: 'pixelated',
          }}>
            {/* Floor tiles */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `repeating-conic-gradient(${C.floorLight} 0% 25%, ${C.floorDark} 0% 50%) 0 0 / ${TILE*2}px ${TILE*2}px`,
            }} />

            {/* Map tiles */}
            {MAP.map((row, ry) => row.map((tile, cx) => {
              if (tile === T.FLOOR) return null;
              return <MapTile key={`${cx}-${ry}`} tile={tile} x={cx} y={ry} agents={agents} pcPositions={pcPositions} healAnimating={healAnimating} />;
            }))}

            {/* NPC: Nurse Joy */}
            <NurseJoy />

            {/* Player */}
            <Player pos={playerPos} dir={playerDir} walking={isWalking} frame={walkFrame} />

            {/* Interaction hint */}
            {!activePanel && !dialogue && (() => {
              const interaction = getInteraction(playerPos.x, playerPos.y, playerDir);
              if (!interaction) return null;
              const fx = playerPos.x + (playerDir === 'left' ? -1 : playerDir === 'right' ? 1 : 0);
              const fy = playerPos.y + (playerDir === 'up' ? -1 : playerDir === 'down' ? 1 : 0);
              return (
                <div style={{
                  position: 'absolute',
                  left: fx * TILE + TILE/2 - 8,
                  top: fy * TILE - 4,
                  ...pf(7),
                  color: C.white,
                  textShadow: '1px 1px 0 #000',
                  animation: 'bounce 0.8s ease infinite',
                  pointerEvents: 'none',
                  zIndex: 50,
                }}>▼</div>
              );
            })()}
          </div>

          {/* ── DIALOGUE BOX ── */}
          {dialogue && (
            <div style={{
              position: 'absolute',
              bottom: 4,
              left: 4,
              right: 4,
              height: 120,
              background: C.dialogBg,
              border: `4px solid ${C.dialogBorder}`,
              borderRadius: 8,
              boxShadow: `0 0 0 2px ${C.dialogBorderOuter}, inset 2px 2px 0 #eee, inset -1px -1px 0 #ccc`,
              padding: '14px 18px',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <div style={{ ...pf(11), lineHeight: '2', color: C.text }}>
                {dialogue.displayed}
              </div>
              {dialogueComplete && (
                <div style={{
                  alignSelf: 'flex-end',
                  ...pf(10),
                  animation: 'triangleBlink 0.6s ease infinite',
                  color: C.text,
                }}>▼</div>
              )}
            </div>
          )}

          {/* ── CONFIRM DIALOG ── */}
          {showConfirm && (
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              background: C.dialogBg,
              border: `4px solid ${C.dialogBorder}`,
              borderRadius: 8,
              boxShadow: `0 0 0 2px ${C.dialogBorderOuter}`,
              padding: '16px 24px',
              zIndex: 200,
              minWidth: 280,
            }}>
              <div style={{ ...pf(10), marginBottom: 16, color: C.text }}>
                {showConfirm.text}
              </div>
              {['YES', 'NO'].map((opt, i) => (
                <div key={opt} style={{
                  ...pf(10),
                  padding: '6px 12px',
                  background: confirmIdx === i ? C.menuHighlight : 'transparent',
                  color: confirmIdx === i ? C.white : C.text,
                  cursor: 'pointer',
                  marginBottom: 2,
                }} onClick={() => { setConfirmIdx(i); interact(); }}>
                  {confirmIdx === i ? '▶ ' : '  '}{opt}
                </div>
              ))}
            </div>
          )}

          {/* ── CONTROL HINTS ── */}
          {!activePanel && !dialogue && (
            <div style={{
              position: 'absolute',
              bottom: 6,
              right: 10,
              ...pf(7),
              color: 'rgba(255,255,255,0.5)',
              textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
              zIndex: 10,
              lineHeight: '1.8',
              textAlign: 'right',
            }}>
              Arrow Keys: Move<br/>
              Z/Enter: Interact<br/>
              X/Esc: Back
            </div>
          )}

          {/* ── RECEPTION PANEL (Overview Dashboard) ── */}
          {activePanel === 'reception' && (
            <ReceptionPanel
              agents={agents}
              statusCounts={statusCounts}
              onClose={() => setActivePanel(null)}
              onSelectAgent={(id) => { setActivePanel(id); setAgentPanelTab(0); setShowLogs(false); }}
            />
          )}

          {/* ── AGENT DETAIL PANEL ── */}
          {activePanel && activePanel !== 'reception' && (() => {
            const agent = agents.find(a => a.id === activePanel);
            if (!agent) return null;
            return (
              <AgentPanel
                agent={agent}
                tab={agentPanelTab}
                onTabChange={setAgentPanelTab}
                onAction={(action) => handleAgentAction(agent, action)}
                onClose={() => { setActivePanel(null); setShowLogs(false); setAgentPanelTab(0); }}
              />
            );
          })()}
        </div>
      </div>
    </>
  );
}

// ============================================================
// 🗺️ MAP TILE COMPONENT
// ============================================================
function MapTile({ tile, x, y, agents, pcPositions, healAnimating }) {
  const style = {
    position: 'absolute',
    left: x * TILE,
    top: y * TILE,
    width: TILE,
    height: TILE,
    imageRendering: 'pixelated',
  };

  switch (tile) {
    case T.WALL:
      return (
        <div style={{ ...style, background: C.wall, borderBottom: `2px solid ${C.wallDark}` }}>
          {/* Wall texture lines */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: C.wallDark }} />
          <div style={{ position: 'absolute', top: 8, left: 4, right: 4, height: 1, background: C.wallAccent, opacity: 0.4 }} />
        </div>
      );

    case T.POKEBALL_WALL:
      return (
        <div style={{ ...style, background: C.wall, borderBottom: `2px solid ${C.wallDark}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: C.wallDark }} />
          {/* Pokeball emblem */}
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            background: `linear-gradient(to bottom, ${C.pokeball} 50%, ${C.pokeballWhite} 50%)`,
            border: `2px solid ${C.black}`,
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              width: 6, height: 6, borderRadius: '50%', background: C.white, border: `2px solid ${C.black}`,
            }} />
          </div>
        </div>
      );

    case T.SHELF:
      return (
        <div style={{ ...style, background: C.wall, borderBottom: `2px solid ${C.wallDark}` }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: C.wallDark }} />
          {/* Shelf */}
          <div style={{ position: 'absolute', bottom: 8, left: 2, right: 2, height: 3, background: C.deskLight, borderRadius: 1 }} />
          <div style={{ position: 'absolute', bottom: 12, left: 6, width: 6, height: 4, background: '#88b8d8', borderRadius: 1 }} />
          <div style={{ position: 'absolute', bottom: 12, left: 16, width: 6, height: 6, background: '#d88888', borderRadius: 1 }} />
        </div>
      );

    case T.POSTER:
      return (
        <div style={{ ...style, background: C.wall, borderBottom: `2px solid ${C.wallDark}` }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: C.wallDark }} />
          {/* Poster */}
          <div style={{
            position: 'absolute', top: 4, left: 6, width: 20, height: 22,
            background: '#F8F0D0', border: `2px solid ${C.wallDark}`, borderRadius: 1,
          }}>
            <div style={{ width: 12, height: 2, background: C.text, margin: '4px auto 2px', opacity: 0.6 }} />
            <div style={{ width: 14, height: 2, background: C.text, margin: '2px auto', opacity: 0.4 }} />
            <div style={{ width: 10, height: 2, background: C.text, margin: '2px auto', opacity: 0.4 }} />
          </div>
        </div>
      );

    case T.BULLETIN:
      return (
        <div style={{ ...style, background: C.wall, borderBottom: `2px solid ${C.wallDark}` }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: C.wallDark }} />
          {/* Bulletin board */}
          <div style={{
            position: 'absolute', top: 3, left: 4, width: 24, height: 24,
            background: '#A08060', border: `2px solid ${C.wallDark}`, borderRadius: 1,
          }}>
            <div style={{ position: 'absolute', top: 3, left: 3, width: 8, height: 6, background: '#F8E858', transform: 'rotate(-5deg)' }} />
            <div style={{ position: 'absolute', top: 4, left: 13, width: 7, height: 5, background: '#88D0F0', transform: 'rotate(3deg)' }} />
            <div style={{ position: 'absolute', top: 12, left: 5, width: 9, height: 6, background: '#F89888', transform: 'rotate(2deg)' }} />
          </div>
        </div>
      );

    case T.PC: {
      // Find which agent this PC represents
      const pcIdx = pcPositions.findIndex(p => p.x === x && p.y === y);
      const agent = agents[pcIdx];
      const ledColor = agent ? statusColor(agent.status) : '#555';
      const ledAnim = agent?.status === 'running' ? 'ledPulse 1.5s ease infinite' :
                      agent?.status === 'idle' ? 'none' :
                      agent?.status === 'completed' ? 'none' :
                      agent?.status === 'error' || agent?.status === 'stopped' ? 'none' :
                      'none';
      return (
        <div style={{ ...style, background: C.wall }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: C.wallDark }} />
          {/* PC body */}
          <div style={{
            position: 'absolute', bottom: 6, left: 5, width: 22, height: 20,
            background: C.pcBody, border: `2px solid ${C.pcBodyDark}`, borderRadius: 2,
          }}>
            {/* Screen */}
            <div style={{
              position: 'absolute', top: 2, left: 2, right: 2, height: 10,
              background: agent ? '#183018' : '#222',
              border: `1px solid #555`,
            }}>
              {agent && <div style={{
                position: 'absolute', top: 2, left: 2, width: '60%', height: 2,
                background: C.pcScreen, opacity: 0.7,
              }} />}
              {agent && <div style={{
                position: 'absolute', top: 6, left: 2, width: '40%', height: 2,
                background: C.pcScreen, opacity: 0.5,
              }} />}
            </div>
            {/* LED */}
            <div style={{
              position: 'absolute', bottom: 2, right: 3,
              width: 4, height: 4, borderRadius: '50%',
              background: ledColor,
              boxShadow: `0 0 4px ${ledColor}`,
              animation: ledAnim,
            }} />
          </div>
          {/* Agent name label */}
          {agent && (
            <div style={{
              position: 'absolute', bottom: -2, left: 0, right: 0,
              textAlign: 'center',
              fontFamily: '"Press Start 2P", monospace',
              fontSize: 5, color: C.wallAccent,
              overflow: 'hidden', whiteSpace: 'nowrap',
            }}>
              {agent.name}
            </div>
          )}
        </div>
      );
    }

    case T.DESK:
      return (
        <div style={{ ...style }}>
          {/* Counter top */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: TILE,
            background: C.desk,
            borderTop: `3px solid ${C.deskTop}`,
            borderBottom: `2px solid #8B3A1A`,
          }}>
            <div style={{ position: 'absolute', top: 4, left: 2, right: 2, height: 1, background: C.deskLight, opacity: 0.5 }} />
          </div>
        </div>
      );

    case T.NURSE:
      return (
        <div style={{ ...style }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: TILE,
            background: C.desk,
            borderTop: `3px solid ${C.deskTop}`,
            borderBottom: `2px solid #8B3A1A`,
          }} />
        </div>
      );

    case T.HEAL:
      return (
        <div style={{
          ...style,
          background: C.floorLight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Healing machine base */}
          <div style={{
            width: 28, height: 26,
            background: '#E8E0D0',
            border: `2px solid ${C.pcBodyDark}`,
            borderRadius: 4,
            position: 'relative',
            animation: healAnimating ? 'healGlow 0.5s ease infinite' : 'none',
          }}>
            {/* Pokeball slots */}
            {[0,1,2].map(i => (
              <div key={i} style={{
                position: 'absolute',
                top: 4 + i * 7,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 8, height: 5, borderRadius: '50%',
                background: healAnimating ? C.healPink : '#D0C8B8',
                border: `1px solid ${C.pcBodyDark}`,
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
        </div>
      );

    case T.PLANT:
      return (
        <div style={{ ...style }}>
          {/* Pot */}
          <div style={{
            position: 'absolute', bottom: 2, left: 8, width: 16, height: 10,
            background: C.plantPot, borderRadius: '0 0 4px 4px',
            border: `2px solid #9A5A30`,
          }} />
          {/* Leaves */}
          <div style={{
            position: 'absolute', bottom: 10, left: 6, width: 20, height: 16,
            background: C.plantGreen, borderRadius: '50% 50% 10% 10%',
            border: `2px solid ${C.plantDark}`,
          }}>
            <div style={{
              position: 'absolute', top: 4, left: 3, width: 6, height: 4,
              background: '#78D878', borderRadius: '50%',
            }} />
          </div>
        </div>
      );

    case T.BENCH:
      return (
        <div style={{ ...style }}>
          {/* Bench seat */}
          <div style={{
            position: 'absolute', bottom: 8, left: 2, right: 2, height: 8,
            background: '#C8A878', border: `2px solid #A08058`,
            borderRadius: 2,
          }} />
          {/* Legs */}
          <div style={{ position: 'absolute', bottom: 2, left: 4, width: 4, height: 6, background: '#A08058' }} />
          <div style={{ position: 'absolute', bottom: 2, right: 4, width: 4, height: 6, background: '#A08058' }} />
        </div>
      );

    case T.MAT:
      return (
        <div style={{
          ...style,
          background: C.matDark,
          borderTop: `2px solid ${C.matLight}`,
          borderBottom: `2px solid #5A3820`,
        }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 5, color: C.matLight, opacity: 0.6,
          }}>
            ♦
          </div>
        </div>
      );

    case T.DOOR:
      return (
        <div style={{ ...style, background: C.doorFrame }}>
          <div style={{
            position: 'absolute', top: 4, left: 2, right: 2, bottom: 0,
            background: C.doorGlass,
            borderTop: `3px solid #B0B0B0`,
            opacity: 0.8,
          }}>
            <div style={{ position: 'absolute', top: 0, left: '50%', width: 2, height: '100%', background: '#888', transform: 'translateX(-50%)' }} />
          </div>
        </div>
      );

    case T.FLOOR_ALT:
      return <div style={{ ...style, background: C.floorDark }} />;

    default:
      return null;
  }
}

// ============================================================
// 👩‍⚕️ NURSE JOY (NPC)
// ============================================================
function NurseJoy() {
  // Position behind the desk at row 8, col 9-10
  return (
    <div style={{
      position: 'absolute',
      left: 9 * TILE + 4,
      top: 7 * TILE - 16,
      width: TILE + 16,
      height: TILE + 16,
      zIndex: 20,
      imageRendering: 'pixelated',
    }}>
      {/* Hair */}
      <div style={{
        position: 'absolute', top: 0, left: 6, width: 20, height: 12,
        background: '#F890A0', borderRadius: '8px 8px 0 0',
        border: '2px solid #D87088',
        borderBottom: 'none',
      }} />
      {/* Hair loops */}
      <div style={{
        position: 'absolute', top: 2, left: 0, width: 10, height: 10,
        background: '#F890A0', borderRadius: '50%',
        border: '2px solid #D87088',
      }} />
      <div style={{
        position: 'absolute', top: 2, right: 4, width: 10, height: 10,
        background: '#F890A0', borderRadius: '50%',
        border: '2px solid #D87088',
      }} />
      {/* Face */}
      <div style={{
        position: 'absolute', top: 10, left: 7, width: 18, height: 14,
        background: '#FFE8D0', borderRadius: '4px',
        border: '2px solid #D0B8A0',
      }}>
        {/* Eyes */}
        <div style={{ position: 'absolute', top: 4, left: 3, width: 3, height: 3, background: '#383838', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: 4, right: 3, width: 3, height: 3, background: '#383838', borderRadius: '50%' }} />
        {/* Mouth */}
        <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 2, background: '#F87878', borderRadius: '0 0 2px 2px' }} />
      </div>
      {/* Hat */}
      <div style={{
        position: 'absolute', top: 5, left: 5, width: 22, height: 6,
        background: C.white, border: '2px solid #C8C8C8',
        borderRadius: 2,
      }}>
        <div style={{
          position: 'absolute', top: 1, left: '50%', transform: 'translateX(-50%)',
          width: 4, height: 3, background: '#F83030', borderRadius: 1,
        }} />
      </div>
      {/* Body */}
      <div style={{
        position: 'absolute', top: 24, left: 5, width: 22, height: 18,
        background: '#FFB8C8', borderRadius: '0 0 4px 4px',
        border: '2px solid #E898A8',
        borderTop: 'none',
      }} />
    </div>
  );
}

// ============================================================
// 🚶 PLAYER SPRITE
// ============================================================
function Player({ pos, dir, walking, frame }) {
  // Simple pixel character
  const bodyColor = '#F83030'; // Red trainer hat/shirt
  const skinColor = '#FFE0B8';
  const hairColor = '#383838';
  const pantsColor = '#3870B8';

  const offsetX = walking && frame === 1 ? 1 : 0;

  return (
    <div style={{
      position: 'absolute',
      left: pos.x * TILE,
      top: pos.y * TILE - 8,
      width: TILE,
      height: TILE + 8,
      zIndex: 30 + pos.y,
      imageRendering: 'pixelated',
      animation: walking ? 'walkBob 0.18s ease' : 'none',
    }}>
      {/* Shadow */}
      <div style={{
        position: 'absolute', bottom: 1, left: 6, width: 20, height: 6,
        background: 'rgba(0,0,0,0.15)', borderRadius: '50%',
      }} />

      {dir === 'down' && <>
        {/* Hat */}
        <div style={{ position: 'absolute', top: 0, left: 7, width: 18, height: 8, background: bodyColor, borderRadius: '6px 6px 0 0', border: `2px solid #C82020`, borderBottom: 'none' }} />
        {/* Face */}
        <div style={{ position: 'absolute', top: 6, left: 8, width: 16, height: 12, background: skinColor, borderRadius: 3, border: `2px solid #D0B890` }}>
          <div style={{ position: 'absolute', top: 3, left: 3, width: 3, height: 3, background: '#383838', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', top: 3, right: 3, width: 3, height: 3, background: '#383838', borderRadius: '50%' }} />
        </div>
        {/* Body */}
        <div style={{ position: 'absolute', top: 18, left: 7 + offsetX, width: 18, height: 14, background: bodyColor, borderRadius: '0 0 3px 3px', border: `2px solid #C82020`, borderTop: 'none' }} />
        {/* Legs */}
        <div style={{ position: 'absolute', bottom: 2, left: 9, width: 6, height: 6, background: pantsColor, borderRadius: 1 }} />
        <div style={{ position: 'absolute', bottom: 2, right: 9, width: 6, height: 6, background: pantsColor, borderRadius: 1 }} />
      </>}

      {dir === 'up' && <>
        {/* Hat (back) */}
        <div style={{ position: 'absolute', top: 0, left: 7, width: 18, height: 10, background: bodyColor, borderRadius: '6px 6px 0 0', border: `2px solid #C82020` }}>
          <div style={{ position: 'absolute', bottom: 0, left: 2, right: 2, height: 2, background: '#C82020' }} />
        </div>
        {/* Hair back */}
        <div style={{ position: 'absolute', top: 8, left: 8, width: 16, height: 8, background: hairColor, borderRadius: '0 0 3px 3px' }} />
        {/* Body */}
        <div style={{ position: 'absolute', top: 16, left: 7 + offsetX, width: 18, height: 16, background: bodyColor, borderRadius: '0 0 3px 3px', border: `2px solid #C82020`, borderTop: 'none' }} />
        {/* Legs */}
        <div style={{ position: 'absolute', bottom: 2, left: 9, width: 6, height: 6, background: pantsColor, borderRadius: 1 }} />
        <div style={{ position: 'absolute', bottom: 2, right: 9, width: 6, height: 6, background: pantsColor, borderRadius: 1 }} />
      </>}

      {dir === 'left' && <>
        {/* Hat */}
        <div style={{ position: 'absolute', top: 0, left: 5, width: 18, height: 8, background: bodyColor, borderRadius: '6px 6px 0 0', border: `2px solid #C82020`, borderBottom: 'none' }}>
          <div style={{ position: 'absolute', top: 2, left: -4, width: 6, height: 4, background: bodyColor, borderRadius: '3px 0 0 3px', border: `2px solid #C82020`, borderRight: 'none' }} />
        </div>
        {/* Face */}
        <div style={{ position: 'absolute', top: 6, left: 6, width: 16, height: 12, background: skinColor, borderRadius: 3, border: `2px solid #D0B890` }}>
          <div style={{ position: 'absolute', top: 3, left: 3, width: 3, height: 3, background: '#383838', borderRadius: '50%' }} />
        </div>
        {/* Body */}
        <div style={{ position: 'absolute', top: 18, left: 7, width: 16, height: 14, background: bodyColor, borderRadius: '0 0 3px 3px', border: `2px solid #C82020`, borderTop: 'none' }} />
        {/* Legs */}
        <div style={{ position: 'absolute', bottom: 2, left: 8, width: 6, height: 6, background: pantsColor, borderRadius: 1 }} />
        <div style={{ position: 'absolute', bottom: 2, left: 16, width: 6, height: 6, background: pantsColor, borderRadius: 1 }} />
      </>}

      {dir === 'right' && <>
        {/* Hat */}
        <div style={{ position: 'absolute', top: 0, left: 9, width: 18, height: 8, background: bodyColor, borderRadius: '6px 6px 0 0', border: `2px solid #C82020`, borderBottom: 'none' }}>
          <div style={{ position: 'absolute', top: 2, right: -4, width: 6, height: 4, background: bodyColor, borderRadius: '0 3px 3px 0', border: `2px solid #C82020`, borderLeft: 'none' }} />
        </div>
        {/* Face */}
        <div style={{ position: 'absolute', top: 6, left: 10, width: 16, height: 12, background: skinColor, borderRadius: 3, border: `2px solid #D0B890` }}>
          <div style={{ position: 'absolute', top: 3, right: 3, width: 3, height: 3, background: '#383838', borderRadius: '50%' }} />
        </div>
        {/* Body */}
        <div style={{ position: 'absolute', top: 18, left: 9, width: 16, height: 14, background: bodyColor, borderRadius: '0 0 3px 3px', border: `2px solid #C82020`, borderTop: 'none' }} />
        {/* Legs */}
        <div style={{ position: 'absolute', bottom: 2, right: 8, width: 6, height: 6, background: pantsColor, borderRadius: 1 }} />
        <div style={{ position: 'absolute', bottom: 2, right: 16, width: 6, height: 6, background: pantsColor, borderRadius: 1 }} />
      </>}
    </div>
  );
}

// ============================================================
// 🏥 RECEPTION PANEL (Overview Dashboard)
// ============================================================
function ReceptionPanel({ agents, statusCounts, onClose, onSelectAgent }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: C.panelBg,
      zIndex: 150,
      display: 'flex',
      flexDirection: 'column',
      border: `4px solid ${C.panelBorder}`,
      overflow: 'hidden',
    }}>
      {/* Title bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px',
        borderBottom: `3px solid ${C.panelBorder}`,
        background: C.panelBgLight,
      }}>
        <span style={{ ...pf(11), color: C.textLight }}>POKECENTER CONTROL HUB</span>
        <button className="gba-btn" onClick={onClose} style={{ fontSize: 8, padding: '4px 8px' }}>✕ CLOSE</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px' }} className="gba-scrollbar">
        {/* Welcome */}
        <div style={{ ...pf(9), color: C.textLight, marginBottom: 14 }}>
          Welcome, Trainer! Here is your system status:
        </div>

        {/* Status summary boxes */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'RUNNING', count: statusCounts.running, color: C.statusGreen },
            { label: 'STOPPED', count: statusCounts.stopped, color: C.statusRed },
            { label: 'IDLE', count: statusCounts.idle, color: C.statusBlue },
            { label: 'COMPLETE', count: statusCounts.completed, color: C.statusWhite },
            { label: 'ERROR', count: statusCounts.error, color: C.statusRed },
          ].filter(s => s.count > 0).map(s => (
            <div key={s.label} style={{
              border: `2px solid ${C.panelBorder}`,
              padding: '8px 12px',
              minWidth: 80,
              textAlign: 'center',
            }}>
              <div style={{ ...pf(14), color: s.color, marginBottom: 4 }}>{s.count}</div>
              <div style={{ ...pf(7), color: C.textLight }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{
          ...pf(9), color: C.textLight,
          borderTop: `2px solid ${C.panelBorder}`,
          borderBottom: `2px solid ${C.panelBorder}`,
          padding: '6px 0',
          marginBottom: 10,
          textAlign: 'center',
        }}>
          ── AGENT ROSTER ──
        </div>

        {/* Agent list */}
        {agents.map(agent => (
          <div
            key={agent.id}
            onClick={() => onSelectAgent(agent.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px',
              borderBottom: `1px solid rgba(255,255,255,0.1)`,
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {/* Pokemon sprite placeholder */}
            <div style={{
              width: 28, height: 28,
              background: `url(https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${agent.pokemonId}.png) center/contain no-repeat`,
              imageRendering: 'pixelated',
              flexShrink: 0,
            }} />
            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...pf(8), color: C.textLight }}>
                {agent.name} <span style={{ color: 'rgba(255,255,255,0.5)' }}>[{agent.pokemon}]</span>
              </div>
            </div>
            {/* Progress / status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {agent.status === 'running' || agent.status === 'completed' ? (
                <>
                  {/* Progress bar */}
                  <div style={{ width: 80, height: 8, background: '#102030', border: `1px solid ${C.panelBorder}` }}>
                    <div style={{
                      width: `${agent.progress}%`, height: '100%',
                      background: agent.status === 'completed' ? C.statusGreen : C.statusYellow,
                      transition: 'width 0.5s',
                    }} />
                  </div>
                  <span style={{ ...pf(7), color: C.textLight, width: 32, textAlign: 'right' }}>{Math.round(agent.progress)}%</span>
                </>
              ) : (
                <span style={{ ...pf(7), color: 'rgba(255,255,255,0.5)', width: 80, textAlign: 'right' }}>{statusLabel(agent.status).toLowerCase()}</span>
              )}
              {/* Status dot */}
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: statusColor(agent.status),
                boxShadow: `0 0 4px ${statusColor(agent.status)}`,
                animation: agent.status === 'running' ? 'ledPulse 1.5s ease infinite' : 'none',
              }} />
            </div>
          </div>
        ))}

        {/* Create new agent button */}
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <button className="gba-btn" style={{ padding: '10px 16px' }}
            onClick={() => alert('Coming Soon, Trainer!')}
          >
            + CREATE NEW AGENT
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 🖥️ AGENT DETAIL PANEL
// ============================================================
function AgentPanel({ agent, tab, onTabChange, onAction, onClose }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: C.panelBg,
      zIndex: 150,
      display: 'flex',
      flexDirection: 'column',
      border: `4px solid ${C.panelBorder}`,
      overflow: 'hidden',
    }}>
      {/* Title bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px',
        borderBottom: `3px solid ${C.panelBorder}`,
        background: C.panelBgLight,
      }}>
        <span style={{ ...pf(10), color: C.textLight }}>AGENT: {agent.name.toUpperCase()}</span>
        <button className="gba-btn" onClick={onClose} style={{ fontSize: 8, padding: '4px 8px' }}>✕ CLOSE</button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${C.panelBorder}` }}>
        {['INFO', 'LOGS'].map((t, i) => (
          <button key={t}
            className="gba-btn"
            style={{
              flex: 1, borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none',
              background: tab === i ? C.panelBg : C.panelBgLight,
              borderBottom: tab === i ? `2px solid ${C.menuHighlight}` : '2px solid transparent',
              fontSize: 8, padding: '8px',
            }}
            onClick={() => onTabChange(i)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px' }} className="gba-scrollbar">
        {tab === 0 && (
          <>
            {/* Pokemon + basic info */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
              <div style={{
                width: 80, height: 80,
                background: `url(https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${agent.pokemonId}.png) center/contain no-repeat`,
                imageRendering: 'pixelated',
                border: `2px solid ${C.panelBorder}`,
                flexShrink: 0,
              }} />
              <div>
                <div style={{ ...pf(11), color: C.textLight, marginBottom: 6 }}>{agent.pokemon.toUpperCase()}</div>
                <div style={{ ...pf(8), color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>Type: {agent.typeIcon} {agent.type}</div>
                <div style={{ ...pf(8), color: statusColor(agent.status), marginBottom: 4 }}>
                  Status: {statusLabel(agent.status)}
                </div>
                <div style={{ ...pf(7), color: 'rgba(255,255,255,0.5)' }}>Last run: {agent.lastRun}</div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ ...pf(8), color: C.textLight, marginBottom: 6 }}>── PROGRESS ──</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 12, background: '#102030', border: `2px solid ${C.panelBorder}` }}>
                  <div style={{
                    width: `${agent.progress}%`, height: '100%',
                    background: agent.progress >= 100 ? C.statusGreen :
                                agent.status === 'running' ? C.statusYellow :
                                agent.status === 'stopped' ? C.statusRed : C.statusBlue,
                    transition: 'width 0.5s',
                  }} />
                </div>
                <span style={{ ...pf(9), color: C.textLight, minWidth: 40, textAlign: 'right' }}>{Math.round(agent.progress)}%</span>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ ...pf(8), color: C.textLight, marginBottom: 6 }}>── DESCRIPTION ──</div>
              <div style={{ ...pf(8), color: 'rgba(255,255,255,0.8)', lineHeight: '2' }}>{agent.description}</div>
            </div>

            {/* Recent logs (compact) */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ ...pf(8), color: C.textLight, marginBottom: 6 }}>── RECENT LOG ──</div>
              {agent.logs.slice(-3).map((log, i) => (
                <div key={i} style={{ ...pf(7), color: 'rgba(255,255,255,0.6)', marginBottom: 3 }}>
                  <span style={{ color: C.statusYellow }}>{log.time}</span> {'>'} {log.message}
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ ...pf(8), color: C.textLight, marginBottom: 8 }}>── ACTIONS ──</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {agent.isRunOnce ? (
                  agent.status === 'completed' ? (
                    <button className="gba-btn" onClick={() => onAction('run')}>↻ RE-RUN</button>
                  ) : agent.status === 'running' ? (
                    <button className="gba-btn" onClick={() => onAction('stop')}>⏹ STOP</button>
                  ) : (
                    <button className="gba-btn" onClick={() => onAction('run')}>▶ RUN ONCE</button>
                  )
                ) : (
                  <>
                    <button className="gba-btn"
                      onClick={() => onAction('run')}
                      disabled={agent.status === 'running'}
                    >▶ RUN</button>
                    <button className="gba-btn"
                      onClick={() => onAction('stop')}
                      disabled={agent.status !== 'running'}
                    >⏹ STOP</button>
                  </>
                )}
                <button className="gba-btn" onClick={() => onAction('config')}>⚙ CONFIG</button>
                <button className="gba-btn" onClick={() => onAction('logs')}>📋 LOGS</button>
              </div>
            </div>
          </>
        )}

        {tab === 1 && (
          <>
            <div style={{ ...pf(8), color: C.textLight, marginBottom: 8 }}>── FULL LOG: {agent.name.toUpperCase()} ──</div>
            <div style={{
              background: '#0A1820',
              border: `2px solid ${C.panelBorder}`,
              padding: 10,
              maxHeight: 350,
              overflow: 'auto',
            }} className="gba-scrollbar">
              {agent.logs.map((log, i) => (
                <div key={i} style={{ ...pf(7), color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
                  <span style={{ color: C.statusYellow }}>[{log.time}]</span> {log.message}
                </div>
              ))}
              {agent.logs.length === 0 && (
                <div style={{ ...pf(7), color: 'rgba(255,255,255,0.4)' }}>No log entries yet.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
