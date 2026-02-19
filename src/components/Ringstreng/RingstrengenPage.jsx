import { useState, useMemo } from 'react';
import { useSpeciesRef } from '../../hooks/useSpeciesRef';
import { useRole } from '../../hooks/useRole';
import './RingstrengenPage.css';

// Ringnummer normaliseren: verwijder punten en zet naar lowercase
function normalizeRing(s) {
  return s ? s.replace(/\./g, '').trim().toLowerCase() : '';
}

// Parse ringnummer: prefix (letters) + cijfers + suffix (letters)
// Voorbeelden: "BU73001" → {prefix:"bu", num:73001, suffix:"", len:5}
//              "62301A"  → {prefix:"",   num:62301, suffix:"a", len:5}
function parseRing(s) {
  const norm = normalizeRing(s);
  const m = norm.match(/^([a-z]*)(\d+)([a-z]*)$/);
  if (!m) return null;
  return { prefix: m[1], num: parseInt(m[2], 10), suffix: m[3], len: m[2].length };
}

// Twee geparsede ringen hebben hetzelfde schema (zelfde prefix + suffix)
function sameScheme(a, b) {
  return a && b && a.prefix === b.prefix && a.suffix === b.suffix;
}

// Reconstrueer een ringnummer vanuit een schema + nieuw getal
function reconstructRing(parsed, num) {
  return (parsed.prefix + String(num).padStart(parsed.len, '0') + parsed.suffix).toUpperCase();
}

function parsePrijs(s) {
  return parseFloat(String(s).replace(',', '.'));
}

function formatBedrag(n) {
  return '€\u00a0' + n.toFixed(2).replace('.', ',');
}

const LEEG = { ringmaat: '', beschrijving: '', van: '', tot: '', huidige: '', prijsPerRing: '' };

