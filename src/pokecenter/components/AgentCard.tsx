import type { PCAgent } from '../../types';
import { StatusBadge } from './StatusBadge';

interface AgentCardProps {
  agent: PCAgent;
  onClick: () => void;
  onDelete?: () => void;
}

export function AgentCard({ agent, onClick, onDelete }: AgentCardProps) {
  const progress = parseFloat(agent.progress) || 0;
  const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${agent.pokemonId}.png`;

  return (
    <div className="agent-card" onClick={onClick}>
      <div className="agent-card__top">
        <img className="agent-card__sprite" src={spriteUrl} alt={agent.pokemon} />
        <div className="agent-card__info">
          <div className="agent-card__name">{agent.name}</div>
          <div className="agent-card__type">{agent.typeIcon} {agent.type}</div>
        </div>
        <StatusBadge status={agent.status} />
      </div>
      {agent.status === 'running' && (
        <div className="agent-card__progress">
          <div className="agent-card__progress-bar">
            <div
              className="agent-card__progress-fill"
              style={{ width: `${progress}%`, background: 'var(--green)' }}
            />
          </div>
          <div className="agent-card__progress-text">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      )}
      {onDelete && (
        <div
          style={{ borderTop: '1px solid var(--border-0)', paddingTop: 10, marginTop: 4 }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onDelete}
            style={{
              fontSize: 11, color: 'var(--red)', background: 'none',
              border: 'none', cursor: 'pointer', padding: '2px 0',
              opacity: 0.7,
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
          >
            ✕ Delete agent
          </button>
        </div>
      )}
    </div>
  );
}
