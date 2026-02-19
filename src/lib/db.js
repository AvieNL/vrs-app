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
  // Primaire sleutel als eerste veld; overige velden zijn indices voor querying.
  // Niet alle record-velden hoeven hier: IndexedDB slaat het volledige object op.
  vangsten:          'id, user_id, [user_id+timestamp], vogelnaam, vangstdatum, project, uploaded, bron',
  projecten:         'id, user_id, naam',
  ringstrengen:      'id, user_id',
  species_overrides: '[user_id+soort_naam], user_id, soort_naam',

  // Sync-wachtrij: ++ = auto-increment primaire sleutel
  sync_queue: '++id, table_name, createdAt, attempts',

  // Metadata (bijv. laatste sync-tijdstip)
  meta: 'key',
});
