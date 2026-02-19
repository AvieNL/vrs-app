import { useState } from 'react';
import { useRole } from '../../hooks/useRole';
import './ProjectenPage.css';

export default function ProjectenPage({ projects, onAdd, onUpdate, onDelete, onRenameProject }) {
  const { canAdd, canEdit, canDelete } = useRole();
  const [showForm, setShowForm] = useState(false);
  const [naam, setNaam] = useState('');
  const [locatie, setLocatie] = useState('');
  const [nummer, setNummer] = useState('');
  const [editId, setEditId] = useState(null);
  const [editNaam, setEditNaam] = useState('');
  const [editLocatie, setEditLocatie] = useState('');
  const [editNummer, setEditNummer] = useState('');

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
    // Als de naam is gewijzigd, ook records updaten
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
          projects.map(p => (
            <div key={p.id} className="project-card">
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
                    <button type="button" className="btn-success" onClick={() => saveEdit(p)}
                      style={{ minWidth: 'auto', padding: '6px 14px' }}>
                      Opslaan
                    </button>
                    <button type="button" className="btn-secondary" onClick={cancelEdit}
                      style={{ minWidth: 'auto', padding: '6px 14px' }}>
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
                    </span>
                  </div>
                  <div className="project-actions">
                    {canEdit && (
                      <button
                        className="btn-secondary"
                        onClick={() => startEdit(p)}
                        style={{ minWidth: 'auto', minHeight: 'auto', padding: '4px 10px', fontSize: '0.8rem' }}
                      >
                        Bewerk
                      </button>
                    )}
                    <button
                      className={`btn-secondary badge ${p.actief ? 'badge-success' : ''}`}
                      onClick={() => canEdit && onUpdate(p.id, { actief: !p.actief })}
                      disabled={!canEdit}
                      style={{ minWidth: 'auto', minHeight: 'auto', padding: '4px 10px' }}
                    >
                      {p.actief ? 'Actief' : 'Inactief'}
                    </button>
                    {canDelete && (
                      <button
                        className="btn-danger"
                        onClick={() => onDelete(p.id)}
                        style={{ minWidth: 'auto', minHeight: 'auto', padding: '4px 10px', fontSize: '0.8rem' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
