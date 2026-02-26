import { useMemo } from 'react';
import { usePokecenterStore } from '../pokecenterStore';
import { useCityStore } from '../../stores/cityStore';
import { C, pf, statusColor, statusLabel } from '../gba-theme';
import { PanelShell, SectionTitle, ProgressBar, StatusDot } from './PanelShell';

interface Props {
  onClose: () => void;
  onSelectAgent: (agentId: string) => void;
  onOpenPanel: (panel: string) => void;
}

export function DashboardPanel({ onClose, onSelectAgent, onOpenPanel }: Props) {
  const agents = usePokecenterStore(s => s.agents);
  const notifications = usePokecenterStore(s => s.notifications);
  const twitterPosts = usePokecenterStore(s => s.twitterPosts);
  const linkedInPosts = usePokecenterStore(s => s.linkedInPosts);
  const tasks = useCityStore(s => s.moduleData.tasks);
  const calendarEvents = useCityStore(s => s.moduleData.calendarEvents);

  const statusCounts = useMemo(() => {
    const c = { running: 0, stopped: 0, idle: 0, completed: 0, error: 0 };
    agents.forEach(a => { c[a.status as keyof typeof c] = (c[a.status as keyof typeof c] || 0) + 1; });
    return c;
  }, [agents]);

  const today = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => t.dueDate === today && t.status !== 'done');
  const overdueTasks = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done');
  const openTasks = tasks.filter(t => t.status !== 'done');

  const todayEvents = calendarEvents.filter(e => e.startDate === today);

  const scheduledTweets = twitterPosts.filter(p => p.status === 'scheduled');
  const postedTweets = twitterPosts.filter(p => p.status === 'posted');
  const tweetEngagement = postedTweets.reduce((s, p) => ({
    likes: s.likes + (parseInt(p.engagementLikes) || 0),
    retweets: s.retweets + (parseInt(p.engagementRetweets) || 0),
    replies: s.replies + (parseInt(p.engagementReplies) || 0),
  }), { likes: 0, retweets: 0, replies: 0 });

  const scheduledLI = linkedInPosts.filter(p => p.status === 'scheduled');
  const postedLI = linkedInPosts.filter(p => p.status === 'posted');
  const liEngagement = postedLI.reduce((s, p) => ({
    likes: s.likes + (parseInt(p.engagementLikes) || 0),
    comments: s.comments + (parseInt(p.engagementComments) || 0),
    shares: s.shares + (parseInt(p.engagementShares) || 0),
  }), { likes: 0, comments: 0, shares: 0 });

  const unreadNotifs = notifications.filter(n => n.read !== 'true');

  return (
    <PanelShell title="◄ POKECENTER COMMAND HUB ►" onClose={onClose}>
      {/* System status bar */}
      <div style={{
        border: `2px solid ${C.panelBorder}`,
        padding: '8px 12px',
        marginBottom: 12,
        background: '#081418',
      }}>
        <div style={{ ...pf(8), color: C.textLight, marginBottom: 6 }}>
          Agents: {agents.length} total | {statusCounts.running} running | {statusCounts.idle} idle | {statusCounts.stopped} stopped | {statusCounts.completed} done
        </div>
        <div style={{ ...pf(8), color: C.textLight, marginBottom: 4 }}>
          Tasks: {openTasks.length} open | {todayTasks.length} due today{overdueTasks.length > 0 ? ` | ${overdueTasks.length} overdue` : ''}
        </div>
      </div>

      {/* Status summary boxes */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {[
          { label: 'RUNNING', count: statusCounts.running, color: C.statusGreen },
          { label: 'STOPPED', count: statusCounts.stopped, color: C.statusRed },
          { label: 'IDLE', count: statusCounts.idle, color: C.statusBlue },
          { label: 'COMPLETE', count: statusCounts.completed, color: C.statusWhite },
        ].filter(s => s.count > 0).map(s => (
          <div key={s.label} style={{
            border: `2px solid ${C.panelBorder}`, padding: '6px 10px',
            minWidth: 70, textAlign: 'center',
          }}>
            <div style={{ ...pf(12), color: s.color, marginBottom: 2 }}>{s.count}</div>
            <div style={{ ...pf(6), color: C.textLight }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Agent mini-panels in 2-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {/* Taskmaster */}
        <MiniPanel
          icon="📋" title="TASKMASTER"
          onClick={() => onOpenPanel('tasks')}
        >
          <div style={{ ...pf(7), color: C.textLight, marginBottom: 4 }}>
            TODAY'S TASKS
          </div>
          {todayTasks.slice(0, 3).map(t => (
            <div key={t.id} style={{ ...pf(6), color: 'rgba(255,255,255,0.7)', marginBottom: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              ☐ {t.title}
            </div>
          ))}
          {todayTasks.length === 0 && <div style={{ ...pf(6), color: 'rgba(255,255,255,0.4)' }}>No tasks today</div>}
          {overdueTasks.length > 0 && (
            <div style={{ ...pf(6), color: C.statusRed, marginTop: 4 }}>
              Overdue: {overdueTasks.length} tasks
            </div>
          )}
        </MiniPanel>

        {/* Twitter Bot */}
        <MiniPanel
          icon="🐦" title="TWITTER BOT"
          onClick={() => onOpenPanel('twitter')}
        >
          <AgentStatusLine agents={agents} agentId="agent_twitter" />
          <div style={{ ...pf(6), color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>
            Queue: {scheduledTweets.length} scheduled
          </div>
          <div style={{ ...pf(6), color: 'rgba(255,255,255,0.7)' }}>
            ♥ {tweetEngagement.likes} ↻ {tweetEngagement.retweets} 💬 {tweetEngagement.replies}
          </div>
        </MiniPanel>

        {/* LinkedIn Bot */}
        <MiniPanel
          icon="💼" title="LINKEDIN BOT"
          onClick={() => onOpenPanel('linkedin')}
        >
          <AgentStatusLine agents={agents} agentId="agent_linkedin" />
          <div style={{ ...pf(6), color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>
            Queue: {scheduledLI.length} pending
          </div>
          <div style={{ ...pf(6), color: 'rgba(255,255,255,0.7)' }}>
            ♥ {liEngagement.likes} 💬 {liEngagement.comments} ↗ {liEngagement.shares}
          </div>
        </MiniPanel>

        {/* Calendar */}
        <MiniPanel
          icon="📅" title="CALENDAR"
          onClick={() => onOpenPanel('calendar')}
        >
          <div style={{ ...pf(7), color: C.textLight, marginBottom: 4 }}>TODAY</div>
          {todayEvents.slice(0, 3).map(e => (
            <div key={e.id} style={{ ...pf(6), color: 'rgba(255,255,255,0.7)', marginBottom: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {e.startTime || '??:??'} {e.title}
            </div>
          ))}
          {todayEvents.length === 0 && <div style={{ ...pf(6), color: 'rgba(255,255,255,0.4)' }}>No events today</div>}
        </MiniPanel>

        {/* Sentinel */}
        <MiniPanel icon="🛡️" title="SENTINEL" onClick={() => { const a = agents.find(a => a.id === 'agent_sentinel'); if (a) onSelectAgent(a.id); }}>
          <AgentStatusLine agents={agents} agentId="agent_sentinel" />
          <div style={{ ...pf(6), color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>
            Alerts today: {notifications.filter(n => n.agentId === 'agent_sentinel').length}
          </div>
        </MiniPanel>

        {/* Analyst */}
        <MiniPanel icon="📊" title="ANALYST" onClick={() => { const a = agents.find(a => a.id === 'agent_analyst'); if (a) onSelectAgent(a.id); }}>
          <AgentStatusLine agents={agents} agentId="agent_analyst" />
          <AgentProgressLine agents={agents} agentId="agent_analyst" />
        </MiniPanel>

        {/* Scout */}
        <MiniPanel icon="🔍" title="SCOUT" onClick={() => { const a = agents.find(a => a.id === 'agent_scout'); if (a) onSelectAgent(a.id); }}>
          <AgentStatusLine agents={agents} agentId="agent_scout" />
          <AgentProgressLine agents={agents} agentId="agent_scout" />
        </MiniPanel>

        {/* Courier */}
        <MiniPanel icon="📨" title="COURIER" onClick={() => { const a = agents.find(a => a.id === 'agent_courier'); if (a) onSelectAgent(a.id); }}>
          <AgentStatusLine agents={agents} agentId="agent_courier" />
          <div style={{ ...pf(6), color: 'rgba(255,255,255,0.7)' }}>
            Pending: 0 messages
          </div>
        </MiniPanel>
      </div>

      {/* Notifications */}
      <SectionTitle>── 🔔 NOTIFICATIONS ──</SectionTitle>
      <div style={{ border: `2px solid ${C.panelBorderDim}`, padding: 8, marginBottom: 12, background: '#081418' }}>
        {unreadNotifs.slice(0, 3).map(n => {
          const agent = agents.find(a => a.id === n.agentId);
          return (
            <div key={n.id} style={{ ...pf(7), color: 'rgba(255,255,255,0.7)', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
              <span>● {agent?.name || 'System'}: "{n.message}"</span>
            </div>
          );
        })}
        {unreadNotifs.length === 0 && <div style={{ ...pf(7), color: 'rgba(255,255,255,0.4)' }}>No unread notifications</div>}
        {unreadNotifs.length > 3 && (
          <div style={{ ...pf(6), color: C.statusBlue, marginTop: 4, cursor: 'pointer' }} onClick={() => onOpenPanel('notifications')}>
            +{unreadNotifs.length - 3} more...
          </div>
        )}
      </div>

      {/* Create New Agent */}
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <button className="gba-btn" style={{ padding: '10px 16px' }}
          onClick={() => onOpenPanel('create-agent')}
        >
          + CREATE NEW AGENT
        </button>
      </div>
    </PanelShell>
  );
}

// ── Mini panel component ──
function MiniPanel({ icon, title, onClick, children }: { icon: string; title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClick}
      style={{
        border: `2px solid ${C.panelBorderDim}`,
        padding: '8px 10px',
        cursor: 'pointer',
        transition: 'border-color 0.1s',
        minHeight: 80,
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = C.menuHighlight)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = C.panelBorderDim)}
    >
      <div style={{ ...pf(7), color: C.textLight, marginBottom: 6 }}>
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

// ── Helper: agent status line ──
function AgentStatusLine({ agents, agentId }: { agents: { id: string; status: string }[]; agentId: string }) {
  const agent = agents.find(a => a.id === agentId);
  if (!agent) return null;
  return (
    <div style={{ ...pf(6), color: statusColor(agent.status), marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
      <StatusDot status={agent.status} size={6} />
      {statusLabel(agent.status)}
    </div>
  );
}

// ── Helper: agent progress line ──
function AgentProgressLine({ agents, agentId }: { agents: { id: string; progress: string; status: string }[]; agentId: string }) {
  const agent = agents.find(a => a.id === agentId);
  if (!agent) return null;
  const progress = parseFloat(agent.progress) || 0;
  if (agent.status === 'idle') return <div style={{ ...pf(6), color: 'rgba(255,255,255,0.5)' }}>Standing by...</div>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
      <div style={{ flex: 1 }}><ProgressBar value={progress} height={6} /></div>
      <span style={{ ...pf(6), color: C.textLight }}>{Math.round(progress)}%</span>
    </div>
  );
}
