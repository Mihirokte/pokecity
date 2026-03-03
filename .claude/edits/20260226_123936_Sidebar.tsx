import { useAuthStore } from '../stores/authStore';
import { usePokecenterStore } from './pokecenterStore';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const currentPage = usePokecenterStore(s => s.currentPage);
  const setCurrentPage = usePokecenterStore(s => s.setCurrentPage);
  const notifications = usePokecenterStore(s => s.notifications);

  const unreadCount = notifications.filter(n => n.read !== 'true').length;

  const overviewItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '\u25A3' },
    { id: 'notifications', label: 'Notifications', icon: '\uD83D\uDD14', badge: unreadCount || undefined },
  ];

  const moduleItems: NavItem[] = [
    { id: 'tasks', label: 'Tasks', icon: '\u2611' },
    { id: 'calendar', label: 'Calendar', icon: '\uD83D\uDCC5' },
    { id: 'notes', label: 'Notes', icon: '\uD83D\uDCDD' },
  ];

  const socialItems: NavItem[] = [
    { id: 'twitter', label: 'Twitter Bot', icon: '\uD83D\uDC26' },
    { id: 'linkedin', label: 'LinkedIn Bot', icon: '\uD83D\uDCBC' },
  ];

  const lifeItems: NavItem[] = [
    { id: 'travel', label: 'Travel', icon: '\u2708' },
    { id: 'gym', label: 'Gym', icon: '\uD83C\uDFCB' },
    { id: 'shopping', label: 'Shopping', icon: '\uD83D\uDED2' },
  ];

  const handleNav = (page: string) => {
    setCurrentPage(page);
    onClose();
  };

  const renderGroup = (label: string, items: NavItem[]) => (
    <div className="sidebar__group">
      <div className="sidebar__group-label">{label}</div>
      {items.map(item => (
        <button
          key={item.id}
          className={`sidebar__item ${currentPage === item.id ? 'sidebar__item--active' : ''}`}
          onClick={() => handleNav(item.id)}
        >
          <span className="sidebar__item-icon">{item.icon}</span>
          {item.label}
          {item.badge ? <span className="sidebar__item-badge">{item.badge}</span> : null}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'sidebar-overlay--visible' : ''}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <img
            className="sidebar__brand-icon"
            src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
            alt="PokéCity"
          />
          <span className="sidebar__brand-text">PokéCity</span>
        </div>

        <nav className="sidebar__nav">
          {renderGroup('Overview', overviewItems)}
          {renderGroup('Productivity', moduleItems)}
          {renderGroup('Social', socialItems)}
          {renderGroup('Lifestyle', lifeItems)}
          {renderGroup('System', systemItems)}
        </nav>

        {user && (
          <div className="sidebar__user">
            <img className="sidebar__avatar" src={user.picture} alt={user.name} />
            <div className="sidebar__user-info">
              <div className="sidebar__user-name">{user.given_name}</div>
              <div className="sidebar__user-email">{user.email}</div>
            </div>
            <button className="sidebar__logout" onClick={logout} title="Logout">
              &#x23FB;
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
