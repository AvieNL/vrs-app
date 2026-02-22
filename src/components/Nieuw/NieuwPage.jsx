import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSpeciesRef } from '../../hooks/useSpeciesRef';
import { useVeldConfig } from '../../hooks/useVeldConfig';
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

// EURING leeftijdcodes 0–9 en A–L (code I bestaat niet in EURING; stopt bij L)
const LEEFTIJD_OPTIONS = [
  { value: '', label: '-- Kies --' },
  { value: '0', label: '0 – Onbekend' },
  { value: '1', label: '1 – Nestjong/pullus' },
  { value: '2', label: '2 – Volgroeid, leeftijd onbekend' },
  { value: '3', label: '3 – 1e kalenderjaar (1 kj)' },
  { value: '4', label: '4 – Na 1e kj' },
  { value: '5', label: '5 – 2e kj' },
  { value: '6', label: '6 – Na 2e kj' },
  { value: '7', label: '7 – 3e kj' },
  { value: '8', label: '8 – Na 3e kj' },
  { value: '9', label: '9 – 4e kj' },
  { value: 'A', label: 'A – Na 4e kj' },
  { value: 'B', label: 'B – 5e kj' },
  { value: 'C', label: 'C – Na 5e kj' },
  { value: 'D', label: 'D – 6e kj' },
  { value: 'E', label: 'E – Na 6e kj' },
  { value: 'F', label: 'F – 7e kj' },
  { value: 'G', label: 'G – Na 7e kj' },
  { value: 'H', label: 'H – 8e kj' },
  { value: 'J', label: 'J – Na 8e kj' },
  { value: 'K', label: 'K – 9e kj' },
  { value: 'L', label: 'L – Na 9e kj en verder' },
];

const LEEFTIJD_LABELS = {
  '0': 'onbekend', '1': 'pullus', '2': 'volgroeid',
  '3': '1kj', '4': 'na 1kj', '5': '2kj', '6': 'na 2kj',
  '7': '3kj', '8': 'na 3kj', '9': '4kj', 'A': 'na 4kj',
  'B': '5kj', 'C': 'na 5kj', 'D': '6kj', 'E': 'na 6kj',
  'F': '7kj', 'G': 'na 7kj', 'H': '8kj',
  'J': 'na 8kj', 'K': '9kj', 'L': 'na 9kj+',
};

const PULLUS_LEEFTIJD_OPTIONS = [
  { value: '--', label: '-- – Vogel is geen nestjong' },
  { value: '99', label: '99 – Leeftijd nestjong niet vastgesteld' },
  ...Array.from({ length: 99 }, (_, i) => ({
    value: String(i).padStart(2, '0'),
    label: `${String(i).padStart(2, '0')} – ${i} ${i === 1 ? 'dag' : 'dagen'}`,
  })),
];

const NAUWK_LEEFTIJD_OPTIONS = [
  { value: '--', label: '-- – Vogel is geen nestjong' },
  { value: 'U', label: 'U – Niet genoteerd / onbekend' },
  ...Array.from({ length: 10 }, (_, i) => ({
    value: String(i),
    label: `${i} – nauwkeurig tot ${i === 0 ? 'op de dag' : `±${i} dag${i > 1 ? 'en' : ''}`}`,
  })),
];

const BROEDGROOTTE_OPTIONS = [
  { value: '--', label: '-- – Vogel is geen nestjong' },
  { value: '00', label: '00 – Onbekend of niet genoteerd' },
  { value: '99', label: '99 – Broedgrootte niet genoteerd' },
  ...Array.from({ length: 49 }, (_, i) => ({
    value: String(i + 1).padStart(2, '0'),
    label: `${String(i + 1).padStart(2, '0')} – ${i + 1} ${i === 0 ? 'kuiken' : 'kuikens'}`,
  })),
  ...Array.from({ length: 29 }, (_, i) => ({
    value: String(i + 52).padStart(2, '0'),
    label: `${String(i + 52).padStart(2, '0')} – ${i + 52} kuikens`,
  })),
];

