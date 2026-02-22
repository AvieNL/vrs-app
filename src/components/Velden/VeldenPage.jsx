import { useState, useMemo } from 'react';
import { euringReference } from '../../data/euring-reference';
import { useVeldConfig } from '../../hooks/useVeldConfig';
import { useRole } from '../../hooks/useRole';
import { supabase } from '../../lib/supabase';
import { db } from '../../lib/db';
import './VeldenPage.css';

// Statische SECTIES als fallback wanneer Supabase nog niet is geseed
// verplicht: true = altijd verplicht, 'pullus' = alleen verplicht bij leeftijd=1
const SECTIES_FALLBACK = [
  {
    naam: 'Nieuwe vangst',
    beschrijving: 'Sectie "Nieuwe vangst" / "Vangst wijzigen" in het formulier',
    velden: [
      { xml: 'vogelnaam',             app: 'Vogelnaam',                      type: 'tekst',    standaard: '',         verplicht: true },
      { xml: 'euring_code',           app: 'EURING-code soort (auto)',       type: 'tekst',    standaard: '(soort)',  verplicht: true },
    ],
  },
  {
    naam: 'Project',
    beschrijving: 'Sectie "Project" in het formulier',
    velden: [
      { xml: 'project',               app: 'Project',                        type: 'tekst',    standaard: '',         verplicht: true, xmlnoot: '— (alleen app)' },
      { xml: 'ringer_nummer',         app: 'Ringernr',                       type: 'tekst',    standaard: '(instellingen)', verplicht: true, xmlnoot: '— (alleen app)' },
      { xml: 'ringer_initiaal',       app: 'Initiaal',                       type: 'tekst',    standaard: '(instellingen)', xmlnoot: '— (alleen app)' },
    ],
  },
  {
    naam: 'Ringgegevens',
    beschrijving: 'Sectie "Ringgegevens" in het formulier',
    velden: [
      { xml: 'centrale',              app: 'Ringcentrale',                   type: 'tekst',    standaard: 'NLA',      verplicht: true },
      { xml: 'ringnummer',            app: 'Ringnummer',                     type: 'tekst',    standaard: '',         verplicht: true },
      { xml: 'identificatie_methode', app: 'Identificatiemethode',           type: 'code',     standaard: 'A0',       verplicht: true },
      { xml: 'verificatie',           app: 'Verificatie',                    type: 'nummer',   standaard: '0' },
      { xml: 'metalenringinfo',       app: 'Metalen ring informatie',        type: 'code',     standaard: '2',        verplicht: true },
      { xml: 'andere_merktekens',     app: 'Andere merktekens',              type: 'code',     standaard: 'ZZ' },
    ],
  },
  {
    naam: 'Vogel',
    beschrijving: 'Sectie "Vogel" in het formulier',
    velden: [
      { xml: 'geslacht',              app: 'Geslacht',                       type: 'code',     standaard: '',         verplicht: true },
      { xml: 'geslachtsbepaling',     app: 'Bepaling geslacht',              type: 'code',     standaard: 'U' },
      { xml: 'leeftijd',              app: 'Leeftijd',                       type: 'code',     standaard: '',         verplicht: true },
      { xml: 'pul_leeftijd',          app: 'Pullus leeftijd',                type: 'tekst',    standaard: '--',       verplicht: 'pullus' },
      { xml: 'nauwk_pul_leeftijd',    app: 'Nauwkeurigheid pullus leeftijd', type: 'tekst',    standaard: '--',       verplicht: 'pullus' },
      { xml: 'broedselgrootte',       app: 'Broedgrootte',                   type: 'tekst',    standaard: '--',       verplicht: 'pullus' },
      { xml: 'status',                app: 'Status',                         type: 'code',     standaard: 'U',        verplicht: true },
      { xml: 'conditie',              app: 'Conditie',                       type: 'code',     standaard: '8',        verplicht: true },
      { xml: 'omstandigheden',        app: 'Omstandigheden',                 type: 'code',     standaard: '99',       verplicht: true },
      { xml: 'zeker_omstandigheden',  app: 'Zekerheid omstandigheden',       type: 'nummer',   standaard: '0' },
      { xml: 'gemanipuleerd',         app: 'Gemanipuleerd',                  type: 'code',     standaard: 'N',        verplicht: true },
      { xml: 'barcode',               app: 'Barcode (als gemanipuleerd=M)',  type: 'tekst',    standaard: '' },
      { xml: 'verplaatst',            app: 'Verplaatst',                     type: 'nummer',   standaard: '0' },
    ],
  },
  {
    naam: 'Vangst',
    beschrijving: 'Sectie "Vangst" in het formulier',
    velden: [
      { xml: 'vangstdatum',           app: 'Vangstdatum',                    type: 'datum',    standaard: '(vandaag)' },
      { xml: 'tijd',                  app: 'Tijd (HHMM)',                    type: 'tijd',     standaard: '' },
      { xml: 'vangstmethode',         app: 'Vangstmethode',                  type: 'code',     standaard: '',         verplicht: true },
      { xml: 'nauwk_vangstdatum',     app: 'Nauwkeurigheid ringdatum',       type: 'nummer',   standaard: '0',        verplicht: true },
      { xml: 'lokmiddelen',           app: 'Lokmiddelen',                    type: 'code',     standaard: 'N',        verplicht: true },
      { xml: 'netnummer',             app: 'Netnummer',                      type: 'tekst',    standaard: '' },
      { xml: 'opmerkingen',           app: 'Opmerkingen',                    type: 'tekst',    standaard: '' },
    ],
  },
  {
    naam: 'Locatie',
    beschrijving: 'Sectie "Locatie" in het formulier',
    velden: [
      { xml: 'plaatscode',            app: 'Plaatscode',                     type: 'tekst',    standaard: 'NL--',     verplicht: true },
      { xml: 'google_plaats',         app: 'Plaatsnaam',                     type: 'tekst',    standaard: '',         verplicht: true },
      { xml: 'lat',                   app: 'Breedtegraad (lat)',              type: 'decimaal', standaard: '',         verplicht: true },
      { xml: 'lon',                   app: 'Lengtegraad (lon)',               type: 'decimaal', standaard: '',         verplicht: true },
      { xml: 'nauwk_coord',           app: 'Nauwkeurigheid coördinaten',     type: 'tekst',    standaard: '0',        verplicht: true },
    ],
  },
  {
    naam: 'Biometrie',
    beschrijving: 'Sectie "Biometrie" in het formulier',
    velden: [
      { xml: 'vleugel',               app: 'Vleugel (0,5 mm)',               type: 'decimaal', standaard: '' },
      { xml: 'handpenlengte',         app: 'P8 (0,5 mm)',                    type: 'decimaal', standaard: '' },
      { xml: 'rui_lichaam',           app: 'Ruiscore',                       type: 'code',     standaard: '' },
      { xml: 'vet',                   app: 'Vet (Busse 0-5)',                 type: 'code',     standaard: '' },
      { xml: 'borstspier',            app: 'Vliegspier',                     type: 'code',     standaard: '' },
      { xml: 'gewicht',               app: 'Gewicht (0,1 g)',                type: 'decimaal', standaard: '' },
      { xml: 'weegtijd',              app: 'Weegtijd',                       type: 'tijd',     standaard: '' },
      { xml: 'cloaca',                app: 'Cloaca',                         type: 'code',     standaard: '0' },
      { xml: 'broedvlek',             app: 'Broedvlek',                      type: 'code',     standaard: '0' },
      { xml: 'handicap',              app: 'Handicap',                       type: 'code',     standaard: '00' },
    ],
  },
  {
    naam: 'Biometrie vervolg',
    beschrijving: 'Sectie "Biometrie vervolg" in het formulier',
    velden: [
      { xml: 'tarsus_lengte',         app: 'Tarsus (0,1 mm)',                type: 'decimaal', standaard: '' },
      { xml: 'tarsus_teen',           app: 'Tarsus-teen (0,1 mm)',           type: 'decimaal', standaard: '' },
      { xml: 'tarsus_dikte',          app: 'Tarsus dikte (0,1 mm)',          type: 'decimaal', standaard: '' },
      { xml: 'achternagel',           app: 'Achternagel (0,1 mm)',           type: 'decimaal', standaard: '' },
      { xml: 'staartlengte',          app: 'Staartlengte (0,1 mm)',          type: 'decimaal', standaard: '' },
      { xml: 'staart_verschil',       app: 'Staartverschil (0,1 mm)',        type: 'decimaal', standaard: '' },
      { xml: 'snavel_schedel',        app: 'Snavellengte (0,1 mm)',          type: 'decimaal', standaard: '' },
      { xml: 'snavel_methode',        app: 'Snavelmethode',                  type: 'code',     standaard: '' },
      { xml: 'kop_snavel',            app: 'Totale koplengte (0,1 mm)',      type: 'decimaal', standaard: '' },
    ],
  },
  {
    naam: 'Rui',
    beschrijving: 'Sectie "Rui" in het formulier',
    velden: [
      { xml: 'handpen_score',         app: 'Handpenrui (totaal)',             type: 'tekst',    standaard: '' },
      { xml: 'oude_dekveren',         app: 'Oude dekveren',                  type: 'tekst',    standaard: '' },
    ],
  },
  {
    naam: 'Overige EURING data',
    beschrijving: 'Sectie "Overige EURING data" in het formulier',
    velden: [
      { xml: 'opmerkingen1',          app: 'Opmerkingen 1',                  type: 'tekst',    standaard: '' },
    ],
  },
  {
    naam: 'Niet in formulier',
    beschrijving: 'Velden die wel in het datamodel / de XML staan maar niet zichtbaar zijn in het formulier',
    velden: [
      { xml: 'verificatie',           app: '— (zie Ringgegevens)',           type: 'nummer',   standaard: '0' },
    ],
  },
];

