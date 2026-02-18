import { useState, useMemo, useRef } from 'react';
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

function resizeImage(file, maxWidth = 400) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

const BIO_FIELDS = [
  { key: 'vleugel', label: 'Vleugel', unit: 'mm' },
  { key: 'gewicht', label: 'Gewicht', unit: 'g' },
  { key: 'handpenlengte', label: 'P8 / Handpen', unit: 'mm' },
  { key: 'staartlengte', label: 'Staart', unit: 'mm' },
  { key: 'kop_snavel', label: 'Kop+snavel', unit: 'mm' },
  { key: 'tarsus_lengte', label: 'Tarsus', unit: 'mm' },
  { key: 'tarsus_dikte', label: 'Tarsus dikte', unit: 'mm' },
  { key: 'snavel_schedel', label: 'Snavel-schedel', unit: 'mm' },
];

const ALL_BOEKEN = [
  { key: 'svensson_2023', label: 'Svensson 2023' },
  { key: 'svensson_2016', label: 'Svensson 2016' },
  { key: 'demongin_2020', label: 'Demongin 2020' },
  { key: 'blasco_zumeta_2023', label: 'Blasco-Zumeta 2023' },
  { key: 'jenni_winkler_2020', label: 'Jenni & Winkler 2020' },
  { key: 'baker_2016', label: 'Baker 2016' },
  { key: 'klaassen_voorjaar', label: 'Klaassen voorjaar' },
  { key: 'klaassen_najaar', label: 'Klaassen najaar' },
  { key: 'conings_1999', label: 'Conings 1999' },
  { key: 'speek_1994', label: 'Speek 1994' },
];

const EDITABLE_FIELDS = {
  namen: [
    { key: 'naam_lat', label: 'Latijn' },
    { key: 'naam_en', label: 'Engels' },
    { key: 'naam_de', label: 'Duits' },
    { key: 'familie', label: 'Familie' },
    { key: 'orde', label: 'Orde' },
  ],
  ring: [
    { key: 'ringmaat', label: 'Ringmaat' },
    { key: 'ruitype', label: 'Ruitype' },
  ],
  nest: [
    { key: 'nest_eileg', label: 'Eileg' },
    { key: 'nest_broedels', label: 'Broedels' },
    { key: 'nest_eieren', label: 'Eieren' },
    { key: 'nest_ei_dagen', label: 'Broedtijd (dagen)' },
    { key: 'nest_jong_dagen', label: 'Nestjong (dagen)' },
    { key: 'broed', label: 'Broed' },
    { key: 'zorg', label: 'Zorg' },
  ],
  boeken: ALL_BOEKEN,
};

const boekKeys = new Set(ALL_BOEKEN.map(b => b.key));

function isBoekKey(key) {
  return boekKeys.has(key);
}