const GESLACHT_OPTIONS = [
  { value: '', label: '-- Kies --' },
  { value: 'M', label: '♂ Man' },
  { value: 'F', label: '♀ Vrouw' },
  { value: 'U', label: 'U - Onbekend' },
];

const GESLACHTSBEPALING_OPTIONS = [
  { value: 'A', label: 'A – Activiteit/gedrag' },
  { value: 'B', label: 'B – Broedvlek' },
  { value: 'C', label: 'C – Cloacale protuberans' },
  { value: 'D', label: 'D – DNA' },
  { value: 'E', label: 'E – Intern cloacaonderzoek' },
  { value: 'L', label: 'L – Laparoscopie' },
  { value: 'P', label: 'P – Verenkleed (absoluut)' },
  { value: 'S', label: 'S – Grootte / kleurintensiteit' },
  { value: 'T', label: 'T – Post-mortem dissectie' },
  { value: 'U', label: 'U – Onbekend' },
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
  { value: '0', label: '0 – Geen vet' },
  { value: '1', label: '1 – Spoor van vet' },
  { value: '2', label: '2 – Weinig vet (⅓ fossa)' },
  { value: '3', label: '3 – Matig vet (⅔ fossa)' },
  { value: '4', label: '4 – Fossa gevuld, nog hol' },
  { value: '5', label: '5 – Fossa bol / uitpuilend' },
  { value: '6', label: '6 – Vet over borstspieren zichtbaar' },
  { value: '7', label: '7 – Vet over ¾ van borstspieren' },
  { value: '8', label: '8 – Borstspieren niet meer zichtbaar' },
];

const VLIEGSPIER_OPTIONS = [
  { value: '', label: '-- Kies --' },
  { value: '0', label: '0 – Borstbeen scherp, spier ingevallen' },
  { value: '1', label: '1 – Borstbeen goed voelbaar, spier vlak' },
  { value: '2', label: '2 – Borstbeen nog voelbaar, spier licht gewelfd' },
  { value: '3', label: '3 – Borstbeen nauwelijks voelbaar, spier volledig gewelfd' },
];

