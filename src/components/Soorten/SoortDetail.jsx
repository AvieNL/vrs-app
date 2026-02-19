import { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSpeciesRef } from '../../hooks/useSpeciesRef';
import { useRole } from '../../hooks/useRole';
import { db } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import './SoortDetail.css';

const LEEFTIJD_LABEL = {
  '0': '?', '1': 'pullus', '2': 'onb.', '3': '1kj', '4': '+1kj',
  '5': '2kj', '6': '+2kj', '7': '3kj', '8': '+3kj', '9': '4kj+', 'A': '+4kj',
};
function leeftijdLabel(code) { return LEEFTIJD_LABEL[code] || code; }

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
  const { isAdmin } = useRole();
  const speciesRef = useSpeciesRef();
  const soorten = useMemo(
    () => speciesRef.filter(s => s.naam_nl && !s.naam_nl.includes('groene tekst')),
    [speciesRef]
  );

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
      // Geslachtsspecifieke biometrie
      ['M', 'F'].forEach(gender => {
        ['min', 'avg', 'max'].forEach(stat => {
          const key = `bio_${f.key}_${gender}_${stat}`;
          data[key] = soort[key] ?? '';
        });
      });
    });
    // Separate notities voor geslachts- en leeftijdsbepaling
    // Fallback: toon oude ruitype_notities in het geslachtsveld als migratie
    data.geslachts_notities = soort.geslachts_notities ?? soort.ruitype_notities ?? '';
    data.leeftijds_notities = soort.leeftijds_notities ?? '';
    data.foto = soort.foto ?? '';
    setEditData(data);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditData({});
  };

  const saveEdit = async () => {
    if (isAdmin) {
      // Admin: sla volledige soortdata op in Supabase species tabel + Dexie
      const adminData = {
        ...defaultSoort,
        boeken: { ...(defaultSoort?.boeken || {}) },
      };

      Object.values(EDITABLE_FIELDS).flat().forEach(f => {
        if (isBoekKey(f.key)) {
          if (editData[f.key]) {
            adminData.boeken[f.key] = editData[f.key];
          } else {
            delete adminData.boeken[f.key];
          }
        } else {
          adminData[f.key] = editData[f.key] ?? '';
        }
      });

      BIO_FIELDS.forEach(f => {
        ['min', 'max', 'avg'].forEach(stat => {
          const key = `bio_${f.key}_${stat}`;
          adminData[key] = editData[key] ?? '';
        });
        // Geslachtsspecifieke biometrie
        ['M', 'F'].forEach(gender => {
          ['min', 'avg', 'max'].forEach(stat => {
            const key = `bio_${f.key}_${gender}_${stat}`;
            adminData[key] = editData[key] ?? '';
          });
        });
      });

      adminData.geslachts_notities = editData.geslachts_notities ?? '';
      adminData.leeftijds_notities = editData.leeftijds_notities ?? '';
      if (editData.foto !== undefined) adminData.foto = editData.foto;

      const { error } = await supabase
        .from('species')
        .upsert({ naam_nl: decodedNaam, data: adminData });

      if (error) {
        alert('Opslaan mislukt: ' + error.message);
        return;
      }

      await db.species.put(adminData);
    } else {
      // Ringer: sla delta op als override (alleen voor eigen view)
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

      // Bio overrides: alleen opslaan als afwijkend van berekende statistieken
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
        // Geslachtsspecifieke biometrie overrides
        ['M', 'F'].forEach(gender => {
          ['min', 'avg', 'max'].forEach(stat => {
            const key = `bio_${f.key}_${gender}_${stat}`;
            const editVal = editData[key] ?? '';
            const defaultVal = defaultSoort?.[key] ?? '';
            if (String(editVal) !== String(defaultVal)) {
              changes[key] = editVal;
            }
          });
        });
      });

      const defaultGeslachts = defaultSoort?.geslachts_notities ?? defaultSoort?.ruitype_notities ?? '';
      if (editData.geslachts_notities !== defaultGeslachts) {
        changes.geslachts_notities = editData.geslachts_notities;
      }
      const defaultLeeftijds = defaultSoort?.leeftijds_notities ?? '';
      if (editData.leeftijds_notities !== defaultLeeftijds) {
        changes.leeftijds_notities = editData.leeftijds_notities;
      }
      if (editData.foto && editData.foto !== (defaultSoort?.foto ?? '')) {
        changes.foto = editData.foto;
      }

      speciesOverrides.saveOverride(decodedNaam, changes);
    }

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
      const a = r.leeftijd || '0';
      counts[a] = (counts[a] || 0) + 1;
    });
    return counts;
  }, [soortRecords]);

  if (speciesRef.length === 0) {
    return (
      <div className="page">
        <button className="btn-secondary" onClick={() => navigate('/soorten')}>← Terug</button>
        <div className="empty-state">Laden...</div>
      </div>
    );
  }

  if (!defaultSoort) {
    return (
      <div className="page">
        <button className="btn-secondary" onClick={() => navigate('/soorten')}>← Terug</button>
        <div className="empty-state">Soort niet gevonden</div>
      </div>
    );
  }

  const foto = editMode ? editData.foto : soort.foto;
  // Geslachts- en leeftijdsbepaling: nieuwe velden, met fallback op ruitype_notities voor migratie
  const geslachtsNotities = editMode
    ? editData.geslachts_notities
    : (soort.geslachts_notities || soort.ruitype_notities);
  const leeftijdsNotities = editMode ? editData.leeftijds_notities : soort.leeftijds_notities;

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
          <div className="sd-hero-actions">
            <button className="sd-edit-btn" onClick={startEdit} title="Bewerken">✏️</button>
            {!isAdmin && speciesOverrides && Object.keys(speciesOverrides.getOverride(decodedNaam)).length > 0 && (
              <button
                className="btn-secondary sd-reset-btn"
                onClick={() => speciesOverrides.resetOverride(decodedNaam)}
                title="Reset naar basisdata"
              >
                ↩ Reset
              </button>
            )}
          </div>
        ) : (
          <div className="sd-edit-actions">
            <button className="btn-primary sd-save-btn" onClick={saveEdit}>Opslaan</button>
            <button className="btn-secondary sd-cancel-btn" onClick={cancelEdit}>Annuleren</button>
          </div>
        )}
      </div>

      {/* Geslachtsbepaling */}
      {(editMode || geslachtsNotities) && (
        <div className="sd-card">
          <h3 className="sd-card-title">Geslachtsbepaling</h3>
          {editMode ? (
            <textarea
              className="sd-edit-textarea"
              value={editData.geslachts_notities || ''}
              onChange={e => handleField('geslachts_notities', e.target.value)}
              placeholder="Hoe is het geslacht te bepalen bij deze soort?"
              rows={3}
            />
          ) : (
            <p className="sd-notities-text">{geslachtsNotities}</p>
          )}
        </div>
      )}

      {/* Leeftijdsbepaling */}
      {(editMode || leeftijdsNotities) && (
        <div className="sd-card">
          <h3 className="sd-card-title">Leeftijdsbepaling</h3>
          {editMode ? (
            <textarea
              className="sd-edit-textarea"
              value={editData.leeftijds_notities || ''}
              onChange={e => handleField('leeftijds_notities', e.target.value)}
              placeholder="Hoe is de leeftijd te bepalen bij deze soort?"
              rows={3}
            />
          ) : (
            <p className="sd-notities-text">{leeftijdsNotities}</p>
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
            <div key={f.key} className="sd-bio-edit-group">
              <div className="sd-bio-edit-field-label">{f.label} ({f.unit})</div>
              {[
                { prefix: null, label: 'Alg.', cls: '' },
                { prefix: 'M',  label: '♂',    cls: ' sd-bio-edit-subrow--m' },
                { prefix: 'F',  label: '♀',    cls: ' sd-bio-edit-subrow--f' },
              ].map(({ prefix, label, cls }) => (
                <div key={prefix ?? 'alg'} className={`sd-bio-edit-subrow${cls}`}>
                  <span className="sd-bio-gender-lbl">{label}</span>
                  <div className="sd-bio-edit-inputs">
                    {['min', 'avg', 'max'].map(stat => {
                      const key = prefix
                        ? `bio_${f.key}_${prefix}_${stat}`
                        : `bio_${f.key}_${stat}`;
                      return (
                        <input
                          key={stat}
                          type="text"
                          inputMode="decimal"
                          value={editData[key] ?? ''}
                          onChange={e => handleField(key, e.target.value)}
                          className="sd-edit-input"
                          placeholder={{ min: 'Min', avg: 'Gem.', max: 'Max' }[stat]}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Biometrie */}
      {bioStats.length > 0 && !editMode && (
        <div className="sd-card">
          <h3 className="sd-card-title">Biometrie</h3>
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
              {BIO_FIELDS.flatMap(b => {
                const minVal = getBioValue(b.key, 'min');
                const avgVal = getBioValue(b.key, 'avg');
                const maxVal = getBioValue(b.key, 'max');
                if (!minVal && !avgVal && !maxVal) return [];
                const calc = bioStatsCalc.find(c => c.key === b.key);
                const n = calc?.stats?.n;
                const isOv = (stat) => soort[`bio_${b.key}_${stat}`] !== undefined && soort[`bio_${b.key}_${stat}`] !== '';
                const rows = [
                  <tr key={b.key}>
                    <td className="sd-bio-field">{b.label} <span className="sd-bio-unit">({b.unit})</span></td>
                    <td className={`sd-bio-num${isOv('min') ? ' sd-bio-override' : ''}`}>{minVal || '—'}</td>
                    <td className={`sd-bio-num sd-bio-avg${isOv('avg') ? ' sd-bio-override' : ''}`}>{avgVal || '—'}</td>
                    <td className={`sd-bio-num${isOv('max') ? ' sd-bio-override' : ''}`}>{maxVal || '—'}</td>
                    <td className="sd-bio-num sd-bio-n">{n || '—'}</td>
                  </tr>,
                ];
                // Geslachtsspecifieke rijen
                [['M', '♂', 'sd-bio-row-m'], ['F', '♀', 'sd-bio-row-f']].forEach(([g, sym, cls]) => {
                  const gMin = soort[`bio_${b.key}_${g}_min`];
                  const gAvg = soort[`bio_${b.key}_${g}_avg`];
                  const gMax = soort[`bio_${b.key}_${g}_max`];
                  if (gMin || gAvg || gMax) {
                    rows.push(
                      <tr key={`${b.key}-${g}`} className={cls}>
                        <td className="sd-bio-field sd-bio-field--gender">
                          <span className="sd-bio-gender-tag">{sym}</span> {b.label}
                        </td>
                        <td className="sd-bio-num">{gMin || '—'}</td>
                        <td className="sd-bio-num sd-bio-avg">{gAvg || '—'}</td>
                        <td className="sd-bio-num">{gMax || '—'}</td>
                        <td className="sd-bio-num sd-bio-n">—</td>
                      </tr>
                    );
                  }
                });
                return rows;
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Biometrie per geslacht — toon ook als er geen algemene stats zijn */}
      {!editMode && !bioStats.length && BIO_FIELDS.some(f =>
        soort[`bio_${f.key}_M_min`] || soort[`bio_${f.key}_M_max`] ||
        soort[`bio_${f.key}_F_min`] || soort[`bio_${f.key}_F_max`]
      ) && (
        <div className="sd-card">
          <h3 className="sd-card-title">Biometrie per geslacht</h3>
          <table className="sd-bio-table">
            <thead>
              <tr><th>Meting</th><th>Min</th><th>Gem.</th><th>Max</th><th></th></tr>
            </thead>
            <tbody>
              {BIO_FIELDS.flatMap(b => {
                const rows = [];
                [['M', '♂', 'sd-bio-row-m'], ['F', '♀', 'sd-bio-row-f']].forEach(([g, sym, cls]) => {
                  const gMin = soort[`bio_${b.key}_${g}_min`];
                  const gAvg = soort[`bio_${b.key}_${g}_avg`];
                  const gMax = soort[`bio_${b.key}_${g}_max`];
                  if (gMin || gAvg || gMax) {
                    rows.push(
                      <tr key={`${b.key}-${g}`} className={cls}>
                        <td className="sd-bio-field sd-bio-field--gender">
                          <span className="sd-bio-gender-tag">{sym}</span> {b.label} <span className="sd-bio-unit">({b.unit})</span>
                        </td>
                        <td className="sd-bio-num">{gMin || '—'}</td>
                        <td className="sd-bio-num sd-bio-avg">{gAvg || '—'}</td>
                        <td className="sd-bio-num">{gMax || '—'}</td>
                        <td className="sd-bio-num sd-bio-n">—</td>
                      </tr>
                    );
                  }
                });
                return rows;
              })}
            </tbody>
          </table>
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

            {Object.keys(ageStats).length > 0 && (
              <div className="sd-age-section">
                <span className="sd-sub-title">Leeftijdsverdeling</span>
                {(() => {
                  const AGE_ORDER = ['1', '3', '4', '5', '6', '7', '8', '9', 'A', '2', '0'];
                  const sorted = AGE_ORDER.filter(c => ageStats[c]).map(c => [c, ageStats[c]]);
                  const maxCount = Math.max(...sorted.map(([, n]) => n));
                  return (
                    <div className="sd-age-chart">
                      {sorted.map(([code, count]) => (
                        <div key={code} className="sd-age-bar-row">
                          <span className="sd-age-bar-label">{leeftijdLabel(code)}</span>
                          <div className="sd-age-bar-track">
                            <div className="sd-age-bar-fill" style={{ width: `${(count / maxCount) * 100}%` }} />
                          </div>
                          <span className="sd-age-bar-count">{count}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="sd-recent-section">
              <span className="sd-sub-title">Recente vangsten</span>
              {[...soortRecords]
                .sort((a, b) => {
                  const parseDate = d => {
                    if (!d) return 0;
                    const [dd, mm, yyyy] = d.split('-');
                    return new Date(yyyy, mm - 1, dd).getTime();
                  };
                  const dateA = parseDate(a.vangstdatum);
                  const dateB = parseDate(b.vangstdatum);
                  if (dateB !== dateA) return dateB - dateA;
                  // Zelfde datum: ringnummer als tiebreaker, maar alleen voor nieuwe vangsten
                  const isTvA = a.metalenringinfo === 4 || a.metalenringinfo === '4';
                  const isTvB = b.metalenringinfo === 4 || b.metalenringinfo === '4';
                  if (!isTvA && !isTvB) {
                    const ringNum = s => {
                      const m = s?.replace(/\./g, '').match(/^[A-Za-z]*(\d+)[A-Za-z]*$/);
                      return m ? parseInt(m[1], 10) : 0;
                    };
                    return ringNum(b.ringnummer) - ringNum(a.ringnummer);
                  }
                  return 0;
                })
                .slice(0, 10)
                .map(r => {
                  const isTerugvangst = r.metalenringinfo === 4 || r.metalenringinfo === '4';
                  return (
                    <div key={r.id} className={`sd-recent-item${isTerugvangst ? ' sd-recent-item--tv' : ''}`}>
                      <span className="sd-recent-type">{isTerugvangst ? 'TV' : 'NV'}</span>
                      <span
                        className="sd-recent-ring ring-link"
                        onClick={() => navigate('/records', { state: { openId: r.id } })}
                      >{r.ringnummer}</span>
                      <span className="sd-recent-date">{r.vangstdatum}</span>
                      <span className="sd-recent-meta">
                        {r.geslacht && r.geslacht !== 'U' && <>{r.geslacht}</>}
                        {r.leeftijd && <> · {leeftijdLabel(r.leeftijd)}</>}
                      </span>
                    </div>
                  );
                })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
