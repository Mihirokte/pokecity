import { useState, useCallback } from 'react';
import { usePokecenterStore } from '../pokecenterStore';
import { useCityStore } from '../../stores/cityStore';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { AgentCard } from '../components/AgentCard';
import { DashboardScene } from './DashboardScene';
import type { BuildingType } from '../components/3d/CityBuilding';

type ViewMode = '2d' | '3d';

export function Dashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('2d');
  
  const agents = usePokecenterStore(s => s.agents);
  const notifications = usePokecenterStore(s => s.notifications);
  const setCurrentPage = usePokecenterStore(s => s.setCurrentPage);
  const { tasks, calendarEvents, notes } = useCityStore(s => s.moduleData);

  const runningAgents = agents.filter(a => a.status === 'running').length;
  const unread = notifications.filter(n => n.read !== 'true').length;
  const activeTasks = tasks.filter(t => t.status !== 'done').length;

  // Today's events
  const today = new Date().toISOString().split('T')[0];
  const todayEvents = calendarEvents.filter(e => e.startDate === today);

  // Recent activity: last 5 notifications
  const recentNotifs = [...notifications]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  // Handle agent click in 3D view
  const handleAgentClick = useCallback((agentId: string) => {
    setViewMode('2d');
    setCurrentPage(`agent:${agentId}`);
  }, [setCurrentPage]);

  // Handle building click in 3D view
  const handleBuildingClick = useCallback((type: BuildingType) => {
    // Map building types to pages
    const pageMap: Record<BuildingType, string> = {
      agents: 'dashboard',
      tasks: 'tasks',
      calendar: 'calendar',
      notes: 'notes',
      notifications: 'notifications',
    };
    setViewMode('2d');
    // Navigate to the respective page
    const targetPage = pageMap[type];
    if (targetPage) {
      setCurrentPage(targetPage);
    }
  }, [setCurrentPage]);

  // Toggle to 3D view
  const handleViewToggle = useCallback(() => {
    setViewMode(prev => prev === '2d' ? '3d' : '2d');
  }, []);

  // Render 3D view
  if (viewMode === '3d') {
    return (
      <DashboardScene 
        onAgentClick={handleAgentClick}
        onBuildingClick={handleBuildingClick}
        onBackClick={() => setViewMode('2d')}
      />
    );
  }

  // Render 2D view (original dashboard)
  return (
    <>
      {/* View Toggle Button */}
      <div style={{ 
        position: 'absolute', 
        top: '16px', 
        right: '24px', 
        zIndex: 100 
      }}>
        <button
          onClick={handleViewToggle}
          style={{
            background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            color: '#fff',
            fontFamily: 'Dogica, sans-serif',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.5)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
          }}
        >
          <span>🎮</span>
          <span>Switch to 3D</span>
        </button>
      </div>

      <PageHeader
        title="Dashboard"
        description="Your PokéCity command center at a glance"
      />

      <div className="stat-row">
        <StatCard icon="&#x1F916;" value={runningAgents} label="Agents Running" />
        <StatCard icon="&#x2611;" value={activeTasks} label="Active Tasks" />
        <StatCard icon="&#x1F4C5;" value={todayEvents.length} label="Events Today" />
        <StatCard icon="&#x1F4DD;" value={notes.length} label="Notes" />
        <StatCard icon="&#x1F514;" value={unread} label="Unread" />
      </div>

      <div className="section">
        <div className="section__title">Agents</div>
        <div className="agent-grid">
          {agents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={() => setCurrentPage(`agent:${agent.id}`)}
            />
          ))}
        </div>
      </div>

      {todayEvents.length > 0 && (
        <div className="section">
          <div className="section__title">Today's Schedule</div>
          <div className="card">
            {todayEvents.map(event => (
              <div key={event.id} className="event-bar">
                <span className="event-bar__time">{event.startTime || 'All day'}</span>
                <span className="event-bar__title">{event.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="section">
        <div className="section__title">Recent Activity</div>
        <div className="card">
          {recentNotifs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">&#x1F4ED;</div>
              <div className="empty-state__text">No recent activity</div>
            </div>
          ) : (
            recentNotifs.map(n => {
              const agent = agents.find(a => a.id === n.agentId);
              return (
                <div key={n.id} className="list-item">
                  <span className={`status-dot status-dot--${n.read === 'true' ? 'idle' : 'running'}`} />
                  <span style={{ flex: 1, fontSize: 13 }}>{n.message}</span>
                  {agent && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{agent.name}</span>}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
