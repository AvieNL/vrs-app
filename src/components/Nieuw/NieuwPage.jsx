import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSpeciesRef } from '../../hooks/useSpeciesRef';
import euringCodes from '../../data/euring-codes.json';
import { euringReference } from '../../data/euring-reference.js';
import RuiscoreDiagram from './RuiscoreDiagram';
import LocatiePicker from './LocatiePicker';
import './NieuwPage.css';

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
  { value: '1', label: '1 - Pullus (0)' },
  { value: '2', label: '2 - Volgroeid, leeftijd onbekend' },
  { value: '3', label: '3 - Eerste jaar (1)' },
  { value: '4', label: '4 - Na eerste jaar (+1)' },
  { value: '5', label: '5 - Tweede jaar (2)' },
  { value: '6', label: '6 - Na tweede jaar (+2)' },
  { value: '7', label: '7 - Derde jaar (3)' },
  { value: '8', label: '8 - Na derde jaar (+3)' },
  { value: '9', label: '9 - Vierde jaar en ouder (4+)' },
  { value: 'A', label: 'A - Na vierde jaar (+4)' },
];

const LEEFTIJD_LABELS = {
  '0': 'onbekend',
  '1': 'pullus',
  '2': 'volgroeid',
  '3': '1kj',
  '4': 'na 1kj',
  '5': '2kj',
  '6': 'na 2kj',
  '7': '3kj',
  '8': 'na 3kj',
  '9': '4kj+',
  'A': 'na 4kj+',
};

const PULLUS_LEEFTIJD_OPTIONS = [
  { value: '99', label: '99 – leeftijd niet genoteerd' },
  ...Array.from({ length: 45 }, (_, i) => ({
    value: String(i).padStart(2, '0'),
    label: `${String(i).padStart(2, '0')} – ${i} ${i === 1 ? 'dag' : 'dagen'}`,
  })),
];

const NAUWK_LEEFTIJD_OPTIONS = [
  { value: 'U', label: 'U – niet genoteerd / onbekend' },
  ...Array.from({ length: 10 }, (_, i) => ({
    value: String(i),
    label: `${i} – nauwkeurig tot ${i === 0 ? 'op de dag' : `±${i} dag${i > 1 ? 'en' : ''}`}`,
  })),
];

const BROEDGROOTTE_OPTIONS = [
  { value: '00', label: '00 – onbekend of niet genoteerd' },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, '0'),
    label: `${String(i + 1).padStart(2, '0')} – ${i + 1} ${i === 0 ? 'kuiken' : 'kuikens'} in het nest`,
  })),
];

const GESLACHT_OPTIONS = [
  { value: '', label: '-- Kies --' },
  { value: 'M', label: '♂ Man' },
  { value: 'F', label: '♀ Vrouw' },
  { value: 'U', label: 'U - Onbekend' },
];

const GESLACHTSBEPALING_OPTIONS = [
  { value: '', label: '-- Kies --' },
  { value: '0', label: '0 - Onbekend' },
  { value: '1', label: '1 - Kleed' },
  { value: '2', label: '2 - Maten' },
  { value: '3', label: '3 - Gedrag' },
  { value: '4', label: '4 - Cloaca' },
  { value: '5', label: '5 - Broedvlek' },
  { value: '6', label: '6 - DNA' },
  { value: '7', label: '7 - Combinatie' },
];

const ALL_RINGCENTRALES = [
  { value: 'NLA', label: 'NLA - Netherlands' },
  { value: 'ABT', label: 'ABT - Albania' },
  { value: 'AUW', label: 'AUW - Austria' },
  { value: 'BGS', label: 'BGS - Bulgaria' },
  { value: 'BHS', label: 'BHS - Bosnia & Herzegovina' },
  { value: 'BLB', label: 'BLB - Belgium' },
  { value: 'BYM', label: 'BYM - Belarus' },
  { value: 'CIJ', label: 'CIJ - Channel Islands' },
  { value: 'CYC', label: 'CYC - Cyprus' },
  { value: 'CYK', label: 'CYK - Cyprus (North)' },
  { value: 'CZP', label: 'CZP - Czech Republic' },
  { value: 'DEH', label: 'DEH - Germany (Hiddensee)' },
  { value: 'DER', label: 'DER - Germany (Radolfzell)' },
  { value: 'DEW', label: 'DEW - Germany (Helgoland)' },
  { value: 'DKC', label: 'DKC - Denmark' },
  { value: 'ESA', label: 'ESA - Spain (Aranzadi)' },
  { value: 'ESC', label: 'ESC - Spain (Catalan)' },
  { value: 'ESI', label: 'ESI - Spain (Madrid)' },
  { value: 'ESS', label: 'ESS - Spain (SEO/Birdlife)' },
  { value: 'ETM', label: 'ETM - Estonia' },
  { value: 'FRP', label: 'FRP - France' },
  { value: 'GBT', label: 'GBT - UK & Ireland' },
  { value: 'GET', label: 'GET - Georgia' },
  { value: 'GRA', label: 'GRA - Greece' },
  { value: 'HES', label: 'HES - Switzerland' },
  { value: 'HGB', label: 'HGB - Hungary' },
  { value: 'HRZ', label: 'HRZ - Croatia' },
  { value: 'IAB', label: 'IAB - Italy' },
  { value: 'ILT', label: 'ILT - Israel' },
  { value: 'ISR', label: 'ISR - Iceland' },
  { value: 'LID', label: 'LID - Lithuania' },
  { value: 'LIK', label: 'LIK - Lithuania (Museum)' },
  { value: 'LVR', label: 'LVR - Latvia' },
  { value: 'MEC', label: 'MEC - Montenegro' },
  { value: 'MEP', label: 'MEP - Montenegro' },
  { value: 'MKS', label: 'MKS - Macedonia' },
  { value: 'MLV', label: 'MLV - Malta' },
  { value: 'NOS', label: 'NOS - Norway' },
  { value: 'PLG', label: 'PLG - Poland' },
  { value: 'POL', label: 'POL - Portugal' },
  { value: 'ROB', label: 'ROB - Romania' },
  { value: 'RSB', label: 'RSB - Serbia' },
  { value: 'RUM', label: 'RUM - Russian Federation' },
  { value: 'SFH', label: 'SFH - Finland' },
  { value: 'SKB', label: 'SKB - Slovakia' },
  { value: 'SLL', label: 'SLL - Slovenia' },
  { value: 'SVS', label: 'SVS - Sweden' },
  { value: 'TUA', label: 'TUA - Turkey' },
  { value: 'UKK', label: 'UKK - Ukraine' },
];


const VET_OPTIONS = [
  { value: '', label: '-- Kies --' },
  { value: '0', label: '0 - Geen vet' },
  { value: '1', label: '1 - Keel vettig' },
  { value: '2', label: '2 - Darm zichtbaar' },
  { value: '3', label: '3 - Lever zichtbaar' },
  { value: '4', label: '4 - Iets lever zichtbaar' },
  { value: '5', label: '5 - Uitpuilen' },
];

const VLIEGSPIER_OPTIONS = [
  { value: '', label: '-- Kies --' },
  { value: '0', label: '0 – Borstbeen scherp, spier ingevallen' },
  { value: '1', label: '1 – Borstbeen goed voelbaar, spier vlak' },
  { value: '2', label: '2 – Borstbeen nog voelbaar, spier licht gewelfd' },
  { value: '3', label: '3 – Borstbeen nauwelijks voelbaar, spier volledig gewelfd' },
];

const BROEDVLEK_OPTIONS = [
  { value: '', label: '-- Kies --' },
  { value: '0', label: '0 - Niet bepaald' },
  { value: '1', label: '1 - Afwezig' },
  { value: '2', label: '2 - Aanwezig (geen details)' },
  { value: '3', label: '3 - Startend (eileg)' },
  { value: '4', label: '4 - Begrensd (begin broed)' },
  { value: '5', label: '5 - Geaderd en rood (op ei)' },
  { value: '6', label: '6 - Gerimpeld (jongen)' },
  { value: '7', label: '7 - Groeit dicht (uitgevlogen)' },
];

