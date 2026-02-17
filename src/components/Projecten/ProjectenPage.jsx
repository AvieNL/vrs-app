import { useState } from 'react';
import './ProjectenPage.css';

export default function ProjectenPage({ projects, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [naam, setNaam] = useState('');
  const [locatie, setLocatie] = useState('');

  function handleAdd(e) {
    e.preventDefault();
    if (!naam.trim()) return;
    onAdd({ naam: naam.trim(), locatie: locatie.trim() });
    setNaam('');
    setLocatie('');
    setShowForm(false);
  }

  return (
    <div className="page projecten-page">
      <div className="page-top">
        <h2>Projecten</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Annuleer' : '+ Nieuw'}
        </button>
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
              <div className="project-info">
                <strong>{p.naam}</strong>
                {p.locatie && <span className="project-loc">{p.locatie}</span>}
              </div>
              <div className="project-actions">
                <button
                  className={`btn-secondary badge ${p.actief ? 'badge-success' : ''}`}
                  onClick={() => onUpdate(p.id, { actief: !p.actief })}
                  style={{ minWidth: 'auto', minHeight: 'auto', padding: '4px 10px' }}
                >
                  {p.actief ? 'Actief' : 'Inactief'}
                </button>
                <button
                  className="btn-danger"
                  onClick={() => onDelete(p.id)}
                  style={{ minWidth: 'auto', minHeight: 'auto', padding: '4px 10px', fontSize: '0.8rem' }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
