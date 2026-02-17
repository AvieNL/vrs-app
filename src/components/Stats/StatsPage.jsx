import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { exportCSV, exportJSON, exportGrielXML, downloadFile } from '../../utils/export';
import './StatsPage.css';

function parseDate(d) {
  if (!d) return null;
  const parts = d.split('-');
  if (parts[0].length === 4) return new Date(+parts[0], +parts[1] - 1, +parts[2]);
  if (parts[2] && parts[2].length === 4) return new Date(+parts[2], +parts[1] - 1, +parts[0]);
  return null;
}

function dagenTussen(d1, d2) {
  if (!d1 || !d2) return null;
  return Math.round(Math.abs(d2 - d1) / 86400000);
}

function haversineKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDagen(d) {
  if (d === null) return '—';
  if (d === 0) return 'zelfde dag';
  if (d < 30) return `${d} dg`;
  if (d < 365) return `${Math.floor(d / 30)} mnd ${d % 30 ? `${d % 30} dg` : ''}`.trim();
  const j = Math.floor(d / 365);
  const rest = d % 365;
  const m = Math.floor(rest / 30);
  return `${j} jr${m ? ` ${m} mnd` : ''}`;
}

function formatAfstand(km) {
  if (km === null) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function computeStats(records) {
  const soorten = new Set();
  const perSoort = {};
  const perMaand = {};
  const perProject = {};
  let nieuw = 0;
  let terugvangst = 0;

  records.forEach(r => {
    const naam = r.vogelnaam || 'Onbekend';
    soorten.add(naam);

    if (!perSoort[naam]) perSoort[naam] = { nieuw: 0, terugvangst: 0 };
    if (r.metalenringinfo === 1 || r.metalenringinfo === '1') {
      perSoort[naam].nieuw++;
      nieuw++;
    } else {
      perSoort[naam].terugvangst++;
      terugvangst++;
    }

    if (r.vangstdatum) {
      const parts = r.vangstdatum.split('-');
      let maandKey;
      if (parts[0].length === 4) {
        maandKey = `${parts[0]}-${parts[1]}`;
      } else if (parts[2] && parts[2].length === 4) {
        maandKey = `${parts[2]}-${parts[1]}`;
      }
      if (maandKey) {
        perMaand[maandKey] = (perMaand[maandKey] || 0) + 1;
      }
    }

    if (r.project) {
      perProject[r.project] = (perProject[r.project] || 0) + 1;
    }
  });

  const topSoorten = Object.entries(perSoort)
    .map(([naam, s]) => [naam, s.nieuw + s.terugvangst])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  const soortenTabel = Object.entries(perSoort)
    .map(([naam, s]) => ({ naam, nieuw: s.nieuw, terugvangst: s.terugvangst, totaal: s.nieuw + s.terugvangst }))
    .sort((a, b) => b.totaal - a.totaal);

  return { total: records.length, soorten: soorten.size, nieuw, terugvangst, topSoorten, perMaand, perProject, soortenTabel };
}

function computeTerugvangsten(records) {
  // Bouw een index van ringnummer → eerste vangst (metalenringinfo=1)
  const eersteVangst = {};
  records.forEach(r => {
    if (!r.ringnummer) return;
    if (r.metalenringinfo === 1 || r.metalenringinfo === '1') {
      const bestaand = eersteVangst[r.ringnummer];
      if (!bestaand || (r.vangstdatum && (!bestaand.vangstdatum || r.vangstdatum < bestaand.vangstdatum))) {
        eersteVangst[r.ringnummer] = r;
      }
    }
  });

  // Zoek terugvangsten en bereken verschil
  const lijst = [];
  records.forEach(r => {
    if (!r.ringnummer) return;
    if (r.metalenringinfo === 1 || r.metalenringinfo === '1') return;

    const origineel = eersteVangst[r.ringnummer];
    const tvDatum = parseDate(r.vangstdatum);
    const origDatum = origineel ? parseDate(origineel.vangstdatum) : null;
    const dagen = dagenTussen(origDatum, tvDatum);

    let afstandKm = null;
    if (origineel) {
      const lat1 = parseFloat(origineel.lat);
      const lon1 = parseFloat(origineel.lon);
      const lat2 = parseFloat(r.lat);
      const lon2 = parseFloat(r.lon);
      afstandKm = haversineKm(lat1, lon1, lat2, lon2);
    }

    lijst.push({
      ringnummer: r.ringnummer,
      soort: r.vogelnaam || 'Onbekend',
      datum: r.vangstdatum,
      origDatum: origineel?.vangstdatum || null,
      origPlaats: origineel?.plaatscode || origineel?.google_plaats || null,
      plaats: r.plaatscode || r.google_plaats || '',
      dagen,
      afstandKm,
      project: r.project || '',
    });
  });

  // Sorteer op datum (nieuwste eerst)
  lijst.sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));

  return lijst;
}