const HANDICAP_OPTIONS = [
  { value: '', label: '-- Kies --' },
  { value: '00', label: '00 - Geen handicap, vermoedelijk gezond' },
  { value: '10', label: '10 - PARASIET(EN)' },
  { value: '11', label: '11 - Teek(en)' },
  { value: '12', label: '12 - Veerluis(luizen)' },
  { value: '13', label: '13 - Luisvlieg(en)' },
  { value: '14', label: '14 - Teken en luisvliegen' },
  { value: '20', label: '20 - KLEURAFWIJKING' },
  { value: '21', label: '21 - Leucistisch' },
  { value: '22', label: '22 - Albinistisch' },
  { value: '23', label: '23 - Groeistrepen' },
  { value: '30', label: '30 - VERENKLEED niet in orde' },
  { value: '31', label: '31 - Mist meerdere slagpennen (geen rui)' },
  { value: '32', label: '32 - Mist meerdere staartpennen (geen rui)' },
  { value: '33', label: '33 - Mist hele staart' },
  { value: '40', label: '40 - POTEN niet in orde' },
  { value: '41', label: '41 - Oude of nieuwe breuk' },
  { value: '42', label: '42 - Mist teen(en)' },
  { value: '43', label: '43 - Mist voet(en)' },
  { value: '44', label: '44 - Kalkpoten' },
  { value: '45', label: '45 - Gezwel / wrat / tumor (poot)' },
  { value: '50', label: '50 - SNAVEL niet in orde' },
  { value: '51', label: '51 - Kruisbek' },
  { value: '52', label: '52 - Onder- of bovensnavel korter' },
  { value: '53', label: '53 - Mist onder- of bovensnavel' },
  { value: '60', label: '60 - VLEUGEL niet in orde' },
  { value: '61', label: '61 - Vleugel lam (stress/verrekking/breuk)' },
  { value: '70', label: '70 - ZIEKTE' },
  { value: '71', label: '71 - Schimmel' },
  { value: '72', label: '72 - Gezwel / wrat / tumor' },
  { value: '73', label: '73 - Geel' },
  { value: '80', label: '80 - Vleugel nog niet volgroeid (1kj)' },
  { value: '90', label: '90 - ANDERE MANKEMENTEN' },
  { value: '91', label: '91 - Blind aan één oog' },
  { value: '99', label: '99 - Niet in deze lijst' },
];

const CLOACA_OPTIONS = [
  { value: '', label: '-- Kies --' },
  { value: '0', label: '0 - Niet bepaald' },
  { value: '1', label: '1 - Niet ontwikkeld (geslacht?)' },
  { value: '2', label: '2 - Uitstekend, bol, kegelvormig (man!)' },
  { value: '3', label: '3 - Uitstekend, iets bol (man)' },
  { value: '4', label: '4 - Enigszins uitstekend (man?)' },
  { value: '5', label: '5 - Duidelijk verwijd, zacht gewelfd (vrouw!)' },
  { value: '6', label: '6 - Zacht gewelfd (vrouw)' },
  { value: '7', label: '7 - Niet verwijd, onopvallend (vrouw?)' },
];

const PLAATSCODE_OPTIONS = [
  { value: 'NL--', label: 'NL-- – Nederland (niet gespecificeerd)' },
  { value: 'NL11', label: 'NL11 – Ameland' },
  { value: 'NL04', label: 'NL04 – Drenthe' },
  { value: 'NL05', label: 'NL05 – Friesland' },
  { value: 'NL06', label: 'NL06 – Gelderland' },
  { value: 'NL02', label: 'NL02 – Griend' },
  { value: 'NL07', label: 'NL07 – Groningen' },
  { value: 'NL17', label: 'NL17 – IJsselmeerpolders (incl. Urk & Schokland)' },
  { value: 'NL08', label: 'NL08 – Limburg' },
  { value: 'NL09', label: 'NL09 – Noord-Brabant' },
  { value: 'NL14', label: 'NL14 – Noord-Holland' },
  { value: 'NL15', label: 'NL15 – Overijssel' },
  { value: 'NL13', label: 'NL13 – Rottumeroog' },
  { value: 'NL12', label: 'NL12 – Schiermonnikoog' },
  { value: 'NL03', label: 'NL03 – Terschelling' },
  { value: 'NL00', label: 'NL00 – Texel' },
  { value: 'NL16', label: 'NL16 – Utrecht' },
  { value: 'NL01', label: 'NL01 – Vlieland' },
  { value: 'NL18', label: 'NL18 – Zeeland' },
  { value: 'NL19', label: 'NL19 – Zuid-Holland' },
];

const SNAVEL_METHODE_OPTIONS = [
  { value: '', label: '-- Kies --' },
  { value: 'C', label: 'C – Punt tot cere' },
  { value: 'F', label: 'F – Punt tot veren' },
  { value: 'N', label: 'N – Punt tot neusgat' },
  { value: 'S', label: 'S – Punt tot schedel' },
];

const TARSUS_METHODE_OPTIONS = [
  { value: '', label: '-- Kies --' },
  { value: 'M', label: 'M – Maximum tarsus (gevouwen voet)' },
  { value: 'S', label: 'S – Minimum tarsus (Svensson 1992)' },
  { value: 'T', label: 'T – Tarsus en teen (langste teen)' },
];

const CONDITIE_OPTIONS = [
  { value: '0', label: '0 – Conditie onbekend' },
  { value: '1', label: '1 – Dood, tijdstip onbekend' },
  { value: '2', label: '2 – Vers dood (binnen ~1 week)' },
  { value: '3', label: '3 – Niet vers dood (meer dan ~1 week geleden)' },
  { value: '4', label: '4 – Ziek/gewond aangetroffen, vrijgelaten' },
  { value: '5', label: '5 – Ziek/gewond aangetroffen, niet (zeker) vrijgelaten' },
  { value: '6', label: '6 – Levend en gezond, in gevangenschap genomen' },
  { value: '7', label: '7 – Levend en gezond, zeker vrijgelaten' },
  { value: '8', label: '8 – Levend en gezond, vrijgelaten door ringer' },
  { value: '9', label: '9 – Levend en gezond, lot onbekend' },
];

const NAUWK_COORD_OPTIONS = [
  { value: 0, label: '0 – Nauwkeurig tot de opgegeven coördinaten' },
  { value: 1, label: '1 – Straal 5 km' },
  { value: 2, label: '2 – Straal 10 km' },
  { value: 3, label: '3 – Straal 20 km' },
  { value: 4, label: '4 – Straal 50 km' },
  { value: 5, label: '5 – Straal 100 km' },
  { value: 6, label: '6 – Straal 500 km' },
  { value: 7, label: '7 – Straal 1000 km' },
  { value: 8, label: '8 – Gereserveerd' },
  { value: 9, label: '9 – Ergens in het land/gebied uit de plaatscode' },
];

const NAUWK_DATUM_OPTIONS = [
  { value: 0, label: '0 – Nauwkeurig op de dag' },
  { value: 1, label: '1 – ±1 dag' },
  { value: 2, label: '2 – ±3 dagen' },
  { value: 3, label: '3 – ±1 week' },
  { value: 4, label: '4 – ±2 weken' },
  { value: 5, label: '5 – ±6 weken' },
  { value: 6, label: '6 – ±3 maanden' },
  { value: 7, label: '7 – ±6 maanden' },
  { value: 8, label: '8 – Slechts nauwkeurig tot op het jaar' },
  { value: 9, label: '9 – Datum uitgifte ring / datum vondst (lang dood)' },
];

const RUI_LICHAAM_OPTIONS = [
  { value: '', label: '-- Kies --' },
  { value: '0', label: '0 - Geen' },
  { value: '1', label: '1 - < 20 veren' },
  { value: '2', label: '2 - > 20 veren' },
];

const EMPTY_FORM = {
  vogelnaam: '',
  ringnummer: '',
  metalenringinfo: 2,
  identificatie_methode: 'A0',
  leeftijd: '',
  geslacht: '',
  vangstmethode: 'M',
  lokmiddelen: 'N',
  vangstdatum: new Date().toISOString().split('T')[0],
  tijd: '',
  project: '',
  centrale: 'NLA',
  status: 'U',
  conditie: '8',
  omstandigheden: '',
  plaatscode: 'NL--',
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
  snavel_methode: '',
  staart_verschil: '',
  tarsus_methode: '',
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
  gemanipuleerd: 'N',
  verplaatst: 0,
  broedselgrootte: '00',
  pul_leeftijd: '99',
  nauwk_pul_leeftijd: 'U',
  nauwk_vangstdatum: 0,
  nauwk_coord: 0,
  zeker_omstandigheden: 0,
  verificatie: 0,
  geslachtsbepaling: '',
  handicap: '',
  oude_dekveren: '',
  achternagel: '',
  weegtijd: '',
  ringer_initiaal: '',
  ringer_nummer: '',
};

// Parse a value that might use comma or dot as decimal separator
function parseVal(v) {
  if (v === undefined || v === null || v === '') return NaN;
  return parseFloat(String(v).replace(',', '.'));
}