export default function SoortDetail({ records, speciesOverrides }) {
  const { naam } = useParams();
  const navigate = useNavigate();
  const decodedNaam = decodeURIComponent(naam);
  const fileInputRef = useRef(null);

  const defaultSoort = soorten.find(s => s.naam_nl === decodedNaam);
  const soort = speciesOverrides
    ? speciesOverrides.getMerged(decodedNaam, defaultSoort || {})
    : defaultSoort;

  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});

  // Calculate bioStats early so we can use them in startEdit
  const soortRecords = useMemo(() => {
    if (!decodedNaam) return [];
    const lower = decodedNaam.toLowerCase();
    return records.filter(r => r.vogelnaam && r.vogelnaam.toLowerCase() === lower);
  }, [records, decodedNaam]);

  const bioStatsCalc = useMemo(() => {
    return BIO_FIELDS.map(f => ({ ...f, stats: calcStats(soortRecords, f.key) }));
  }, [soortRecords]);

  // Merged bio: override > stats from records
  const getBioValue = (field, stat) => {
    const overrideKey = `bio_${field}_${stat}`;
    if (soort[overrideKey] !== undefined && soort[overrideKey] !== '') return soort[overrideKey];
    const calc = bioStatsCalc.find(b => b.key === field);
    if (calc?.stats) return calc.stats[stat]?.toFixed(1);
    return '';
  };

  const startEdit = () => {
    const data = {};
    Object.values(EDITABLE_FIELDS).flat().forEach(f => {
      if (isBoekKey(f.key)) {
        data[f.key] = soort.boeken?.[f.key] ?? '';
      } else {
        data[f.key] = soort[f.key] ?? '';
      }
    });
    // Bio fields: prefill with override or stats
    BIO_FIELDS.forEach(f => {
      ['min', 'max', 'avg'].forEach(stat => {
        const key = `bio_${f.key}_${stat}`;
        data[key] = getBioValue(f.key, stat);
      });
    });
    data.ruitype_notities = soort.ruitype_notities ?? '';
    data.foto = soort.foto ?? '';
    setEditData(data);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditData({});
  };

  const saveEdit = () => {
    if (!speciesOverrides) return;
    const changes = {};
    const boekenChanges = {};

    Object.values(EDITABLE_FIELDS).flat().forEach(f => {
      const defaultVal = isBoekKey(f.key) ? (defaultSoort?.boeken?.[f.key] ?? '') : (defaultSoort?.[f.key] ?? '');
      const newVal = editData[f.key] ?? '';
      if (String(newVal) !== String(defaultVal)) {
        if (isBoekKey(f.key)) {
          boekenChanges[f.key] = newVal;
        } else {
          changes[f.key] = newVal;
        }
      }
    });

    if (Object.keys(boekenChanges).length > 0) {
      changes.boeken = boekenChanges;
    }

    // Bio overrides: only save if user changed from the stats-calculated value
    BIO_FIELDS.forEach(f => {
      ['min', 'max', 'avg'].forEach(stat => {
        const key = `bio_${f.key}_${stat}`;
        const editVal = editData[key] ?? '';
        const calc = bioStatsCalc.find(b => b.key === f.key);
        const statsVal = calc?.stats ? calc.stats[stat].toFixed(1) : '';
        if (String(editVal) !== String(statsVal)) {
          changes[key] = editVal;
        }
      });
    });

    const defaultNotities = defaultSoort?.ruitype_notities ?? '';
    if (editData.ruitype_notities !== defaultNotities) {
      changes.ruitype_notities = editData.ruitype_notities;
    }
    if (editData.foto && editData.foto !== (defaultSoort?.foto ?? '')) {
      changes.foto = editData.foto;
    }

    speciesOverrides.saveOverride(decodedNaam, changes);
    setEditMode(false);
    setEditData({});
  };

  const handleField = (key, value) => {
    setEditData(prev => ({ ...prev, [key]: value }));
  };

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImage(file);
    setEditData(prev => ({ ...prev, foto: dataUrl }));
  };

  const bioStats = useMemo(() => {
    return bioStatsCalc.filter(f => f.stats);
  }, [bioStatsCalc]);

  const genderStats = useMemo(() => {
    const counts = {};
    soortRecords.forEach(r => {
      const g = r.geslacht || 'U';
      counts[g] = (counts[g] || 0) + 1;
    });
    return counts;
  }, [soortRecords]);

  const ageStats = useMemo(() => {
    const counts = {};
    soortRecords.forEach(r => {
      const a = r.leeftijd || '?';
      counts[a] = (counts[a] || 0) + 1;
    });
    return counts;
  }, [soortRecords]);

  if (!defaultSoort) {
    return (
      <div className="page">
        <button className="btn-secondary" onClick={() => navigate('/soorten')}>Terug</button>
        <div className="empty-state">Soort niet gevonden</div>
      </div>
    );
  }

  const foto = editMode ? editData.foto : soort.foto;
  const ruitypeNotities = editMode ? editData.ruitype_notities : soort.ruitype_notities;

  const renderField = (key, label, opts = {}) => {
    if (editMode) {
      const val = editData[key] ?? '';
      return (
        <div className="sd-edit-row" key={key}>
          <label className="sd-edit-label">{label}</label>
          <input
            type="text"
            value={val}
            onChange={e => handleField(key, e.target.value)}
            className="sd-edit-input"
            placeholder={opts.placeholder || ''}
          />
        </div>
      );
    }
    const val = isBoekKey(key) ? soort.boeken?.[key] : soort[key];
    if (!val && !opts.showEmpty) return null;
    return (
      <div className="sd-row" key={key}>
        <span className="sd-label">{label}</span>
        <span className={`sd-value ${opts.italic ? 'sd-italic' : ''}`}>{val || '—'}</span>
      </div>
    );
  };

  return (
    <div className="page soort-detail">
      <button className="btn-secondary sd-back" onClick={() => navigate('/soorten')}>
        ← Terug
      </button>

      {/* Hero */}
      <div className="sd-hero">
        <div
          className={`sd-foto ${editMode ? 'sd-foto-edit' : ''}`}
          onClick={editMode ? () => fileInputRef.current?.click() : undefined}
        >
          {foto ? (
            <img src={foto} alt={soort.naam_nl} />
          ) : (
            <div className="sd-foto-placeholder">
              <span>🐦</span>
              {editMode && <span className="sd-foto-hint">Foto toevoegen</span>}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhoto}
            style={{ display: 'none' }}
          />
        </div>
        <div className="sd-hero-info">
          <h2 className="sd-title">{soort.naam_nl}</h2>
          {soort.naam_lat && <p className="sd-subtitle">{soort.naam_lat}</p>}
          <div className="sd-badges">
            {soort.ringmaat && (
              <span className="sd-badge sd-badge-accent">Ring {soort.ringmaat}</span>
            )}
            {soort.ruitype && (
              <span className="sd-badge sd-badge-muted">{soort.ruitype}</span>
            )}
          </div>
        </div>
        {!editMode ? (
          <button className="sd-edit-btn" onClick={startEdit} title="Bewerken">✏️</button>
        ) : (
          <div className="sd-edit-actions">
            <button className="btn-primary sd-save-btn" onClick={saveEdit}>Opslaan</button>
            <button className="btn-secondary sd-cancel-btn" onClick={cancelEdit}>Annuleren</button>
          </div>
        )}
      </div>

      {/* Ruitype notities */}
      {(editMode || ruitypeNotities) && (
        <div className="sd-card">
          <h3 className="sd-card-title">Leeftijds-/geslachtsbepaling</h3>
          {editMode ? (
            <textarea
              className="sd-edit-textarea"
              value={editData.ruitype_notities || ''}
              onChange={e => handleField('ruitype_notities', e.target.value)}
              placeholder="Waar moet je op letten bij deze soort?"
              rows={3}
            />
          ) : (
            <p className="sd-notities-text">{ruitypeNotities}</p>
          )}
        </div>
      )}

      {/* Namen */}
      <div className="sd-card">
        <h3 className="sd-card-title">Namen</h3>
        {EDITABLE_FIELDS.namen.map(f =>
          renderField(f.key, f.label, { italic: f.key === 'naam_lat', showEmpty: editMode })
        )}
      </div>

      {/* Ring & Rui */}
      <div className="sd-card">
        <h3 className="sd-card-title">Ring & Rui</h3>
        {EDITABLE_FIELDS.ring.map(f =>
          renderField(f.key, f.label, { showEmpty: editMode })
        )}
      </div>

      {/* Nestgegevens */}
      {(editMode || (soort.nest_eileg && soort.nest_eileg !== 'maanden')) && (
        <div className="sd-card">
          <h3 className="sd-card-title">Nestgegevens</h3>
          {EDITABLE_FIELDS.nest.map(f =>
            renderField(f.key, f.label, { showEmpty: editMode })
          )}
        </div>
      )}

      {/* Determinatieboeken */}
      {(editMode || (soort.boeken && Object.keys(soort.boeken).length > 0)) && (
        <div className="sd-card">
          <h3 className="sd-card-title">Determinatieboeken</h3>
          {EDITABLE_FIELDS.boeken.map(f =>
            renderField(f.key, f.label, { showEmpty: editMode })
          )}
        </div>
      )}

      {/* Biometrie (bewerkbaar) */}
      {editMode && (
        <div className="sd-card">
          <h3 className="sd-card-title">Biometrie (min / gem / max)</h3>
          {BIO_FIELDS.map(f => (
            <div key={f.key} className="sd-bio-edit-row">
              <label className="sd-edit-label">{f.label} ({f.unit})</label>
              <div className="sd-bio-edit-inputs">
                <input
                  type="text"
                  inputMode="decimal"
                  value={editData[`bio_${f.key}_min`] ?? ''}
                  onChange={e => handleField(`bio_${f.key}_min`, e.target.value)}
                  className="sd-edit-input"
                  placeholder="Min"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={editData[`bio_${f.key}_avg`] ?? ''}
                  onChange={e => handleField(`bio_${f.key}_avg`, e.target.value)}
                  className="sd-edit-input"
                  placeholder="Gem."
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={editData[`bio_${f.key}_max`] ?? ''}
                  onChange={e => handleField(`bio_${f.key}_max`, e.target.value)}
                  className="sd-edit-input"
                  placeholder="Max"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mijn vangsten */}
      <div className="sd-card">
        <h3 className="sd-card-title">Mijn vangsten</h3>
        {soortRecords.length === 0 ? (
          <p className="sd-empty">Nog geen vangsten van deze soort</p>
        ) : (
          <>
            <div className="sd-stats-row">
              <div className="sd-stat">
                <div className="sd-stat-value">{soortRecords.length}</div>
                <div className="sd-stat-label">Totaal</div>
              </div>
              {Object.entries(genderStats).map(([g, count]) => (
                <div key={g} className="sd-stat">
                  <div className="sd-stat-value">{count}</div>
                  <div className="sd-stat-label">{g === 'M' ? 'Man' : g === 'F' ? 'Vrouw' : 'Onbekend'}</div>
                </div>
              ))}
            </div>

            {Object.keys(ageStats).length > 1 && (
              <div className="sd-age-section">
                <span className="sd-sub-title">Leeftijd</span>
                <div className="sd-chips">
                  {Object.entries(ageStats).sort((a, b) => b[1] - a[1]).map(([age, count]) => (
                    <span key={age} className="sd-chip">{age}: {count}</span>
                  ))}
                </div>
              </div>
            )}

            {bioStats.length > 0 && !editMode && (
              <div className="sd-bio-section">
                <span className="sd-sub-title">Biometrie</span>
                <table className="sd-bio-table">
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
                    {BIO_FIELDS.map(b => {
                      const minVal = getBioValue(b.key, 'min');
                      const avgVal = getBioValue(b.key, 'avg');
                      const maxVal = getBioValue(b.key, 'max');
                      const calc = bioStatsCalc.find(c => c.key === b.key);
                      const n = calc?.stats?.n;
                      if (!minVal && !avgVal && !maxVal) return null;
                      const isOv = (stat) => soort[`bio_${b.key}_${stat}`] !== undefined && soort[`bio_${b.key}_${stat}`] !== '';
                      return (
                        <tr key={b.key}>
                          <td className="sd-bio-field">{b.label} <span className="sd-bio-unit">({b.unit})</span></td>
                          <td className={`sd-bio-num${isOv('min') ? ' sd-bio-override' : ''}`}>{minVal || '—'}</td>
                          <td className={`sd-bio-num sd-bio-avg${isOv('avg') ? ' sd-bio-override' : ''}`}>{avgVal || '—'}</td>
                          <td className={`sd-bio-num${isOv('max') ? ' sd-bio-override' : ''}`}>{maxVal || '—'}</td>
                          <td className="sd-bio-num sd-bio-n">{n || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="sd-recent-section">
              <span className="sd-sub-title">Recente vangsten</span>
              {soortRecords.slice(0, 5).map(r => (
                <div key={r.id} className="sd-recent-item">
                  <span className="sd-recent-ring">{r.ringnummer}</span>
                  <span className="sd-recent-date">{r.vangstdatum}</span>
                  <span className="sd-recent-meta">
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
