import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePokecenterStore } from './pokecenterStore';
import { C, TILE, MAP_W, MAP_H, pf, statusColor, GBA_CSS, gbaDialogStyle } from './gba-theme';
import { MAP, T, isBlocked, getPCPositions, getInteraction } from './map-data';
import { useDialogue } from './hooks/useDialogue';
import { useAgentSimulation } from './hooks/useAgentSimulation';
import { useSessionPersistence } from './hooks/useSessionPersistence';

// Panels
import { DashboardPanel } from './panels/DashboardPanel';
import { AgentDetailPanel } from './panels/AgentDetailPanel';
import { TasksPanel } from './panels/TasksPanel';
import { TwitterBotPanel } from './panels/TwitterBotPanel';
import { LinkedInBotPanel } from './panels/LinkedInBotPanel';
import { CalendarPanel } from './panels/CalendarPanel';
import { NotificationsPanel } from './panels/NotificationsPanel';
import { AgentCreatePanel } from './panels/AgentCreatePanel';
import { KnowledgeBasePanel } from './panels/KnowledgeBasePanel';

// ============================================================
// 🎮 POKÉCENTER HUB — Main Component
// ============================================================
export function PokeCenterHub() {
  // ── State ──
  const playerPos = usePokecenterStore(s => s.playerPos);
  const playerDir = usePokecenterStore(s => s.playerDir);
  const setPlayerPos = usePokecenterStore(s => s.setPlayerPos);
  const setPlayerDir = usePokecenterStore(s => s.setPlayerDir);
  const agents = usePokecenterStore(s => s.agents);
  const updateAgentStatus = usePokecenterStore(s => s.updateAgentStatus);
  const addAgentLog = usePokecenterStore(s => s.addAgentLog);

  const [isWalking, setIsWalking] = useState(false);
  const [walkFrame, setWalkFrame] = useState(0);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [healAnimating, setHealAnimating] = useState(false);
  const [showConfirm, setShowConfirm] = useState<{ text: string; onYes: () => void } | null>(null);
  const [confirmIdx, setConfirmIdx] = useState(0);

  const moveTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { dialogue, isComplete: dialogueComplete, show: showDialogue, advance: advanceDialogue, isActive: dialogueActive } = useDialogue();

  // Hooks
  useAgentSimulation();
  useSessionPersistence();

  // ── PC positions ──
  const pcPositions = useMemo(() => getPCPositions(), []);

  // ── Movement ──
  const movePlayer = useCallback((dir: string) => {
    if (activePanel || dialogueActive || showConfirm) return;
    setPlayerDir(dir);
    const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    const nx = playerPos.x + dx;
    const ny = playerPos.y + dy;
    if (!isBlocked(nx, ny)) {
      setPlayerPos(nx, ny);
      setIsWalking(true);
      setWalkFrame(f => (f + 1) % 2);
      if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
      moveTimerRef.current = setTimeout(() => setIsWalking(false), 180);
    }
  }, [playerPos, activePanel, dialogueActive, showConfirm, setPlayerPos, setPlayerDir]);

  // ── Interact ──
  const interact = useCallback(() => {
    if (showConfirm) {
      if (confirmIdx === 0) showConfirm.onYes();
      setShowConfirm(null);
      setConfirmIdx(0);
      return;
    }

    if (dialogueActive) {
      advanceDialogue();
      return;
    }

    if (activePanel) return;

    const interaction = getInteraction(playerPos.x, playerPos.y, playerDir);
    if (!interaction) return;

    switch (interaction.type) {
      case 'reception':
        showDialogue("Welcome back, Trainer! Let me pull up your command center...", () => {
          setActivePanel('reception');
        });
        break;
      case 'pc': {
        const agent = agents[interaction.agentIndex];
        if (agent) {
          showDialogue(`Accessing ${agent.name.toUpperCase()}'s terminal... ${agent.pokemon} is on standby.`, () => {
            setActivePanel(`agent:${agent.id}`);
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
              updateAgentStatus(a.id, 'idle');
              addAgentLog(a.id, 'info', 'System refreshed by healing machine.');
            }
          });
        });
        break;
      case 'bulletin':
        showDialogue("The bulletin board is full of notices from your agents...", () => {
          setActivePanel('notifications');
        });
        break;
      case 'bookshelf':
        showDialogue("Scout's compiled knowledge base... Let's take a look.", () => {
          setActivePanel('knowledge');
        });
        break;
      case 'plant':
        showDialogue("A lovely plant. It seems to be thriving in the center.");
        break;
      case 'bench':
        showDialogue("A bench for waiting trainers. Looks comfy.");
        break;
      case 'poster':
        showDialogue("A poster reads: 'Keep your agents healthy! Regular maintenance is key.'");
        break;
      case 'filing':
        showDialogue("The Archivist's filing cabinet. Organization at its finest.");
        break;
      case 'terminal':
        showDialogue("Spark's quick-action terminal. Ready for rapid tasks.");
        break;
      case 'door':
        showDialogue("The automatic doors. Your agents are waiting for you inside!");
        break;
    }
  }, [playerPos, playerDir, activePanel, dialogueActive, agents, showDialogue, advanceDialogue, showConfirm, confirmIdx, updateAgentStatus, addAgentLog]);

  // ── Keyboard ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Prevent scrolling
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'Escape' || e.key === 'x' || e.key === 'X') {
        if (showConfirm) { setShowConfirm(null); setConfirmIdx(0); return; }
        if (activePanel) { setActivePanel(null); return; }
        if (dialogueActive) { advanceDialogue(); return; }
        return;
      }

      if (showConfirm) {
        if (['ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S'].includes(e.key)) setConfirmIdx(i => i === 0 ? 1 : 0);
        if (['Enter', ' ', 'z', 'Z'].includes(e.key)) interact();
        return;
      }

      if (dialogueActive) {
        if (['Enter', ' ', 'z', 'Z'].includes(e.key)) interact();
        return;
      }

      if (activePanel) return;

      if (['ArrowUp', 'w', 'W'].includes(e.key)) { movePlayer('up'); return; }
      if (['ArrowDown', 's', 'S'].includes(e.key)) { movePlayer('down'); return; }
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) { movePlayer('left'); return; }
      if (['ArrowRight', 'd', 'D'].includes(e.key)) { movePlayer('right'); return; }
      if (['Enter', ' ', 'z', 'Z'].includes(e.key)) { interact(); return; }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [movePlayer, interact, activePanel, dialogueActive, showConfirm, advanceDialogue]);

  // Focus on mount
  useEffect(() => { containerRef.current?.focus(); }, []);

  // ── Panel routing ──
  const handleOpenPanel = (panel: string) => setActivePanel(panel);
  const handleSelectAgent = (agentId: string) => setActivePanel(`agent:${agentId}`);

  const renderPanel = () => {
    if (!activePanel) return null;
    const closePanel = () => setActivePanel(null);

    if (activePanel === 'reception') {
      return <DashboardPanel onClose={closePanel} onSelectAgent={handleSelectAgent} onOpenPanel={handleOpenPanel} />;
    }
    if (activePanel === 'tasks') return <TasksPanel onClose={closePanel} />;
    if (activePanel === 'twitter') return <TwitterBotPanel onClose={closePanel} />;
    if (activePanel === 'linkedin') return <LinkedInBotPanel onClose={closePanel} />;
    if (activePanel === 'calendar') return <CalendarPanel onClose={closePanel} />;
    if (activePanel === 'notifications') return <NotificationsPanel onClose={closePanel} />;
    if (activePanel === 'create-agent') return <AgentCreatePanel onClose={closePanel} />;
    if (activePanel === 'knowledge') return <KnowledgeBasePanel onClose={closePanel} />;
    if (activePanel.startsWith('agent:')) {
      const agentId = activePanel.slice(6);
      const agent = agents.find(a => a.id === agentId);
      // Special routing: Taskmaster opens tasks panel
      if (agentId === 'agent_taskmaster') return <TasksPanel onClose={closePanel} />;
      if (agentId === 'agent_twitter') return <TwitterBotPanel onClose={closePanel} />;
      if (agentId === 'agent_linkedin') return <LinkedInBotPanel onClose={closePanel} />;
      if (agent) return <AgentDetailPanel agent={agent} onClose={closePanel} />;
    }
    return null;
  };

  // ============================================================
  // 🎨 RENDER
  // ============================================================
  return (
    <div className="pokecenter" ref={containerRef} tabIndex={0} style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#000', overflow: 'hidden', outline: 'none',
    }}>
      <style>{GBA_CSS}</style>

      {/* GBA Screen Frame */}
      <div style={{
        width: MAP_W * TILE,
        height: MAP_H * TILE,
        background: '#181818',
        border: '4px solid #333',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', position: 'relative',
        boxShadow: '0 0 40px rgba(0,0,0,0.8), inset 0 0 2px #444',
        imageRendering: 'pixelated',
      }}>
        {/* ── MAP VIEWPORT ── */}
        <div style={{ width: MAP_W * TILE, height: MAP_H * TILE, position: 'relative', overflow: 'hidden' }}>
          {/* Floor */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `repeating-conic-gradient(${C.floorLight} 0% 25%, ${C.floorDark} 0% 50%) 0 0 / ${TILE * 2}px ${TILE * 2}px`,
          }} />

          {/* Map tiles */}
          {MAP.map((row, ry) => row.map((tile, cx) => {
            if (tile === T.FLOOR) return null;
            return <MapTile key={`${cx}-${ry}`} tile={tile} x={cx} y={ry} agents={agents} pcPositions={pcPositions} healAnimating={healAnimating} />;
          }))}

          {/* Nurse Joy */}
          <NurseJoy />

          {/* Player */}
          <PlayerSprite pos={playerPos} dir={playerDir} walking={isWalking} frame={walkFrame} />

          {/* Interaction hint arrow */}
          {!activePanel && !dialogueActive && (() => {
            const inter = getInteraction(playerPos.x, playerPos.y, playerDir);
            if (!inter) return null;
            const fx = playerPos.x + (playerDir === 'left' ? -1 : playerDir === 'right' ? 1 : 0);
            const fy = playerPos.y + (playerDir === 'up' ? -1 : playerDir === 'down' ? 1 : 0);
            return (
              <div style={{
                position: 'absolute', left: fx * TILE + TILE / 2 - 6, top: fy * TILE - 6,
                ...pf(8), color: C.white, textShadow: '1px 1px 0 #000',
                animation: 'bounce 0.8s ease infinite', pointerEvents: 'none', zIndex: 50,
              }}>▼</div>
            );
          })()}
        </div>

        {/* ── DIALOGUE BOX ── */}
        {dialogue && (
          <div style={{
            position: 'absolute', bottom: 4, left: 4, right: 4, height: 100,
            ...gbaDialogStyle,
            borderRadius: 4, padding: '12px 16px', zIndex: 100,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <div style={{ ...pf(10), lineHeight: 2, color: C.text }}>
              {dialogue.displayed}
            </div>
            {dialogueComplete && (
              <div style={{ alignSelf: 'flex-end', ...pf(10), animation: 'triangleBlink 0.6s ease infinite', color: C.text }}>▼</div>
            )}
          </div>
        )}

        {/* ── CONFIRM DIALOG ── */}
        {showConfirm && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            ...gbaDialogStyle, borderRadius: 4, padding: '16px 24px', zIndex: 200, minWidth: 280,
          }}>
            <div style={{ ...pf(10), marginBottom: 16, color: C.text }}>{showConfirm.text}</div>
            {['YES', 'NO'].map((opt, i) => (
              <div key={opt} style={{
                ...pf(10), padding: '6px 12px', cursor: 'pointer', marginBottom: 2,
                background: confirmIdx === i ? C.menuHighlight : 'transparent',
                color: confirmIdx === i ? C.white : C.text,
              }} onClick={() => { setConfirmIdx(i); interact(); }}>
                {confirmIdx === i ? '▶ ' : '  '}{opt}
              </div>
            ))}
          </div>
        )}

        {/* ── CONTROL HINTS ── */}
        {!activePanel && !dialogueActive && (
          <div style={{
            position: 'absolute', bottom: 6, right: 10,
            ...pf(6), color: 'rgba(255,255,255,0.4)',
            textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
            zIndex: 10, lineHeight: 1.8, textAlign: 'right',
          }}>
            Arrows: Move | Z: Act | X: Back
          </div>
        )}

        {/* ── ACTIVE PANEL OVERLAY ── */}
        {renderPanel()}
      </div>
    </div>
  );
}

