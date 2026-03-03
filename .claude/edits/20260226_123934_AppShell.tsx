import { useState } from 'react';
import { usePokecenterStore } from './pokecenterStore';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Dashboard } from './pages/Dashboard';
import { Tasks } from './pages/Tasks';
import { Calendar } from './pages/Calendar';
import { Notes } from './pages/Notes';
import { TwitterBot } from './pages/TwitterBot';
import { LinkedInBot } from './pages/LinkedInBot';
import { Travel } from './pages/Travel';
import { Gym } from './pages/Gym';
import { Shopping } from './pages/Shopping';
import { Notifications } from './pages/Notifications';
import { AgentDetail } from './pages/AgentDetail';
import './pokecenter.css';

export function AppShell() {
  const currentPage = usePokecenterStore(s => s.currentPage);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderPage = () => {
    if (currentPage.startsWith('agent:')) {
      const agentId = currentPage.split(':')[1];
      return <AgentDetail agentId={agentId} />;
    }

    switch (currentPage) {
      case 'tasks': return <Tasks />;
      case 'calendar': return <Calendar />;
      case 'notes': return <Notes />;
      case 'twitter': return <TwitterBot />;
      case 'linkedin': return <LinkedInBot />;
      case 'travel': return <Travel />;
      case 'gym': return <Gym />;
      case 'shopping': return <Shopping />;
      case 'notifications': return <Notifications />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Header onMenuToggle={() => setSidebarOpen(o => !o)} />
        <div className="page">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}
