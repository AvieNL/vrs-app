import { NavLink } from 'react-router-dom';
import './Navigation.css';

const tabs = [
  { path: '/', label: 'Nieuw', icon: '＋' },
  { path: '/records', label: 'Records', icon: '☰' },
  { path: '/stats', label: 'Stats', icon: '◔' },
  { path: '/projecten', label: 'Projecten', icon: '▤' },
  { path: '/soorten', label: 'Soorten', icon: '🐦' },
  { path: '/velden', label: 'Velden', icon: '▦' },
];

export default function Navigation() {
  return (
    <nav className="bottom-nav">
      {tabs.map(tab => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