// ============================================================
// 🗺️ MAP TILE
// ============================================================
function MapTile({ tile, x, y, agents, pcPositions, healAnimating }: {
  tile: number; x: number; y: number;
  agents: { id: string; status: string; name: string; pokemonId: string }[];
  pcPositions: { x: number; y: number }[];
  healAnimating: boolean;
}) {
  const s: React.CSSProperties = {
    position: 'absolute', left: x * TILE, top: y * TILE, width: TILE, height: TILE, imageRendering: 'pixelated',
  };

  switch (tile) {
    case T.WALL:
      return (
        <div style={{ ...s, background: C.wall }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: C.wallDark }} />
          <div style={{ position: 'absolute', top: 8, left: 4, right: 4, height: 1, background: C.wallAccent, opacity: 0.4 }} />
        </div>
      );

    case T.POKEBALL_WALL:
      return (
        <div style={{ ...s, background: C.wall, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: C.wallDark }} />
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            background: `linear-gradient(to bottom, ${C.pokeball} 50%, ${C.pokeballWhite} 50%)`,
            border: `2px solid ${C.black}`, position: 'relative',
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
        <div style={{ ...s, background: C.wall }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: C.wallDark }} />
          <div style={{ position: 'absolute', bottom: 8, left: 2, right: 2, height: 3, background: C.deskLight }} />
          <div style={{ position: 'absolute', bottom: 12, left: 6, width: 6, height: 4, background: '#88b8d8' }} />
          <div style={{ position: 'absolute', bottom: 12, left: 16, width: 6, height: 6, background: '#d88888' }} />
        </div>
      );

    case T.POSTER:
      return (
        <div style={{ ...s, background: C.wall }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: C.wallDark }} />
          <div style={{
            position: 'absolute', top: 4, left: 6, width: 20, height: 22,
            background: '#F8F0D0', border: `2px solid ${C.wallDark}`,
          }}>
            <div style={{ width: 12, height: 2, background: C.text, margin: '4px auto 2px', opacity: 0.6 }} />
            <div style={{ width: 14, height: 2, background: C.text, margin: '2px auto', opacity: 0.4 }} />
            <div style={{ width: 10, height: 2, background: C.text, margin: '2px auto', opacity: 0.4 }} />
          </div>
        </div>
      );

    case T.BULLETIN:
      return (
        <div style={{ ...s, background: C.wall }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: C.wallDark }} />
          <div style={{
            position: 'absolute', top: 3, left: 4, width: 24, height: 24,
            background: '#A08060', border: `2px solid ${C.wallDark}`,
          }}>
            <div style={{ position: 'absolute', top: 3, left: 3, width: 8, height: 6, background: '#F8E858', transform: 'rotate(-5deg)' }} />
            <div style={{ position: 'absolute', top: 4, left: 13, width: 7, height: 5, background: '#88D0F0', transform: 'rotate(3deg)' }} />
            <div style={{ position: 'absolute', top: 12, left: 5, width: 9, height: 6, background: '#F89888', transform: 'rotate(2deg)' }} />
          </div>
        </div>
      );

    case T.BOOKSHELF:
      return (
        <div style={{ ...s, background: C.wall }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: C.wallDark }} />
          {/* Bookshelf */}
          <div style={{ position: 'absolute', top: 2, left: 3, width: 26, height: 26, background: '#8B6B3D', border: `2px solid #6B4B2D` }}>
            {/* Shelves with books */}
            {[0, 1, 2].map(i => (
              <div key={i} style={{ position: 'absolute', top: 2 + i * 8, left: 2, right: 2, height: 6 }}>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: '#6B4B2D' }} />
                {[0, 1, 2, 3].map(j => (
                  <div key={j} style={{
                    position: 'absolute', bottom: 1, left: 1 + j * 5, width: 4, height: 5,
                    background: ['#D04040', '#4080D0', '#40B040', '#D0A040'][j],
                  }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      );

    case T.PC: {
      const pcIdx = pcPositions.findIndex(p => p.x === x && p.y === y);
      const agent = agents[pcIdx];
      const ledColor = agent ? statusColor(agent.status) : '#555';
      const ledAnim = agent?.status === 'running' ? 'ledPulse 1.5s ease infinite' : 'none';
      // Determine if this is a wall-mounted or side PC
      const isWallPC = y <= 2;
      return (
        <div style={{ ...s, background: isWallPC ? C.wall : C.floorLight }}>
          {isWallPC && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: C.wallDark }} />}
          {/* PC body */}
          <div style={{
            position: 'absolute', bottom: isWallPC ? 6 : 4, left: 5, width: 22, height: 20,
            background: C.pcBody, border: `2px solid ${C.pcBodyDark}`, borderRadius: 2,
          }}>
            <div style={{
              position: 'absolute', top: 2, left: 2, right: 2, height: 10,
              background: agent ? '#183018' : '#222', border: '1px solid #555',
            }}>
              {agent && <div style={{ position: 'absolute', top: 2, left: 2, width: '60%', height: 2, background: C.pcScreen, opacity: 0.7 }} />}
              {agent && <div style={{ position: 'absolute', top: 6, left: 2, width: '40%', height: 2, background: C.pcScreen, opacity: 0.5 }} />}
            </div>
            <div style={{
              position: 'absolute', bottom: 2, right: 3, width: 4, height: 4, borderRadius: '50%',
              background: ledColor, boxShadow: `0 0 4px ${ledColor}`, animation: ledAnim,
            }} />
          </div>
          {/* Agent name */}
          {agent && (
            <div style={{
              position: 'absolute', bottom: isWallPC ? -1 : 0, left: 0, right: 0, textAlign: 'center',
              fontFamily: '"Press Start 2P", monospace', fontSize: 5,
              color: isWallPC ? C.wallAccent : C.text,
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
        <div style={{ ...s }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: TILE,
            background: C.desk, borderTop: `3px solid ${C.deskTop}`, borderBottom: '2px solid #8B3A1A',
          }}>
            <div style={{ position: 'absolute', top: 4, left: 2, right: 2, height: 1, background: C.deskLight, opacity: 0.5 }} />
          </div>
        </div>
      );

    case T.NURSE:
      return (
        <div style={{ ...s }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: TILE,
            background: C.desk, borderTop: `3px solid ${C.deskTop}`, borderBottom: '2px solid #8B3A1A',
          }} />
        </div>
      );

    case T.HEAL:
      return (
        <div style={{ ...s, background: C.floorLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: 28, height: 26, background: '#E8E0D0', border: `2px solid ${C.pcBodyDark}`, borderRadius: 4,
            position: 'relative',
            animation: healAnimating ? 'healGlow 0.5s ease infinite' : 'none',
          }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                position: 'absolute', top: 4 + i * 7, left: '50%', transform: 'translateX(-50%)',
                width: 8, height: 5, borderRadius: '50%',
                background: healAnimating ? C.healPink : '#D0C8B8',
                border: `1px solid ${C.pcBodyDark}`, transition: 'background 0.3s',
              }} />
            ))}
          </div>
        </div>
      );

    case T.PLANT:
      return (
        <div style={{ ...s }}>
          <div style={{ position: 'absolute', bottom: 2, left: 8, width: 16, height: 10, background: C.plantPot, borderRadius: '0 0 4px 4px', border: '2px solid #9A5A30' }} />
          <div style={{ position: 'absolute', bottom: 10, left: 6, width: 20, height: 16, background: C.plantGreen, borderRadius: '50% 50% 10% 10%', border: `2px solid ${C.plantDark}` }}>
            <div style={{ position: 'absolute', top: 4, left: 3, width: 6, height: 4, background: '#78D878', borderRadius: '50%' }} />
          </div>
        </div>
      );

    case T.BENCH:
      return (
        <div style={{ ...s }}>
          <div style={{ position: 'absolute', bottom: 8, left: 2, right: 2, height: 8, background: '#C8A878', border: '2px solid #A08058', borderRadius: 2 }} />
          <div style={{ position: 'absolute', bottom: 2, left: 4, width: 4, height: 6, background: '#A08058' }} />
          <div style={{ position: 'absolute', bottom: 2, right: 4, width: 4, height: 6, background: '#A08058' }} />
        </div>
      );

    case T.MAT:
      return (
        <div style={{ ...s, background: C.matDark, borderTop: `2px solid ${C.matLight}`, borderBottom: '2px solid #5A3820' }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            fontFamily: '"Press Start 2P", monospace', fontSize: 5, color: C.matLight, opacity: 0.6,
          }}>♦</div>
        </div>
      );

    case T.DOOR:
      return (
        <div style={{ ...s, background: C.doorFrame }}>
          <div style={{
            position: 'absolute', top: 4, left: 2, right: 2, bottom: 0,
            background: C.doorGlass, borderTop: '3px solid #B0B0B0', opacity: 0.8,
          }}>
            <div style={{ position: 'absolute', top: 0, left: '50%', width: 2, height: '100%', background: '#888', transform: 'translateX(-50%)' }} />
          </div>
        </div>
      );

    case T.FILING:
      return (
        <div style={{ ...s }}>
          <div style={{
            position: 'absolute', bottom: 2, left: 4, width: 24, height: 26,
            background: '#A0A0A0', border: `2px solid #808080`, borderRadius: 2,
          }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                position: 'absolute', top: 3 + i * 8, left: 3, right: 3, height: 6,
                background: '#888', border: '1px solid #707070',
              }}>
                <div style={{ position: 'absolute', top: 2, right: 2, width: 3, height: 2, background: '#606060' }} />
              </div>
            ))}
          </div>
        </div>
      );

    case T.TERMINAL:
      return (
        <div style={{ ...s }}>
          <div style={{
            position: 'absolute', bottom: 4, left: 4, width: 24, height: 22,
            background: '#282828', border: `2px solid #484848`, borderRadius: 2,
          }}>
            <div style={{ position: 'absolute', top: 2, left: 2, right: 2, height: 12, background: '#0A2A0A', border: '1px solid #1A4A1A' }}>
              <div style={{ position: 'absolute', top: 2, left: 2, width: 8, height: 1, background: '#48D848', opacity: 0.8 }} />
              <div style={{ position: 'absolute', top: 5, left: 2, width: 12, height: 1, background: '#48D848', opacity: 0.6 }} />
              <div style={{ position: 'absolute', top: 8, left: 2, width: 6, height: 1, background: '#48D848', opacity: 0.4 }} />
            </div>
            {/* Keyboard area */}
            <div style={{ position: 'absolute', bottom: 2, left: 3, right: 3, height: 4, background: '#383838' }} />
          </div>
        </div>
      );

    default:
      return null;
  }
}

