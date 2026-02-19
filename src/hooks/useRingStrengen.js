import { useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';

export function useRingStrengen() {
  const { user } = useAuth();
  const { addToQueue } = useSync();
  const pulledRef = useRef(false);

  const ringStrengen = useLiveQuery(
    () => {
      if (!user) return [];
      return db.ringstrengen.where('user_id').equals(user.id).toArray();
    },
    [user?.id],
    []
  ) ?? [];

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
    const localCount = await db.ringstrengen.where('user_id').equals(user.id).count();
    const meta = await db.meta.get(`last_pull_ringstrengen_${user.id}`);
    const lastPull = meta?.value;

    let query = supabase.from('ringstrengen').select('*').eq('user_id', user.id);
    if (localCount > 0 && lastPull) {
      query = query.gt('updated_at', lastPull);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) return;

    const rows = data.map(r => ({ ...r.data, id: r.id, user_id: user.id }));
    await db.ringstrengen.bulkPut(rows);
    await db.meta.put({
      key: `last_pull_ringstrengen_${user.id}`,
      value: new Date().toISOString(),
    });
  }

  function toRingstrengRow(streng) {
    return {
      id: streng.id,
      user_id: user.id,
      data: streng,
      updated_at: new Date().toISOString(),
    };
  }

  function addRingstreng(data) {
    if (!user) return;
    const id = Date.now().toString();
    const streng = { id, ...data, huidige: data.huidige || data.van, user_id: user.id };
    db.ringstrengen.put(streng);
    addToQueue('ringstrengen', 'upsert', toRingstrengRow(streng));
  }

  function updateRingstreng(id, updates) {
    db.ringstrengen.get(id).then(existing => {
      if (!existing) return;
      const updated = { ...existing, ...updates };
      db.ringstrengen.put(updated);
      addToQueue('ringstrengen', 'upsert', toRingstrengRow(updated));
    });
  }

  function deleteRingstreng(id) {
    db.ringstrengen.delete(id);
    addToQueue('ringstrengen', 'delete', { id, user_id: user.id });
  }

  function advanceHuidige(id) {
    db.ringstrengen.get(id).then(r => {
      if (!r) return;
      const m = r.huidige.replace(/\./g, '').match(/^([A-Za-z]*)(\d+)([A-Za-z]*)$/);
      if (!m) return;
      const [, prefix, digits, suffix] = m;
      const next = String(parseInt(digits, 10) + 1).padStart(digits.length, '0');
      const nextFull = prefix + next + suffix;
      if (nextFull > r.tot) return;
      const updated = { ...r, huidige: nextFull };
      db.ringstrengen.put(updated);
      addToQueue('ringstrengen', 'upsert', toRingstrengRow(updated));
    });
  }

  return { ringStrengen, addRingstreng, updateRingstreng, deleteRingstreng, advanceHuidige };
}