export default function RingstrengenPage({ ringStrengen, records = [], onAdd, onUpdate, onDelete }) {
  const { canAdd, canEdit, canDelete } = useRole();
  const speciesRef = useSpeciesRef();
  const RINGMATEN = useMemo(() => {
    return [...new Set(
      speciesRef
        .map(s => s.ringmaat)
        .filter(m => m && !m.includes('-') && (/^\d/.test(m) || /^(S|laag S)\d/.test(m)))
    )].sort((a, b) => {
      const numA = parseFloat(a.replace(/[^0-9.]/g, '')) || 0;
      const numB = parseFloat(b.replace(/[^0-9.]/g, '')) || 0;
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
  }, [speciesRef]);

  const [toonForm, setToonForm] = useState(false);
  const [form, setForm] = useState(LEEG);
  const [bewerkId, setBewerkId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Bereken stats per streng vanuit de records
  const statsPerStreng = useMemo(() => {
    return ringStrengen.map(streng => {
      const v = parseRing(streng.van);
      const t = parseRing(streng.tot);
      const h = parseRing(streng.huidige);
      if (!v || !t || !h || !sameScheme(v, t)) return { inDatabase: new Set(), gaten: [], totaal: 0, beschikbaar: 0, vol: false };

      const totaalRingen = t.num - v.num + 1;
      const vol = h.num > t.num;
      const beschikbaar = vol ? 0 : t.num - h.num + 1;

      // Welke ringnummers (als getal) zitten in de database?
      const inDatabase = new Set(
        records
          .map(r => r.ringnummer ? parseRing(r.ringnummer) : null)
          .filter(r => r && sameScheme(r, v) && r.num >= v.num && r.num <= t.num)
          .map(r => r.num)
      );

      // Gaten: ringen die aangewezen zijn (< huidige) maar niet in de database staan
      const gaten = [];
      for (let n = v.num; n < h.num && n <= t.num; n++) {
        if (!inDatabase.has(n)) {
          gaten.push(reconstructRing(v, n));
        }
      }

      return { inDatabase, gaten, totaal: totaalRingen, beschikbaar, vol };
    });
  }, [ringStrengen, records]);

  const ringFields = ['van', 'tot', 'huidige'];

  function update(field, value) {
    const val = ringFields.includes(field) ? value.toUpperCase() : value;
    setForm(prev => {
      const next = { ...prev, [field]: val };
      if (field === 'van' && !bewerkId) next.huidige = val;
      return next;
    });
  }

  function startBewerken(streng) {
    setForm({ ...streng });
    setBewerkId(streng.id);
    setToonForm(true);
  }

  function annuleer() {
    setForm(LEEG);
    setBewerkId(null);
    setToonForm(false);
  }

  function opslaan() {
    if (!form.ringmaat || !form.van || !form.tot) return;
    if (bewerkId) {
      onUpdate(bewerkId, form);
    } else {
      onAdd(form);
    }
    annuleer();
  }

  return (
    <div className="page ringstreng-page">
      <h2>Ringstrengen</h2>

      {ringStrengen.length === 0 && !toonForm && (
        <p className="ringstreng-leeg">Nog geen ringstrengen toegevoegd.</p>
      )}

      <div className="ringstreng-lijst">
        {ringStrengen.map((streng, idx) => {
          const stats = statsPerStreng[idx];
          const inDb = stats.inDatabase.size;
          const totaal = stats.totaal;
          const pct = totaal > 0 ? Math.round((inDb / totaal) * 100) : 0;

          return (
            <div key={streng.id} className={`ringstreng-kaart${stats.vol ? ' ringstreng-kaart--vol' : ''}`}>
              <div className="ringstreng-header">
                <span className="ringstreng-maat">{streng.ringmaat}</span>
                {streng.beschrijving && (
                  <span className="ringstreng-beschrijving">{streng.beschrijving}</span>
                )}
                {stats.vol && <span className="ringstreng-vol-badge">Vol</span>}
                <div className="ringstreng-iconen">
                  {canEdit && confirmDeleteId !== streng.id && (
                    <button className="ringstreng-icoon" onClick={() => startBewerken(streng)} title="Bewerken">✎</button>
                  )}
                  {canDelete && (
                    confirmDeleteId === streng.id ? (
                      <>
                        <button className="ringstreng-icoon ringstreng-icoon--delete" style={{ opacity: 1, fontSize: '0.82rem', padding: '2px 8px' }}
                          onClick={() => { onDelete(streng.id); setConfirmDeleteId(null); }}>Ja</button>
                        <button className="ringstreng-icoon" style={{ opacity: 1, fontSize: '0.82rem', padding: '2px 8px' }}
                          onClick={() => setConfirmDeleteId(null)}>Nee</button>
                      </>
                    ) : (
                      <button className="ringstreng-icoon ringstreng-icoon--delete" onClick={() => setConfirmDeleteId(streng.id)} title="Verwijderen">✕</button>
                    )
                  )}
                </div>
              </div>
              <div className="ringstreng-range">
                {streng.van} – {streng.tot}
              </div>
              <div className="ringstreng-voortgang">
                <div className="ringstreng-balk">
                  <div className="ringstreng-balk-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="ringstreng-stats">
                  {inDb} in database · <strong>{stats.beschikbaar} beschikbaar</strong> · volgende: <code>{streng.huidige}</code>
                </span>
                {streng.prijsPerRing && !isNaN(parsePrijs(streng.prijsPerRing)) && (
                  <span className="ringstreng-prijs">
                    {formatBedrag(parsePrijs(streng.prijsPerRing))} p/st · betaald: <strong>{formatBedrag(parsePrijs(streng.prijsPerRing) * stats.totaal)}</strong> · voorraad: <strong>{formatBedrag(parsePrijs(streng.prijsPerRing) * stats.beschikbaar)}</strong>
                  </span>
                )}
              </div>
              {stats.gaten.length > 0 && (
                <div className="ringstreng-gaten">
                  <span className="ringstreng-gaten-label">
                    {stats.gaten.length} {stats.gaten.length === 1 ? 'ring' : 'ringen'} ontbreekt in database
                  </span>
                  <span className="ringstreng-gaten-lijst">
                    {stats.gaten.slice(0, 8).join(', ')}
                    {stats.gaten.length > 8 && ` en ${stats.gaten.length - 8} meer`}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(() => {
        const totaalWaarde = ringStrengen.reduce((sum, streng, idx) => {
          const prijs = parsePrijs(streng.prijsPerRing);
          if (isNaN(prijs)) return sum;
          return sum + prijs * statsPerStreng[idx].totaal;
        }, 0);
        const totaalBeschikbaar = ringStrengen.reduce((sum, streng, idx) => {
          const prijs = parsePrijs(streng.prijsPerRing);
          if (isNaN(prijs)) return sum;
          return sum + prijs * statsPerStreng[idx].beschikbaar;
        }, 0);
        const heeftPrijzen = ringStrengen.some(s => !isNaN(parsePrijs(s.prijsPerRing)));
        if (!heeftPrijzen || ringStrengen.length === 0) return null;
        return (
          <div className="ringstreng-totaal">
            <div className="ringstreng-totaal-rij">
              <span className="ringstreng-totaal-label">Totaal betaald</span>
              <span className="ringstreng-totaal-waarde">{formatBedrag(totaalWaarde)}</span>
            </div>
            <div className="ringstreng-totaal-rij">
              <span className="ringstreng-totaal-label">Huidige voorraadwaarde</span>
              <span className="ringstreng-totaal-waarde ringstreng-totaal-waarde--beschikbaar">{formatBedrag(totaalBeschikbaar)}</span>
            </div>
          </div>
        );
      })()}

      {toonForm ? (
        <div className="section">
          <div className="section-content">
            <h3 className="ringstreng-form-titel">{bewerkId ? 'Ringstreng bewerken' : 'Nieuwe ringstreng'}</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Ringmaat *</label>
                <select value={form.ringmaat} onChange={e => update('ringmaat', e.target.value)}>
                  <option value="">-- Kies --</option>
                  {RINGMATEN.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Beschrijving</label>
                <input type="text" value={form.beschrijving}
                  onChange={e => update('beschrijving', e.target.value)}
                  placeholder="bijv. NK027 2024" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Eerste ringnummer *</label>
                <input type="text" value={form.van}
                  onChange={e => update('van', e.target.value)}
                  placeholder="bijv. BU73001" />
              </div>
              <div className="form-group">
                <label>Laatste ringnummer *</label>
                <input type="text" value={form.tot}
                  onChange={e => update('tot', e.target.value)}
                  placeholder="bijv. BU74000" />
              </div>
            </div>
            <div className="form-group">
              <label>Huidige (volgende te gebruiken)</label>
              <input type="text" value={form.huidige}
                onChange={e => update('huidige', e.target.value)}
                placeholder="Vult automatisch in bij eerste ringnummer" />
              <span className="field-hint">Past automatisch aan na elke opgeslagen vangst</span>
            </div>
            <div className="form-group">
              <label>Prijs per ring (€)</label>
              <input type="text" inputMode="decimal" value={form.prijsPerRing}
                onChange={e => update('prijsPerRing', e.target.value)}
                placeholder="bijv. 0,08" />
            </div>
            <div className="ringstreng-form-acties">
              <button className="btn-primary" onClick={opslaan}>Opslaan</button>
              <button className="btn-secondary" onClick={annuleer}>Annuleren</button>
            </div>
          </div>
        </div>
      ) : canAdd ? (
        <button className="btn-primary ringstreng-add-btn" onClick={() => setToonForm(true)}>
          + Nieuwe ringstreng
        </button>
      ) : null}
    </div>
  );
}
