import { NavLink } from 'react-router-dom';
import { useRole } from '../../hooks/useRole';
import './Navigation.css';

const ALL_TABS = [
  { path: '/', label: 'Nieuw', icon: '＋', requiresEdit: true },
  { path: '/records', label: 'Records', icon: '☰' },
  { path: '/stats', label: 'Stats', icon: '◔' },
  { path: '/soorten', label: 'Soorten', icon: '🐦' },
  { path: '/velden', label: 'Velden', icon: '▦' },
];

export default function Navigation() {
  const { canAdd } = useRole();
  const tabs = ALL_TABS.filter(t => !t.requiresEdit || canAdd);

  return (
    <nav className="bottom-nav">
      {tabs.map(tab => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.path === '/'}
          className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
