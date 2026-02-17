import { useMemo, useState } from 'react';
import { exportCSV, exportJSON, exportGrielXML, downloadFile } from '../../utils/export';
import './StatsPage.css';

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

export default function StatsPage({ records, markAllAsUploaded }) {
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);

  const huidigeRecords = useMemo(
    () => records.filter(r => !r.uploaded && r.bron !== 'griel_import'),
    [records]
  );
  const huidigeStats = useMemo(() => computeStats(huidigeRecords), [huidigeRecords]);
  const totaalStats = useMemo(() => computeStats(records), [records]);

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

        {/* Per project */}
        {Object.keys(totaalStats.perProject).length > 0 && (
          <div className="section">
            <h3>Per project</h3>
            <div className="top-list">
              {Object.entries(totaalStats.perProject)
                .sort((a, b) => b[1] - a[1])
                .map(([project, count]) => (
                  <div key={project} className="top-item">
                    <span className="top-name">{project}</span>
                    <span className="top-count">{count}</span>
                  </div>
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
