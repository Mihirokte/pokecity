import { useAuthStore } from '../../stores/authStore';
import { CatanBoard3D } from './CatanBoard3D';
import type { PCAgent } from '../../types';
import './LandingPage.css';

interface LandingPageProps {
  agents?: PCAgent[];
}

export function LandingPage({ agents }: LandingPageProps) {
  const login = useAuthStore(s => s.login);
  // If we have agents (after login), show them in a sidepane
  const hasAgents = agents && agents.length > 0;

  return (
    <div className="landing-root">
      {/* 3D Background with original overlay (title, info panel, yellow SIGN IN button) */}
      <CatanBoard3D onLogin={login} />
      
      {/* After login, agents can be clicked - show first agent as example */}
      {hasAgents && agents.length > 0 && (
        <div className="landing-post-login">
          <div className="landing-post-login-hint">
            Click on an agent in the dashboard to view details
          </div>
        </div>
      )}
    </div>
  );
}
