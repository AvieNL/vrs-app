import { useState, useEffect } from 'react';
import { useRole } from '../../hooks/useRole';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import './ProjectenPage.css';

// Ingebouwde component voor ledenbeheeer per project
function ProjectMembers({ project }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isOwner = project.user_id === user?.id;

  async function loadMembers() {
    const { data } = await supabase.rpc('get_project_members', { p_project_id: project.id });
    setMembers(data || []);
  }

  useEffect(() => {
    if (open) loadMembers();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addMember() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      const { data: userId, error: lookupErr } = await supabase.rpc('lookup_user_id', { p_email: trimmed });
      if (lookupErr || !userId) throw new Error('Geen account gevonden voor dit e-mailadres.');
      if (userId === user.id) throw new Error('Je kunt jezelf niet toevoegen.');

      const { error: insertErr } = await supabase
        .from('project_members')
        .insert({ project_id: project.id, user_id: userId });
      if (insertErr) {
        if (insertErr.code === '23505') throw new Error('Deze ringer is al lid van het project.');
        throw insertErr;
      }
      setEmail('');
      await loadMembers();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function removeMember(userId) {
    await supabase.from('project_members').delete()
      .eq('project_id', project.id)
      .eq('user_id', userId);
    await loadMembers();
  }

  if (!isOwner && !project.shared) return null;

  return (
    <div className="project-members">
      <button
        className="project-members-toggle"
        onClick={() => setOpen(o => !o)}
      >
        {open ? '▾' : '▸'} {open ? 'Leden' : `Leden${members.length > 0 ? ` (${members.length})` : ''}`}
      </button>
      {open && (
        <div className="project-members-panel">
          {members.length === 0 ? (
            <p className="project-members-empty">Nog geen leden toegevoegd.</p>
          ) : (
            members.map(m => (
              <div key={m.user_id} className="project-member-row">
                <span className="project-member-name">
                  {m.ringer_naam || m.email}
                  {m.email && m.ringer_naam && (
                    <span className="project-member-email">{m.email}</span>
                  )}
                </span>
                {isOwner && (
                  <button
                    className="project-member-remove"
                    onClick={() => removeMember(m.user_id)}
                    title="Verwijderen"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))
          )}
          {isOwner && (
            <div className="project-members-add">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addMember()}
                placeholder="e-mailadres van ringer"
              />
              <button
                className="btn-success btn-sm"
                onClick={addMember}
                disabled={loading || !email.trim()}
              >
                {loading ? '...' : 'Toevoegen'}
              </button>
            </div>
          )}
          {error && <p className="project-members-error">{error}</p>}
        </div>
      )}
    </div>
  );
}

export default function ProjectenPage({ projects, onAdd, onUpdate, onDelete, onRenameProject }) {
  const { canAdd, canEdit, canDelete } = useRole();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [naam, setNaam] = useState('');
  const [locatie, setLocatie] = useState('');
  const [nummer, setNummer] = useState('');
  const [editId, setEditId] = useState(null);
  const [editNaam, setEditNaam] = useState('');
  const [editLocatie, setEditLocatie] = useState('');
  const [editNummer, setEditNummer] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  function handleAdd(e) {
    e.preventDefault();
    if (!naam.trim()) return;
    onAdd({ naam: naam.trim(), locatie: locatie.trim(), nummer: nummer.trim() });
    setNaam('');
    setLocatie('');
    setNummer('');
    setShowForm(false);
  }

  function startEdit(p) {
    setEditId(p.id);
    setEditNaam(p.naam);
    setEditLocatie(p.locatie || '');
    setEditNummer(p.nummer || '');
  }

  function cancelEdit() {
    setEditId(null);
  }

  function saveEdit(p) {
    const newNaam = editNaam.trim();
    if (!newNaam) return;
    if (newNaam !== p.naam && onRenameProject) {
      onRenameProject(p.naam, newNaam);
    }
    onUpdate(p.id, { naam: newNaam, locatie: editLocatie.trim(), nummer: editNummer.trim() });
    setEditId(null);
  }

  return (
    <div className="page projecten-page">
      <div className="page-top">
        <h2>Projecten</h2>
        {canAdd && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Annuleer' : '+ Nieuw'}
          </button>
        )}
      </div>

      {showForm && (
        <form className="section" onSubmit={handleAdd}>
          <div className="form-group">
            <label>Projectnaam *</label>
            <input type="text" value={naam} onChange={e => setNaam(e.target.value)} placeholder="bijv. CES Breedenbroek 2025" />
          </div>
          <div className="form-group">
            <label>Locatie</label>
            <input type="text" value={locatie} onChange={e => setLocatie(e.target.value)} placeholder="bijv. Breedenbroek" />
          </div>
          <div className="form-group">
            <label>Projectnummer</label>
            <input type="text" value={nummer} onChange={e => setNummer(e.target.value)} placeholder="bijv. 1925" />
          </div>
          <button type="submit" className="btn-success" style={{ width: '100%' }}>
            Project Toevoegen
          </button>
        </form>
      )}

      <div className="project-list">
        {projects.length === 0 ? (
          <div className="empty-state">Nog geen projecten</div>
        ) : (
          projects.map(p => {
            const isOwn = p.user_id === user?.id;
            const isShared = p.shared === true;
            return (
              <div key={p.id} className={`project-card${isShared ? ' project-card--shared' : ''}`}>
                {editId === p.id ? (
                  <div className="project-edit">
                    <div className="form-group">
                      <label>Naam</label>
                      <input type="text" value={editNaam} onChange={e => setEditNaam(e.target.value)} />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Locatie</label>
                        <input type="text" value={editLocatie} onChange={e => setEditLocatie(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Nummer</label>
                        <input type="text" value={editNummer} onChange={e => setEditNummer(e.target.value)} />
                      </div>
                    </div>
                    <div className="project-edit-actions">
                      <button type="button" className="btn-success btn-sm" onClick={() => saveEdit(p)}>
                        Opslaan
                      </button>
                      <button type="button" className="btn-secondary btn-sm" onClick={cancelEdit}>
                        Annuleer
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="project-info">
                      <strong>{p.naam}</strong>
                      <span className="project-meta">
                        {p.nummer && <span className="project-nummer">#{p.nummer}</span>}
                        {p.locatie && <span className="project-loc">{p.locatie}</span>}
                        {isShared && <span className="project-shared-badge">Gedeeld</span>}
                      </span>
                      <ProjectMembers project={p} />
                    </div>
                    <div className="project-actions">
                      {canEdit && isOwn && (
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => startEdit(p)}
                        >
                          Bewerk
                        </button>
                      )}
                      <button
                        className={`btn-secondary btn-sm badge ${p.actief ? 'badge-success' : ''}`}
                        onClick={() => canEdit && isOwn && onUpdate(p.id, { actief: !p.actief })}
                        disabled={!canEdit || !isOwn}
                      >
                        {p.actief ? 'Actief' : 'Inactief'}
                      </button>
                      {canDelete && isOwn && (
                        confirmDeleteId === p.id ? (
                          <>
                            <button
                              className="btn-danger btn-sm"
                              onClick={() => { onDelete(p.id); setConfirmDeleteId(null); }}
                            >
                              Zeker?
                            </button>
                            <button
                              className="btn-secondary btn-sm"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Nee
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn-danger btn-sm"
                            onClick={() => setConfirmDeleteId(p.id)}
                          >
                            Verwijder
                          </button>
                        )
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
