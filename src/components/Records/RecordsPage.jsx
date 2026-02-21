import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRole } from '../../hooks/useRole';
import './RecordsPage.css';

function geslachtIcoon(g) {
  if (g === 'M') return <span className="gender-m">♂</span>;
  if (g === 'V' || g === 'F') return <span className="gender-f">♀</span>;
  return null;
}

function fmtTijd(t) {
  if (!t) return '';
  const s = String(t).replace(':', '');
  if (s.length === 4) return s.slice(0, 2) + ':' + s.slice(2);
  return t;
}

function stripDots(ring) {
  return ring ? ring.replace(/\./g, '') : '';
}

const LEEFTIJD_LABEL = {
  '0': '?',
  '1': 'pullus',
  '2': 'onb.',
  '3': '1kj',
  '4': '+1kj',
  '5': '2kj',
  '6': '+2kj',
  '7': '3kj',
  '8': '+3kj',
  '9': '4kj+',
  'A': '+4kj',
};

function leeftijdLabel(code) {
  if (!code) return '';
  return LEEFTIJD_LABEL[code] || code;
}

export default function RecordsPage({ records, deletedRecords = [], onDelete, onRestore, onPermanentDelete }) {
  const [zoek, setZoek] = useState('');
  const [prullenbakOpen, setPrullenbakOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { canDelete } = useRole();

  useEffect(() => {
    const openId = location.state?.openId;
    if (!openId) return;
    const record = records.find(r => r.id === openId);
    if (record?.ringnummer) setZoek(record.ringnummer);
    setExpanded(openId);
    setTimeout(() => {
      const el = document.getElementById(`record-${openId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.openId]);

  useEffect(() => {
    const filterSoort = location.state?.filterSoort;
    if (filterSoort) setZoek(filterSoort);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.filterSoort]);

  const filtered = useMemo(() => {
    if (!zoek) return records;
    const lower = zoek.toLowerCase();
    return records.filter(r =>
      (r.vogelnaam && r.vogelnaam.toLowerCase().includes(lower)) ||
      (r.ringnummer && r.ringnummer.toLowerCase().includes(lower)) ||
      (r.vangstdatum && r.vangstdatum.includes(lower)) ||
      (r.project && r.project.toLowerCase().includes(lower))
    );
  }, [records, zoek]);

  return (
    <div className="page records-page">
      <div className="search-bar">
        <input
          type="search"
          value={zoek}
          onChange={e => setZoek(e.target.value)}
          placeholder="Zoek op soort, ring, datum, project..."
        />
        <span className="result-count">{filtered.length} vangsten</span>
      </div>

      <div className="records-list">
        {filtered.length === 0 ? (
          <div className="empty-state">Geen vangsten gevonden</div>
        ) : (
          filtered.slice(0, 100).map(r => {
            const isTerugvangst = r.metalenringinfo === 4 || r.metalenringinfo === '4';
            return (
            <div
              key={r.id}
              id={`record-${r.id}`}
              className={`record-card ${expanded === r.id ? 'expanded' : ''}`}
              onClick={() => setExpanded(expanded === r.id ? null : r.id)}
            >
              <div className="record-header">
                <span className={`record-type${isTerugvangst ? ' record-type--tv' : ''}`}>{isTerugvangst ? 'TV' : 'NV'}</span>
                <div className="record-main">
                  <strong>{r.vogelnaam || 'Onbekend'}</strong>
                  <div className="record-ring-row">
                    <span className="record-ring ring-link" onClick={e => { e.stopPropagation(); setExpanded(r.id); setTimeout(() => { document.getElementById(`record-${r.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50); }}>{stripDots(r.ringnummer)}</span>
                    {r.geslacht && r.geslacht !== 'U' && geslachtIcoon(r.geslacht)}
                  </div>
                </div>
                <div className="record-meta">
                  <span>{r.vangstdatum}</span>
                  {r.bron === 'griel_import' && <span className="badge badge-accent">Griel</span>}
                </div>
              </div>

              {expanded === r.id && (
                <div className="record-details">
                  <div className="detail-grid">
                    {r.leeftijd && <div><span className="detail-label">Leeftijd:</span> {leeftijdLabel(r.leeftijd)}</div>}
                    {r.geslacht && r.geslacht !== 'U' && <div><span className="detail-label">Geslacht:</span> {geslachtIcoon(r.geslacht)}</div>}
                    {r.vangstmethode && <div><span className="detail-label">Methode:</span> {r.vangstmethode}</div>}
                    {r.project && <div><span className="detail-label">Project:</span> {r.project}</div>}
                    {r.vleugel && <div><span className="detail-label">Vleugel:</span> {r.vleugel} mm</div>}
                    {r.gewicht && <div><span className="detail-label">Gewicht:</span> {r.gewicht} g</div>}
                    {r.handpenlengte && <div><span className="detail-label">P8:</span> {r.handpenlengte} mm</div>}
                    {r.staartlengte && <div><span className="detail-label">Staart:</span> {r.staartlengte} mm</div>}
                    {r.tarsus_lengte && <div><span className="detail-label">Tarsus:</span> {r.tarsus_lengte} mm</div>}
                    {r.vet && <div><span className="detail-label">Vet:</span> {r.vet}</div>}
                    {r.tijd && <div><span className="detail-label">Tijd:</span> {fmtTijd(r.tijd)}</div>}
                    {r.google_plaats && <div><span className="detail-label">Plaats:</span> {r.google_plaats}</div>}
                    {r.opmerkingen && <div><span className="detail-label">Opmerkingen:</span> {r.opmerkingen}</div>}
                  </div>
                  {canDelete && r.bron !== 'griel_import' && (
                    <div className="record-actions">
                      {!r.uploaded && (
                        <button
                          className="record-action-btn record-edit-btn"
                          title="Wijzigen"
                          onClick={e => { e.stopPropagation(); navigate('/', { state: { editRecord: r } }); }}
                        >✏️</button>
                      )}
                      {onDelete && (
                        <button
                          className="record-action-btn record-delete-btn"
                          title="Verwijderen"
                          onClick={e => { e.stopPropagation(); onDelete(r.id); }}
                        >🗑️</button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            );
          })
        )}
        {filtered.length > 100 && (
          <div className="empty-state">
            Toont eerste 100 van {filtered.length} resultaten. Verfijn je zoekopdracht.
          </div>
        )}
      </div>

      {deletedRecords.length > 0 && (
        <div className="prullenbak-section">
          <button
            className="prullenbak-toggle"
            onClick={() => setPrullenbakOpen(o => !o)}
          >
            {prullenbakOpen ? '▾' : '▸'} Prullenbak ({deletedRecords.length})
          </button>
          {prullenbakOpen && (
            <div className="prullenbak-list">
              {deletedRecords.map(r => (
                <div key={r.id} className="prullenbak-item">
                  <div className="prullenbak-info">
                    <strong>{r.vogelnaam || 'Onbekend'}</strong>
                    {r.ringnummer && <span className="prullenbak-ring">{stripDots(r.ringnummer)}</span>}
                    {r.vangstdatum && <span className="prullenbak-datum">{r.vangstdatum}</span>}
                  </div>
                  <div className="prullenbak-acties">
                    {onRestore && canDelete && (
                      <button
                        className="btn-success prullenbak-btn"
                        onClick={() => onRestore(r.id)}
                      >
                        Herstellen
                      </button>
                    )}
                    {onPermanentDelete && canDelete && (
                      <button
                        className="btn-danger prullenbak-btn"
                        onClick={() => onPermanentDelete(r.id)}
                      >
                        Definitief
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
