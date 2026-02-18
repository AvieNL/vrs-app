import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Header.css';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

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

  return (
    <header className="app-header">
      <h1>VRS App</h1>
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
            <button onClick={() => goTo('/instellingen')}>Instellingen</button>
            <button onClick={() => goTo('/over')}>Over</button>
          </div>
        )}
      </div>
    </header>
  );
}
