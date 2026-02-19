import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';

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
    pullFromSupabase();
  }, [user?.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  async function pullFromSupabase() {
    const localCount = await db.species_overrides.where('user_id').equals(user.id).count();
    if (localCount > 0) return; // Dexie heeft al data, geen pull nodig

    const { data, error } = await supabase
      .from('species_overrides')
      .select('*')
      .eq('user_id', user.id);

    if (error || !data || data.length === 0) return;

    const rows = data.map(r => ({
      user_id: user.id,
      soort_naam: r.soort_naam,
      data: r.data,
    }));
    await db.species_overrides.bulkPut(rows);
  }

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
