import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { CatanBoard3D } from './CatanBoard3D';
import { AboutMePanel } from '../City/AboutMePanel';
import type { PCAgent } from '../../types';
import './LandingPage.css';

interface LandingPageProps {
  agents?: PCAgent[];
}

export function LandingPage({ agents }: LandingPageProps) {
  const login = useAuthStore(s => s.login);
  const [showAboutMe, setShowAboutMe] = useState(false);
  const hasAgents = agents && agents.length > 0;

  return (
    <div className="landing-root">
      <CatanBoard3D onLogin={login} />

      {/* Pre-login About button (top-right) */}
      <button
        type="button"
        className="landing-about-btn"
        onClick={() => setShowAboutMe(true)}
      >
        ABOUT
      </button>

      {showAboutMe && (
        <AboutMePanel onClose={() => setShowAboutMe(false)} />
      )}

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
