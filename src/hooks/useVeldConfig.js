import { useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';

const PULL_INTERVAL_MS = 60 * 60 * 1000; // 1 uur

// Module-level vlag zodat gelijktijdige hook-instanties niet tegelijk pullen
let _pulling = false;

/**
 * Geeft de volledige veldconfiguratie terug uit de lokale Dexie-cache (offline-first).
 * Pull van Supabase als de cache leeg is of ouder dan 1 uur.
 */
export function useVeldConfig() {
  const pulledRef = useRef(false);

  const config = useLiveQuery(
    () => db.veld_config.toArray().then(rows =>
      rows.sort((a, b) => (a.volgorde ?? 0) - (b.volgorde ?? 0))
    ),
    [],
    []
  ) ?? [];

  useEffect(() => {
    if (pulledRef.current) return;
    pulledRef.current = true;
    pullVeldConfigIfNeeded(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return config;
}

/**
 * Controleert of een Supabase-pull nodig is en voert deze uit.
 * Exporteerbaar zodat SyncContext dit ook kan aanroepen.
 */
export async function pullVeldConfigIfNeeded(force = false) {
  if (_pulling || !navigator.onLine) return;
  _pulling = true;
  try {
    if (!force) {
      const count = await db.veld_config.count();
      if (count > 0) {
        const meta = await db.meta.get('veld_config_last_pull');
        if (meta) {
          const age = Date.now() - new Date(meta.value).getTime();
          if (age < PULL_INTERVAL_MS) return;
        }
      }
    }

    const { data, error } = await supabase
      .from('veld_config')
      .select('*')
      .order('volgorde');

    if (error || !data || data.length === 0) return;

    await db.veld_config.bulkPut(data);
    await db.meta.put({ key: 'veld_config_last_pull', value: new Date().toISOString() });
  } finally {
    _pulling = false;
  }
}
