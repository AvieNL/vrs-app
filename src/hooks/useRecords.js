import { useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { generateId } from '../utils/storage';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';
import { toVangstRow, fromVangstRow } from '../utils/supabase-helpers';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';

function migrateUploaded(record) {
  if (record.uploaded !== undefined) return record;
  return { ...record, uploaded: record.bron === 'griel_import' };
}

export function useRecords() {
  const { user } = useAuth();
  const { addToQueue } = useSync();
  const pulledRef = useRef(false);

  // Reactieve query vanuit Dexie — werkt automatisch bij, ook offline.
  const records = useLiveQuery(
    () => {
      if (!user) return [];
      return db.vangsten
        .orderBy('[user_id+timestamp]')
        .reverse()
        .filter(r => r.user_id === user.id)
        .toArray();
    },
    [user?.id],
    []
  ) ?? [];

  // Bij (her)inloggen: pull data van Supabase naar Dexie
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
    const localCount = await db.vangsten
      .where('user_id').equals(user.id).count();

    // Bepaal vanaf wanneer we moeten ophalen
    const meta = await db.meta.get(`last_pull_vangsten_${user.id}`);
    const lastPull = meta?.value;

    let query = supabase
      .from('vangsten')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (localCount > 0 && lastPull) {
      // Incrementele sync: alleen wat nieuwer is dan laatste pull
      query = query.gt('updated_at', lastPull);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Pull vangsten mislukt:', error.message);
      return;
    }
    if (!data || data.length === 0) return;

    const rows = data.map(r => ({ ...fromVangstRow(r), user_id: user.id }))
                     .map(migrateUploaded);
    await db.vangsten.bulkPut(rows);
    await db.meta.put({
      key: `last_pull_vangsten_${user.id}`,
      value: new Date().toISOString(),
    });
  }

  // --- Mutaties ---

  function addRecord(record) {
    if (!user) return null;
    const newRecord = {
      ...record,
      id: generateId(),
      timestamp: new Date().toISOString(),
      bron: 'app',
      uploaded: false,
      user_id: user.id,
    };
    db.vangsten.put(newRecord);
    addToQueue('vangsten', 'upsert', toVangstRow(newRecord, user.id));
    return newRecord;
  }

  function updateRecord(id, updates) {
    db.vangsten.get(id).then(existing => {
      if (!existing) return;
      const updated = { ...existing, ...updates };
      db.vangsten.put(updated);
      addToQueue('vangsten', 'upsert', toVangstRow(updated, user.id));
    });
  }

  function deleteRecord(id) {
    db.vangsten.delete(id);
    addToQueue('vangsten', 'delete', { id, user_id: user.id });
  }

  function markAsUploaded(ids) {
    db.vangsten.where('id').anyOf(ids).modify({ uploaded: true });
    addToQueue('vangsten', 'mark_uploaded', { ids });
  }

  function markAllAsUploaded() {
    db.vangsten
      .where('user_id').equals(user.id)
      .and(r => !r.uploaded)
      .primaryKeys()
      .then(ids => {
        if (ids.length === 0) return;
        db.vangsten.where('id').anyOf(ids).modify({ uploaded: true });
        addToQueue('vangsten', 'mark_uploaded', { ids });
      });
  }

  function importRecords(newRecords) {
    if (!user) return 0;
    const withIds = newRecords.map(r => ({
      ...r,
      id: r.id || generateId(),
      timestamp: r.timestamp || new Date().toISOString(),
      bron: r.bron || 'import',
      uploaded: r.uploaded ?? true,
      user_id: user.id,
    }));
    db.vangsten.bulkPut(withIds);
    addToQueue('vangsten', 'batch_upsert', withIds.map(r => toVangstRow(r, user.id)));
    return withIds.length;
  }

  function renameProject(oldName, newName) {
    db.vangsten
      .where('user_id').equals(user.id)
      .and(r => r.project === oldName)
      .toArray()
      .then(affected => {
        if (affected.length === 0) return;
        const updated = affected.map(r => ({ ...r, project: newName }));
        db.vangsten.bulkPut(updated);
        addToQueue('vangsten', 'batch_upsert', updated.map(r => toVangstRow(r, user.id)));
      });
  }

  return {
    records,
    addRecord,
    updateRecord,
    deleteRecord,
    markAsUploaded,
    markAllAsUploaded,
    importRecords,
    renameProject,
  };
}