// ============================================================
// 👩‍⚕️ NURSE JOY
// ============================================================
function NurseJoy() {
  return (
    <div style={{
      position: 'absolute', left: 9 * TILE + 4, top: 7 * TILE - 16,
      width: TILE + 16, height: TILE + 16, zIndex: 20, imageRendering: 'pixelated',
    }}>
      {/* Hair */}
      <div style={{ position: 'absolute', top: 0, left: 6, width: 20, height: 12, background: '#F890A0', borderRadius: '8px 8px 0 0', border: '2px solid #D87088', borderBottom: 'none' }} />
      <div style={{ position: 'absolute', top: 2, left: 0, width: 10, height: 10, background: '#F890A0', borderRadius: '50%', border: '2px solid #D87088' }} />
      <div style={{ position: 'absolute', top: 2, right: 4, width: 10, height: 10, background: '#F890A0', borderRadius: '50%', border: '2px solid #D87088' }} />
      {/* Face */}
      <div style={{ position: 'absolute', top: 10, left: 7, width: 18, height: 14, background: '#FFE8D0', borderRadius: 4, border: '2px solid #D0B8A0' }}>
        <div style={{ position: 'absolute', top: 4, left: 3, width: 3, height: 3, background: '#383838', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: 4, right: 3, width: 3, height: 3, background: '#383838', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 2, background: '#F87878', borderRadius: '0 0 2px 2px' }} />
      </div>
      {/* Hat */}
      <div style={{ position: 'absolute', top: 5, left: 5, width: 22, height: 6, background: C.white, border: '2px solid #C8C8C8', borderRadius: 2 }}>
        <div style={{ position: 'absolute', top: 1, left: '50%', transform: 'translateX(-50%)', width: 4, height: 3, background: '#F83030', borderRadius: 1 }} />
      </div>
      {/* Body */}
      <div style={{ position: 'absolute', top: 24, left: 5, width: 22, height: 18, background: '#FFB8C8', borderRadius: '0 0 4px 4px', border: '2px solid #E898A8', borderTop: 'none' }} />
    </div>
  );
}

