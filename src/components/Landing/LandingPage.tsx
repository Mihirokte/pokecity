import { useState } from 'react';
import { DEFAULT_AGENTS } from '../../pokecenter/default-agents';
import { CatanBoard3D } from './CatanBoard3D';
import { AgentDetail } from '../../pokecenter/pages/AgentDetail';
import type { PCAgent } from '../../types';
import './LandingPage.css';

export function LandingPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const agents: PCAgent[] = DEFAULT_AGENTS.map(agent => ({
    ...agent,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const handleAgentClick = (agentId: string) => {
    setSelectedAgentId(agentId);
  };

  const handleCloseAgent = () => {
    setSelectedAgentId(null);
  };

  const handleLoginClick = () => {
    // Trigger Google OAuth login
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    const redirectUri = window.location.origin + '/';
    const scope = 'openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive.file';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}&prompt=select_account`;
    window.location.href = authUrl;
  };

  return (
    <div className="landing-root">
      {/* 3D Catan Board Background */}
      <div className="landing-3d-container">
        <CatanBoard3D onLogin={handleLoginClick} />
      </div>

      {/* Agents Overlay */}
      <div className="landing-agents-overlay">
        <div className="landing-agents-header">
          <div className="landing-logo">
            <img 
              src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png" 
              alt="Pikachu" 
              className="landing-logo-img"
            />
            <span className="landing-logo-text">POKÉCITY</span>
          </div>
          <button className="landing-login-btn" onClick={() => setShowLoginModal(true)}>
            Sign In
          </button>
        </div>

        <div className="landing-agents-grid">
          {agents.map(agent => (
            <div 
              key={agent.id} 
              className="landing-agent-card-wrapper"
              onClick={() => handleAgentClick(agent.id)}
            >
              <div className="landing-agent-card">
                <img 
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${agent.pokemonId}.png`}
                  alt={agent.pokemon}
                  className="landing-agent-sprite"
                />
                <div className="landing-agent-info">
                  <div className="landing-agent-name">{agent.name}</div>
                  <div className="landing-agent-type">
                    {agent.typeIcon} {agent.type}
                  </div>
                </div>
                <div className="landing-agent-status" data-status={agent.status}>
                  {agent.status}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="landing-footer">
          <p>Built with love by Mihir</p>
        </div>
      </div>

      {/* Agent Sidepane */}
      {selectedAgentId && (
        <>
          <div className="landing-sidepane-overlay" onClick={handleCloseAgent} />
          <div className="landing-sidepane">
            <AgentDetail agentId={selectedAgentId} onClose={handleCloseAgent} />
          </div>
        </>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <>
          <div className="landing-modal-overlay" onClick={() => setShowLoginModal(false)} />
          <div className="landing-modal">
            <div className="landing-modal-header">
              <h2>Welcome to PokéCity</h2>
              <button className="landing-modal-close" onClick={() => setShowLoginModal(false)}>×</button>
            </div>
            <div className="landing-modal-body">
              <p>Sign in with your Google account to access your personal agent city.</p>
              <button className="landing-modal-btn" onClick={handleLoginClick}>
                <img src="https://www.google.com/favicon.ico" alt="Google" className="landing-modal-google-icon" />
                Sign in with Google
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
