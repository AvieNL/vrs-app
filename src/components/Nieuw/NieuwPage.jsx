import { useState, useMemo, useCallback } from 'react';
import speciesRef from '../../data/species-reference.json';
import euringCodes from '../../data/euring-codes.json';
import './NieuwPage.css';

// Filter out the header row from speciesRef
const speciesData = speciesRef.filter(s => s.naam_nl && s.naam_lat);

const TAAL_LABELS = {
  naam_nl: 'Nederlands',
  naam_lat: 'Latijn',
  naam_en: 'Engels',
  naam_de: 'Duits',
};

// Fuzzy match: all characters of query must appear in order in target
// Returns score (lower = better) or -1 if no match
function fuzzyMatch(query, target) {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Exact substring match — best score
  const substringIdx = t.indexOf(q);
  if (substringIdx === 0) return 0;   // starts-with
  if (substringIdx > 0) return 1;      // substring

  // Fuzzy: all chars in order
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  if (qi === q.length) return 2; // fuzzy match
  return -1; // no match
}

const LEEFTIJD_OPTIONS = [
  { value: '', label: '-- Kies --' },
  { value: '0', label: '0 - Onbekend' },
  { value: '1', label: '1 - Pullus' },
  { value: '2', label: '2 - Volledig gegroeid, leeftijd onbekend' },
  { value: '3', label: '3 - Eerste jaar' },
  { value: '4', label: '4 - Na eerste jaar' },
  { value: '5', label: '5 - Tweede jaar' },
  { value: '6', label: '6 - Na tweede jaar' },
  { value: '7', label: '7 - Derde jaar' },
  { value: '8', label: '8 - Na derde jaar' },
  { value: '9', label: '9 - Vierde jaar en ouder' },
  { value: 'A', label: 'A - Na vierde jaar' },
];

const GESLACHT_OPTIONS = [
  { value: '', label: '-- Kies --' },
  { value: 'M', label: 'M - Man' },
  { value: 'F', label: 'F - Vrouw' },
  { value: 'U', label: 'U - Onbekend' },
];

const VANGSTMETHODE_OPTIONS = [
  { value: '', label: '-- Kies --' },
  { value: 'L', label: 'L - Mistnet' },
  { value: 'N', label: 'N - Nestval' },
  { value: 'H', label: 'H - Met de hand' },
  { value: 'T', label: 'T - Val/kooi' },
  { value: 'P', label: 'P - Pul in nest' },
  { value: 'R', label: 'R - Herbepaling' },
  { value: 'D', label: 'D - Dood' },
];

const VET_OPTIONS = [
  { value: '', label: '-- Kies --' },
  { value: '0', label: '0 - Geen vet' },
  { value: '1', label: '1 - Spoor' },
  { value: '2', label: '2 - Weinig' },
  { value: '3', label: '3 - Matig' },
  { value: '4', label: '4 - Veel' },
  { value: '5', label: '5 - Zeer veel' },
];

const EMPTY_FORM = {
  vogelnaam: '',
  ringnummer: '',
  metalenringinfo: 1,
  identificatie_methode: 'A0',
  leeftijd: '',
  geslacht: '',
  vangstmethode: 'L',
  lokmiddelen: 'N',
  vangstdatum: new Date().toISOString().split('T')[0],
  tijd: '',
  project: '',
  centrale: 'NLA',
  status: '',
  conditie: '',
  omstandigheden: '',
  plaatscode: '',
  google_plaats: '',
  lat: '',
  lon: '',
  vleugel: '',
  gewicht: '',
  kop_snavel: '',
  tarsus_lengte: '',
  handpenlengte: '',
  staartlengte: '',
  snavel_schedel: '',
  tarsus_teen: '',
  tarsus_dikte: '',
  vet: '',
  handpen_score: '',
  cloaca: '',
  broedvlek: '',
  borstspier: '',
  rui_lichaam: '',
  netnummer: '',
  barcode: '',
  opmerkingen: '',
  opmerkingen1: '',
  opmerkingen2: '',
  andere_merktekens: '',
  gemanipuleerd: '',
  verplaatst: 0,
  broedselgrootte: '--',
  pul_leeftijd: '--',
  nauwk_pul_leeftijd: '-',
  nauwk_vangstdatum: 0,
  nauwk_coord: 0,
  zeker_omstandigheden: 0,
  verificatie: 0,
  geslachtsbepaling: '',
  handicap: '',
  oude_dekveren: '',
  achternagel: '',
  weegtijd: '',
};

