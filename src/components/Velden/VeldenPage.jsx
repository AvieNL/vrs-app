import { useState } from 'react';
import { euringReference } from '../../data/euring-reference';
import './VeldenPage.css';

// Sectienamen komen overeen met de secties in het Nieuwe Vangst formulier.
// verplicht: true = altijd verplicht, 'pullus' = alleen verplicht bij leeftijd=1
const SECTIES = [
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

let volgnr = 0;

export default function VeldenPage() {
  const [openVeld, setOpenVeld] = useState(null);
  volgnr = 0;

  function toggleVeld(xml) {
    setOpenVeld(prev => (prev === xml ? null : xml));
  }

  const totaalVelden = SECTIES.reduce((sum, s) => sum + s.velden.length, 0);
  const totaalVerplicht = SECTIES.reduce(
    (sum, s) => sum + s.velden.filter(v => v.verplicht === true).length, 0
  );

  return (
    <div className="velden-page">
      <h1>Veldenoverzicht</h1>
      <p className="intro">
        {totaalVelden} velden in totaal, waarvan <strong>{totaalVerplicht} altijd verplicht</strong> en
        3 voorwaardelijk verplicht (alleen bij pullus/nestjong). Klik op een <span className="code-badge-inline">code</span>-veld
        voor alle mogelijke waarden.
      </p>
      <div className="velden-legenda">
        <span className="verplicht-badge verplicht-ja">✓</span> Altijd verplicht
        <span className="verplicht-badge verplicht-cond">P</span> Verplicht bij pullus (leeftijd=1)
      </div>

      {SECTIES.map(sectie => (
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
              </tr>
            </thead>
            <tbody>
              {sectie.velden.map(veld => {
                volgnr++;
                const hasRef = veld.type === 'code' && euringReference[veld.xml];
                const isOpen = openVeld === veld.xml;
                return (
                  <VeldRow
                    key={veld.xml}
                    veld={veld}
                    nr={volgnr}
                    hasRef={hasRef}
                    isOpen={isOpen}
                    onToggle={() => hasRef && toggleVeld(veld.xml)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function VeldRow({ veld, nr, hasRef, isOpen, onToggle }) {
  const ref = hasRef ? euringReference[veld.xml] : null;

  return (
    <>
      <tr
        className={hasRef ? 'veld-clickable' : ''}
        onClick={onToggle}
      >
        <td className="col-nr">{nr}</td>
        <td className="col-xml">
          {veld.xml}
          {veld.xmlnoot && <span className="xml-noot">{veld.xmlnoot}</span>}
        </td>
        <td>{veld.app}</td>
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
          {veld.standaard !== '' && veld.standaard !== undefined ? (
            <code className="standaard-waarde">{veld.standaard}</code>
          ) : '—'}
        </td>
        <td className="col-verplicht">
          {veld.verplicht === true && (
            <span className="verplicht-badge verplicht-ja">✓</span>
          )}
          {veld.verplicht === 'pullus' && (
            <span className="verplicht-badge verplicht-cond" title="Verplicht wanneer leeftijd = 1 (pullus)">P</span>
          )}
        </td>
      </tr>
      {isOpen && ref && (
        <tr className="code-detail-row">
          <td colSpan="6">
            <div className="code-detail">
              <div className="code-detail-title">{ref.label}</div>
              <div className="code-detail-list">
                {ref.codes.map(c => (
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
    </>
  );
}
