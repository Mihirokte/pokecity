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
import './pokecenter.css';

function getPageComponent(pageId: string) {
  // Handle agent detail pages
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
    default:
      return <Dashboard />;
  }
}

export function AppShell() {
  const currentPage = usePokecenterStore(s => s.currentPage);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Header onMenuToggle={() => setSidebarOpen(o => !o)} />
        <div className="page">
          {getPageComponent(currentPage)}
        </div>
      </div>
    </div>
  );
}
