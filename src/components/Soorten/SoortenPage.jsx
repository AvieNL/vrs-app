import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpeciesRef } from '../../hooks/useSpeciesRef';
import { useRole } from '../../hooks/useRole';
import './SoortenPage.css';

export default function SoortenPage({ records }) {
  const [zoek, setZoek] = useState('');
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const speciesRef = useSpeciesRef();
  const soorten = useMemo(
    () => speciesRef.filter(s => s.naam_nl && !s.naam_nl.includes('groene tekst')),
    [speciesRef]
  );

  // Count records per species
  const countPerSoort = useMemo(() => {
    const counts = {};
    records.forEach(r => {
      if (r.vogelnaam) {
        const key = r.vogelnaam.toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [records]);

  const filtered = useMemo(() => {
    if (!zoek) return soorten;
    const lower = zoek.toLowerCase();
    return soorten.filter(s =>
      s.naam_nl.toLowerCase().includes(lower) ||
      (s.naam_lat && s.naam_lat.toLowerCase().includes(lower)) ||
      (s.naam_en && s.naam_en.toLowerCase().includes(lower))
    );
  }, [zoek]);

  return (
    <div className="page soorten-page">
      <div className="soorten-topbar">
        <input
          type="search"
          value={zoek}
          onChange={e => setZoek(e.target.value)}
          placeholder="Zoek soort..."
          className="soorten-search"
        />
        {isAdmin && (
          <button
            className="btn-primary soorten-nieuw-btn"
            onClick={() => navigate('/soorten/__nieuw__')}
          >
            + Nieuw
          </button>
        )}
      </div>

      <div className="soorten-list">
        {filtered.map(s => {
          const count = countPerSoort[s.naam_nl.toLowerCase()] || 0;
          return (
            <div
              key={s.naam_nl}
              className="soort-card"
              onClick={() => navigate(`/soorten/${encodeURIComponent(s.naam_nl)}`)}
            >
              <div className="soort-info">
                <strong>{s.naam_nl}</strong>
                <span className="soort-lat">{s.naam_lat}</span>
              </div>
              <div className="soort-meta">
                {s.ringmaat && <span className="badge badge-accent">{s.ringmaat}</span>}
                {count > 0 && <span className="badge badge-success">{count}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
