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
    <div className="agent-card" style={{ position: 'relative' }} onClick={onClick}>
      {onDelete && (
        <button
          title="Delete agent"
          onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{
            position: 'absolute', top: 8, right: 8,
            width: 22, height: 22, borderRadius: '50%',
            border: 'none', cursor: 'pointer',
            background: 'rgba(239,68,68,0.12)', color: 'var(--red)',
            fontSize: 13, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0.6, transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
        >
          ✕
        </button>
      )}
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
    </div>
  );
}
