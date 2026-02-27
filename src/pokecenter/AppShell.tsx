import { useState } from 'react';
import { usePokecenterStore } from './pokecenterStore';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Dashboard } from './pages/Dashboard';
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
