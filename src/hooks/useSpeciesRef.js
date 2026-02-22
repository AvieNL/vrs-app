import { useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';

const PULL_INTERVAL_MS = 60 * 60 * 1000; // 1 uur

// Module-level vlag zodat gelijktijdige hook-instanties niet tegelijk pullen
let _pulling = false;

/**
 * Geeft alle soorten terug uit de lokale Dexie-cache (offline-first).
 * Pull van Supabase als de cache leeg is of ouder dan 24 uur.
 */
export function useSpeciesRef() {
  const pulledRef = useRef(false);

  const species = useLiveQuery(
    () => db.species.toArray(),
    [],
    []
  ) ?? [];

  useEffect(() => {
    if (pulledRef.current) return;
    pulledRef.current = true;
    pullIfNeeded();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return species;
}

/**
 * Controleert of een Supabase-pull nodig is en voert deze uit.
 * Exporteerbaar zodat SyncContext dit ook kan aanroepen.
 */
export async function pullSpeciesIfNeeded(force = false) {
  if (_pulling) return;
  _pulling = true;
  try {
    if (!force) {
      const count = await db.species.count();
      if (count > 0) {
        const meta = await db.meta.get('species_last_pull');
        if (meta) {
          const age = Date.now() - new Date(meta.value).getTime();
          if (age < PULL_INTERVAL_MS) return; // Nog niet verlopen
        }
      }
    }

    const { data, error } = await supabase
      .from('species')
      .select('naam_nl, data');

    if (error || !data || data.length === 0) return;

    // data.map(r => r.data) geeft het volledige soortobject incl. naam_nl
    const rows = data.map(r => r.data);
    await db.species.bulkPut(rows);

    // Verwijder lokale soorten die op een ander apparaat zijn gewist
    const supabaseNames = new Set(data.map(r => r.data?.naam_nl).filter(Boolean));
    const localAll = await db.species.toArray();
    const toDelete = localAll.filter(r => !supabaseNames.has(r.naam_nl)).map(r => r.naam_nl);
    if (toDelete.length > 0) await db.species.bulkDelete(toDelete);

    await db.meta.put({ key: 'species_last_pull', value: new Date().toISOString() });
  } finally {
    _pulling = false;
  }
}

async function pullIfNeeded() {
  await pullSpeciesIfNeeded(false);
}