// Parse a value that might use comma or dot as decimal separator
function parseVal(v) {
  if (v === undefined || v === null || v === '') return NaN;
  return parseFloat(String(v).replace(',', '.'));
}

// Compute min/max ranges from records for a species, with 10% margin
function computeRanges(soortRecords) {
  const fields = [
    { key: 'vleugel', label: 'Vleugel' },
    { key: 'gewicht', label: 'Gewicht' },
    { key: 'handpenlengte', label: 'P8' },
    { key: 'staartlengte', label: 'Staart' },
    { key: 'kop_snavel', label: 'Kop+snavel' },
    { key: 'tarsus_lengte', label: 'Tarsus' },
    { key: 'tarsus_dikte', label: 'Tarsus dikte' },
    { key: 'snavel_schedel', label: 'Snavel-schedel' },
  ];
  const ranges = {};
  for (const f of fields) {
    const vals = soortRecords
      .map(r => parseVal(r[f.key]))
      .filter(v => !isNaN(v) && v > 0);
    if (vals.length >= 3) {
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const margin = (max - min) * 0.1 || min * 0.1;
      ranges[f.key] = {
        label: f.label,
        min: min,
        max: max,
        rangeMin: +(min - margin).toFixed(1),
        rangeMax: +(max + margin).toFixed(1),
        n: vals.length,
      };
    }
  }
  return ranges;
}