// Compute min/max ranges from records for a species, with 10% margin
function renderGeslachtTekst(str) {
  if (!str) return str;
  return String(str).split(/([MVF])/).map((part, i) => {
    if (part === 'M') return <span key={i} className="gender-m">{'\u2642\uFE0E'}</span>;
    if (part === 'V' || part === 'F') return <span key={i} className="gender-f">{'\u2640\uFE0E'}</span>;
    return part || null;
  });
}

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

// Verplichte velden voor validatie bij opslaan
const REQUIRED_FIELDS = [
  { key: 'vogelnaam',             label: 'Vogelnaam',                    section: 'essentieel' },
  { key: 'centrale',              label: 'Ringcentrale',                 section: 'essentieel' },
  { key: 'ringnummer',            label: 'Ringnummer',                   section: 'essentieel' },
  { key: 'geslacht',              label: 'Geslacht',                     section: 'essentieel' },
  { key: 'leeftijd',              label: 'Leeftijd',                     section: 'essentieel' },
  { key: 'vangstmethode',         label: 'Vangstmethode',                section: 'essentieel' },
  { key: 'project',               label: 'Project',                      section: 'essentieel' },
  { key: 'pul_leeftijd',          label: 'Pullus leeftijd',              section: 'essentieel', conditie: f => f.leeftijd === '1' },
  { key: 'nauwk_pul_leeftijd',    label: 'Nauwk. pulleeftijd',           section: 'essentieel', conditie: f => f.leeftijd === '1' },
  { key: 'broedselgrootte',       label: 'Broedselgrootte',              section: 'essentieel', conditie: f => f.leeftijd === '1' },
  { key: 'ringer_nummer',         label: 'Ringernr.',                    section: 'vangstdetails' },
  { key: 'metalenringinfo',       label: 'Metalen ring info',            section: 'euring' },
  { key: 'status',                label: 'Status',                       section: 'euring' },
  { key: 'conditie',              label: 'Conditie',                     section: 'euring' },
  { key: 'omstandigheden',        label: 'Omstandigheden',               section: 'euring' },
  { key: 'gemanipuleerd',         label: 'Beïnvloeding meldkans',        section: 'euring' },
  { key: 'lokmiddelen',           label: 'Lokmiddelen',                  section: 'euring' },
  { key: 'identificatie_methode', label: 'Identificatiemethode',         section: 'euring' },
  { key: 'nauwk_vangstdatum',     label: 'Nauwkeurigheid datum',         section: 'euring' },
  { key: 'plaatscode',            label: 'Plaatscode',                   section: 'locatie' },
  { key: 'google_plaats',         label: 'Plaatsnaam',                   section: 'locatie' },
  { key: 'lat',                   label: 'Breedtegraad',                 section: 'locatie' },
  { key: 'lon',                   label: 'Lengtegraad',                  section: 'locatie' },
  { key: 'nauwk_coord',           label: 'Nauwkeurigheid coördinaten',   section: 'locatie' },
  { key: 'andere_merktekens',     label: 'Andere merktekens',            section: 'opmerkingen' },
];

