import type { PCAgent } from '../../types';
import { StatusBadge } from './StatusBadge';

interface AgentCardProps {
  agent: PCAgent;
  onClick: () => void;
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
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
    </div>
  );
}
