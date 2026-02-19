#!/usr/bin/env node
/**
 * Genereert supabase-species-data.sql vanuit species-reference.json.
 * Gebruik: node scripts/generate-species-sql.js
 *
 * Stappen:
 *   1. node scripts/generate-species-sql.js
 *   2. Voer supabase-species-data.sql uit in Supabase SQL Editor
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const inputPath  = join(__dirname, '../src/data/species-reference.json');
const outputPath = join(__dirname, '../supabase-species-data.sql');

const species = JSON.parse(readFileSync(inputPath, 'utf8'));

/**
 * Escapes een JavaScript-string voor gebruik in een PostgreSQL E'...' literal.
 */
function pgStr(str) {
  if (str === null || str === undefined) return 'NULL';
  const escaped = String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
  return `E'${escaped}'`;
}

const lines = [
  '-- Gegenereerd door scripts/generate-species-sql.js',
  '-- Voer uit in Supabase SQL Editor ná supabase-species.sql',
  '',
];

let count = 0;
for (const soort of species) {
  // Sla header-rijen over (geen echte soorten)
  if (!soort.naam_nl || soort.naam_nl.includes('groene tekst')) continue;

  const naam    = pgStr(soort.naam_nl);
  const dataStr = pgStr(JSON.stringify(soort));

  lines.push(
    `INSERT INTO public.species (naam_nl, data) VALUES (${naam}, ${dataStr}::jsonb)` +
    ` ON CONFLICT (naam_nl) DO UPDATE SET data = EXCLUDED.data;`
  );
  count++;
}

writeFileSync(outputPath, lines.join('\n') + '\n');
console.log(`Geschreven: ${outputPath} (${count} soorten)`);
