import { supabase } from '../lib/supabase';
import { euringReference } from '../data/euring-reference';

// Zelfde SECTIES-definitie als VeldenPage.jsx
// verplicht: true = altijd verplicht, 'pullus' = alleen verplicht bij leeftijd=1
const SECTIES = [
  {
    naam: 'Nieuwe vangst',
    velden: [
      { xml: 'vogelnaam',             type: 'tekst',    standaard: '',         verplicht: true },
      { xml: 'euring_code',           type: 'tekst',    standaard: '(soort)',  verplicht: true },
    ],
  },
  {
    naam: 'Project',
    velden: [
      { xml: 'project',               type: 'tekst',    standaard: '',         verplicht: true },
      { xml: 'ringer_nummer',         type: 'tekst',    standaard: '(instellingen)', verplicht: true },
      { xml: 'ringer_initiaal',       type: 'tekst',    standaard: '(instellingen)' },
    ],
  },
  {
    naam: 'Ringgegevens',
    velden: [
      { xml: 'centrale',              type: 'code',     standaard: 'NLA',      verplicht: true },
      { xml: 'ringnummer',            type: 'tekst',    standaard: '',         verplicht: true },
      { xml: 'identificatie_methode', type: 'code',     standaard: 'A0',       verplicht: true },
      { xml: 'verificatie',           type: 'nummer',   standaard: '0' },
      { xml: 'metalenringinfo',       type: 'code',     standaard: '2',        verplicht: true },
      { xml: 'andere_merktekens',     type: 'code',     standaard: 'ZZ' },
    ],
  },
  {
    naam: 'Vogel',
    velden: [
      { xml: 'geslacht',              type: 'code',     standaard: '',         verplicht: true },
      { xml: 'geslachtsbepaling',     type: 'code',     standaard: 'U' },
      { xml: 'leeftijd',              type: 'code',     standaard: '',         verplicht: true },
      { xml: 'pul_leeftijd',          type: 'tekst',    standaard: '--',       verplicht: 'pullus' },
      { xml: 'nauwk_pul_leeftijd',    type: 'tekst',    standaard: '--',       verplicht: 'pullus' },
      { xml: 'broedselgrootte',       type: 'tekst',    standaard: '--',       verplicht: 'pullus' },
      { xml: 'status',                type: 'code',     standaard: 'U',        verplicht: true },
      { xml: 'conditie',              type: 'code',     standaard: '8',        verplicht: true },
      { xml: 'omstandigheden',        type: 'code',     standaard: '99',       verplicht: true },
      { xml: 'zeker_omstandigheden',  type: 'nummer',   standaard: '0' },
      { xml: 'gemanipuleerd',         type: 'code',     standaard: 'N',        verplicht: true },
      { xml: 'barcode',               type: 'tekst',    standaard: '' },
      { xml: 'verplaatst',            type: 'nummer',   standaard: '0' },
    ],
  },
  {
    naam: 'Vangst',
    velden: [
      { xml: 'vangstdatum',           type: 'datum',    standaard: '(vandaag)' },
      { xml: 'tijd',                  type: 'tijd',     standaard: '' },
      { xml: 'vangstmethode',         type: 'code',     standaard: '',         verplicht: true },
      { xml: 'nauwk_vangstdatum',     type: 'nummer',   standaard: '0',        verplicht: true },
      { xml: 'lokmiddelen',           type: 'code',     standaard: 'N',        verplicht: true },
      { xml: 'netnummer',             type: 'tekst',    standaard: '' },
      { xml: 'opmerkingen',           type: 'tekst',    standaard: '' },
    ],
  },
  {
    naam: 'Locatie',
    velden: [
      { xml: 'plaatscode',            type: 'tekst',    standaard: 'NL--',     verplicht: true },
      { xml: 'google_plaats',         type: 'tekst',    standaard: '',         verplicht: true },
      { xml: 'lat',                   type: 'decimaal', standaard: '',         verplicht: true },
      { xml: 'lon',                   type: 'decimaal', standaard: '',         verplicht: true },
      { xml: 'nauwk_coord',           type: 'tekst',    standaard: '0',        verplicht: true },
    ],
  },
  {
    naam: 'Biometrie',
    velden: [
      { xml: 'vleugel',               type: 'decimaal', standaard: '' },
      { xml: 'handpenlengte',         type: 'decimaal', standaard: '' },
      { xml: 'rui_lichaam',           type: 'code',     standaard: '' },
      { xml: 'vet',                   type: 'code',     standaard: '' },
      { xml: 'borstspier',            type: 'code',     standaard: '' },
      { xml: 'gewicht',               type: 'decimaal', standaard: '' },
      { xml: 'weegtijd',              type: 'tijd',     standaard: '' },
      { xml: 'cloaca',                type: 'code',     standaard: '0' },
      { xml: 'broedvlek',             type: 'code',     standaard: '0' },
      { xml: 'handicap',              type: 'code',     standaard: '00' },
    ],
  },
  {
    naam: 'Biometrie vervolg',
    velden: [
      { xml: 'tarsus_lengte',         type: 'decimaal', standaard: '' },
      { xml: 'tarsus_teen',           type: 'decimaal', standaard: '' },
      { xml: 'tarsus_dikte',          type: 'decimaal', standaard: '' },
      { xml: 'achternagel',           type: 'decimaal', standaard: '' },
      { xml: 'staartlengte',          type: 'decimaal', standaard: '' },
      { xml: 'staart_verschil',       type: 'decimaal', standaard: '' },
      { xml: 'snavel_schedel',        type: 'decimaal', standaard: '' },
      { xml: 'snavel_methode',        type: 'code',     standaard: '' },
      { xml: 'kop_snavel',            type: 'decimaal', standaard: '' },
    ],
  },
  {
    naam: 'Rui',
    velden: [
      { xml: 'handpen_score',         type: 'tekst',    standaard: '' },
      { xml: 'oude_dekveren',         type: 'tekst',    standaard: '' },
    ],
  },
  {
    naam: 'Overige EURING data',
    velden: [
      { xml: 'opmerkingen1',          type: 'tekst',    standaard: '' },
    ],
  },
  {
    naam: 'Niet in formulier',
    velden: [
      { xml: 'verificatie',           type: 'nummer',   standaard: '0' },
    ],
  },
];

export async function seedVeldConfig() {
  const rows = [];
  let volgorde = 0;
  const seen = new Set();

  for (const sectie of SECTIES) {
    for (const veld of sectie.velden) {
      // Sla duplicaten over (verificatie staat twee keer)
      if (seen.has(veld.xml)) continue;
      seen.add(veld.xml);

      const ref = euringReference[veld.xml];
      rows.push({
        veld_key:  veld.xml,
        type:      veld.type,
        verplicht: veld.verplicht === true ? 'ja' : (veld.verplicht === 'pullus' ? 'pullus' : 'nee'),
        standaard: veld.standaard ?? '',
        zichtbaar: true,
        sectie:    sectie.naam,
        volgorde:  volgorde++,
        codes:     ref ? ref.codes.map(c => ({ ...c, zichtbaar: true })) : null,
      });
    }
  }

  const { error } = await supabase
    .from('veld_config')
    .upsert(rows, { onConflict: 'veld_key' });

  if (error) throw error;
}