export default function VeldenPage() {
  const veldConfig = useVeldConfig();
  const { isAdmin } = useRole();
  const [openVeld, setOpenVeld] = useState(null);
  const [editVeld, setEditVeld] = useState(null);  // veld_key being edited
  const [editState, setEditState] = useState({});
  const [saving, setSaving] = useState(null);
  const [saveError, setSaveError] = useState('');

  // Bepaal of we dynamische of statische data gebruiken
  const useDynamic = veldConfig.length > 0;

  // Bouw secties op vanuit dynamische config (gegroepeerd op sectie-veld)
  const secties = useMemo(() => {
    if (!useDynamic) return SECTIES_FALLBACK;

    const map = new Map();
    for (const v of veldConfig) {
      if (!map.has(v.sectie)) map.set(v.sectie, []);
      map.get(v.sectie).push(v);
    }
    return Array.from(map.entries()).map(([naam, velden]) => ({ naam, velden }));
  }, [useDynamic, veldConfig]);

  const totaalVelden = useDynamic
    ? veldConfig.length
    : SECTIES_FALLBACK.reduce((sum, s) => sum + s.velden.length, 0);

  const totaalVerplicht = useDynamic
    ? veldConfig.filter(v => v.verplicht === 'ja').length
    : SECTIES_FALLBACK.reduce((sum, s) => sum + s.velden.filter(v => v.verplicht === true).length, 0);

  function toggleVeld(xml) {
    setOpenVeld(prev => (prev === xml ? null : xml));
  }

  function startEdit(veld) {
    if (!isAdmin) return;
    setEditVeld(veld.veld_key ?? veld.xml);
    setEditState({
      verplicht: veld.verplicht ?? 'nee',
      standaard: veld.standaard ?? '',
      zichtbaar: veld.zichtbaar !== false,
      codes: veld.codes ? veld.codes.map(c => ({ ...c })) : null,
    });
    setSaveError('');
  }

  function cancelEdit() {
    setEditVeld(null);
    setEditState({});
  }

  async function saveVeld(veldKey) {
    setSaving(veldKey);
    setSaveError('');
    const changes = {
      verplicht:  editState.verplicht,
      standaard:  editState.standaard,
      zichtbaar:  editState.zichtbaar,
      codes:      editState.codes,
    };
    const { error } = await supabase
      .from('veld_config')
      .update(changes)
      .eq('veld_key', veldKey);
    if (error) {
      setSaveError(error.message);
    } else {
      await db.veld_config.update(veldKey, changes);
      setEditVeld(null);
    }
    setSaving(null);
  }

  let volgnr = 0;

  return (
    <div className="velden-page">
      <h1>Veldenoverzicht</h1>
      {!useDynamic && (
        <p className="velden-seed-hint">
          Statische data — seed de veldconfiguratie via het Admin-panel voor bewerkbare velden.
        </p>
      )}
      <p className="intro">
        {totaalVelden} velden in totaal, waarvan <strong>{totaalVerplicht} altijd verplicht</strong> en
        3 voorwaardelijk verplicht (alleen bij pullus/nestjong). Klik op een <span className="code-badge-inline">code</span>-veld
        voor alle mogelijke waarden.
      </p>
      <div className="velden-legenda">
        <span className="verplicht-badge verplicht-ja">✓</span> Altijd verplicht
        <span className="verplicht-badge verplicht-cond">P</span> Verplicht bij pullus (leeftijd=1)
        {isAdmin && useDynamic && (
          <span className="velden-admin-hint">— klik op ✎ om een veld te bewerken</span>
        )}
      </div>

      {saveError && (
        <div className="velden-error">{saveError}</div>
      )}

      {secties.map(sectie => {
        const sVelden = useDynamic ? sectie.velden : sectie.velden;
        return (
          <div key={sectie.naam} className="velden-sectie">
            <h2>{sectie.naam}</h2>
            {sectie.beschrijving && (
              <p className="sectie-beschrijving">{sectie.beschrijving}</p>
            )}
            <table className="velden-tabel">
              <thead>
                <tr>
                  <th className="col-nr">#</th>
                  <th className="col-xml">XML-sleutel</th>
                  <th>Formulier-label</th>
                  <th className="col-type">Type</th>
                  <th className="col-default">Standaard</th>
                  <th className="col-verplicht">Verplicht</th>
                  {isAdmin && useDynamic && <th className="col-edit"></th>}
                </tr>
              </thead>
              <tbody>
                {sVelden.map(veld => {
                  volgnr++;
                  const veldKey = veld.veld_key ?? veld.xml;
                  const veldXml = veld.xml ?? veld.veld_key;
                  const isHidden = useDynamic && veld.zichtbaar === false;
                  const hasRef = veld.type === 'code' && euringReference[veldXml];
                  // Use codes from dynamic config if available, fallback to euringReference
                  const dynCodes = useDynamic && veld.codes ? veld.codes : null;
                  const isOpen = openVeld === veldKey;
                  const isEditing = editVeld === veldKey;

                  return (
                    <VeldRow
                      key={veldKey}
                      veld={veld}
                      veldKey={veldKey}
                      veldXml={veldXml}
                      nr={volgnr}
                      hasRef={!!(hasRef || dynCodes)}
                      isOpen={isOpen}
                      isHidden={isHidden}
                      isEditing={isEditing}
                      isAdmin={isAdmin && useDynamic}
                      editState={editState}
                      saving={saving === veldKey}
                      onToggle={() => (hasRef || dynCodes) && toggleVeld(veldKey)}
                      onEdit={() => startEdit(veld)}
                      onCancelEdit={cancelEdit}
                      onSaveEdit={() => saveVeld(veldKey)}
                      onEditChange={(key, val) => setEditState(prev => ({ ...prev, [key]: val }))}
                      onCodeChange={(idx, key, val) => setEditState(prev => {
                        const codes = prev.codes.map((c, i) => i === idx ? { ...c, [key]: val } : c);
                        return { ...prev, codes };
                      })}
                      showEditCol={isAdmin && useDynamic}
                      dynCodes={dynCodes}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function VeldRow({
  veld, veldKey, veldXml, nr, hasRef, isOpen, isHidden,
  isEditing, isAdmin, editState, saving,
  onToggle, onEdit, onCancelEdit, onSaveEdit, onEditChange, onCodeChange,
  showEditCol, dynCodes,
}) {
  const staticRef = euringReference[veldXml] ?? null;
  const displayCodes = dynCodes ?? (staticRef ? staticRef.codes.map(c => ({ ...c, zichtbaar: true })) : null);

  // For dynamic rows, read verplicht from veld.verplicht (string 'ja'/'nee'/'pullus')
  // For static rows, read from veld.verplicht (boolean/string)
  const verplichtVal = veld.veld_key
    ? veld.verplicht  // dynamic: 'ja' | 'nee' | 'pullus'
    : (veld.verplicht === true ? 'ja' : (veld.verplicht === 'pullus' ? 'pullus' : 'nee'));

  const standaard = veld.standaard ?? '';
  const appLabel = veld.app ?? veld.veld_key ?? veldXml;

  return (
    <>
      <tr
        className={[
          hasRef ? 'veld-clickable' : '',
          isHidden ? 'veld-hidden-row' : '',
        ].filter(Boolean).join(' ')}
        onClick={!isEditing ? onToggle : undefined}
      >
        <td className="col-nr">{nr}</td>
        <td className="col-xml">
          {veldXml}
          {veld.xmlnoot && <span className="xml-noot">{veld.xmlnoot}</span>}
        </td>
        <td>
          {appLabel}
          {isHidden && <span className="veld-hidden-badge">verborgen</span>}
        </td>
        <td className="col-type">
          {hasRef ? (
            <span className="code-badge">
              code {isOpen ? '▲' : '▼'}
            </span>
          ) : (
            veld.type
          )}
        </td>
        <td className="col-default">
          {standaard !== '' && standaard !== undefined ? (
            <code className="standaard-waarde">{standaard}</code>
          ) : '—'}
        </td>
        <td className="col-verplicht">
          {verplichtVal === 'ja' && (
            <span className="verplicht-badge verplicht-ja">✓</span>
          )}
          {verplichtVal === 'pullus' && (
            <span className="verplicht-badge verplicht-cond" title="Verplicht wanneer leeftijd = 1 (pullus)">P</span>
          )}
        </td>
        {showEditCol && (
          <td className="col-edit" onClick={e => { e.stopPropagation(); onEdit(); }}>
            <button className="veld-edit-btn" title="Bewerk veld">✎</button>
          </td>
        )}
      </tr>

      {/* Code-detail rij */}
      {isOpen && !isEditing && displayCodes && (
        <tr className="code-detail-row">
          <td colSpan={showEditCol ? 7 : 6}>
            <div className="code-detail">
              <div className="code-detail-title">
                {staticRef?.label ?? veldXml}
              </div>
              <div className="code-detail-list">
                {displayCodes
                  .filter(c => c.zichtbaar !== false)
                  .map(c => (
                    <div key={c.code} className="code-detail-item">
                      <span className="code-value">{c.code}</span>
                      <span className="code-desc">{c.beschrijving}</span>
                    </div>
                  ))}
              </div>
            </div>
          </td>
        </tr>
      )}

      {/* Admin edit panel */}
      {isEditing && (
        <tr className="veld-edit-row">
          <td colSpan={showEditCol ? 7 : 6}>
            <div className="veld-edit-panel">
              <div className="veld-edit-fields">
                <label className="veld-edit-label">
                  Verplicht
                  <select
                    value={editState.verplicht}
                    onChange={e => onEditChange('verplicht', e.target.value)}
                    className="veld-edit-select"
                  >
                    <option value="ja">Ja (altijd)</option>
                    <option value="pullus">Pullus (leeftijd=1)</option>
                    <option value="nee">Nee</option>
                  </select>
                </label>
                <label className="veld-edit-label">
                  Standaard
                  <input
                    type="text"
                    value={editState.standaard}
                    onChange={e => onEditChange('standaard', e.target.value)}
                    className="veld-edit-input"
                    placeholder="(leeg)"
                  />
                </label>
                <label className="veld-edit-label veld-edit-label--check">
                  <input
                    type="checkbox"
                    checked={editState.zichtbaar}
                    onChange={e => onEditChange('zichtbaar', e.target.checked)}
                  />
                  Zichtbaar in formulier
                </label>
              </div>

              {editState.codes && (
                <div className="veld-edit-codes">
                  <div className="veld-edit-codes-title">Codes</div>
                  {editState.codes.map((c, idx) => (
                    <div key={c.code} className="veld-edit-code-row">
                      <span className="code-value">{c.code}</span>
                      <input
                        type="text"
                        value={c.beschrijving}
                        onChange={e => onCodeChange(idx, 'beschrijving', e.target.value)}
                        className="veld-edit-input veld-edit-input--desc"
                      />
                      <label className="veld-edit-zichtbaar">
                        <input
                          type="checkbox"
                          checked={c.zichtbaar !== false}
                          onChange={e => onCodeChange(idx, 'zichtbaar', e.target.checked)}
                        />
                        Toon
                      </label>
                    </div>
                  ))}
                </div>
              )}

              <div className="veld-edit-actions">
                <button
                  className="veld-save-btn"
                  onClick={onSaveEdit}
                  disabled={saving || !navigator.onLine}
                >
                  {saving ? 'Opslaan...' : 'Opslaan'}
                </button>
                <button className="veld-cancel-btn" onClick={onCancelEdit}>
                  Annuleren
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
