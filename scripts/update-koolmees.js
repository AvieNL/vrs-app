/**
 * Genereert SQL om Koolmees-soortdata in Supabase bij te werken.
 * Run: node scripts/update-koolmees.js > supabase-koolmees-update.sql
 * Voer het gegenereerde SQL-bestand uit in de Supabase SQL Editor.
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Nieuw in te vullen data ────────────────────────────────────────────────
// Bron: Demongin (2020), subspecies major (Nederland/Eurasia)

const nieuweData = {

  // ── Geslachtsbepaling ─────────────────────────────────────────────────────
  geslachts_notities_m:
`Kruin en keel helder blauwzwart. Zwarte middenstreep op de buik helder en breed; vormt een brede zwarte vlek op de buik tussen de poten (bij eerstejaars soms met witte randen).

Handpennen (PC): rand blauwgrijs. Alleen als eerstejaars ♂ scoren als rand duidelijk blauw is — niet bij groenachtige, grijsachtige of bruinachtige rand zonder blauw.

Praktisch: staart met meer dan 6 zwarte pennen → man.`,

  geslachts_notities_f:
`Zwarte kleur doffer, met name op kin en bovenkeel. Middenstreep op de buik dof zwartgrijs, smal op de borst, soms onderbroken. Buikvlek klein, vermengd met witte veren. Kruin soms wel wat donkerder. Handpennen (PC) iets minder blauw; rand soms lichtgroenachtig getint.

Let op: beoordeel de buikvlek vóór het blazen van de veren (bijv. voor vetscore of borstspier). Soms lastig te beoordelen door variabele kleuring, met name uit Oost-Europa.

Praktisch: staartlengte < 58 mm bij adult → vrouw.`,

  // ── Leeftijdsbepaling najaar ───────────────────────────────────────────────
  leeftijds_notities_nj:
`EERSTEJAARS (1KJ / 3J):
• Handpennen (PC) gepunter; buitenvlag dof blauwgroenachtig grijs.
• Duidelijk contrast PC vs. grote armdekveren (GC). Contrast duidelijker bij ♂ dan bij ♀.
• Alula 2 (middelste alula-pen) vaak duidelijk bleker dan verruide alula 1. Alula 3 altijd donker.
• Soms: juv. buitenste GC zonder blauw (grijze kern) contrasteert met verruide binnenste GC.
• Tertials (TF) en staartpennen meer versleten dan bij adult; soms zichtbaar contrast met verse verruide TF/T.
• PC meer gepunt. Iris donkerbruin, in najaar vaak met doffe grijsachtige tint.
• Juveniele vogels (pas uit het nest): wangen bleekgeel, niet omringd door zwart; kruin dof zwart; onderzijde dof geel, middenstreep onduidelijk.

Pneumatisatie: betrouwbaar tot eind september; bruikbaar tot eind oktober, soms tot december.

ADULT (2KJ+ / 4J):
• PC en alula vrijwel dezelfde blauwtint als GC en MC: geen of nauwelijks contrast.
• Soms alleen smalle blauwachtige rand op PC — dof uiterlijk dat op eerstejaars kan lijken, met name bij ♀.
• Geen rui-limiet in GC, alula, T of TF.
• PC meer afgerond. Iris helder bruin met roodachtige tint.
• Uitzonderlijk: een klein beetje geel op de wangen.

RUITYPE B — Juvenile rui (gedeeltelijk): eind juni–juli t/m september.
Omvat: lichaamsveren, alle kleine en middelste armdekveren (IC + MC), 4–10 grote armdekveren (GC; gewoonlijk alle), CC, alula, tertials en tertiaaldekveren (TF); uitzonderlijk 1–2 binnenste slagpennen (S) en 1–5 binnenste handpennen (PC).
Adult rui (volledig): midden mei–juli t/m eind juli–midden oktober.`,

  // ── Leeftijdsbepaling voorjaar ────────────────────────────────────────────
  leeftijds_notities_vj:
`Dezelfde criteria als in het najaar zijn toepasbaar tot in het voorjaar of zelfs de zomer. Slijtage van de grote armdekveren (GC) is relatief gering. Slijtage kan het contrast tussen handpennen (PC) en GC zelfs duidelijker zichtbaar maken.`,

  // ── Biometrie — subspecies major (Nederland/Eurasia) — bron: Demongin 2020 ─
  // Algemeen (beide geslachten)
  bio_vleugel_min:        '69',
  bio_vleugel_max:        '82',
  bio_staartlengte_min:   '58',
  bio_staartlengte_max:   '80',
  bio_tarsus_lengte_min:  '18.2',
  bio_tarsus_lengte_max:  '22.2',
  bio_gewicht_min:        '14',
  bio_gewicht_max:        '22',

  // ♂ Man
  bio_vleugel_M_min:       '73',
  bio_vleugel_M_max:       '81',
  bio_staartlengte_M_min:  '68',
  bio_staartlengte_M_max:  '80',
  bio_tarsus_lengte_M_min: '19.4',
  bio_tarsus_lengte_M_max: '22.2',

  // ♀ Vrouw
  bio_vleugel_F_min:       '69',
  bio_vleugel_F_max:       '78',
  bio_staartlengte_F_min:  '58',
  bio_staartlengte_F_max:  '72',
  bio_tarsus_lengte_F_min: '18.2',
  bio_tarsus_lengte_F_max: '20.9',
};

// ─── SQL genereren ──────────────────────────────────────────────────────────

const jsonPayload = JSON.stringify(nieuweData, null, 2);

const sql = `-- Update Koolmees soortdata
-- Bron: Demongin (2020) – subspecies major
-- Uitvoeren in Supabase SQL Editor (omzeilt RLS als superuser)
-- Bestaande velden worden NIET overschreven door de || merge-operator,
-- tenzij ze ook in dit object staan.

UPDATE public.species
SET data = data || $koolmees$
${jsonPayload}
$koolmees$::jsonb
WHERE naam_nl = 'Koolmees';

-- Bevestiging: toon bijgewerkte velden
SELECT
  naam_nl,
  data->>'geslachts_notities_m'  AS geslacht_m,
  data->>'leeftijds_notities_nj' AS leeftijd_nj,
  data->>'bio_vleugel_M_min'     AS vlg_m_min,
  data->>'bio_vleugel_M_max'     AS vlg_m_max,
  data->>'bio_vleugel_F_min'     AS vlg_f_min,
  data->>'bio_vleugel_F_max'     AS vlg_f_max
FROM public.species
WHERE naam_nl = 'Koolmees';
`;

const outputPath = join(__dirname, '..', 'supabase-koolmees-update.sql');
writeFileSync(outputPath, sql, 'utf8');
console.log(`SQL geschreven naar: supabase-koolmees-update.sql`);
console.log(`Voer dit uit in de Supabase SQL Editor van je project.`);
