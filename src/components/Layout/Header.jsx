import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../hooks/useRole';
import SyncIndicator from '../Sync/SyncIndicator';
import './Header.css';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { logout, profile } = useAuth();
  const { isAdmin } = useRole();

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  function goTo(path) {
    setMenuOpen(false);
    navigate(path);
  }

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
  }

  const isStaging = import.meta.env.VITE_STAGING === 'true';

  return (
    <header className="app-header">
      <h1>VRS App{isStaging && <span className="header-staging-badge">STAGING</span>}</h1>
      {profile?.ringer_naam && (
        <span className="header-ringer">{profile.ringer_naam}</span>
      )}
      <div className="header-sync">
        <SyncIndicator />
      </div>
      <div className="header-menu" ref={menuRef}>
        <button
          className="hamburger-btn"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Menu"
        >
          &#9776;
        </button>
        {menuOpen && (
          <div className="header-dropdown">
            {isAdmin && (
              <button onClick={() => goTo('/admin')} className="header-admin-btn">
                ⚙ Admin panel
              </button>
            )}
            <button onClick={() => goTo('/projecten')}>Projecten</button>
            <button onClick={() => goTo('/ringstrengen')}>Ringstrengen</button>
            <button onClick={() => goTo('/instellingen')}>Instellingen</button>
            <button onClick={() => goTo('/over')}>Over</button>
            <div className="header-dropdown-divider" />
            <button onClick={handleLogout} className="header-logout-btn">Uitloggen</button>
          </div>
        )}
      </div>
    </header>
  );
}
