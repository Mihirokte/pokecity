import { usePokecenterStore } from '../pokecenterStore';
import { PageHeader } from '../components/PageHeader';

export function Notifications() {
  const notifications = usePokecenterStore(s => s.notifications);
  const agents = usePokecenterStore(s => s.agents);
  const markNotificationRead = usePokecenterStore(s => s.markNotificationRead);
  const markAllNotificationsRead = usePokecenterStore(s => s.markAllNotificationsRead);

  const unread = notifications.filter(n => n.read !== 'true');
  const read = notifications.filter(n => n.read === 'true');

  const formatTime = (ts: string) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        description={`${unread.length} unread`}
        actions={
          unread.length > 0 ? (
            <button className="btn btn--secondary" onClick={markAllNotificationsRead}>
              Mark all read
            </button>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">&#x1F514;</div>
          <div className="empty-state__text">No notifications</div>
          <div className="empty-state__sub">You're all caught up</div>
        </div>
      ) : (
        <>
          {unread.length > 0 && (
            <div className="section">
              <div className="section__title">Unread ({unread.length})</div>
              <div className="card" style={{ padding: 0 }}>
                {unread.map(n => {
                  const agent = agents.find(a => a.id === n.agentId);
                  return (
                    <div key={n.id} className="notif-item notif-item--unread" onClick={() => markNotificationRead(n.id)}>
                      <span className="notif-item__dot" />
                      <span className="notif-item__text">
                        {n.message}
                        {agent && (
                          <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8 }}>
                            — {agent.name}
                          </span>
                        )}
                      </span>
                      <span className="notif-item__time">{formatTime(n.createdAt)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {read.length > 0 && (
            <div className="section">
              <div className="section__title">Read</div>
              <div className="card" style={{ padding: 0 }}>
                {read.map(n => {
                  const agent = agents.find(a => a.id === n.agentId);
                  return (
                    <div key={n.id} className="notif-item">
                      <span className="notif-item__dot notif-item__dot--read" />
                      <span className="notif-item__text" style={{ color: 'var(--text-secondary)' }}>
                        {n.message}
                        {agent && (
                          <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8 }}>
                            — {agent.name}
                          </span>
                        )}
                      </span>
                      <span className="notif-item__time">{formatTime(n.createdAt)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
