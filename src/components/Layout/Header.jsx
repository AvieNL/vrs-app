import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../hooks/useRole';
import SyncIndicator from '../Sync/SyncIndicator';
import './Header.css';

const ROL_LABELS = { admin: 'Admin', ringer: 'Ringer', viewer: 'Viewer' };

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { logout, profile, simulatedRole, setSimulatedRole } = useAuth();
  const { isSimulating, rol } = useRole();

  const isRealAdmin = profile?.rol === 'admin';

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

  function switchRole(newRol) {
    setSimulatedRole(newRol === profile?.rol ? null : newRol);
  }

  const isStaging = import.meta.env.VITE_STAGING === 'true';

  return (
    <header className="app-header">
      {/* Hoofd-rij */}
      <div className="header-inner">
        <h1>VRS App{isStaging && <span className="header-staging-badge">STAGING</span>}</h1>
        {profile?.ringer_naam && (
          <span className="header-ringer">
            {profile.ringer_naam}
            <span className="header-ringer-rol"> ({ROL_LABELS[rol] || rol})</span>
          </span>
        )}
        <div className="header-sync">
          <SyncIndicator />
        </div>
        <div className="header-menu" ref={menuRef}>
          <button
            className={`hamburger-btn${isSimulating ? ' hamburger-btn--simulating' : ''}`}
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Menu"
          >
            &#9776;
            {isSimulating && <span className="hamburger-sim-dot" />}
          </button>
          {menuOpen && (
            <div className="header-dropdown">
              {isRealAdmin && (
                <button onClick={() => goTo('/admin')} className="header-admin-btn">
                  ⚙ Admin panel
                </button>
              )}
              <button onClick={() => goTo('/projecten')}>Projecten</button>
              <button onClick={() => goTo('/ringstrengen')}>Ringstrengen</button>
              <button onClick={() => goTo('/instellingen')}>Instellingen</button>
              <button onClick={() => goTo('/over')}>Over</button>

              {isRealAdmin && (
                <div className="header-role-section">
                  <span className="header-role-label">Rol simuleren</span>
                  <div className="header-role-btns">
                    {['admin', 'ringer', 'viewer'].map(r => (
                      <button
                        key={r}
                        className={`header-role-btn${rol === r ? ' header-role-btn--active' : ''}`}
                        onClick={() => switchRole(r)}
                      >
                        {ROL_LABELS[r]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="header-dropdown-divider" />
              <button onClick={handleLogout} className="header-logout-btn">Uitloggen</button>
            </div>
          )}
        </div>
      </div>

      {/* Simulatiebanner — zichtbaar als admin een andere rol simuleert */}
      {isSimulating && (
        <div className="header-sim-banner">
          Simuleert: <strong>{ROL_LABELS[simulatedRole]}</strong>
          <button onClick={() => setSimulatedRole(null)}>↩ Terug naar Admin</button>
        </div>
      )}
    </header>
  );
}
