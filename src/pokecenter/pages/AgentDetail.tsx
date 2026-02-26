import { usePokecenterStore } from '../pokecenterStore';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import type { AgentStatus } from '../../types';

interface AgentDetailProps {
  agentId: string;
}

export function AgentDetail({ agentId }: AgentDetailProps) {
  const agents = usePokecenterStore(s => s.agents);
  const agentLogs = usePokecenterStore(s => s.agentLogs);
  const updateAgentStatus = usePokecenterStore(s => s.updateAgentStatus);
  const setCurrentPage = usePokecenterStore(s => s.setCurrentPage);

  const agent = agents.find(a => a.id === agentId);
  const logs = agentLogs
    .filter(l => l.agentId === agentId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  if (!agent) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">&#x2753;</div>
        <div className="empty-state__text">Agent not found</div>
        <button className="btn btn--secondary" onClick={() => setCurrentPage('dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${agent.pokemonId}.png`;
  const progress = parseFloat(agent.progress) || 0;

  const formatTime = (ts: string) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const handleStatusChange = (status: AgentStatus) => {
    updateAgentStatus(agent.id, status);
  };

  return (
    <>
      <PageHeader
        title={agent.name}
        actions={
          <button className="btn btn--secondary" onClick={() => setCurrentPage('dashboard')}>
            &larr; Back
          </button>
        }
      />

      <div className="agent-detail__header">
        <img className="agent-detail__sprite" src={spriteUrl} alt={agent.pokemon} />
        <div>
          <div className="agent-detail__name">{agent.name}</div>
          <div className="agent-detail__type">{agent.typeIcon} {agent.type} &middot; {agent.pokemon}</div>
          <div className="agent-detail__desc">{agent.description}</div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <StatusBadge status={agent.status} />
            {agent.status === 'running' && (
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{Math.round(progress)}%</span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {agent.status === 'running' && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="section__title">Progress</div>
          <div className="agent-card__progress-bar" style={{ height: 8, borderRadius: 4 }}>
            <div
              className="agent-card__progress-fill"
              style={{ width: `${progress}%`, background: 'var(--green)', borderRadius: 4 }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            <span>0%</span>
            <span>{Math.round(progress)}%</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section__title">Controls</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {agent.status !== 'running' && (
            <button className="btn btn--primary" onClick={() => handleStatusChange('running')}>
              &#x25B6; Run
            </button>
          )}
          {agent.status === 'running' && (
            <button className="btn btn--secondary" onClick={() => handleStatusChange('stopped')}>
              &#x23F8; Stop
            </button>
          )}
          {(agent.status === 'completed' || agent.status === 'error') && (
            <button className="btn btn--secondary" onClick={() => handleStatusChange('running')}>
              &#x21BB; Restart
            </button>
          )}
        </div>
      </div>

      {/* Logs */}
      <div className="section">
        <div className="section__title">Logs ({logs.length})</div>
        {logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__text">No logs yet</div>
          </div>
        ) : (
          <div className="card" style={{ padding: '12px 16px', maxHeight: 400, overflowY: 'auto' }}>
            {logs.map(log => (
              <div key={log.id} className="log-entry">
                <span className="log-entry__time">{formatTime(log.timestamp)}</span>
                <span className={`log-entry__level log-entry__level--${log.level}`}>
                  {log.level.toUpperCase()}
                </span>
                <span className="log-entry__msg">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
