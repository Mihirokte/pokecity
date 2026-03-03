import { usePokecenterStore } from './pokecenterStore';

interface HeaderProps {
  onMenuToggle: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  tasks: 'Tasks',
  calendar: 'Calendar',
  notes: 'Notes',
  twitter: 'Twitter Bot',
  linkedin: 'LinkedIn Bot',
  travel: 'Travel',
  gym: 'Gym',
  shopping: 'Shopping',
  notifications: 'Notifications',
  knowledge: 'Knowledge Base',
};

export function Header({ onMenuToggle }: HeaderProps) {
  const currentPage = usePokecenterStore(s => s.currentPage);
  const agents = usePokecenterStore(s => s.agents);

  let title = PAGE_TITLES[currentPage] || 'Dashboard';
  if (currentPage.startsWith('agent:')) {
    const agentId = currentPage.split(':')[1];
    const agent = agents.find(a => a.id === agentId);
    title = agent ? agent.name : 'Agent';
  }

  return (
    <header className="header">
      <button className="mobile-menu-toggle" onClick={onMenuToggle}>
        &#9776;
      </button>
      <h1 className="header__title">{title}</h1>
      <div className="header__spacer" />
    </header>
  );
}
