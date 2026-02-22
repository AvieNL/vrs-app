import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';

// Module-level vlag zodat gelijktijdige aanroepen niet overlappen
let _pulling = false;

/**
 * Pull alle species overrides van Supabase naar de lokale Dexie-cache.
 * Verwijdert ook lokale rijen die op een ander apparaat zijn gewist.
 * Exporteerbaar zodat SyncContext dit ook kan aanroepen.
 */
export async function pullSpeciesOverrides(userId) {
  if (_pulling || !navigator.onLine) return;
  _pulling = true;
  try {
    const { data, error } = await supabase
      .from('species_overrides')
      .select('*')
      .eq('user_id', userId);
    if (error || !data) return;

    // Upsert alle Supabase-rijen lokaal
    const rows = data.map(r => ({ user_id: userId, soort_naam: r.soort_naam, data: r.data }));
    if (rows.length > 0) await db.species_overrides.bulkPut(rows);

    // Verwijder lokale rijen die op een ander apparaat zijn gewist
    const supabaseNames = new Set(data.map(r => r.soort_naam));
    const localAll = await db.species_overrides.where('user_id').equals(userId).toArray();
    const toDelete = localAll
      .filter(r => !supabaseNames.has(r.soort_naam))
      .map(r => [userId, r.soort_naam]);
    if (toDelete.length > 0) await db.species_overrides.bulkDelete(toDelete);
  } finally {
    _pulling = false;
  }
}

export function useSpeciesOverrides() {
  const { user } = useAuth();
  const { addToQueue } = useSync();
  const pulledRef = useRef(false);

  // Reactieve array van overrides uit Dexie
  const overridesArray = useLiveQuery(
    () => {
      if (!user) return [];
      return db.species_overrides.where('user_id').equals(user.id).toArray();
    },
    [user?.id],
    []
  ) ?? [];

  // Converteer array naar dictionary voor de bestaande API
  const overrides = useMemo(() => {
    const dict = {};
    overridesArray.forEach(row => { dict[row.soort_naam] = row.data; });
    return dict;
  }, [overridesArray]);

  useEffect(() => {
    if (!user) {
      pulledRef.current = false;
      return;
    }
    if (pulledRef.current) return;
    pulledRef.current = true;
    pullSpeciesOverrides(user.id).catch(e => console.warn('Override pull mislukt:', e.message));
  }, [user?.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  const getOverride = useCallback((naam) => {
    return overrides[naam] || {};
  }, [overrides]);

  const saveOverride = useCallback((naam, data) => {
    if (!user) return;
    const existing = overrides[naam] || {};
    const newData = { ...existing, ...data };

    db.species_overrides.put({
      user_id: user.id,
      soort_naam: naam,
      data: newData,
    });

    addToQueue('species_overrides', 'species_override_upsert', {
      user_id: user.id,
      soort_naam: naam,
      data: newData,
      updated_at: new Date().toISOString(),
    });
  }, [user, overrides, addToQueue]);

  const getMerged = useCallback((naam, defaultSoort) => {
    const override = overrides[naam] || {};
    const mergedBoeken = defaultSoort.boeken || override.boeken
      ? { ...(defaultSoort.boeken || {}), ...(override.boeken || {}) }
      : undefined;
    return {
      ...defaultSoort,
      ...override,
      ...(mergedBoeken ? { boeken: mergedBoeken } : {})
    };
  }, [overrides]);

  const resetOverride = useCallback(async (naam) => {
    if (!user) return;
    await db.species_overrides.delete([user.id, naam]);
    addToQueue('species_overrides', 'species_override_delete', {
      user_id: user.id,
      soort_naam: naam,
    });
  }, [user, addToQueue]);

  return { getOverride, saveOverride, getMerged, resetOverride };
}
