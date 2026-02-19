import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../hooks/useRole';
import { supabase } from '../../lib/supabase';
import './AdminPage.css';

const ROLLEN = ['ringer', 'viewer', 'admin'];
const ROL_LABEL = { admin: 'Admin', ringer: 'Ringer', viewer: 'Viewer' };

export default function AdminPage() {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const navigate = useNavigate();
  const [gebruikers, setGebruikers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    loadGebruikers();
  }, [isAdmin]);  // eslint-disable-line react-hooks/exhaustive-deps

  async function loadGebruikers() {
    setLoading(true);
    setError('');

    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (err) {
      setError(
        'Kon gebruikers niet laden. Voer eerst supabase-phase3.sql uit in het Supabase SQL-editor.'
      );
      setLoading(false);
      return;
    }

    // Haal vangstenaantal per gebruiker op
    const metCounts = await Promise.all(
      data.map(async (p) => {
        const { count } = await supabase
          .from('vangsten')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', p.id);
        return { ...p, vangsten_count: count ?? 0 };
      })
    );

    setGebruikers(metCounts);
    setLoading(false);
  }

  async function changeRol(profileId, newRol) {
    if (profileId === user.id) return; // Admin mag eigen rol niet wijzigen
    setSavingId(profileId);
    const { error: err } = await supabase
      .from('profiles')
      .update({ rol: newRol, updated_at: new Date().toISOString() })
      .eq('id', profileId);
    if (!err) {
      setGebruikers(prev =>
        prev.map(g => g.id === profileId ? { ...g, rol: newRol } : g)
      );
    }
    setSavingId(null);
  }

  if (!isAdmin) return null;

  return (
    <div className="page admin-page">
      <h2>Admin panel</h2>

      {loading && <div className="admin-status">Gebruikers laden...</div>}

      {error && (
        <div className="admin-error">
          <strong>Fout:</strong> {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="section">
            <h3>Gebruikers ({gebruikers.length})</h3>
            <div className="admin-users">
              {gebruikers.map(g => (
                <div
                  key={g.id}
                  className={`admin-user-card${g.id === user.id ? ' is-self' : ''}`}
                >
                  <div className="admin-user-info">
                    <div className="admin-user-name">
                      {g.ringer_naam || <em>Naam niet ingesteld</em>}
                      {g.id === user.id && (
                        <span className="admin-badge admin-badge--self">Jij</span>
                      )}
                    </div>
                    <div className="admin-user-email">{g.email || '–'}</div>
                    <div className="admin-user-meta">
                      {g.ringer_nummer && <span>Ringer #{g.ringer_nummer}</span>}
                      <span className="admin-count">{g.vangsten_count} vangsten</span>
                    </div>
                  </div>

                  <div className="admin-user-rol">
                    {g.id === user.id ? (
                      <span className="rol-badge">
                        {ROL_LABEL[g.rol] || g.rol}
                      </span>
                    ) : (
                      <select
                        value={g.rol || 'ringer'}
                        onChange={e => changeRol(g.id, e.target.value)}
                        disabled={savingId === g.id}
                        className="rol-select"
                        aria-label={`Rol van ${g.ringer_naam || g.email}`}
                      >
                        {ROLLEN.map(r => (
                          <option key={r} value={r}>{ROL_LABEL[r]}</option>
                        ))}
                      </select>
                    )}
                    {savingId === g.id && (
                      <span className="admin-saving">Opslaan...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <h3>Nieuwe gebruiker uitnodigen</h3>
            <div className="section-content">
              <p className="admin-hint">
                Laat de nieuwe gebruiker zelf een account aanmaken via het inlogscherm
                (Registreren). Zodra ze zijn ingelogd, verschijnen ze hier en kun je
                hun rol instellen.
              </p>
              <p className="admin-hint">
                <strong>Rol uitleg:</strong><br />
                <strong>Ringer</strong> — kan eigen vangsten toevoegen en beheren.<br />
                <strong>Viewer</strong> — kan data alleen bekijken, niet bewerken.<br />
                <strong>Admin</strong> — volledige toegang inclusief dit panel.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
