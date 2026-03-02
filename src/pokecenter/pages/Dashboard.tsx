import { usePokecenterStore } from '../pokecenterStore';
import { useCityStore } from '../../stores/cityStore';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { AgentCard } from '../components/AgentCard';

export function Dashboard() {
  const agents = usePokecenterStore(s => s.agents);
  const notifications = usePokecenterStore(s => s.notifications);
  const setCurrentPage = usePokecenterStore(s => s.setCurrentPage);
  const deleteAgent = usePokecenterStore(s => s.deleteAgent);
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

  return (
    <>
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
              onDelete={() => deleteAgent(agent.id)}
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
