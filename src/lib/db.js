import Dexie from 'dexie';

/**
 * Lokale IndexedDB database via Dexie.js.
 * Dient als offline-first cache en buffer voor Supabase-synchronisatie.
 *
 * Versiebeheer: verhoog het versienummer + voeg een nieuwe .stores() definitie toe
 * als je het schema uitbreidt. Verander NOOIT bestaande versies.
 */
export const db = new Dexie('vrs-app');

db.version(1).stores({
  vangsten:          'id, user_id, [user_id+timestamp], vogelnaam, vangstdatum, project, uploaded, bron',
  projecten:         'id, user_id, naam',
  ringstrengen:      'id, user_id',
  species_overrides: '[user_id+soort_naam], user_id, soort_naam',
  sync_queue: '++id, table_name, createdAt, attempts',
  meta: 'key',
});

// Versie 2: deleted_at index voor soft delete van vangsten
db.version(2).stores({
  vangsten: 'id, user_id, [user_id+timestamp], vogelnaam, vangstdatum, project, uploaded, bron, deleted_at',
});

// Versie 3: offline-cache voor soortbasisdata (580 soorten, gevuld vanuit Supabase)
db.version(3).stores({
  species: 'naam_nl',
});