const BROEDVLEK_OPTIONS = [
  { value: '0', label: '0 – Geen broedvlek waarneembaar' },
  { value: '1', label: '1 – Beginnend' },
  { value: '2', label: '2 – Goed begrensd' },
  { value: '3', label: '3 – Geaderd en rood' },
  { value: '4', label: '4 – Gerimpeld' },
  { value: '5', label: '5 – Bevederd aan het worden' },
  { value: 'P', label: 'P – Aanwezig, mate niet genoteerd' },
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
  { value: '0', label: '0 – Niet onderzocht' },
  { value: '1', label: '1 – Geen zwelling' },
  { value: '2', label: '2 – Lichte zwelling' },
  { value: '3', label: '3 – Matige zwelling' },
  { value: '4', label: '4 – Sterke zwelling' },
  { value: '5', label: '5 – Zeer sterke zwelling (cloacale protuberans)' },
  { value: '6', label: '6 – Zwelling afnemend' },
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

const ANDERE_MERKTEKENS_OPTIONS = [
  { value: 'ZZ', label: 'ZZ – Geen andere merktekens' },
  { value: 'BB', label: 'BB – Kleurring (blauw)' },
  { value: 'BC', label: 'BC – Kleurring (groen)' },
  { value: 'BD', label: 'BD – Kleurring (rood)' },
  { value: 'BE', label: 'BE – Kleurring (geel)' },
  { value: 'LB', label: 'LB – Vlaggetje (blauw)' },
  { value: 'LC', label: 'LC – Vlaggetje (groen)' },
  { value: 'LD', label: 'LD – Vlaggetje (rood)' },
  { value: 'LE', label: 'LE – Vlaggetje (geel)' },
  { value: 'K', label: 'K – Kapsel / neckcollar' },
  { value: 'T', label: 'T – Transmitter / zender' },
  { value: 'S', label: 'S – Secundaire ring' },
  { value: 'R', label: 'R – Ring op poot (extra)' },
  { value: 'H', label: 'H – Halsband' },
  { value: 'G', label: 'G – Gezenderd (telemetrie)' },
  { value: 'F', label: 'F – Vlag (flag)' },
  { value: 'E', label: 'E – Emitter' },
  { value: 'D', label: 'D – Darvic ring' },
  { value: 'C', label: 'C – Kleurring (overig)' },
  { value: 'OT', label: 'OT – Ander type merkteken' },
  { value: 'OP', label: 'OP – Ander pootmerkteken' },
  { value: 'OM', label: 'OM – Ander merkteken (overig)' },
  { value: 'MM', label: 'MM – Meerdere merktekens' },
];

const VERIFICATIE_OPTIONS = [
  { value: 0, label: '0 – Ring NIET bevestigd' },
  { value: 1, label: '1 – Ring bevestigd' },
];

const VERPLAATST_OPTIONS = [
  { value: 0, label: '0 – Niet verplaatst' },
  { value: 2, label: '2 – Onopzettelijk verplaatst' },
  { value: 4, label: '4 – Opzettelijk verplaatst' },
  { value: 6, label: '6 – Verplaatst door water' },
];

const ZEKER_OMSTANDIG_OPTIONS = [
  { value: 0, label: '0 – Zeker' },
  { value: 1, label: '1 – Aangenomen' },
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
  { value: '0', label: '0 – Nauwkeurig tot de opgegeven coördinaten' },
  { value: '1', label: '1 – Straal 5 km' },
  { value: '2', label: '2 – Straal 10 km' },
  { value: '3', label: '3 – Straal 20 km' },
  { value: '4', label: '4 – Straal 50 km' },
  { value: '5', label: '5 – Straal 100 km' },
  { value: '6', label: '6 – Straal 500 km' },
  { value: '7', label: '7 – Straal 1000 km' },
  { value: '8', label: '8 – Gereserveerd' },
  { value: '9', label: '9 – Ergens in het land/gebied uit de plaatscode' },
  { value: 'A', label: 'A – Administratief gebied 1' },
  { value: 'B', label: 'B – Administratief gebied 2' },
  { value: 'C', label: 'C – Administratief gebied 3' },
  { value: 'D', label: 'D – Administratief gebied 4' },
  { value: 'E', label: 'E – Administratief gebied 5' },
  { value: 'F', label: 'F – Administratief gebied 6' },
  { value: 'G', label: 'G – Administratief gebied 7' },
  { value: 'H', label: 'H – Administratief gebied 8' },
  { value: 'I', label: 'I – Administratief gebied 9' },
  { value: 'J', label: 'J – Administratief gebied 10' },
  { value: 'K', label: 'K – Administratief gebied 11' },
  { value: 'L', label: 'L – Administratief gebied 12' },
  { value: 'M', label: 'M – Administratief gebied 13' },
  { value: 'N', label: 'N – Administratief gebied 14' },
  { value: 'O', label: 'O – Administratief gebied 15' },
  { value: 'P', label: 'P – Administratief gebied 16' },
  { value: 'Q', label: 'Q – Administratief gebied 17' },
  { value: 'R', label: 'R – Administratief gebied 18' },
  { value: 'S', label: 'S – Administratief gebied 19' },
  { value: 'T', label: 'T – Administratief gebied 20' },
  { value: 'U', label: 'U – Administratief gebied 21' },
  { value: 'V', label: 'V – Administratief gebied 22' },
  { value: 'W', label: 'W – Administratief gebied 23' },
  { value: 'X', label: 'X – Administratief gebied 24' },
  { value: 'Y', label: 'Y – Administratief gebied 25' },
  { value: 'Z', label: 'Z – Administratief gebied 26' },
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
  { value: 'B', label: 'B – Actieve lichaam-/dekverenrui' },
  { value: 'J', label: 'J – Volledig juveniel verenkleed' },
  { value: 'M', label: 'M – Actieve rui incl. slagpennen' },
  { value: 'P', label: 'P – Partiële postjuveniele rui' },
  { value: 'X', label: 'X – Geen rui, niet juveniel' },
  { value: 'U', label: 'U – Onbekend / niet onderzocht' },
];

const EMPTY_FORM = {
  vogelnaam: '',
  ringnummer: '',
  metalenringinfo: 2,
  identificatie_methode: 'A0',
  leeftijd: '',
  geslacht: '',
  vangstmethode: '',
  lokmiddelen: 'N',
  vangstdatum: new Date().toISOString().split('T')[0],
  tijd: '',
  project: '',
  centrale: 'NLA',
  status: 'U',
  conditie: '8',
  omstandigheden: '99',
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
  tarsus_teen: '',
  tarsus_dikte: '',
  vet: '',
  handpen_score: '',
  cloaca: '0',
  broedvlek: '0',
  borstspier: '',
  rui_lichaam: '',
  netnummer: '',
  barcode: '',
  opmerkingen: '',
  opmerkingen1: '',
  andere_merktekens: 'ZZ',
  gemanipuleerd: 'N',
  verplaatst: 0,
  broedselgrootte: '--',
  pul_leeftijd: '--',
  nauwk_pul_leeftijd: '--',
  nauwk_vangstdatum: 0,
  nauwk_coord: '0',
  zeker_omstandigheden: 0,
  verificatie: 0,
  geslachtsbepaling: 'U',
  handicap: '00',
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
  { key: 'vogelnaam',             label: 'Vogelnaam',                    section: 'nieuweVangst' },
  { key: 'project',               label: 'Project',                      section: 'project' },
  { key: 'ringer_nummer',         label: 'Ringernr.',                    section: 'project' },
  { key: 'centrale',              label: 'Ringcentrale',                 section: 'ringgegevens' },
  { key: 'ringnummer',            label: 'Ringnummer',                   section: 'ringgegevens' },
  { key: 'metalenringinfo',       label: 'Metalen ring info',            section: 'ringgegevens' },
  { key: 'identificatie_methode', label: 'Identificatiemethode',         section: 'ringgegevens' },
  { key: 'geslacht',              label: 'Geslacht',                     section: 'vogel' },
  { key: 'leeftijd',              label: 'Leeftijd',                     section: 'vogel' },
  { key: 'pul_leeftijd',          label: 'Pullus leeftijd',              section: 'vogel', conditie: f => f.leeftijd === '1', isPullusField: true },
  { key: 'nauwk_pul_leeftijd',    label: 'Nauwk. pulleeftijd',           section: 'vogel', conditie: f => f.leeftijd === '1', isPullusField: true },
  { key: 'broedselgrootte',       label: 'Broedselgrootte',              section: 'vogel', conditie: f => f.leeftijd === '1', isPullusField: true },
  { key: 'status',                label: 'Status',                       section: 'vogel' },
  { key: 'conditie',              label: 'Conditie',                     section: 'vogel' },
  { key: 'omstandigheden',        label: 'Omstandigheden',               section: 'vogel' },
  { key: 'gemanipuleerd',         label: 'Gemanipuleerd',                section: 'vogel' },
  { key: 'vangstmethode',         label: 'Vangstmethode',                section: 'vangst' },
  { key: 'lokmiddelen',           label: 'Lokmiddelen',                  section: 'vangst' },
  { key: 'nauwk_vangstdatum',     label: 'Nauwkeurigheid datum',         section: 'vangst' },
  { key: 'plaatscode',            label: 'Plaatscode',                   section: 'locatie' },
  { key: 'google_plaats',         label: 'Plaatsnaam',                   section: 'locatie' },
  { key: 'lat',                   label: 'Breedtegraad',                 section: 'locatie' },
  { key: 'lon',                   label: 'Lengtegraad',                  section: 'locatie' },
  { key: 'nauwk_coord',           label: 'Nauwkeurigheid coördinaten',   section: 'locatie' },
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

  const veldConfig = useVeldConfig();
  const configMap = useMemo(
    () => Object.fromEntries(veldConfig.map(v => [v.veld_key, v])),
    [veldConfig]
  );

  // Codes voor een select: gebruik configMap als beschikbaar (met zichtbaar-filter), anders euringReference
  function getCodesForSelect(veldKey) {
    const cfg = configMap[veldKey];
    if (cfg?.codes && cfg.codes.length > 0) {
      return cfg.codes.filter(c => c.zichtbaar !== false);
    }
    return euringReference[veldKey]?.codes ?? [];
  }

  // Is een veld zichtbaar (niet verborgen door admin)?
  function isVeldZichtbaar(veldKey) {
    if (veldConfig.length === 0) return true;
    const cfg = configMap[veldKey];
    return !cfg || cfg.zichtbaar !== false;
  }

  // Dynamische verplichtenlijst: gebruik configMap als beschikbaar, anders hard-coded
  const SECTION_MAP_DYNREQ = {
    'Nieuwe vangst': 'nieuweVangst',
    'Project': 'project',
    'Ringgegevens': 'ringgegevens',
    'Vogel': 'vogel',
    'Vangst': 'vangst',
    'Locatie': 'locatie',
    'Biometrie': 'biometrieBasis',
    'Biometrie vervolg': 'biometrieVervolg',
    'Rui': 'rui',
    'Overige EURING data': 'euringOverig',
  };
  const REQUIRED_LABEL_MAP = Object.fromEntries(REQUIRED_FIELDS.map(f => [f.key, f.label]));
  const REQUIRED_SECTION_MAP = Object.fromEntries(REQUIRED_FIELDS.map(f => [f.key, f.section]));
  const PULLUS_KEYS = new Set(['pul_leeftijd', 'nauwk_pul_leeftijd', 'broedselgrootte']);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const requiredFields = useMemo(() => {
    if (veldConfig.length === 0) return REQUIRED_FIELDS;
    const result = [];
    for (const v of veldConfig) {
      const key = v.veld_key;
      if (v.verplicht === 'ja') {
        result.push({
          key,
          label: REQUIRED_LABEL_MAP[key] ?? key,
          section: REQUIRED_SECTION_MAP[key] ?? SECTION_MAP_DYNREQ[v.sectie] ?? 'nieuweVangst',
        });
      } else if (v.verplicht === 'pullus' || PULLUS_KEYS.has(key)) {
        result.push({
          key,
          label: REQUIRED_LABEL_MAP[key] ?? key,
          section: REQUIRED_SECTION_MAP[key] ?? SECTION_MAP_DYNREQ[v.sectie] ?? 'vogel',
          conditie: f => f.leeftijd === '1',
          isPullusField: true,
        });
      }
    }
    return result;
  }, [veldConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  const [form, setForm] = useState(() => editRecord
    ? { ...EMPTY_FORM, ...editRecord }
    : { ...EMPTY_FORM, ringer_initiaal: settings?.ringerInitiaal || '', ringer_nummer: settings?.ringerNummer || '' }
  );
  const [formErrors, setFormErrors] = useState([]);
  const [sections, setSections] = useState({
    nieuweVangst: true,
    project: true,
    ringgegevens: true,
    vogel: true,
    vangst: true,
    locatie: false,
    biometrieBasis: true,
    biometrieVervolg: false,
    rui: false,
    euringOverig: false,
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

  // Set van fout-keys voor rode omlijning; helper om class toe te voegen
  const errorKeys = useMemo(() => new Set(formErrors.map(f => f.key)), [formErrors]);
  const errCls = (...keys) => keys.some(k => errorKeys.has(k)) ? ' form-group--error' : '';

  // Get species overrides for selected species
  const getOverride = speciesOverrides?.getOverride;
  const soortOverride = useMemo(() => {
    if (!form.vogelnaam || !getOverride) return {};
    return getOverride(form.vogelnaam);
  }, [form.vogelnaam, getOverride]);

  // Get EURING code (soortOverride.euring_code has priority over the JSON lookup)
  const euringCode = useMemo(() => {
    if (!form.vogelnaam) return '';
    if (soortOverride?.euring_code) return soortOverride.euring_code;
    if (speciesInfo?.euring_code) return speciesInfo.euring_code;
    const key = form.vogelnaam.toLowerCase();
    return euringCodes[key] || '';
  }, [form.vogelnaam, soortOverride, speciesInfo]);

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

      // Also match on EURING code
      if (bestScore !== 0) {
        const spCode = euringCodes[sp.naam_nl?.toLowerCase()];
        if (spCode) {
          const codeScore = fuzzyMatch(query, spCode);
          if (codeScore >= 0 && (bestScore < 0 || codeScore < bestScore)) {
            bestScore = codeScore;
            bestField = 'euring_code';
          }
        }
      }

      if (bestScore >= 0) {
        results.push({
          naam_nl: sp.naam_nl,
          matchedField: bestField,
          matchedName: bestField !== 'naam_nl' && bestField !== 'euring_code' ? sp[bestField] : null,
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
    for (const f of requiredFields) {
      if (f.conditie && !f.conditie(form)) continue;
      const val = form[f.key];
      const isEmpty = f.isPullusField
        ? (val === '' || val === null || val === undefined || val === '--')
        : (val === '' || val === null || val === undefined);
      if (isEmpty) errors.push(f);
    }

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
      plaatscode: form.plaatscode,
      google_plaats: form.google_plaats,
      lat: form.lat,
      lon: form.lon,
      nauwk_coord: form.nauwk_coord,
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

  // Cloaca/geslacht mismatch waarschuwing (EURING-schaal: code 5 = cloacale protuberans = man)
  const cloacaWarning = useMemo(() => {
    const c = form.cloaca;
    const g = form.geslacht;
    if (!c || !g || c === '0' || c === '1') return null;
    if (c === '5' && g === 'F') return 'Cloacale protuberans (code 5) wijst op een man, maar het ingevoerde geslacht is vrouw';
    if (['3', '4'].includes(c) && g === 'F') return 'Sterke zwelling wijst mogelijk op een man, maar het ingevoerde geslacht is vrouw';
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
    setFormErrors(prev => prev.filter(f => f.key !== 'ringnummer'));
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
      setForm(prev => ({ ...prev, metalenringinfo: 2, centrale: 'NLA', omstandigheden: '99' }));
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

        {/* Sectie: Nieuwe vangst */}
        <div className="section">
          <div className="section-header" onClick={() => toggleSection('nieuweVangst')}>
            <h3>{editRecord ? 'Vangst wijzigen' : 'Nieuwe vangst'}</h3>
            <span className={`toggle ${sections.nieuweVangst ? 'open' : ''}`}>▾</span>
          </div>
          {sections.nieuweVangst && (
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
                    {suggestions.map(s => {
                      const code = euringCodes[s.naam_nl?.toLowerCase()] || '';
                      return (
                        <li key={s.naam_nl + (s.matchedField || '')} onClick={() => selectSpecies(s.naam_nl)}>
                          <div className="suggestion-content">
                            <span className="suggestion-name">
                              {s.naam_nl}{code && <span className="suggestion-euring"> ({code})</span>}
                            </span>
                            {s.matchedName && (
                              <span className="suggestion-sub">{s.matchedName} ({TAAL_LABELS[s.matchedField]})</span>
                            )}
                            {s.isRecent && !s.matchedName && form.vogelnaam.length < 2 && (
                              <span className="suggestion-sub">Recent gebruikt</span>
                            )}
                          </div>
                        </li>
                      );
                    })}
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
                    {euringCode && (
                      <div className="soort-info-item">
                        <span className="sii-label">EURING</span>
                        <span className="sii-value">{euringCode}</span>
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
            </div>
          )}
        </div>

        {/* Sectie: Project */}
        <div className="section">
          <div className="section-header" onClick={() => toggleSection('project')}>
            <h3>Project</h3>
            <span className={`toggle ${sections.project ? 'open' : ''}`}>▾</span>
          </div>
          {sections.project && (
            <div className="section-content">
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
              <div className="form-row-3">
                <div className={`form-group${errCls('ringer_nummer')}`}>
                  <label>Ringernr *</label>
                  <input type="text" value={form.ringer_nummer}
                    onChange={e => update('ringer_nummer', e.target.value)}
                    placeholder="bijv. 3254" />
                </div>
                <div className="form-group">
                  <label>Initiaal</label>
                  <input type="text" value={form.ringer_initiaal}
                    onChange={e => update('ringer_initiaal', e.target.value)}
                    placeholder="bijv. TtA" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sectie: Ringgegevens */}
        <div className="section">
          <div className="section-header" onClick={() => toggleSection('ringgegevens')}>
            <h3>Ringgegevens</h3>
            <span className={`toggle ${sections.ringgegevens ? 'open' : ''}`}>▾</span>
          </div>
          {sections.ringgegevens && (
            <div className="section-content">
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
                <div className={`form-group${errCls('identificatie_methode')}`}>
                  <label>Identificatiemethode *</label>
                  <select value={form.identificatie_methode} onChange={e => update('identificatie_methode', e.target.value)}>
                    {getCodesForSelect('identificatie_methode').map(o => (
                      <option key={o.code} value={o.code}>{o.code} – {o.beschrijving}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Verificatie</label>
                  <select value={form.verificatie} onChange={e => update('verificatie', Number(e.target.value))}>
                    {VERIFICATIE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className={`form-group${errCls('metalenringinfo')}`}>
                  <label>Metalen ring informatie *</label>
                  <select value={form.metalenringinfo} onChange={e => update('metalenringinfo', Number(e.target.value))}>
                    {getCodesForSelect('metalenringinfo').map(o => (
                      <option key={o.code} value={o.code}>{o.code} – {o.beschrijving}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Andere merktekens</label>
                  <select value={form.andere_merktekens} onChange={e => update('andere_merktekens', e.target.value)}>
                    {ANDERE_MERKTEKENS_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sectie: Vogel */}
        <div className="section">
          <div className="section-header" onClick={() => toggleSection('vogel')}>
            <h3>Vogel</h3>
            <span className={`toggle ${sections.vogel ? 'open' : ''}`}>▾</span>
          </div>
          {sections.vogel && (
            <div className="section-content">
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

              {/* Status, Conditie, Omstandigheden, Gemanipuleerd, Verplaatst */}
              <div className="form-row">
                <div className={`form-group${errCls('status')}`}>
                  <label>Status *</label>
                  <select value={form.status} onChange={e => update('status', e.target.value)}>
                    {getCodesForSelect('status').map(o => (
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
              <div className="form-row">
                <div className={`form-group${errCls('omstandigheden')}`}>
                  <label>Omstandigheden *</label>
                  <select value={form.omstandigheden} onChange={e => update('omstandigheden', e.target.value)}>
                    {getCodesForSelect('omstandigheden').map(o => (
                      <option key={o.code} value={o.code}>{o.code} – {o.beschrijving}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Zekerheid omstandigheden</label>
                  <select value={form.zeker_omstandigheden} onChange={e => update('zeker_omstandigheden', Number(e.target.value))}>
                    {ZEKER_OMSTANDIG_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className={`form-group${errCls('gemanipuleerd')}`}>
                  <label>Gemanipuleerd *</label>
                  <select value={form.gemanipuleerd} onChange={e => update('gemanipuleerd', e.target.value)}>
                    {getCodesForSelect('gemanipuleerd').map(o => (
                      <option key={o.code} value={o.code}>{o.code} – {o.beschrijving}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Verplaatst</label>
                  <select value={form.verplaatst} onChange={e => update('verplaatst', Number(e.target.value))}>
                    {VERPLAATST_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {form.gemanipuleerd === 'M' && (
                <div className="form-group">
                  <label>Barcode</label>
                  <input type="text" value={form.barcode}
                    onChange={e => update('barcode', e.target.value)} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sectie: Vangst */}
        <div className="section">
          <div className="section-header" onClick={() => toggleSection('vangst')}>
            <h3>Vangst</h3>
            <span className={`toggle ${sections.vangst ? 'open' : ''}`}>▾</span>
          </div>
          {sections.vangst && (
            <div className="section-content">
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
                  <label>Tijd (HHMM)</label>
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
                <div className={`form-group${errCls('vangstmethode')}`}>
                  <label>Vangstmethode *</label>
                  <select value={form.vangstmethode} onChange={e => update('vangstmethode', e.target.value)}>
                    <option value="">-- Kies --</option>
                    {getCodesForSelect('vangstmethode').map(o => (
                      <option key={o.code} value={o.code}>{o.code} – {o.beschrijving}</option>
                    ))}
                  </select>
                </div>
                <div className={`form-group${errCls('nauwk_vangstdatum')}`}>
                  <label>Nauwkeurigheid datum *</label>
                  <select value={form.nauwk_vangstdatum} onChange={e => update('nauwk_vangstdatum', Number(e.target.value))}>
                    {NAUWK_DATUM_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className={`form-group${errCls('lokmiddelen')}`}>
                  <label>Lokmiddelen *</label>
                  <select value={form.lokmiddelen} onChange={e => update('lokmiddelen', e.target.value)}>
                    {getCodesForSelect('lokmiddelen').map(o => (
                      <option key={o.code} value={o.code}>{o.code} – {o.beschrijving}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Netnummer</label>
                  <input type="text" value={form.netnummer}
                    onChange={e => update('netnummer', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Opmerkingen</label>
                <textarea rows="2" value={form.opmerkingen}
                  onChange={e => update('opmerkingen', e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* Sectie: Biometrie basis */}
        <div className="section">
          <div className="section-header" onClick={() => toggleSection('biometrieBasis')}>
            <h3>Biometrie</h3>
            {warnings.some(w => ['vleugel', 'gewicht', 'handpenlengte'].includes(w.key)) && <span className="section-badge-warn">!</span>}
            <span className={`toggle ${sections.biometrieBasis ? 'open' : ''}`}>▾</span>
          </div>
          {sections.biometrieBasis && (
            <div className="section-content">
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

        {/* Sectie: Biometrie vervolg */}
        <div className="section">
          <div className="section-header" onClick={() => toggleSection('biometrieVervolg')}>
            <h3>Biometrie vervolg</h3>
            {warnings.some(w => !['vleugel', 'gewicht', 'handpenlengte'].includes(w.key)) && <span className="section-badge-warn">!</span>}
            <span className={`toggle ${sections.biometrieVervolg ? 'open' : ''}`}>▾</span>
          </div>
          {sections.biometrieVervolg && (
            <div className="section-content">
              <div className="form-row">
                {renderBioField('tarsus_lengte', 'Tarsus (0,1 mm)')}
                <div className="form-group">
                  <label>Tarsus-teen (0,1 mm)</label>
                  <input type="text" inputMode="decimal" value={form.tarsus_teen}
                    onChange={e => update('tarsus_teen', e.target.value)} />
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
                <select value={form.nauwk_coord} onChange={e => update('nauwk_coord', e.target.value)}>
                  {NAUWK_COORD_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Sectie: Overige EURING data */}
        <div className="section">
          <div className="section-header" onClick={() => toggleSection('euringOverig')}>
            <h3>Overige EURING data</h3>
            <span className={`toggle ${sections.euringOverig ? 'open' : ''}`}>▾</span>
          </div>
          {sections.euringOverig && (
            <div className="section-content">
              <div className="form-group">
                <label>Opmerkingen 1</label>
                <input type="text" value={form.opmerkingen1}
                  onChange={e => update('opmerkingen1', e.target.value)} />
              </div>
            </div>
          )}
        </div>

      </form>
    </div>
  );
}