export default function NieuwPage({ onSave, projects, records, speciesOverrides }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [sections, setSections] = useState({
    essentieel: true,
    biometrie: false,
    rui: false,
    euring: false,
    opmerkingen: false,
  });
  const [suggestions, setSuggestions] = useState([]);
  const [saved, setSaved] = useState(false);

  // Find species reference data for selected species
  const speciesInfo = useMemo(() => {
    if (!form.vogelnaam) return null;
    return speciesRef.find(
      s => s.naam_nl && s.naam_nl.toLowerCase() === form.vogelnaam.toLowerCase()
    );
  }, [form.vogelnaam]);

  // Get EURING code
  const euringCode = useMemo(() => {
    if (!form.vogelnaam) return '';
    const key = form.vogelnaam.toLowerCase();
    return euringCodes[key] || '';
  }, [form.vogelnaam]);

  // Get species overrides for selected species
  const getOverride = speciesOverrides?.getOverride;
  const soortOverride = useMemo(() => {
    if (!form.vogelnaam || !getOverride) return {};
    return getOverride(form.vogelnaam);
  }, [form.vogelnaam, getOverride]);

  // Compute biometry ranges from existing records for selected species
  const bioRangesFromRecords = useMemo(() => {
    if (!form.vogelnaam) return {};
    const lower = form.vogelnaam.toLowerCase();
    const soortRecords = records.filter(
      r => r.vogelnaam && r.vogelnaam.toLowerCase() === lower && r.project !== 'NK027'
    );
    return computeRanges(soortRecords);
  }, [form.vogelnaam, records]);

  // Merge: manual overrides take priority, per individual field (min/max)
  const bioRanges = useMemo(() => {
    const BIO_KEYS = [
      { key: 'vleugel', label: 'Vleugel' },
      { key: 'gewicht', label: 'Gewicht' },
      { key: 'handpenlengte', label: 'P8' },
      { key: 'staartlengte', label: 'Staart' },
      { key: 'kop_snavel', label: 'Kop+snavel' },
      { key: 'tarsus_lengte', label: 'Tarsus' },
      { key: 'tarsus_dikte', label: 'Tarsus dikte' },
      { key: 'snavel_schedel', label: 'Snavel-schedel' },
    ];
    const merged = {};
    for (const f of BIO_KEYS) {
      const ovMin = parseVal(soortOverride[`bio_${f.key}_min`]);
      const ovMax = parseVal(soortOverride[`bio_${f.key}_max`]);
      const fromRec = bioRangesFromRecords[f.key];

      const hasAnyOverride = !isNaN(ovMin) || !isNaN(ovMax);
      const hasRecords = !!fromRec;

      if (!hasAnyOverride && !hasRecords) continue;

      // Pick best available min/max: override > records
      const min = !isNaN(ovMin) ? ovMin : (hasRecords ? fromRec.min : NaN);
      const max = !isNaN(ovMax) ? ovMax : (hasRecords ? fromRec.max : NaN);

      if (isNaN(min) || isNaN(max)) continue;

      const margin = (max - min) * 0.1 || min * 0.1;
      merged[f.key] = {
        label: f.label,
        min,
        max,
        rangeMin: +(min - margin).toFixed(1),
        rangeMax: +(max + margin).toFixed(1),
        n: hasRecords ? fromRec.n : 0,
        isOverride: hasAnyOverride,
      };
    }
    return merged;
  }, [bioRangesFromRecords, soortOverride]);

  // Check current form values against ranges
  const warnings = useMemo(() => {
    const w = [];
    for (const [key, range] of Object.entries(bioRanges)) {
      const val = parseVal(form[key]);
      if (!isNaN(val) && val > 0) {
        if (val < range.rangeMin || val > range.rangeMax) {
          w.push({
            key,
            label: range.label,
            value: val,
            min: range.rangeMin,
            max: range.rangeMax,
          });
        }
      }
    }
    return w;
  }, [form, bioRanges]);

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  // Recent species from records (unique, most recent first)
  const recentSpecies = useMemo(() => {
    const seen = new Set();
    const recent = [];
    const sorted = [...records].sort((a, b) => {
      const da = a.vangstdatum || '';
      const db = b.vangstdatum || '';
      return db.localeCompare(da);
    });
    for (const r of sorted) {
      if (r.vogelnaam && !seen.has(r.vogelnaam)) {
        seen.add(r.vogelnaam);
        recent.push(r.vogelnaam);
        if (recent.length >= 15) break;
      }
    }
    return recent;
  }, [records]);

  const recentSet = useMemo(() => new Set(recentSpecies), [recentSpecies]);

  const searchSpecies = useCallback((query) => {
    const fields = ['naam_nl', 'naam_lat', 'naam_en', 'naam_de'];
    const results = [];

    for (const sp of speciesData) {
      let bestScore = -1;
      let bestField = 'naam_nl';

      for (const field of fields) {
        const val = sp[field];
        if (!val) continue;
        const score = fuzzyMatch(query, val);
        if (score >= 0 && (bestScore < 0 || score < bestScore)) {
          bestScore = score;
          bestField = field;
          if (score === 0) break; // can't do better than starts-with
        }
      }

      if (bestScore >= 0) {
        results.push({
          naam_nl: sp.naam_nl,
          matchedField: bestField,
          matchedName: bestField !== 'naam_nl' ? sp[bestField] : null,
          score: bestScore,
          isRecent: recentSet.has(sp.naam_nl),
        });
      }
    }

    // Sort: recent first, then by score, then alphabetical
    results.sort((a, b) => {
      if (a.isRecent !== b.isRecent) return a.isRecent ? -1 : 1;
      if (a.score !== b.score) return a.score - b.score;
      return a.naam_nl.localeCompare(b.naam_nl);
    });

    return results.slice(0, 10);
  }, [recentSet]);

  function handleSpeciesInput(value) {
    update('vogelnaam', value);
    if (value.length >= 2) {
      setSuggestions(searchSpecies(value));
    } else if (value.length === 0) {
      // Show recent species when input is empty
      if (recentSpecies.length > 0) {
        setSuggestions(recentSpecies.slice(0, 8).map(name => ({
          naam_nl: name,
          matchedField: 'naam_nl',
          matchedName: null,
          score: 0,
          isRecent: true,
        })));
      } else {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  }

  function handleSpeciesFocus() {
    if (form.vogelnaam.length === 0 && recentSpecies.length > 0) {
      setSuggestions(recentSpecies.slice(0, 8).map(name => ({
        naam_nl: name,
        matchedField: 'naam_nl',
        matchedName: null,
        score: 0,
        isRecent: true,
      })));
    }
  }

  function selectSpecies(name) {
    update('vogelnaam', name);
    setSuggestions([]);
  }

  function toggleSection(key) {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.vogelnaam || !form.ringnummer) return;
    onSave({
      ...form,
      euring_code: euringCode,
    });
    setForm({ ...EMPTY_FORM, vangstdatum: form.vangstdatum, project: form.project });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function renderBioField(key, label) {
    const range = bioRanges[key];
    const warning = warnings.find(w => w.key === key);
    return (
      <div className="form-group">
        <label>
          {label}
          {range && (
            <span className={`range-hint${range.isOverride ? ' range-hint-override' : ''}`}>
              {range.min.toFixed(1)}–{range.max.toFixed(1)}
            </span>
          )}
        </label>
        <input type="text" inputMode="decimal" value={form[key]}
          className={warning ? 'input-warn' : ''}
          onChange={e => update(key, e.target.value)} />
        {warning && (
          <span className="field-warning">
            {warning.value} buiten bereik ({warning.min}–{warning.max})
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="page nieuw-page">
      <form onSubmit={handleSubmit}>
        {saved && (
          <div className="save-toast">Vangst opgeslagen!</div>
        )}

        {/* Essentieel */}
        <div className="section">
          <div className="section-header" onClick={() => toggleSection('essentieel')}>
            <h3>Essentieel</h3>
            <span className={`toggle ${sections.essentieel ? 'open' : ''}`}>▾</span>
          </div>
          {sections.essentieel && (
            <div className="section-content">
              <div className="form-group species-input">
                <label>Vogelnaam *</label>
                <input
                  type="text"
                  value={form.vogelnaam}
                  onChange={e => handleSpeciesInput(e.target.value)}
                  onFocus={handleSpeciesFocus}
                  placeholder="Begin te typen..."
                  autoComplete="off"
                />
                {suggestions.length > 0 && (
                  <ul className="suggestions">
                    {suggestions.map(s => (
                      <li key={s.naam_nl + (s.matchedField || '')} onClick={() => selectSpecies(s.naam_nl)}>
                        <div className="suggestion-content">
                          <span className="suggestion-name">{s.naam_nl}</span>
                          {s.matchedName && (
                            <span className="suggestion-sub">{s.matchedName} ({TAAL_LABELS[s.matchedField]})</span>
                          )}
                          {s.isRecent && !s.matchedName && form.vogelnaam.length < 2 && (
                            <span className="suggestion-sub">Recent gebruikt</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Soort-info paneel */}
              {speciesInfo && (
                <div className="soort-info-panel">
                  <div className="soort-info-header">
                    <strong>{speciesInfo.naam_nl}</strong>
                    {speciesInfo.naam_lat && <em className="soort-lat">{speciesInfo.naam_lat}</em>}
                  </div>

                  <div className="soort-info-grid">
                    <div className="soort-info-item highlight">
                      <span className="sii-label">Ringmaat</span>
                      <span className="sii-value">{speciesInfo.ringmaat || '—'}</span>
                    </div>
                    {speciesInfo.ruitype && (
                      <div className="soort-info-item">
                        <span className="sii-label">Ruitype</span>
                        <span className="sii-value">{speciesInfo.ruitype}</span>
                      </div>
                    )}
                  </div>

                  {/* Min/max ranges uit eigen data + handmatig */}
                  {Object.keys(bioRanges).length > 0 && (
                    <div className="bio-ranges">
                      <span className="bio-ranges-title">Bereik</span>
                      <div className="bio-ranges-grid">
                        {Object.entries(bioRanges).map(([key, range]) => (
                          <div key={key} className="bio-range-item">
                            <span className="br-label">{range.label}</span>
                            <span className="br-value">{range.min.toFixed(1)}–{range.max.toFixed(1)}</span>
                            {range.n > 0 && <span className="br-n">n={range.n}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Boeken */}
                  {speciesInfo.boeken && Object.keys(speciesInfo.boeken).length > 0 && (
                    <div className="soort-info-boeken">
                      <span className="boeken-label">Boeken</span>
                      <div className="boeken-chips">
                        {Object.entries(speciesInfo.boeken).map(([boek, pagina]) => (
                          <span key={boek} className="boek-chip">
                            <span className="boek-chip-naam">{boek.replace(/_/g, ' ')}</span>
                            <span className="boek-chip-pagina">p.{pagina}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>Ringnummer *</label>
                <input
                  type="text"
                  value={form.ringnummer}
                  onChange={e => update('ringnummer', e.target.value)}
                  placeholder="bijv. ...7154867"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Leeftijd</label>
                  <select value={form.leeftijd} onChange={e => update('leeftijd', e.target.value)}>
                    {LEEFTIJD_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Geslacht</label>
                  <select value={form.geslacht} onChange={e => update('geslacht', e.target.value)}>
                    {GESLACHT_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Vangstmethode</label>
                  <select value={form.vangstmethode} onChange={e => update('vangstmethode', e.target.value)}>
                    {VANGSTMETHODE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tijd</label>
                  <input
                    type="time"
                    value={form.tijd}
                    onChange={e => update('tijd', e.target.value.replace(':', ''))}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Vangstdatum</label>
                  <input
                    type="date"
                    value={form.vangstdatum}
                    onChange={e => update('vangstdatum', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Project</label>
                  <select value={form.project} onChange={e => update('project', e.target.value)}>
                    <option value="">-- Kies --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.naam}>{p.naam}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Biometrie */}
        <div className="section">
          <div className="section-header" onClick={() => toggleSection('biometrie')}>
            <h3>Biometrie</h3>
            {warnings.length > 0 && <span className="section-badge-warn">!</span>}
            <span className={`toggle ${sections.biometrie ? 'open' : ''}`}>▾</span>
          </div>
          {sections.biometrie && (
            <div className="section-content">
              <div className="form-row">
                {renderBioField('vleugel', 'Vleugel (mm)')}
                {renderBioField('gewicht', 'Gewicht (g)')}
              </div>
              <div className="form-row">
                {renderBioField('handpenlengte', 'P8 / Handpen (mm)')}
                {renderBioField('staartlengte', 'Staart (mm)')}
              </div>
              <div className="form-row">
                {renderBioField('kop_snavel', 'Kop+snavel (mm)')}
                {renderBioField('snavel_schedel', 'Snavel-schedel (mm)')}
              </div>
              <div className="form-row-3">
                {renderBioField('tarsus_lengte', 'Tarsus (mm)')}
                <div className="form-group">
                  <label>Tarsus-teen (mm)</label>
                  <input type="text" inputMode="decimal" value={form.tarsus_teen}
                    onChange={e => update('tarsus_teen', e.target.value)} />
                </div>
                {renderBioField('tarsus_dikte', 'Tarsus dikte (mm)')}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Achternagel (mm)</label>
                  <input type="text" inputMode="decimal" value={form.achternagel}
                    onChange={e => update('achternagel', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Netnummer</label>
                  <input type="text" value={form.netnummer}
                    onChange={e => update('netnummer', e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rui & Conditie */}
        <div className="section">
          <div className="section-header" onClick={() => toggleSection('rui')}>
            <h3>Rui & Conditie</h3>
            <span className={`toggle ${sections.rui ? 'open' : ''}`}>▾</span>
          </div>
          {sections.rui && (
            <div className="section-content">
              <div className="form-row">
                <div className="form-group">
                  <label>Handpenscore</label>
                  <input type="text" value={form.handpen_score}
                    onChange={e => update('handpen_score', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Vet (Busse 0-5)</label>
                  <select value={form.vet} onChange={e => update('vet', e.target.value)}>
                    {VET_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Borstspier</label>
                  <input type="text" value={form.borstspier}
                    onChange={e => update('borstspier', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Broedvlek</label>
                  <input type="text" value={form.broedvlek}
                    onChange={e => update('broedvlek', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Cloaca</label>
                  <input type="text" value={form.cloaca}
                    onChange={e => update('cloaca', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Rui lichaam</label>
                  <input type="text" value={form.rui_lichaam}
                    onChange={e => update('rui_lichaam', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Oude dekveren</label>
                  <input type="text" value={form.oude_dekveren}
                    onChange={e => update('oude_dekveren', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Geslachtsbepaling</label>
                  <input type="text" value={form.geslachtsbepaling}
                    onChange={e => update('geslachtsbepaling', e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* EURING Codes */}
        <div className="section">
          <div className="section-header" onClick={() => toggleSection('euring')}>
            <h3>EURING Codes</h3>
            <span className={`toggle ${sections.euring ? 'open' : ''}`}>▾</span>
          </div>
          {sections.euring && (
            <div className="section-content">
              <div className="form-row">
                <div className="form-group">
                  <label>Centrale</label>
                  <input type="text" value={form.centrale}
                    onChange={e => update('centrale', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Metalenringinfo</label>
                  <select value={form.metalenringinfo} onChange={e => update('metalenringinfo', Number(e.target.value))}>
                    <option value={1}>1 - Nieuwe ring</option>
                    <option value={0}>0 - Terugvangst</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <input type="text" value={form.status}
                    onChange={e => update('status', e.target.value)} placeholder="bijv. U" />
                </div>
                <div className="form-group">
                  <label>Conditie</label>
                  <input type="text" value={form.conditie}
                    onChange={e => update('conditie', e.target.value)} placeholder="bijv. 8" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Omstandigheden</label>
                  <input type="text" value={form.omstandigheden}
                    onChange={e => update('omstandigheden', e.target.value)} placeholder="bijv. 20" />
                </div>
                <div className="form-group">
                  <label>Lokmiddelen</label>
                  <input type="text" value={form.lokmiddelen}
                    onChange={e => update('lokmiddelen', e.target.value)} placeholder="bijv. N" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Plaatscode</label>
                  <input type="text" value={form.plaatscode}
                    onChange={e => update('plaatscode', e.target.value)} placeholder="bijv. NL06" />
                </div>
                <div className="form-group">
                  <label>Barcode</label>
                  <input type="text" value={form.barcode}
                    onChange={e => update('barcode', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Google Plaats</label>
                <input type="text" value={form.google_plaats}
                  onChange={e => update('google_plaats', e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Andere merktekens</label>
                  <input type="text" value={form.andere_merktekens}
                    onChange={e => update('andere_merktekens', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Handicap</label>
                  <input type="text" value={form.handicap}
                    onChange={e => update('handicap', e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Opmerkingen */}
        <div className="section">
          <div className="section-header" onClick={() => toggleSection('opmerkingen')}>
            <h3>Opmerkingen</h3>
            <span className={`toggle ${sections.opmerkingen ? 'open' : ''}`}>▾</span>
          </div>
          {sections.opmerkingen && (
            <div className="section-content">
              <div className="form-group">
                <label>Opmerkingen</label>
                <textarea rows="2" value={form.opmerkingen}
                  onChange={e => update('opmerkingen', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Opmerkingen 1</label>
                <input type="text" value={form.opmerkingen1}
                  onChange={e => update('opmerkingen1', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Opmerkingen 2</label>
                <input type="text" value={form.opmerkingen2}
                  onChange={e => update('opmerkingen2', e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <button type="submit" className="btn-primary save-btn">
          Vangst Opslaan
        </button>
      </form>
    </div>
  );
}
