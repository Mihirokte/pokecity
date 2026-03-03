import { CatanBoard3D } from './CatanBoard3D';
import type { PCAgent } from '../../types';
import './LandingPage.css';

interface LandingPageProps {
  agents?: PCAgent[];
}

export function LandingPage({ agents }: LandingPageProps) {
  // If we have agents (after login), show them in a sidepane
  const hasAgents = agents && agents.length > 0;
  
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
      {/* 3D Background with original overlay (title, info panel, yellow SIGN IN button) */}
      <CatanBoard3D onLogin={handleLoginClick} />
      
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
