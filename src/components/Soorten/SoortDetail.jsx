import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import speciesRef from '../../data/species-reference.json';
import './SoortDetail.css';

const soorten = speciesRef.filter(s => s.naam_nl && !s.naam_nl.includes('groene tekst'));

function parseVal(v) {
  if (v === undefined || v === null || v === '') return NaN;
  return parseFloat(String(v).replace(',', '.'));
}

function calcStats(records, field) {
  const vals = records.map(r => parseVal(r[field])).filter(v => !isNaN(v) && v > 0);
  if (vals.length === 0) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return { min, max, avg, n: vals.length };
}

export default function SoortDetail({ records }) {
  const { naam } = useParams();
  const navigate = useNavigate();
  const decodedNaam = decodeURIComponent(naam);

  const soort = soorten.find(s => s.naam_nl === decodedNaam);

  const soortRecords = useMemo(() => {
    if (!decodedNaam) return [];
    const lower = decodedNaam.toLowerCase();
    return records.filter(r => r.vogelnaam && r.vogelnaam.toLowerCase() === lower);
  }, [records, decodedNaam]);

  const bioStats = useMemo(() => {
    const fields = [
      { key: 'vleugel', label: 'Vleugel', unit: 'mm' },
      { key: 'gewicht', label: 'Gewicht', unit: 'g' },
      { key: 'handpenlengte', label: 'P8 / Handpen', unit: 'mm' },
      { key: 'staartlengte', label: 'Staart', unit: 'mm' },
      { key: 'kop_snavel', label: 'Kop+snavel', unit: 'mm' },
      { key: 'tarsus_lengte', label: 'Tarsus', unit: 'mm' },
      { key: 'tarsus_dikte', label: 'Tarsus dikte', unit: 'mm' },
      { key: 'snavel_schedel', label: 'Snavel-schedel', unit: 'mm' },
    ];
    return fields.map(f => ({ ...f, stats: calcStats(soortRecords, f.key) })).filter(f => f.stats);
  }, [soortRecords]);

  // Gender breakdown
  const genderStats = useMemo(() => {
    const counts = {};
    soortRecords.forEach(r => {
      const g = r.geslacht || 'U';
      counts[g] = (counts[g] || 0) + 1;
    });
    return counts;
  }, [soortRecords]);

  // Age breakdown
  const ageStats = useMemo(() => {
    const counts = {};
    soortRecords.forEach(r => {
      const a = r.leeftijd || '?';
      counts[a] = (counts[a] || 0) + 1;
    });
    return counts;
  }, [soortRecords]);

  if (!soort) {
    return (
      <div className="page">
        <button className="btn-secondary" onClick={() => navigate('/soorten')}>Terug</button>
        <div className="empty-state">Soort niet gevonden</div>
      </div>
    );
  }

  return (
    <div className="page soort-detail">
      <button className="btn-secondary back-btn" onClick={() => navigate('/soorten')}>
        ← Terug
      </button>

      <h2>{soort.naam_nl}</h2>

      {/* Namen */}
      <div className="section">
        <h3>Namen</h3>
        <div className="detail-table">
          <div className="dt-row">
            <span className="dt-label">Latijn</span>
            <span className="dt-value"><em>{soort.naam_lat}</em></span>
          </div>
          <div className="dt-row">
            <span className="dt-label">Engels</span>
            <span className="dt-value">{soort.naam_en || '—'}</span>
          </div>
          <div className="dt-row">
            <span className="dt-label">Duits</span>
            <span className="dt-value">{soort.naam_de || '—'}</span>
          </div>
          {soort.familie && (
            <div className="dt-row">
              <span className="dt-label">Familie</span>
              <span className="dt-value">{soort.familie}</span>
            </div>
          )}
          {soort.orde && (
            <div className="dt-row">
              <span className="dt-label">Orde</span>
              <span className="dt-value">{soort.orde}</span>
            </div>
          )}
        </div>
      </div>

      {/* Ring & Rui */}
      <div className="section">
        <h3>Ring & Rui</h3>
        <div className="ring-rui-grid">
          <div className="rr-item rr-highlight">
            <span className="rr-label">Ringmaat</span>
            <span className="rr-value">{soort.ringmaat || '—'}</span>
          </div>
          <div className="rr-item">
            <span className="rr-label">Ruitype</span>
            <span className="rr-value">{soort.ruitype || '—'}</span>
          </div>
        </div>
      </div>

      {/* Nestgegevens */}
      {soort.nest_eileg && soort.nest_eileg !== 'maanden' && (
        <div className="section">
          <h3>Nestgegevens</h3>
          <div className="detail-table">
            <div className="dt-row">
              <span className="dt-label">Eileg</span>
              <span className="dt-value">{soort.nest_eileg}</span>
            </div>
            <div className="dt-row">
              <span className="dt-label">Broedels</span>
              <span className="dt-value">{soort.nest_broedels || '—'}</span>
            </div>
            <div className="dt-row">
              <span className="dt-label">Eieren</span>
              <span className="dt-value">{soort.nest_eieren || '—'}</span>
            </div>
            <div className="dt-row">
              <span className="dt-label">Broedtijd</span>
              <span className="dt-value">{soort.nest_ei_dagen ? `${soort.nest_ei_dagen} dagen` : '—'}</span>
            </div>
            <div className="dt-row">
              <span className="dt-label">Nestjong</span>
              <span className="dt-value">{soort.nest_jong_dagen ? `${soort.nest_jong_dagen} dagen` : '—'}</span>
            </div>
            {(soort.broed || soort.zorg) && (
              <div className="dt-row">
                <span className="dt-label">Broedzorg</span>
                <span className="dt-value">
                  {soort.broed && <>Broed: {soort.broed}</>}
                  {soort.broed && soort.zorg && ' / '}
                  {soort.zorg && <>Zorg: {soort.zorg}</>}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Determinatieboeken */}
      {soort.boeken && Object.keys(soort.boeken).length > 0 && (
        <div className="section">
          <h3>Determinatieboeken</h3>
          <div className="boeken-list">
            {Object.entries(soort.boeken).map(([boek, pagina]) => (
              <div key={boek} className="boek-item">
                <span className="boek-naam">{boek.replace(/_/g, ' ')}</span>
                <span className="boek-pagina">p. {pagina}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mijn vangsten */}
      <div className="section">
        <h3>Mijn vangsten</h3>
        {soortRecords.length === 0 ? (
          <p className="empty-text">Nog geen vangsten van deze soort</p>
        ) : (
          <>
            {/* Overzicht */}
            <div className="vangst-overview">
              <div className="vo-card">
                <div className="vo-value">{soortRecords.length}</div>
                <div className="vo-label">Totaal</div>
              </div>
              {Object.entries(genderStats).map(([g, count]) => (
                <div key={g} className="vo-card">
                  <div className="vo-value">{count}</div>
                  <div className="vo-label">{g === 'M' ? 'Man' : g === 'F' ? 'Vrouw' : 'Onbekend'}</div>
                </div>
              ))}
            </div>

            {/* Leeftijdsverdeling */}
            {Object.keys(ageStats).length > 1 && (
              <div className="age-stats">
                <span className="substats-title">Leeftijd</span>
                <div className="age-grid">
                  {Object.entries(ageStats).sort((a, b) => b[1] - a[1]).map(([age, count]) => (
                    <span key={age} className="age-chip">
                      {age}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Biometrie tabel */}
            {bioStats.length > 0 && (
              <div className="bio-table">
                <span className="substats-title">Biometrie</span>
                <table>
                  <thead>
                    <tr>
                      <th>Meting</th>
                      <th>Min</th>
                      <th>Gem.</th>
                      <th>Max</th>
                      <th>n</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bioStats.map(b => (
                      <tr key={b.key}>
                        <td className="bio-field">{b.label} <span className="bio-unit">({b.unit})</span></td>
                        <td className="bio-num">{b.stats.min.toFixed(1)}</td>
                        <td className="bio-num bio-avg">{b.stats.avg.toFixed(1)}</td>
                        <td className="bio-num">{b.stats.max.toFixed(1)}</td>
                        <td className="bio-num bio-n">{b.stats.n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Recente vangsten */}
            <div className="recent-vangsten">
              <span className="substats-title">Recente vangsten</span>
              {soortRecords.slice(0, 5).map(r => (
                <div key={r.id} className="rv-item">
                  <span className="rv-ring">{r.ringnummer}</span>
                  <span className="rv-date">{r.vangstdatum}</span>
                  <span className="rv-meta">
                    {r.geslacht && r.geslacht !== 'U' && <>{r.geslacht}</>}
                    {r.leeftijd && <> / lft {r.leeftijd}</>}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
