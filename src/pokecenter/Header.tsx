import { usePokecenterStore } from './pokecenterStore';

interface HeaderProps {
  onMenuToggle: () => void;
  onBack?: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  notifications: 'Notifications',
};

export function Header({ onMenuToggle, onBack }: HeaderProps) {
  const currentPage = usePokecenterStore(s => s.currentPage);
  const agents = usePokecenterStore(s => s.agents);

  let title = PAGE_TITLES[currentPage] || 'Dashboard';
  if (currentPage.startsWith('agent:')) {
    const agentId = currentPage.split(':')[1];
    const agent = agents.find(a => a.id === agentId);
    title = agent ? agent.name : 'Agent';
  }

  return (
    <header className="header" style={{ gap: 8 }}>
      <button className="mobile-menu-toggle" onClick={onMenuToggle}>
        &#9776;
      </button>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            fontFamily: "'Dogica', monospace",
            fontSize: 9,
            fontWeight: 700,
            background: 'rgba(255,215,0,0.1)',
            color: '#FFD700',
            border: '2px solid rgba(255,215,0,0.35)',
            borderRadius: 0,
            padding: '5px 10px',
            cursor: 'pointer',
            letterSpacing: '0.05em',
            flexShrink: 0,
          }}
        >
          ← CITY
        </button>
      )}
      <h1 className="header__title">{title}</h1>
      <div className="header__spacer" />
    </header>
  );
}
