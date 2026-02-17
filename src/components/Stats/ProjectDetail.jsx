import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
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

export default function ProjectDetail({ records }) {
  const { naam } = useParams();

  const projectRecords = useMemo(
    () => records.filter(r => r.project === naam),
    [records, naam]
  );

  const stats = useMemo(() => {
    const perSoort = {};
    const perDatum = {};
    let nieuw = 0;
    let terugvangst = 0;

    projectRecords.forEach(r => {
      const soort = r.vogelnaam || 'Onbekend';
      if (!perSoort[soort]) perSoort[soort] = { nieuw: 0, terugvangst: 0 };
      if (r.metalenringinfo === 1 || r.metalenringinfo === '1') {
        perSoort[soort].nieuw++;
        nieuw++;
      } else {
        perSoort[soort].terugvangst++;
        terugvangst++;
      }

      if (r.vangstdatum) {
        perDatum[r.vangstdatum] = (perDatum[r.vangstdatum] || 0) + 1;
      }
    });

    const soortenTabel = Object.entries(perSoort)
      .map(([soort, s]) => ({ soort, nieuw: s.nieuw, terugvangst: s.terugvangst, totaal: s.nieuw + s.terugvangst }))
      .sort((a, b) => b.totaal - a.totaal);

    const datumTabel = Object.entries(perDatum)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([datum, aantal]) => ({ datum, aantal }));

    const datums = projectRecords
      .map(r => r.vangstdatum)
      .filter(Boolean)
      .sort();
    const eerste = datums[0] || null;
    const laatste = datums[datums.length - 1] || null;

    return {
      totaal: projectRecords.length,
      soorten: Object.keys(perSoort).length,
      nieuw,
      terugvangst,
      soortenTabel,
      datumTabel,
      eerste,
      laatste,
    };
  }, [projectRecords]);

  const terugvangsten = useMemo(() => {
    // Bouw index van ringnummer → eerste vangst uit alle records
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

    const lijst = [];
    projectRecords.forEach(r => {
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
        dagen,
        afstandKm,
      });
    });

    lijst.sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
    return lijst;
  }, [projectRecords, records]);

  function formatDatum(d) {
    if (!d) return '—';
    const parts = d.split('-');
    if (parts[0].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return d;
  }

  return (
    <div className="page stats-page">
      <Link to="/stats" className="project-back">&larr; Stats</Link>
      <h2 className="stats-section-title" style={{ marginTop: 8 }}>{naam}</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totaal}</div>
          <div className="stat-label">Vangsten</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.soorten}</div>
          <div className="stat-label">Soorten</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.nieuw}</div>
          <div className="stat-label">Nieuw</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.terugvangst}</div>
          <div className="stat-label">Terugvangst</div>
        </div>
      </div>

      {stats.eerste && (
        <p className="project-period">
          {formatDatum(stats.eerste)} &mdash; {formatDatum(stats.laatste)}
        </p>
      )}

      {/* Soortentabel */}
      {stats.soortenTabel.length > 0 && (
        <div className="section">
          <h3>Soorten</h3>
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
                {stats.soortenTabel.map(s => (
                  <tr key={s.soort}>
                    <td className="tt-col-soort">{s.soort}</td>
                    <td className="tt-col-num">{s.nieuw || ''}</td>
                    <td className="tt-col-num">{s.terugvangst || ''}</td>
                    <td className="tt-col-num tt-col-total">{s.totaal}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="tt-totaal-row">
                  <td className="tt-col-soort">Totaal ({stats.soorten} soorten)</td>
                  <td className="tt-col-num">{stats.nieuw}</td>
                  <td className="tt-col-num">{stats.terugvangst}</td>
                  <td className="tt-col-num tt-col-total">{stats.totaal}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

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

      {/* Vangsten per datum */}
      {stats.datumTabel.length > 0 && (
        <div className="section">
          <h3>Per datum</h3>
          <div className="trektellen-table-wrap">
            <table className="trektellen-table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th className="tt-col-num">Aantal</th>
                </tr>
              </thead>
              <tbody>
                {stats.datumTabel.map(d => (
                  <tr key={d.datum}>
                    <td>{formatDatum(d.datum)}</td>
                    <td className="tt-col-num tt-col-total">{d.aantal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
