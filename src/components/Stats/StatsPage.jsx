import { useMemo } from 'react';
import { exportCSV, exportJSON, exportGrielXML, downloadFile } from '../../utils/export';
import './StatsPage.css';

export default function StatsPage({ records }) {
  const stats = useMemo(() => {
    const soorten = new Set();
    const perSoort = {};
    const perMaand = {};
    const perProject = {};
    let nieuw = 0;
    let terugvangst = 0;

    records.forEach(r => {
      const naam = r.vogelnaam || 'Onbekend';
      soorten.add(naam);
      perSoort[naam] = (perSoort[naam] || 0) + 1;

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

      if (r.metalenringinfo === 1 || r.metalenringinfo === '1') nieuw++;
      else terugvangst++;
    });

    const topSoorten = Object.entries(perSoort)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    return { total: records.length, soorten: soorten.size, nieuw, terugvangst, topSoorten, perMaand, perProject };
  }, [records]);

  function handleExport(type) {
    const datum = new Date().toISOString().split('T')[0];
    switch (type) {
      case 'csv': {
        const csv = exportCSV(records);
        downloadFile(csv, `vrs-export-${datum}.csv`, 'text/csv');
        break;
      }
      case 'json': {
        const json = exportJSON(records);
        downloadFile(json, `vrs-export-${datum}.json`, 'application/json');
        break;
      }
      case 'griel': {
        const xml = exportGrielXML(records);
        downloadFile(xml, `vrs-griel-${datum}.xml`, 'application/xml');
        break;
      }
    }
  }

  return (
    <div className="page stats-page">
      {/* Overzicht */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Totaal vangsten</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.soorten}</div>
          <div className="stat-label">Soorten</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.nieuw}</div>
          <div className="stat-label">Nieuwe ringen</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.terugvangst}</div>
          <div className="stat-label">Terugvangsten</div>
        </div>
      </div>

      {/* Top soorten */}
      <div className="section">
        <h3>Top soorten</h3>
        <div className="top-list">
          {stats.topSoorten.map(([naam, count]) => (
            <div key={naam} className="top-item">
              <span className="top-name">{naam}</span>
              <div className="top-bar-wrap">
                <div
                  className="top-bar"
                  style={{ width: `${(count / stats.topSoorten[0][1]) * 100}%` }}
                />
              </div>
              <span className="top-count">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per project */}
      {Object.keys(stats.perProject).length > 0 && (
        <div className="section">
          <h3>Per project</h3>
          <div className="top-list">
            {Object.entries(stats.perProject)
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

      {/* Export */}
      <div className="section">
        <h3>Exporteren</h3>
        <div className="export-buttons">
          <button className="btn-primary" onClick={() => handleExport('griel')}>
            Griel XML
          </button>
          <button className="btn-secondary" onClick={() => handleExport('csv')}>
            CSV
          </button>
          <button className="btn-secondary" onClick={() => handleExport('json')}>
            JSON
          </button>
        </div>
      </div>
    </div>
  );
}
