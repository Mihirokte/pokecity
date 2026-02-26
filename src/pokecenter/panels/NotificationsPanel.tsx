import { useState } from 'react';
import { usePokecenterStore } from '../pokecenterStore';
import { C, pf } from '../gba-theme';
import { PanelShell, SectionTitle } from './PanelShell';

interface Props {
  onClose: () => void;
}

function formatTimeAgo(ts: string, nowMs: number) {
  if (!ts) return '';
  const diff = nowMs - new Date(ts).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function NotificationsPanel({ onClose }: Props) {
  const notifications = usePokecenterStore(s => s.notifications);
  const agents = usePokecenterStore(s => s.agents);
  const markNotificationRead = usePokecenterStore(s => s.markNotificationRead);
  const markAllNotificationsRead = usePokecenterStore(s => s.markAllNotificationsRead);

  const sorted = [...notifications].sort((a, b) => {
    if (a.read !== b.read) return a.read === 'true' ? 1 : -1;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  const unreadCount = notifications.filter(n => n.read !== 'true').length;
  const [nowMs] = useState(() => Date.now());

  return (
    <PanelShell title="🔔 BULLETIN BOARD" onClose={onClose}>
      <div style={{ ...pf(8), color: C.textLight, marginBottom: 8 }}>
        {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
      </div>

      <SectionTitle>── NOTIFICATIONS ──</SectionTitle>
      <div style={{ marginBottom: 12 }}>
        {sorted.map(n => {
          const agent = agents.find(a => a.id === n.agentId);
          const isUnread = n.read !== 'true';
          return (
            <div key={n.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '8px 4px',
              borderBottom: `1px solid rgba(255,255,255,0.1)`,
              opacity: isUnread ? 1 : 0.5,
            }}>
              <span style={{ ...pf(10), color: isUnread ? C.statusYellow : C.panelBorderDim, flexShrink: 0 }}>
                {isUnread ? '●' : '○'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ ...pf(7), color: C.textLight, marginBottom: 2 }}>
                  {agent?.name || 'System'}: "{n.message}"
                </div>
                <div style={{ ...pf(6), color: 'rgba(255,255,255,0.4)' }}>
                  {formatTimeAgo(n.createdAt, nowMs)}
                </div>
              </div>
              {isUnread && (
                <button className="gba-btn" style={{ fontSize: 6, padding: '3px 6px' }}
                  onClick={() => markNotificationRead(n.id)}>
                  READ
                </button>
              )}
            </div>
          );
        })}
        {notifications.length === 0 && (
          <div style={{ ...pf(8), color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 20 }}>
            No notifications.
          </div>
        )}
      </div>

      <div style={{ ...pf(7), color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
        ● = unread &nbsp;&nbsp; ○ = read
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button className="gba-btn" onClick={markAllNotificationsRead} disabled={unreadCount === 0}>
          MARK ALL READ
        </button>
      </div>
    </PanelShell>
  );
}