export default function StatsPage({ records, markAllAsUploaded }) {
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);

  const huidigeRecords = useMemo(
    () => records.filter(r => !r.uploaded && r.bron !== 'griel_import'),
    [records]
  );
  const huidigeStats = useMemo(() => computeStats(huidigeRecords), [huidigeRecords]);
  const totaalStats = useMemo(() => computeStats(records), [records]);
  const terugvangsten = useMemo(() => computeTerugvangsten(records), [records]);

  function handleExport(type, subset) {
    const data = subset === 'huidig' ? huidigeRecords : records;
    const datum = new Date().toISOString().split('T')[0];
    switch (type) {
      case 'csv': {
        const csv = exportCSV(data);
        downloadFile(csv, `vrs-export-${datum}.csv`, 'text/csv');
        break;
      }
      case 'json': {
        const json = exportJSON(data);
        downloadFile(json, `vrs-export-${datum}.json`, 'application/json');
        break;
      }
      case 'griel': {
        const xml = exportGrielXML(data);
        downloadFile(xml, `vrs-griel-${datum}.xml`, 'application/xml');
        if (subset === 'huidig') {
          setShowUploadConfirm(true);
        }
        break;
      }
    }
  }

  function handleConfirmUploaded() {
    markAllAsUploaded();
    setShowUploadConfirm(false);
  }

  function formatDatum(d) {
    if (!d) return '—';
    const parts = d.split('-');
    if (parts[0].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return d;
  }

  return (
    <div className="page stats-page">
      {/* Sectie 1: Huidige vangst */}
      <div className="stats-section stats-section--huidig">
        <h2 className="stats-section-title">Huidige vangst</h2>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{huidigeStats.total}</div>
            <div className="stat-label">Totaal</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{huidigeStats.soorten}</div>
            <div className="stat-label">Soorten</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{huidigeStats.nieuw}</div>
            <div className="stat-label">Nieuw</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{huidigeStats.terugvangst}</div>
            <div className="stat-label">Terugvangst</div>
          </div>
        </div>

        {huidigeStats.soortenTabel.length > 0 ? (
          <div className="trektellen-table-wrap">
            <table className="trektellen-table">
              <thead>
                <tr>
                  <th className="tt-col-soort">Soort</th>
                  <th className="tt-col-num">Nieuw</th>
                  <th className="tt-col-num">Terugv.</th>
                  <th className="tt-col-num">Totaal</th>
                </tr>
              </thead>
              <tbody>
                {huidigeStats.soortenTabel.map(s => (
                  <tr key={s.naam}>
                    <td className="tt-col-soort">{s.naam}</td>
                    <td className="tt-col-num">{s.nieuw || ''}</td>
                    <td className="tt-col-num">{s.terugvangst || ''}</td>
                    <td className="tt-col-num tt-col-total">{s.totaal}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="tt-totaal-row">
                  <td className="tt-col-soort">Totaal ({huidigeStats.soorten} soorten)</td>
                  <td className="tt-col-num">{huidigeStats.nieuw}</td>
                  <td className="tt-col-num">{huidigeStats.terugvangst}</td>
                  <td className="tt-col-num tt-col-total">{huidigeStats.total}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="stats-empty">Geen niet-geüploade vangsten.</p>
        )}

        {huidigeStats.total > 0 && (
          <div className="export-buttons">
            <button className="btn-primary" onClick={() => handleExport('griel', 'huidig')}>
              Griel XML exporteren
            </button>
          </div>
        )}

        {showUploadConfirm && (
          <div className="upload-confirm">
            <p>Export gelukt! Wil je deze vangsten als geüpload markeren?</p>
            <div className="upload-confirm-buttons">
              <button className="btn-primary" onClick={handleConfirmUploaded}>
                Ja, markeer als geüpload
              </button>
              <button className="btn-secondary" onClick={() => setShowUploadConfirm(false)}>
                Nee, nog niet
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sectie 2: Totaal overzicht */}
      <div className="stats-section stats-section--totaal">
        <h2 className="stats-section-title">Totaal overzicht</h2>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{totaalStats.total}</div>
            <div className="stat-label">Totaal vangsten</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totaalStats.soorten}</div>
            <div className="stat-label">Soorten</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totaalStats.nieuw}</div>
            <div className="stat-label">Nieuwe ringen</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totaalStats.terugvangst}</div>
            <div className="stat-label">Terugvangsten</div>
          </div>
        </div>

        {/* Top soorten */}
        <div className="section">
          <h3>Top soorten</h3>
          <div className="top-list">
            {totaalStats.topSoorten.map(([naam, count]) => (
              <div key={naam} className="top-item">
                <span className="top-name">{naam}</span>
                <div className="top-bar-wrap">
                  <div
                    className="top-bar"
                    style={{ width: `${(count / totaalStats.topSoorten[0][1]) * 100}%` }}
                  />
                </div>
                <span className="top-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Terugvangsten */}
        {terugvangsten.length > 0 && (
          <div className="section">
            <h3>Terugvangsten ({terugvangsten.length})</h3>
            <div className="trektellen-table-wrap">
              <table className="trektellen-table">
                <thead>
                  <tr>
                    <th className="tt-col-soort">Soort</th>
                    <th>Ring</th>
                    <th>Datum</th>
                    <th className="tt-col-num">Tijd</th>
                    <th className="tt-col-num">Afstand</th>
                  </tr>
                </thead>
                <tbody>
                  {terugvangsten.map((tv, i) => (
                    <tr key={`${tv.ringnummer}-${tv.datum}-${i}`}>
                      <td className="tt-col-soort">{tv.soort}</td>
                      <td className="tv-ring">{tv.ringnummer}</td>
                      <td className="tv-datum">{formatDatum(tv.datum)}</td>
                      <td className="tt-col-num tv-tijd">{formatDagen(tv.dagen)}</td>
                      <td className="tt-col-num tv-afstand">{formatAfstand(tv.afstandKm)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Per project */}
        {Object.keys(totaalStats.perProject).length > 0 && (
          <div className="section">
            <h3>Per project</h3>
            <div className="top-list">
              {Object.entries(totaalStats.perProject)
                .sort((a, b) => b[1] - a[1])
                .map(([project, count]) => (
                  <Link key={project} to={`/stats/project/${encodeURIComponent(project)}`} className="top-item project-link">
                    <span className="top-name">{project}</span>
                    <span className="top-count">{count} →</span>
                  </Link>
                ))}
            </div>
          </div>
        )}

        {/* Export alle data */}
        <div className="section">
          <h3>Alles exporteren</h3>
          <div className="export-buttons">
            <button className="btn-primary" onClick={() => handleExport('griel', 'alles')}>
              Griel XML
            </button>
            <button className="btn-secondary" onClick={() => handleExport('csv', 'alles')}>
              CSV
            </button>
            <button className="btn-secondary" onClick={() => handleExport('json', 'alles')}>
              JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
