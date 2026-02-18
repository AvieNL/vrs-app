import { useState } from 'react';
import { euringReference } from '../../data/euring-reference';
import './VeldenPage.css';

const SECTIES = [
  {
    naam: 'Identificatie',
    velden: [
      { xml: 'centrale', app: 'centrale', type: 'tekst', standaard: 'NLA' },
      { xml: 'ringnummer', app: 'ringnummer', type: 'tekst', standaard: '' },
      { xml: 'metalenringinfo', app: 'metalenringinfo', type: 'code', standaard: '1' },
      { xml: 'identificatie_methode', app: 'identificatie_methode', type: 'code', standaard: 'A0' },
      { xml: 'verificatie', app: 'verificatie', type: 'nummer', standaard: '0' },
      { xml: 'andere_merktekens', app: 'andere_merktekens', type: 'tekst', standaard: '' },
      { xml: 'euring_code', app: 'euring_code', type: 'code', standaard: '' },
      { xml: 'vogelnaam', app: 'vogelnaam', type: 'tekst', standaard: '' },
    ],
  },
  {
    naam: 'Vangst',
    velden: [
      { xml: 'gemanipuleerd', app: 'gemanipuleerd', type: 'code', standaard: '' },
      { xml: 'verplaatst', app: 'verplaatst', type: 'nummer', standaard: '0' },
      { xml: 'vangstmethode', app: 'vangstmethode', type: 'code', standaard: '' },
      { xml: 'lokmiddelen', app: 'lokmiddelen', type: 'code', standaard: 'N' },
      { xml: 'geslacht', app: 'geslacht', type: 'code', standaard: '' },
      { xml: 'leeftijd', app: 'leeftijd', type: 'code', standaard: '' },
      { xml: 'status', app: 'status', type: 'code', standaard: '' },
      { xml: 'broedselgrootte', app: 'broedselgrootte', type: 'tekst', standaard: '--' },
      { xml: 'pul_leeftijd', app: 'pul_leeftijd', type: 'tekst', standaard: '--' },
      { xml: 'nauwk_pul_leeftijd', app: 'nauwk_pul_leeftijd', type: 'tekst', standaard: '-' },
    ],
  },
  {
    naam: 'Datum & Locatie',
    velden: [
      { xml: 'vangstdatum', app: 'vangstdatum', type: 'datum', standaard: '' },
      { xml: 'nauwk_vangstdatum', app: 'nauwk_vangstdatum', type: 'nummer', standaard: '0' },
      { xml: 'tijd', app: 'tijd', type: 'tijd', standaard: '' },
      { xml: 'plaatscode', app: 'plaatscode', type: 'tekst', standaard: '' },
      { xml: 'google_plaats', app: 'google_plaats', type: 'tekst', standaard: '' },
      { xml: 'lat', app: 'lat', type: 'decimaal', standaard: '' },
      { xml: 'lon', app: 'lon', type: 'decimaal', standaard: '' },
      { xml: 'nauwk_coord', app: 'nauwk_coord', type: 'nummer', standaard: '0' },
    ],
  },
  {
    naam: 'Omstandigheden',
    velden: [
      { xml: 'conditie', app: 'conditie', type: 'code', standaard: '' },
      { xml: 'omstandigheden', app: 'omstandigheden', type: 'code', standaard: '' },
      { xml: 'zeker_omstandigheden', app: 'zeker_omstandigheden', type: 'nummer', standaard: '0' },
      { xml: 'opmerkingen', app: 'opmerkingen', type: 'tekst', standaard: '' },
    ],
  },
  {
    naam: 'Biometrie',
    velden: [
      { xml: 'vleugel', app: 'vleugel', type: 'decimaal', standaard: '' },
      { xml: 'gewicht', app: 'gewicht', type: 'decimaal', standaard: '' },
      { xml: 'kop_snavel', app: 'kop_snavel', type: 'decimaal', standaard: '' },
      { xml: 'tarsus_lengte', app: 'tarsus_lengte', type: 'decimaal', standaard: '' },
      { xml: 'handpenlengte', app: 'handpenlengte', type: 'decimaal', standaard: '' },
      { xml: 'staartlengte', app: 'staartlengte', type: 'decimaal', standaard: '' },
      { xml: 'snavel_schedel', app: 'snavel_schedel', type: 'decimaal', standaard: '' },
      { xml: 'tarsus_teen', app: 'tarsus_teen', type: 'decimaal', standaard: '' },
      { xml: 'tarsus_dikte', app: 'tarsus_dikte', type: 'decimaal', standaard: '' },
      { xml: 'achternagel', app: 'achternagel', type: 'decimaal', standaard: '' },
      { xml: 'weegtijd', app: 'weegtijd', type: 'tijd', standaard: '' },
    ],
  },
  {
    naam: 'Rui & Conditie',
    velden: [
      { xml: 'vet', app: 'vet', type: 'code', standaard: '' },
      { xml: 'handpen_score', app: 'handpen_score', type: 'tekst', standaard: '' },
      { xml: 'cloaca', app: 'cloaca', type: 'code', standaard: '' },
      { xml: 'broedvlek', app: 'broedvlek', type: 'code', standaard: '' },
      { xml: 'borstspier', app: 'borstspier', type: 'code', standaard: '' },
      { xml: 'rui_lichaam', app: 'rui_lichaam', type: 'code', standaard: '' },
      { xml: 'geslachtsbepaling', app: 'geslachtsbepaling', type: 'code', standaard: '' },
      { xml: 'handicap', app: 'handicap', type: 'code', standaard: '' },
    ],
  },
  {
    naam: 'Overig',
    velden: [
      { xml: 'netnummer', app: 'netnummer', type: 'tekst', standaard: '' },
      { xml: 'barcode', app: 'barcode', type: 'tekst', standaard: '' },
      { xml: 'opmerkingen1', app: 'opmerkingen1', type: 'tekst', standaard: '' },
      { xml: 'opmerkingen2', app: 'opmerkingen2', type: 'tekst', standaard: '' },
      { xml: 'oude_dekveren', app: 'oude_dekveren', type: 'tekst', standaard: '' },
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

  return (
    <div className="velden-page">
      <h1>Velden</h1>
      <p className="intro">
        Alle {SECTIES.reduce((sum, s) => sum + s.velden.length, 0)} velden uit de Griel XML-export, gegroepeerd per sectie.
        Klik op een <span className="code-badge-inline">code</span>-veld voor alle mogelijke waarden.
      </p>

      {SECTIES.map(sectie => (
        <div key={sectie.naam} className="velden-sectie">
          <h2>{sectie.naam}</h2>
          <table className="velden-tabel">
            <thead>
              <tr>
                <th className="col-nr">#</th>
                <th className="col-xml">XML-tag</th>
                <th>App-veld</th>
                <th className="col-type">Type</th>
                <th className="col-default">Standaard</th>
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
        <td className="col-xml">{veld.xml}</td>
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
        <td className="col-default">{veld.standaard || '—'}</td>
      </tr>
      {isOpen && ref && (
        <tr className="code-detail-row">
          <td colSpan="5">
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