// ============================================================
// 🚶 PLAYER SPRITE
// ============================================================
function PlayerSprite({ pos, dir, walking, frame }: { pos: { x: number; y: number }; dir: string; walking: boolean; frame: number }) {
  const bodyColor = '#F83030';
  const skinColor = '#FFE0B8';
  const hairColor = '#383838';
  const pantsColor = '#3870B8';
  const off = walking && frame === 1 ? 1 : 0;

  return (
    <div style={{
      position: 'absolute', left: pos.x * TILE, top: pos.y * TILE - 8,
      width: TILE, height: TILE + 8, zIndex: 30 + pos.y,
      imageRendering: 'pixelated',
      animation: walking ? 'walkBob 0.18s ease' : 'none',
    }}>
      {/* Shadow */}
      <div style={{ position: 'absolute', bottom: 1, left: 6, width: 20, height: 6, background: 'rgba(0,0,0,0.15)', borderRadius: '50%' }} />

      {dir === 'down' && <>
        <div style={{ position: 'absolute', top: 0, left: 7, width: 18, height: 8, background: bodyColor, borderRadius: '6px 6px 0 0', border: '2px solid #C82020', borderBottom: 'none' }} />
        <div style={{ position: 'absolute', top: 6, left: 8, width: 16, height: 12, background: skinColor, borderRadius: 3, border: '2px solid #D0B890' }}>
          <div style={{ position: 'absolute', top: 3, left: 3, width: 3, height: 3, background: '#383838', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', top: 3, right: 3, width: 3, height: 3, background: '#383838', borderRadius: '50%' }} />
        </div>
        <div style={{ position: 'absolute', top: 18, left: 7 + off, width: 18, height: 14, background: bodyColor, borderRadius: '0 0 3px 3px', border: '2px solid #C82020', borderTop: 'none' }} />
        <div style={{ position: 'absolute', bottom: 2, left: 9, width: 6, height: 6, background: pantsColor, borderRadius: 1 }} />
        <div style={{ position: 'absolute', bottom: 2, right: 9, width: 6, height: 6, background: pantsColor, borderRadius: 1 }} />
      </>}

      {dir === 'up' && <>
        <div style={{ position: 'absolute', top: 0, left: 7, width: 18, height: 10, background: bodyColor, borderRadius: '6px 6px 0 0', border: '2px solid #C82020' }}>
          <div style={{ position: 'absolute', bottom: 0, left: 2, right: 2, height: 2, background: '#C82020' }} />
        </div>
        <div style={{ position: 'absolute', top: 8, left: 8, width: 16, height: 8, background: hairColor, borderRadius: '0 0 3px 3px' }} />
        <div style={{ position: 'absolute', top: 16, left: 7 + off, width: 18, height: 16, background: bodyColor, borderRadius: '0 0 3px 3px', border: '2px solid #C82020', borderTop: 'none' }} />
        <div style={{ position: 'absolute', bottom: 2, left: 9, width: 6, height: 6, background: pantsColor, borderRadius: 1 }} />
        <div style={{ position: 'absolute', bottom: 2, right: 9, width: 6, height: 6, background: pantsColor, borderRadius: 1 }} />
      </>}

      {dir === 'left' && <>
        <div style={{ position: 'absolute', top: 0, left: 5, width: 18, height: 8, background: bodyColor, borderRadius: '6px 6px 0 0', border: '2px solid #C82020', borderBottom: 'none' }}>
          <div style={{ position: 'absolute', top: 2, left: -4, width: 6, height: 4, background: bodyColor, borderRadius: '3px 0 0 3px', border: '2px solid #C82020', borderRight: 'none' }} />
        </div>
        <div style={{ position: 'absolute', top: 6, left: 6, width: 16, height: 12, background: skinColor, borderRadius: 3, border: '2px solid #D0B890' }}>
          <div style={{ position: 'absolute', top: 3, left: 3, width: 3, height: 3, background: '#383838', borderRadius: '50%' }} />
        </div>
        <div style={{ position: 'absolute', top: 18, left: 7, width: 16, height: 14, background: bodyColor, borderRadius: '0 0 3px 3px', border: '2px solid #C82020', borderTop: 'none' }} />
        <div style={{ position: 'absolute', bottom: 2, left: 8, width: 6, height: 6, background: pantsColor, borderRadius: 1 }} />
        <div style={{ position: 'absolute', bottom: 2, left: 16, width: 6, height: 6, background: pantsColor, borderRadius: 1 }} />
      </>}

      {dir === 'right' && <>
        <div style={{ position: 'absolute', top: 0, left: 9, width: 18, height: 8, background: bodyColor, borderRadius: '6px 6px 0 0', border: '2px solid #C82020', borderBottom: 'none' }}>
          <div style={{ position: 'absolute', top: 2, right: -4, width: 6, height: 4, background: bodyColor, borderRadius: '0 3px 3px 0', border: '2px solid #C82020', borderLeft: 'none' }} />
        </div>
        <div style={{ position: 'absolute', top: 6, left: 10, width: 16, height: 12, background: skinColor, borderRadius: 3, border: '2px solid #D0B890' }}>
          <div style={{ position: 'absolute', top: 3, right: 3, width: 3, height: 3, background: '#383838', borderRadius: '50%' }} />
        </div>
        <div style={{ position: 'absolute', top: 18, left: 9, width: 16, height: 14, background: bodyColor, borderRadius: '0 0 3px 3px', border: '2px solid #C82020', borderTop: 'none' }} />
        <div style={{ position: 'absolute', bottom: 2, right: 8, width: 6, height: 6, background: pantsColor, borderRadius: 1 }} />
        <div style={{ position: 'absolute', bottom: 2, right: 16, width: 6, height: 6, background: pantsColor, borderRadius: 1 }} />
      </>}
    </div>
  );
}
