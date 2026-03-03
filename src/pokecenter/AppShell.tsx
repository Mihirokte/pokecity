import { useState } from 'react';
import { usePokecenterStore } from './pokecenterStore';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Dashboard } from './pages/Dashboard';
import { Notifications } from './pages/Notifications';
import { AgentDetail } from './pages/AgentDetail';
import { Calendar } from './pages/Calendar';
import { Tasks } from './pages/Tasks';
import { Notes } from './pages/Notes';
import { Travel } from './pages/Travel';
import { Gym } from './pages/Gym';
import { Shopping } from './pages/Shopping';
import { TwitterBot } from './pages/TwitterBot';
import { LinkedInBot } from './pages/LinkedInBot';
import { HallucinationGame } from './pages/HallucinationGame';
import './pokecenter.css';

function getPageComponent(pageId: string) {
  // Handle agent detail pages - but we'll show as sidepane instead
  if (pageId.startsWith('agent:')) {
    const agentId = pageId.split(':')[1];
    return <AgentDetail agentId={agentId} />;
  }

  switch (pageId) {
    case 'dashboard':
      return <Dashboard />;
    case 'notifications':
      return <Notifications />;
    case 'calendar':
      return <Calendar />;
    case 'tasks':
      return <Tasks />;
    case 'notes':
      return <Notes />;
    case 'travel':
      return <Travel />;
    case 'gym':
      return <Gym />;
    case 'shopping':
      return <Shopping />;
    case 'twitter':
      return <TwitterBot />;
    case 'linkedin':
      return <LinkedInBot />;
    case 'hallucination':
      return <HallucinationGame />;
    default:
      return <Dashboard />;
  }
}

interface AppShellProps {
  onBack?: () => void;
}

export function AppShell({ onBack }: AppShellProps) {
  const currentPage = usePokecenterStore(s => s.currentPage);
  const setCurrentPage = usePokecenterStore(s => s.setCurrentPage);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check if we're showing an agent detail (sidepane mode)
  const isAgentDetail = currentPage.startsWith('agent:');
  const agentId = isAgentDetail ? currentPage.split(':')[1] : null;

  const handleCloseAgentDetail = () => {
    setCurrentPage('dashboard');
  };

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Header onMenuToggle={() => setSidebarOpen(o => !o)} onBack={onBack} />
        <div className="page">
          {/* Always show the base page */}
          {getPageComponent(isAgentDetail ? 'dashboard' : currentPage)}
        </div>
        
        {/* Agent Detail Sidepane Overlay */}
        {isAgentDetail && agentId && (
          <>
            <div className="agent-sidepane-overlay" onClick={handleCloseAgentDetail} />
            <div className="agent-sidepane">
              <AgentDetail agentId={agentId} onClose={handleCloseAgentDetail} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
