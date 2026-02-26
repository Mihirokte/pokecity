import { useState } from 'react';
import { usePokecenterStore } from '../pokecenterStore';
import { C, pf, statusColor, statusLabel } from '../gba-theme';
import { PanelShell, SectionTitle, ProgressBar, StatusDot } from './PanelShell';
import type { PCAgent } from '../../types';

interface Props {
  agent: PCAgent;
  onClose: () => void;
}

export function AgentDetailPanel({ agent, onClose }: Props) {
  const [tab, setTab] = useState<'info' | 'logs'>('info');
  const agentLogs = usePokecenterStore(s => s.agentLogs.filter(l => l.agentId === agent.id));
  const updateAgentStatus = usePokecenterStore(s => s.updateAgentStatus);
  const addAgentLog = usePokecenterStore(s => s.addAgentLog);

  const progress = parseFloat(agent.progress) || 0;
  const isRunOnce = agent.isRunOnce === 'true';

  const handleRun = () => {
    updateAgentStatus(agent.id, 'running');
    addAgentLog(agent.id, 'info', 'Agent started by trainer.');
  };

  const handleStop = () => {
    updateAgentStatus(agent.id, 'stopped');
    addAgentLog(agent.id, 'info', 'Agent stopped by trainer.');
  };

  return (
    <PanelShell title={`AGENT: ${agent.name.toUpperCase()}`} onClose={onClose}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {(['info', 'logs'] as const).map(t => (
          <button key={t} className="gba-btn" style={{
            background: tab === t ? C.menuHighlight : C.panelBgLight,
            fontSize: 8, padding: '6px 12px',
          }} onClick={() => setTab(t)}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <>
          {/* Pokemon + info */}
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
              <div style={{ ...pf(8), color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
                Type: {agent.typeIcon} {agent.type}
              </div>
              <div style={{ ...pf(8), display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ color: statusColor(agent.status) }}>Status:</span>
                <StatusDot status={agent.status} />
                <span style={{ color: statusColor(agent.status) }}>{statusLabel(agent.status)}</span>
              </div>
            </div>
          </div>

          {/* Progress */}
          <SectionTitle>── PROGRESS ──</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1 }}><ProgressBar value={progress} /></div>
            <span style={{ ...pf(9), color: C.textLight }}>{Math.round(progress)}%</span>
          </div>

          {/* Description */}
          <SectionTitle>── DESCRIPTION ──</SectionTitle>
          <div style={{ ...pf(8), color: 'rgba(255,255,255,0.8)', lineHeight: 2, marginBottom: 14 }}>
            {agent.description}
          </div>

          {/* Recent logs (compact) */}
          <SectionTitle>── RECENT LOG ──</SectionTitle>
          <div style={{ marginBottom: 14 }}>
            {agentLogs.slice(-4).map(log => (
              <div key={log.id} style={{ ...pf(7), color: 'rgba(255,255,255,0.6)', marginBottom: 3 }}>
                <span style={{ color: C.statusYellow }}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {' > '}{log.message}
              </div>
            ))}
            {agentLogs.length === 0 && <div style={{ ...pf(7), color: 'rgba(255,255,255,0.4)' }}>No logs yet.</div>}
          </div>

          {/* Actions */}
          <SectionTitle>── ACTIONS ──</SectionTitle>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {isRunOnce ? (
              agent.status === 'completed' ? (
                <button className="gba-btn" onClick={handleRun}>↻ RE-RUN</button>
              ) : agent.status === 'running' ? (
                <button className="gba-btn" onClick={handleStop}>⏹ STOP</button>
              ) : (
                <button className="gba-btn" onClick={handleRun}>▶ RUN ONCE</button>
              )
            ) : (
              <>
                <button className="gba-btn" onClick={handleRun} disabled={agent.status === 'running'}>▶ RUN</button>
                <button className="gba-btn" onClick={handleStop} disabled={agent.status !== 'running'}>⏹ STOP</button>
              </>
            )}
            <button className="gba-btn" onClick={() => setTab('logs')}>📋 LOGS</button>
          </div>
        </>
      )}

      {tab === 'logs' && (
        <>
          <SectionTitle>── FULL LOG: {agent.name.toUpperCase()} ──</SectionTitle>
          <div style={{
            background: '#0A1820', border: `2px solid ${C.panelBorder}`,
            padding: 10, maxHeight: 400, overflow: 'auto',
          }} className="gba-scrollbar">
            {agentLogs.map(log => (
              <div key={log.id} style={{ ...pf(7), color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
                <span style={{ color: log.level === 'warn' ? C.statusYellow : log.level === 'error' ? C.statusRed : C.statusBlue }}>
                  [{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]
                </span>{' '}
                {log.message}
              </div>
            ))}
            {agentLogs.length === 0 && <div style={{ ...pf(7), color: 'rgba(255,255,255,0.4)' }}>No log entries yet.</div>}
          </div>
        </>
      )}
    </PanelShell>
  );
}