export default function NieuwPage({ onSave, onUpdate, projects, records, speciesOverrides, settings, ringStrengen = [], onAdvanceRing }) {
  const location = useLocation();
  const navigate = useNavigate();
  const editRecord = location.state?.editRecord ?? null;
  const speciesRefData = useSpeciesRef();
  const speciesData = useMemo(
    () => speciesRefData.filter(s => s.naam_nl && s.naam_lat),
    [speciesRefData]
  );

  const [form, setForm] = useState(() => editRecord
    ? { ...EMPTY_FORM, ...editRecord }
    : { ...EMPTY_FORM, ringer_initiaal: settings?.ringerInitiaal || '', ringer_nummer: settings?.ringerNummer || '' }
  );
  const [formErrors, setFormErrors] = useState([]);
  const [sections, setSections] = useState({
    essentieel: true,
    vangstdetails: true,
    rui: false,
    overigeMaten: false,
    locatie: false,
    euring: false,
    opmerkingen: false,
  });
  const [suggestions, setSuggestions] = useState([]);
  const [saved, setSaved] = useState(false);
  const [ruikaart, setRuikaart] = useState(Array(20).fill(''));

  function updateRuikaart(index, value) {
    // Laatste veld (19) = L/R, rest alleen 0-5
    if (index === 19) {
      if (value !== '' && !/^[LRlr]$/.test(value)) return;
      value = value.toUpperCase();
    } else {
      if (value !== '' && !/^[0-5]$/.test(value)) return;
    }
    const next = [...ruikaart];
    next[index] = value;
    setRuikaart(next);
    // Auto-sum primaries (index 9-18) naar handpen_score
    const hasAnyPrimary = next.slice(9, 19).some(v => v !== '');
    if (hasAnyPrimary) {
      const primSum = next.slice(9, 19).reduce((sum, v) => sum + (parseInt(v) || 0), 0);
      update('handpen_score', String(primSum));
    }
    // Auto-advance naar volgend veld bij geldig karakter
    if (value !== '' && index < 19) {
      document.querySelector(`[data-rui="${index + 1}"]`)?.focus();
    }
  }

  function resetRuikaart() {
    setRuikaart(Array(20).fill(''));
  }

  // Find species reference data for selected species
  const speciesInfo = useMemo(() => {
    if (!form.vogelnaam || speciesRefData.length === 0) return null;
    return speciesRefData.find(
      s => s.naam_nl && s.naam_nl.toLowerCase() === form.vogelnaam.toLowerCase()
    );
  }, [form.vogelnaam, speciesRefData]);

  // Get EURING code
  const euringCode = useMemo(() => {
    if (!form.vogelnaam) return '';
    const key = form.vogelnaam.toLowerCase();
    return euringCodes[key] || '';
  }, [form.vogelnaam]);

  // Set van fout-keys voor rode omlijning; helper om class toe te voegen
  const errorKeys = useMemo(() => new Set(formErrors.map(f => f.key)), [formErrors]);
  const errCls = (...keys) => keys.some(k => errorKeys.has(k)) ? ' form-group--error' : '';

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
      r => r.vogelnaam && r.vogelnaam.toLowerCase() === lower && r.leeftijd !== '1'
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
      const baseMin = parseVal(speciesInfo?.[`bio_${f.key}_min`]);
      const baseMax = parseVal(speciesInfo?.[`bio_${f.key}_max`]);
      const fromRec = bioRangesFromRecords[f.key];

      // Soortkaart: override > admin-basis (exact, geen marge)
      const cardMin = !isNaN(ovMin) ? ovMin : (!isNaN(baseMin) ? baseMin : NaN);
      const cardMax = !isNaN(ovMax) ? ovMax : (!isNaN(baseMax) ? baseMax : NaN);
      const hasCard = !isNaN(cardMin) && !isNaN(cardMax);

      if (!hasCard && !fromRec) continue;

      if (hasCard) {
        merged[f.key] = {
          label: f.label,
          min: cardMin,
          max: cardMax,
          rangeMin: cardMin,
          rangeMax: cardMax,
          isOverride: !isNaN(ovMin) || !isNaN(ovMax),
        };
      } else {
        // Alleen records beschikbaar: 10% marge als vangs
        const margin = (fromRec.max - fromRec.min) * 0.1 || fromRec.min * 0.1;
        merged[f.key] = {
          label: f.label,
          min: fromRec.min,
          max: fromRec.max,
          rangeMin: +(fromRec.min - margin).toFixed(1),
          rangeMax: +(fromRec.max + margin).toFixed(1),
          isOverride: false,
        };
      }
    }
    return merged;
  }, [bioRangesFromRecords, soortOverride, speciesInfo]);

  // Geslachtsspecifieke bereiken vanuit soortdata + overrides
  const bioGenderRanges = useMemo(() => {
    const BIO_KEYS = ['vleugel', 'gewicht', 'handpenlengte', 'staartlengte', 'kop_snavel', 'tarsus_lengte', 'tarsus_dikte', 'snavel_schedel'];
    const result = { M: {}, F: {} };
    for (const gender of ['M', 'F']) {
      for (const key of BIO_KEYS) {
        // Override heeft prioriteit boven basisdata
        const ovMin = parseVal(soortOverride[`bio_${key}_${gender}_min`]);
        const ovMax = parseVal(soortOverride[`bio_${key}_${gender}_max`]);
        const baseMin = parseVal(speciesInfo?.[`bio_${key}_${gender}_min`]);
        const baseMax = parseVal(speciesInfo?.[`bio_${key}_${gender}_max`]);
        const min = !isNaN(ovMin) ? ovMin : (!isNaN(baseMin) ? baseMin : NaN);
        const max = !isNaN(ovMax) ? ovMax : (!isNaN(baseMax) ? baseMax : NaN);
        if (!isNaN(min) && !isNaN(max)) {
          // Kleine marge (5%) om grensgevallen niet te snel uit te sluiten
          const margin = (max - min) * 0.05 || Math.abs(min) * 0.02;
          result[gender][key] = {
            min, max,
            rangeMin: +(min - margin).toFixed(1),
            rangeMax: +(max + margin).toFixed(1),
          };
        }
      }
    }
    return result;
  }, [soortOverride, speciesInfo]);

  // Geslachtshint op basis van biometrie
  const genderHint = useMemo(() => {
    const mR = bioGenderRanges.M;
    const fR = bioGenderRanges.F;
    // Alleen zinvol als er velden zijn met zowel M- als F-bereik
    const dualFields = Object.keys(mR).filter(k => fR[k]);
    if (dualFields.length === 0) return null;

    let mScore = 0; // velden die duidelijk op ♂ wijzen
    let fScore = 0; // velden die duidelijk op ♀ wijzen
    let checked = 0;

    for (const key of dualFields) {
      const val = parseVal(form[key]);
      if (isNaN(val) || val <= 0) continue;
      const inM = val >= mR[key].rangeMin && val <= mR[key].rangeMax;
      const inF = val >= fR[key].rangeMin && val <= fR[key].rangeMax;
      checked++;
      if (inM && !inF) mScore++;
      else if (inF && !inM) fScore++;
    }

    if (checked === 0) return null;
    // Suggereer geslacht als alle bekeken velden in dezelfde richting wijzen,
    // of als de meerderheid (≥ 2 velden) duidelijk één kant op wijst
    if (mScore > 0 && fScore === 0) return 'M';
    if (fScore > 0 && mScore === 0) return 'F';
    if (mScore >= 2 && mScore > fScore * 2) return 'M';
    if (fScore >= 2 && fScore > mScore * 2) return 'F';
    return null;
  }, [form, bioGenderRanges]);

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
    setFormErrors(prev => prev.filter(f => f.key !== field));
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
  }, [recentSet, speciesData]);

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

    // Valideer verplichte velden
    const errors = [];
    for (const f of REQUIRED_FIELDS) {
      if (f.conditie && !f.conditie(form)) continue;
      const val = form[f.key];
      if (val === '' || val === null || val === undefined) errors.push(f);
    }
    if (!euringCode) errors.push({ key: 'euring_code', label: 'EURING code (onbekende soort)', section: 'essentieel' });

    if (errors.length > 0) {
      setFormErrors(errors);
      // Open secties met fouten zodat de velden zichtbaar zijn
      const toOpen = {};
      errors.forEach(f => { toOpen[f.section] = true; });
      setSections(prev => ({ ...prev, ...toOpen }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setFormErrors([]);

    if (editRecord) {
      onUpdate(editRecord.id, { ...form, euring_code: euringCode });
      navigate('/records');
      return;
    }
    onSave({ ...form, euring_code: euringCode });
    if (!isTerugvangst && autoFilledRingId.current && onAdvanceRing) {
      onAdvanceRing(autoFilledRingId.current);
      autoFilledRingId.current = null;
    }
    setForm({
      ...EMPTY_FORM,
      vangstdatum: form.vangstdatum,
      project: form.project,
      vangstmethode: form.vangstmethode,
      ringer_initiaal: settings?.ringerInitiaal || '',
      ringer_nummer: settings?.ringerNummer || '',
    });
    resetRuikaart();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function renderBioField(key, label) {
    const range = bioRanges[key];
    const warning = warnings.find(w => w.key === key);
    // Geslachtsimplicatie per veld
    const val = parseVal(form[key]);
    const mR = bioGenderRanges.M[key];
    const fR = bioGenderRanges.F[key];
    let fieldGenderHint = null;
    if (!isNaN(val) && val > 0 && mR && fR) {
      const inM = val >= mR.rangeMin && val <= mR.rangeMax;
      const inF = val >= fR.rangeMin && val <= fR.rangeMax;
      if (inM && !inF) fieldGenderHint = 'M';
      else if (inF && !inM) fieldGenderHint = 'F';
    }
    const genderMismatch = fieldGenderHint && form.geslacht && form.geslacht !== fieldGenderHint && form.geslacht !== 'U';
    return (
      <div className="form-group">
        <label>{label}</label>
        <input type="text" inputMode="decimal" value={form[key]}
          className={warning ? 'input-warn' : ''}
          onChange={e => update(key, e.target.value)} />
        {range && !warning && (
          <span className={`field-hint${range.isOverride ? ' field-hint--warn' : ''}`}>
            Bereik: {range.min}–{range.max}
          </span>
        )}
        {warning && (
          <span className="field-warning">
            {warning.value} buiten bereik ({warning.min}–{warning.max})
          </span>
        )}
        {fieldGenderHint && (
          <span className={`field-hint field-gender-hint${genderMismatch ? ' field-hint--warn' : ''}`}>
            {fieldGenderHint === 'M'
              ? <><span className="gender-m">{'\u2642\uFE0E'}</span> wijst op man</>
              : <><span className="gender-f">{'\u2640\uFE0E'}</span> wijst op vrouw</>}
            {genderMismatch && ' — controleer geslacht'}
          </span>
        )}
      </div>
    );
  }

  // Sorteer ringcentrales: gebruikte bovenaan op frequentie, rest alfabetisch
  const ringcentraleOptions = useMemo(() => {
    const freq = {};
    for (const r of records) {
      if (r.centrale) {
        freq[r.centrale] = (freq[r.centrale] || 0) + 1;
      }
    }
    return [...ALL_RINGCENTRALES].sort((a, b) => {
      const fa = freq[a.value] || 0;
      const fb = freq[b.value] || 0;
      if (fa !== fb) return fb - fa; // meest gebruikt eerst
      return a.label.localeCompare(b.label); // rest alfabetisch
    });
  }, [records]);

  // Cloaca/geslacht mismatch waarschuwing
  const cloacaWarning = useMemo(() => {
    const c = form.cloaca;
    const g = form.geslacht;
    if (!c || !g || c === '0' || c === '1') return null;
    if (['2', '3'].includes(c) && g === 'F') return 'Cloaca wijst op man, maar het ingevoerde geslacht is vrouw';
    if (c === '4' && g === 'F') return 'Cloaca wijst mogelijk op man, maar het ingevoerde geslacht is vrouw';
    if (['5', '6'].includes(c) && g === 'M') return 'Cloaca wijst op vrouw, maar het ingevoerde geslacht is man';
    if (c === '7' && g === 'M') return 'Cloaca wijst mogelijk op vrouw, maar het ingevoerde geslacht is man';
    return null;
  }, [form.cloaca, form.geslacht]);

  const isTerugvangst = form.metalenringinfo === 4;

  // Track of het ringnummer auto-ingevuld is (dan mogen we na opslaan de teller ophogen)
  const autoFilledRingId = useRef(null);

  // Auto-invullen ringnummer op basis van ringmaat van de geselecteerde soort
  useEffect(() => {
    if (isTerugvangst) return;
    if (!speciesInfo?.ringmaat) return;

    // Haal mogelijke maten op: "2.3/2.8 pull" → ["2.3", "2.8"]
    const kandidaatMaten = speciesInfo.ringmaat
      .split('/')
      .map(s => s.trim().replace(/[♂♀].*$/, '').replace(/\s.*$/, '').trim())
      .filter(Boolean);

    // Zoek eerste beschikbare ringstreng die matcht op een van de kandidaatmaten
    const parseRingNum = s => { const m = s?.replace(/\./g,'').match(/^[A-Za-z]*(\d+)[A-Za-z]*$/); return m ? parseInt(m[1],10) : NaN; };
    const match = ringStrengen.find(r =>
      kandidaatMaten.includes(r.ringmaat) && parseRingNum(r.huidige) <= parseRingNum(r.tot)
    );
    if (!match) {
      setForm(prev => ({ ...prev, ringnummer: '' }));
      autoFilledRingId.current = null;
      return;
    }
    setForm(prev => ({ ...prev, ringnummer: match.huidige }));
    autoFilledRingId.current = match.id;
  }, [speciesInfo?.ringmaat, isTerugvangst]); // eslint-disable-line react-hooks/exhaustive-deps

  // Terugvangst: zoek eigen vogel op basis van ringnummer
  const terugvangstInfo = useMemo(() => {
    if (!isTerugvangst || form.ringnummer.length < 5) return null;
    const normalize = s => s.trim().replace(/\./g, '').toLowerCase();
    const nr = normalize(form.ringnummer);
    const matches = records.filter(r =>
      r.ringnummer && normalize(r.ringnummer) === nr
    );
    if (matches.length === 0) return { eigen: false };
    // Sorteer op datum, neem eerste vangst
    const gesorteerd = [...matches].sort((a, b) =>
      (a.vangstdatum || '').localeCompare(b.vangstdatum || '')
    );
    const eerste = gesorteerd[0];
    return {
      eigen: true,
      vangstdatum: eerste.vangstdatum,
      leeftijd: eerste.leeftijd,
      vogelnaam: eerste.vogelnaam,
    };
  }, [isTerugvangst, form.ringnummer, records]);

  function toggleTerugvangst() {
    if (isTerugvangst) {
      setForm(prev => ({ ...prev, metalenringinfo: 2, centrale: 'NLA', omstandigheden: '' }));
    } else {
      setForm(prev => ({ ...prev, metalenringinfo: 4, omstandigheden: '28', ringnummer: '' }));
    }
  }

  return (
    <div className="page nieuw-page">
      <form onSubmit={handleSubmit}>
        {/* Sticky header: topbar + foutmeldingen */}
        <div className="nieuw-sticky-header">
          <div className="nieuw-topbar">
            <span className="nieuw-topbar-titel">
              {editRecord ? `✏️ ${editRecord.vogelnaam || 'Vangst'}` : 'Nieuwe vangst'}
            </span>
            {editRecord && (
              <button type="button" className="btn-secondary nieuw-topbar-btn" onClick={() => navigate('/records')}>
                Annuleren
              </button>
            )}
            <button type="submit" className="btn-primary nieuw-topbar-btn">
              {editRecord ? 'Opslaan' : 'Opslaan'}
            </button>
          </div>

          {formErrors.length > 0 && (
            <div className="form-error-bar">
              <strong>Vul eerst alle verplichte velden in:</strong>
              <div className="form-error-list">
                {formErrors.map(f => <span key={f.key} className="form-error-item">{f.label}</span>)}
              </div>
            </div>
          )}
        </div>

        {saved && (
          <div className="save-toast">Vangst opgeslagen!</div>
        )}

        {/* Sectie 1: Essentieel */}
        <div className="section">
          <div className="section-header" onClick={() => toggleSection('essentieel')}>
            <h3>{editRecord ? 'Vangst wijzigen' : 'Nieuwe vangst'}</h3>
            <span className={`toggle ${sections.essentieel ? 'open' : ''}`}>▾</span>
          </div>
          {sections.essentieel && (
            <div className="section-content">
              <div className={`form-group species-input${errCls('vogelnaam')}`}>
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
              {speciesInfo && settings?.hulpModus !== 'basis' && (
                <div className="soort-info-panel">
                  <div className="soort-info-grid">
                    <div className="soort-info-item highlight">
                      <span className="sii-label">Ringmaat</span>
                      <span className="sii-value">{speciesInfo.ringmaat || '—'}</span>
                    </div>
                    {speciesInfo.ruitype && (
                      <div className={`soort-info-item${['A','B','C','D'].includes(speciesInfo.ruitype) ? ' ruitype-highlight' : ''}`}>
                        <span className="sii-label">Ruitype</span>
                        <span className="sii-value">
                          {speciesInfo.ruitype}
                          {speciesInfo.ruitype === 'A' && <span className="ruitype-badge">Leeftijd beperkt</span>}
                          {speciesInfo.ruitype === 'B' && <span className="ruitype-badge">Ruigrens bepalend</span>}
                          {speciesInfo.ruitype === 'C' && <span className="ruitype-badge">Ruigrens bepalend</span>}
                          {speciesInfo.ruitype === 'D' && <span className="ruitype-badge">Kleed bepalend</span>}
                        </span>
                      </div>
                    )}
                  </div>

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

              {/* Terugvangst toggle */}
              <div className="form-group">
                <label className="toggle-label" onClick={toggleTerugvangst}>
                  <span className={`toggle-switch ${isTerugvangst ? 'active' : ''}`}>
                    <span className="toggle-knob" />
                  </span>
                  <span>{isTerugvangst ? 'Terugvangst' : 'Nieuwe ring'}</span>
                </label>
              </div>

              <div className="form-row">
                <div className={`form-group${errCls('centrale')}`}>
                  <label>Ringcentrale *</label>
                  <select value={form.centrale} onChange={e => update('centrale', e.target.value)}>
                    {ringcentraleOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className={`form-group${errCls('ringnummer')}`}>
                  <label>Ringnummer *</label>
                  <input
                    type="text"
                    value={form.ringnummer}
                    onChange={e => { update('ringnummer', e.target.value.toUpperCase()); autoFilledRingId.current = null; }}
                    placeholder="bijv. ...7154867"
                  />
                  {isTerugvangst && terugvangstInfo && (
                    terugvangstInfo.eigen ? (
                      <div className="terugvangst-info terugvangst-info--eigen">
                        <span className="terugvangst-label">Eigen vogel</span>
                        <span>{terugvangstInfo.vogelnaam}</span>
                        {terugvangstInfo.vangstdatum && <span>Eerste vangst: <strong>{terugvangstInfo.vangstdatum}</strong></span>}
                        {terugvangstInfo.leeftijd && <span>Leeftijd bij eerste vangst: <strong>{LEEFTIJD_LABELS[terugvangstInfo.leeftijd] ?? terugvangstInfo.leeftijd}</strong></span>}
                      </div>
                    ) : (
                      <div className="terugvangst-info terugvangst-info--vreemd">
                        <span className="terugvangst-label">Niet in eigen vangsten</span>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className={`form-group${errCls('geslacht')}`}>
                  <label>Geslacht *</label>
                  <select value={form.geslacht} onChange={e => update('geslacht', e.target.value)}>
                    {GESLACHT_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Bepaling geslacht</label>
                  <select value={form.geslachtsbepaling} onChange={e => update('geslachtsbepaling', e.target.value)}>
                    {GESLACHTSBEPALING_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {genderHint && (() => {
                const sym = genderHint === 'M'
                  ? <span className="gender-m">{'\u2642\uFE0E'}</span>
                  : <span className="gender-f">{'\u2640\uFE0E'}</span>;
                const ingevuld = form.geslacht === 'M' || form.geslacht === 'F';
                const klopt = form.geslacht === genderHint;
                return (
                  <div className={`gender-bio-hint ${klopt ? 'gender-bio-hint--match' : ingevuld ? 'gender-bio-hint--mismatch' : 'gender-bio-hint--suggest'}`}>
                    {klopt
                      ? <>Biometrie bevestigt {sym} man</>
                      : ingevuld
                        ? <>Biometrie wijst op {sym} {genderHint === 'M' ? 'man' : 'vrouw'} — controleer het ingevoerde geslacht</>
                        : <>Op basis van biometrie: waarschijnlijk {sym} {genderHint === 'M' ? 'man' : 'vrouw'}</>
                    }
                  </div>
                );
              })()}

              <div className={`form-group${errCls('leeftijd')}`}>
                <label>Leeftijd *</label>
                <select value={form.leeftijd} onChange={e => update('leeftijd', e.target.value)}>
                  {LEEFTIJD_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {form.leeftijd === '1' && (
                  <div className="pullus-velden">
                    <div className="form-row">
                      <div className={`form-group${errCls('pul_leeftijd')}`}>
                        <label>Pullus leeftijd *</label>
                        <select value={form.pul_leeftijd} onChange={e => update('pul_leeftijd', e.target.value)}>
                          {PULLUS_LEEFTIJD_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className={`form-group${errCls('nauwk_pul_leeftijd')}`}>
                        <label>Nauwkeurigheid *</label>
                        <select value={form.nauwk_pul_leeftijd} onChange={e => update('nauwk_pul_leeftijd', e.target.value)}>
                          {NAUWK_LEEFTIJD_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className={`form-group${errCls('broedselgrootte')}`}>
                      <label>Broedgrootte *</label>
                      <select value={form.broedselgrootte} onChange={e => update('broedselgrootte', e.target.value)}>
                        {BROEDGROOTTE_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      {speciesInfo?.nest_eieren && (
                        <span className="field-hint">Eieren {speciesInfo.naam_nl}: {speciesInfo.nest_eieren}</span>
                      )}
                    </div>
                  </div>
                )}
                {speciesInfo?.ruitype === 'A' && <>
                  {settings?.hulpModus !== 'basis' && (
                    <div className="ruitype-note ruitype-note--kalender">
                      <div className="ruitype-kalender">
                        <div className="ruitype-kal-rij">
                          <span className="ruitype-kal-zijlabel">Juv.</span>
                          <div className="ruitype-kal-balk">
                            <div className="ruitype-kal-seg ruitype-kal-seg--pull" style={{gridColumn:'span 1'}}>pull.</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--juv"  style={{gridColumn:'span 2'}}>juv</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--rui"  style={{gridColumn:'span 2'}}>complete rui</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--vol"  style={{gridColumn:'span 3'}}>volgroeid</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--akj"  style={{gridColumn:'span 4'}}>na 1 kj</div>
                          </div>
                        </div>
                        <div className="ruitype-kal-maanden">
                          <span className="ruitype-kal-maand">Mei</span>
                          <span className="ruitype-kal-maand">Jun</span>
                          <span className="ruitype-kal-maand">Jul</span>
                          <span className="ruitype-kal-maand">Aug</span>
                          <span className="ruitype-kal-maand">Sep</span>
                          <span className="ruitype-kal-maand">Okt</span>
                          <span className="ruitype-kal-maand">Nov</span>
                          <span className="ruitype-kal-maand ruitype-kal-maand--dec">Dec</span>
                          <span className="ruitype-kal-maand ruitype-kal-maand--jan">Jan</span>
                          <span className="ruitype-kal-maand">Feb</span>
                          <span className="ruitype-kal-maand">Mrt</span>
                          <span className="ruitype-kal-maand">Apr</span>
                        </div>
                        <div className="ruitype-kal-rij">
                          <span className="ruitype-kal-zijlabel">Ad.</span>
                          <div className="ruitype-kal-balk">
                            <div className="ruitype-kal-seg ruitype-kal-seg--vol"  style={{gridColumn:'span 3'}}>volgroeid</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--rui"  style={{gridColumn:'span 2'}}>complete rui</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--vol"  style={{gridColumn:'span 3'}}>volgroeid</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--akj"  style={{gridColumn:'span 4'}}>na 1 kj</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {settings?.hulpModus !== 'basis' && <div className="ruitype-kal-tekst">
                    <div className="ruitype-groep">
                      <span className="ruitype-seizoen">Voorjaar</span>
                      <div className="ruitype-opties">
                        <div className="ruitype-optie">
                          <span className="ruitype-val">na 1 kj, leeftijd niet mogelijk</span>
                        </div>
                      </div>
                    </div>
                    <div className="ruitype-groep ruitype-groep--separator">
                      <span className="ruitype-seizoen">Najaar</span>
                      <div className="ruitype-opties">
                        <div className="ruitype-optie">
                          <span className="ruitype-val">volgroeid, leeftijd niet mogelijk</span>
                        </div>
                      </div>
                    </div>
                  </div>}
                </>}
                {speciesInfo?.ruitype === 'B' && <>
                  {settings?.hulpModus !== 'basis' && (
                    <div className="ruitype-note ruitype-note--kalender">
                      <div className="ruitype-kalender">
                        <div className="ruitype-kal-rij">
                          <span className="ruitype-kal-zijlabel">Juv.</span>
                          <div className="ruitype-kal-balk">
                            <div className="ruitype-kal-seg ruitype-kal-seg--pull" style={{gridColumn:'span 1'}}>pull.</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--juv"  style={{gridColumn:'span 2'}}>juv</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--rui"  style={{gridColumn:'span 2'}}>part. rui</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--vol"  style={{gridColumn:'span 3'}}>1 kj</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--akj"  style={{gridColumn:'span 4'}}>2 kj</div>
                          </div>
                        </div>
                        <div className="ruitype-kal-maanden">
                          <span className="ruitype-kal-maand">Mei</span>
                          <span className="ruitype-kal-maand">Jun</span>
                          <span className="ruitype-kal-maand">Jul</span>
                          <span className="ruitype-kal-maand">Aug</span>
                          <span className="ruitype-kal-maand">Sep</span>
                          <span className="ruitype-kal-maand">Okt</span>
                          <span className="ruitype-kal-maand">Nov</span>
                          <span className="ruitype-kal-maand ruitype-kal-maand--dec">Dec</span>
                          <span className="ruitype-kal-maand ruitype-kal-maand--jan">Jan</span>
                          <span className="ruitype-kal-maand">Feb</span>
                          <span className="ruitype-kal-maand">Mrt</span>
                          <span className="ruitype-kal-maand">Apr</span>
                        </div>
                        <div className="ruitype-kal-rij">
                          <span className="ruitype-kal-zijlabel">Ad.</span>
                          <div className="ruitype-kal-balk">
                            <div className="ruitype-kal-seg ruitype-kal-seg--vol"  style={{gridColumn:'span 3'}}>2kj / na 2kj</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--rui"  style={{gridColumn:'span 2'}}>complete rui</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--akj"  style={{gridColumn:'span 3'}}>na 1 kj</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--akj"  style={{gridColumn:'span 4'}}>na 2 kj</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {settings?.hulpModus !== 'basis' && <div className="ruitype-kal-tekst">
                    <div className="ruitype-groep">
                      <span className="ruitype-seizoen">Voorjaar</span>
                      <div className="ruitype-opties">
                        <div className="ruitype-optie">
                          <span className="ruitype-cond">met ruigrens</span>
                          <span className="ruitype-val">1 kj</span>
                        </div>
                        <div className="ruitype-optie">
                          <span className="ruitype-cond">zonder ruigrens</span>
                          <span className="ruitype-val">na 1 kj</span>
                        </div>
                      </div>
                    </div>
                    <div className="ruitype-groep ruitype-groep--separator">
                      <span className="ruitype-seizoen">Najaar</span>
                      <div className="ruitype-opties">
                        <div className="ruitype-optie">
                          <span className="ruitype-cond">met ruigrens</span>
                          <span className="ruitype-val">2 kj</span>
                        </div>
                        <div className="ruitype-optie">
                          <span className="ruitype-cond">zonder ruigrens</span>
                          <span className="ruitype-val">na 2 kj</span>
                        </div>
                      </div>
                    </div>
                  </div>}
                </>}
                {speciesInfo?.ruitype === 'C' && <>
                  {settings?.hulpModus !== 'basis' && (
                    <div className="ruitype-note ruitype-note--kalender">
                      <div className="ruitype-kalender">
                        <div className="ruitype-kal-rij">
                          <span className="ruitype-kal-zijlabel">Juv.</span>
                          <div className="ruitype-kal-balk">
                            <div className="ruitype-kal-seg ruitype-kal-seg--pull" style={{gridColumn:'span 1'}}>pull.</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--juv"  style={{gridColumn:'span 2'}}>juv</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--rui"  style={{gridColumn:'span 2'}}>part. rui</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--vol"  style={{gridColumn:'span 3'}}>1 kj</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--rui"  style={{gridColumn:'span 1'}}>p.r.</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--vol"  style={{gridColumn:'span 3'}}>2 kj</div>
                          </div>
                        </div>
                        <div className="ruitype-kal-maanden">
                          <span className="ruitype-kal-maand">Mei</span>
                          <span className="ruitype-kal-maand">Jun</span>
                          <span className="ruitype-kal-maand">Jul</span>
                          <span className="ruitype-kal-maand">Aug</span>
                          <span className="ruitype-kal-maand">Sep</span>
                          <span className="ruitype-kal-maand">Okt</span>
                          <span className="ruitype-kal-maand">Nov</span>
                          <span className="ruitype-kal-maand ruitype-kal-maand--dec">Dec</span>
                          <span className="ruitype-kal-maand ruitype-kal-maand--jan">Jan</span>
                          <span className="ruitype-kal-maand">Feb</span>
                          <span className="ruitype-kal-maand">Mrt</span>
                          <span className="ruitype-kal-maand">Apr</span>
                        </div>
                        <div className="ruitype-kal-rij">
                          <span className="ruitype-kal-zijlabel">Ad.</span>
                          <div className="ruitype-kal-balk">
                            <div className="ruitype-kal-seg ruitype-kal-seg--vol"  style={{gridColumn:'span 3'}}>2kj / na 2kj</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--rui"  style={{gridColumn:'span 2'}}>complete rui</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--akj"  style={{gridColumn:'span 3'}}>na 1 kj</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--rui"  style={{gridColumn:'span 1'}}>p.r.</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--akj"  style={{gridColumn:'span 3'}}>na 2 kj</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {settings?.hulpModus !== 'basis' && <div className="ruitype-kal-tekst">
                    <div className="ruitype-groep">
                      <span className="ruitype-seizoen">Voorjaar</span>
                      <div className="ruitype-opties">
                        <div className="ruitype-optie">
                          <span className="ruitype-cond">twee ruigrenzen</span>
                          <span className="ruitype-val">2 kj</span>
                        </div>
                        <div className="ruitype-optie">
                          <span className="ruitype-cond">één ruigrens</span>
                          <span className="ruitype-val">na 2 kj</span>
                        </div>
                        <div className="ruitype-optie">
                          <span className="ruitype-cond">twijfel</span>
                          <span className="ruitype-val">na 1 kj</span>
                        </div>
                      </div>
                    </div>
                    <div className="ruitype-groep ruitype-groep--separator">
                      <span className="ruitype-seizoen">Najaar</span>
                      <div className="ruitype-opties">
                        <div className="ruitype-optie">
                          <span className="ruitype-cond">ruigrens</span>
                          <span className="ruitype-val">1 kj</span>
                        </div>
                        <div className="ruitype-optie">
                          <span className="ruitype-cond">geen ruigrens</span>
                          <span className="ruitype-val">na 1 kj</span>
                        </div>
                      </div>
                    </div>
                  </div>}
                </>}
                {speciesInfo?.ruitype === 'D' && <>
                  {settings?.hulpModus !== 'basis' && (
                    <div className="ruitype-note ruitype-note--kalender">
                      <div className="ruitype-kalender">
                        <div className="ruitype-kal-rij">
                          <span className="ruitype-kal-zijlabel">Juv.</span>
                          <div className="ruitype-kal-balk">
                            <div className="ruitype-kal-seg ruitype-kal-seg--pull" style={{gridColumn:'span 1'}}>pull.</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--juv"  style={{gridColumn:'span 2'}}>juv</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--rui"  style={{gridColumn:'span 2'}}>part. rui</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--vol"  style={{gridColumn:'span 3'}}>1 kj</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--rui"  style={{gridColumn:'span 1'}}>c.r.</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--akj"  style={{gridColumn:'span 3'}}>na 1 kj</div>
                          </div>
                        </div>
                        <div className="ruitype-kal-maanden">
                          <span className="ruitype-kal-maand">Mei</span>
                          <span className="ruitype-kal-maand">Jun</span>
                          <span className="ruitype-kal-maand">Jul</span>
                          <span className="ruitype-kal-maand">Aug</span>
                          <span className="ruitype-kal-maand">Sep</span>
                          <span className="ruitype-kal-maand">Okt</span>
                          <span className="ruitype-kal-maand">Nov</span>
                          <span className="ruitype-kal-maand ruitype-kal-maand--dec">Dec</span>
                          <span className="ruitype-kal-maand ruitype-kal-maand--jan">Jan</span>
                          <span className="ruitype-kal-maand">Feb</span>
                          <span className="ruitype-kal-maand">Mrt</span>
                          <span className="ruitype-kal-maand">Apr</span>
                        </div>
                        <div className="ruitype-kal-rij">
                          <span className="ruitype-kal-zijlabel">Ad.</span>
                          <div className="ruitype-kal-balk">
                            <div className="ruitype-kal-seg ruitype-kal-seg--vol"  style={{gridColumn:'span 3'}}>volgroeid</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--rui"  style={{gridColumn:'span 2'}}>complete rui</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--akj"  style={{gridColumn:'span 3'}}>na 1 kj</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--rui"  style={{gridColumn:'span 1'}}>c.r.</div>
                            <div className="ruitype-kal-seg ruitype-kal-seg--akj"  style={{gridColumn:'span 3'}}>na 1 kj</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {settings?.hulpModus !== 'basis' && <div className="ruitype-kal-tekst">
                    <div className="ruitype-groep">
                      <span className="ruitype-seizoen">Voorjaar</span>
                      <div className="ruitype-opties">
                        <div className="ruitype-optie">
                          <span className="ruitype-val">niet mogelijk op kleed, na 1 kj</span>
                        </div>
                      </div>
                    </div>
                    <div className="ruitype-groep ruitype-groep--separator">
                      <span className="ruitype-seizoen">Najaar</span>
                      <div className="ruitype-opties">
                        <div className="ruitype-optie">
                          <span className="ruitype-cond">vers kleed</span>
                          <span className="ruitype-val">1 kj</span>
                        </div>
                        <div className="ruitype-optie">
                          <span className="ruitype-cond">versleten kleed</span>
                          <span className="ruitype-val">na 1 kj</span>
                        </div>
                      </div>
                    </div>
                  </div>}
                </>}
              </div>

              <div className="form-row form-row--datum-tijd">
                <div className="form-group">
                  <label>Vangstdatum</label>
                  <input
                    type="date"
                    value={form.vangstdatum}
                    onChange={e => update('vangstdatum', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Tijd</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="bijv. 0845"
                    value={form.tijd}
                    onChange={e => update('tijd', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className={`form-group${errCls('project')}`}>
                  <label>Project *</label>
                  <select value={form.project} onChange={e => update('project', e.target.value)}>
                    <option value="">-- Kies --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.naam}>
                        {p.nummer ? `${p.nummer} - ${p.naam}` : p.naam}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={`form-group${errCls('vangstmethode')}`}>
                  <label>Vangstmethode *</label>
                  <select value={form.vangstmethode} onChange={e => update('vangstmethode', e.target.value)}>
                    {euringReference.vangstmethode.codes.map(o => (
                      <option key={o.code} value={o.code}>{o.code} – {o.beschrijving}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sectie 2: Vangstdetails */}
        <div className="section">
          <div className="section-header" onClick={() => toggleSection('vangstdetails')}>
            <h3>Basisgegevens</h3>
            {warnings.some(w => ['vleugel', 'gewicht', 'handpenlengte'].includes(w.key)) && <span className="section-badge-warn">!</span>}
            <span className={`toggle ${sections.vangstdetails ? 'open' : ''}`}>▾</span>
          </div>
          {sections.vangstdetails && (
            <div className="section-content">
              <div className="form-row-3">
                <div className="form-group">
                  <label>Netnummer</label>
                  <input type="text" value={form.netnummer}
                    onChange={e => update('netnummer', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Initiaal</label>
                  <input type="text" value={form.ringer_initiaal}
                    onChange={e => update('ringer_initiaal', e.target.value)}
                    placeholder="bijv. TtA" />
                </div>
                <div className={`form-group${errCls('ringer_nummer')}`}>
                  <label>Ringernr *</label>
                  <input type="text" value={form.ringer_nummer}
                    onChange={e => update('ringer_nummer', e.target.value)}
                    placeholder="bijv. 3254" />
                </div>
              </div>
              <div className="form-row">
                {renderBioField('vleugel', 'Vleugel (0,5 mm)')}
                {renderBioField('handpenlengte', 'P8 (0,5 mm)')}
              </div>
              <div className="form-row-3">
                <div className="form-group">
                  <label>Ruiscore</label>
                  <select value={form.rui_lichaam} onChange={e => update('rui_lichaam', e.target.value)}>
                    {RUI_LICHAAM_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Vet (Busse 0-5)</label>
                  <select value={form.vet} onChange={e => update('vet', e.target.value)}>
                    {VET_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Vliegspier</label>
                  <select value={form.borstspier} onChange={e => update('borstspier', e.target.value)}>
                    {VLIEGSPIER_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                {renderBioField('gewicht', 'Gewicht (0,1 g)')}
                <div className="form-group">
                  <label>Weegtijd</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="bijv. 0845"
                    value={form.weegtijd}
                    onChange={e => update('weegtijd', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row-3">
                <div className="form-group">
                  <label>Cloaca</label>
                  <select value={form.cloaca} onChange={e => update('cloaca', e.target.value)}>
                    {CLOACA_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {cloacaWarning && (
                    <span className="field-warning">{cloacaWarning}</span>
                  )}
                </div>
                <div className="form-group">
                  <label>Broedvlek</label>
                  <select value={form.broedvlek} onChange={e => update('broedvlek', e.target.value)}>
                    {BROEDVLEK_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Handicap</label>
                  <select value={form.handicap} onChange={e => update('handicap', e.target.value)}>
                    {HANDICAP_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {speciesInfo && (speciesInfo.nest_eileg || speciesInfo.broed) && (
                <div className="broed-info-hint">
                  {speciesInfo.broed && <span>Broedt: <strong>{renderGeslachtTekst(speciesInfo.broed)}</strong></span>}
                  {speciesInfo.nest_eileg && <span>Eileg: <strong>{renderGeslachtTekst(speciesInfo.nest_eileg)}</strong></span>}
                  {speciesInfo.nest_broedels && <span>Broedels: <strong>{renderGeslachtTekst(speciesInfo.nest_broedels)}</strong></span>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sectie 4: Rui */}
        <div className="section">
          <div className="section-header" onClick={() => toggleSection('rui')}>
            <h3>Rui</h3>
            <span className={`toggle ${sections.rui ? 'open' : ''}`}>▾</span>
          </div>
          {sections.rui && (
            <div className="section-content">
              {settings?.hulpModus !== 'basis' && (
                <div className="ruiscore-diagram">
                  <RuiscoreDiagram />
                </div>
              )}
              <div className="ruikaart">
                <div className="ruikaart-labels">
                  <span className="ruikaart-groep ruikaart-tertials">Tertials</span>
                  <span className="ruikaart-groep ruikaart-secondaries">Secondaries</span>
                  <span className="ruikaart-groep ruikaart-primaries">Primaries</span>
                  <span className="ruikaart-groep ruikaart-lr">L/R</span>
                </div>
                <div className="ruikaart-velden">
                  {ruikaart.map((val, i) => (
                    <input
                      key={i}
                      data-rui={i}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className={`ruikaart-input${i === 2 || i === 8 || i === 18 ? ' ruikaart-border-right' : ''}`}
                      value={val}
                      onChange={e => updateRuikaart(i, e.target.value)}
                      placeholder={i === 19 ? 'L/R' : String(i < 3 ? i + 1 : i < 9 ? i - 2 : i - 8)}
                    />
                  ))}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Handpenrui (totaal)</label>
                  <input type="text" value={form.handpen_score}
                    onChange={e => update('handpen_score', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Oude dekveren</label>
                  <input type="text" value={form.oude_dekveren}
                    onChange={e => update('oude_dekveren', e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sectie 5: Overige maten */}
        <div className="section">
          <div className="section-header" onClick={() => toggleSection('overigeMaten')}>
            <h3>Overige maten</h3>
            {warnings.some(w => !['vleugel', 'gewicht', 'handpenlengte'].includes(w.key)) && <span className="section-badge-warn">!</span>}
            <span className={`toggle ${sections.overigeMaten ? 'open' : ''}`}>▾</span>
          </div>
          {sections.overigeMaten && (
            <div className="section-content">
              <div className="form-row">
                {renderBioField('tarsus_lengte', 'Tarsus (0,1 mm)')}
                <div className="form-group">
                  <label>Tarsus methode</label>
                  <select value={form.tarsus_methode} onChange={e => update('tarsus_methode', e.target.value)}>
                    {TARSUS_METHODE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                {renderBioField('tarsus_dikte', 'Tarsus dikte (0,1 mm)')}
                <div className="form-group">
                  <label>Achternagel (0,1 mm)</label>
                  <input type="text" inputMode="decimal" value={form.achternagel}
                    onChange={e => update('achternagel', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                {renderBioField('staartlengte', 'Staartlengte (0,1 mm)')}
                <div className="form-group">
                  <label>Staartverschil (0,1 mm)</label>
                  <input type="text" inputMode="decimal" value={form.staart_verschil}
                    onChange={e => update('staart_verschil', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                {renderBioField('snavel_schedel', 'Snavellengte (0,1 mm)')}
                <div className="form-group">
                  <label>Snavelmethode</label>
                  <select value={form.snavel_methode} onChange={e => update('snavel_methode', e.target.value)}>
                    {SNAVEL_METHODE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                {renderBioField('kop_snavel', 'Totale koplengte (0,1 mm)')}
              </div>
            </div>
          )}
        </div>

        {/* Sectie: Locatie */}
        <div className="section">
          <div className="section-header" onClick={() => toggleSection('locatie')}>
            <h3>Locatie</h3>
            <span className={`toggle ${sections.locatie ? 'open' : ''}`}>▾</span>
          </div>
          {sections.locatie && (
            <div className="section-content">
              <div className="form-row">
                <div className={`form-group${errCls('plaatscode')}`}>
                  <label>Plaatscode *</label>
                  <select value={form.plaatscode} onChange={e => update('plaatscode', e.target.value)}>
                    {PLAATSCODE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className={`form-group${errCls('google_plaats')}`}>
                  <label>Plaatsnaam *</label>
                  <input type="text" value={form.google_plaats}
                    onChange={e => update('google_plaats', e.target.value)}
                    placeholder="bijv. Breedenbroek" />
                </div>
              </div>
              <LocatiePicker
                lat={form.lat}
                lon={form.lon}
                onChange={(lat, lon) => { setForm(prev => ({ ...prev, lat, lon })); setFormErrors(prev => prev.filter(f => f.key !== 'lat' && f.key !== 'lon')); }}
                latError={errorKeys.has('lat')}
                lonError={errorKeys.has('lon')}
              />
              <div className={`form-group${errCls('nauwk_coord')}`}>
                <label>Nauwkeurigheid coördinaten *</label>
                <select value={form.nauwk_coord} onChange={e => update('nauwk_coord', Number(e.target.value))}>
                  {NAUWK_COORD_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* EURING Codes */}
        <div className="section">
          <div className="section-header" onClick={() => toggleSection('euring')}>
            <h3>Overige EURING data</h3>
            <span className={`toggle ${sections.euring ? 'open' : ''}`}>▾</span>
          </div>
          {sections.euring && (
            <div className="section-content">
              <div className="form-row">
                <div className={`form-group${errCls('metalenringinfo')}`}>
                  <label>Metalen ring informatie *</label>
                  <select value={form.metalenringinfo} onChange={e => update('metalenringinfo', Number(e.target.value))}>
                    {euringReference.metalenringinfo.codes.map(o => (
                      <option key={o.code} value={o.code}>{o.code} – {o.beschrijving}</option>
                    ))}
                  </select>
                </div>
                <div className={`form-group${errCls('gemanipuleerd')}`}>
                  <label>Gemanipuleerd *</label>
                  <select value={form.gemanipuleerd} onChange={e => update('gemanipuleerd', e.target.value)}>
                    {euringReference.gemanipuleerd.codes.map(o => (
                      <option key={o.code} value={o.code}>{o.code} – {o.beschrijving}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className={`form-group${errCls('status')}`}>
                  <label>Status *</label>
                  <select value={form.status} onChange={e => update('status', e.target.value)}>
                    {euringReference.status.codes.map(o => (
                      <option key={o.code} value={o.code}>{o.code} – {o.beschrijving}</option>
                    ))}
                  </select>
                </div>
                <div className={`form-group${errCls('conditie')}`}>
                  <label>Conditie *</label>
                  <select value={form.conditie} onChange={e => update('conditie', e.target.value)}>
                    {CONDITIE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={`form-group${errCls('omstandigheden')}`}>
                <label>Omstandigheden *</label>
                <select value={form.omstandigheden} onChange={e => update('omstandigheden', e.target.value)}>
                  <option value="">-- Kies --</option>
                  {euringReference.omstandigheden.codes.map(o => (
                    <option key={o.code} value={o.code}>{o.code} – {o.beschrijving}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className={`form-group${errCls('lokmiddelen')}`}>
                  <label>Lokmiddelen *</label>
                  <select value={form.lokmiddelen} onChange={e => update('lokmiddelen', e.target.value)}>
                    {euringReference.lokmiddelen.codes.map(o => (
                      <option key={o.code} value={o.code}>{o.code} – {o.beschrijving}</option>
                    ))}
                  </select>
                </div>
                <div className={`form-group${errCls('identificatie_methode')}`}>
                  <label>Identificatiemethode *</label>
                  <select value={form.identificatie_methode} onChange={e => update('identificatie_methode', e.target.value)}>
                    {euringReference.identificatie_methode.codes.map(o => (
                      <option key={o.code} value={o.code}>{o.code} – {o.beschrijving}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={`form-group${errCls('nauwk_vangstdatum')}`}>
                <label>Nauwkeurigheid ringdatum *</label>
                <select value={form.nauwk_vangstdatum} onChange={e => update('nauwk_vangstdatum', Number(e.target.value))}>
                  {NAUWK_DATUM_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
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
                <label>Barcode</label>
                <input type="text" value={form.barcode}
                  onChange={e => update('barcode', e.target.value)} />
              </div>
              <div className={`form-group${errCls('andere_merktekens')}`}>
                <label>Andere merktekens *</label>
                <input type="text" value={form.andere_merktekens}
                  onChange={e => update('andere_merktekens', e.target.value)} />
              </div>
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

      </form>
    </div>
  );
}
