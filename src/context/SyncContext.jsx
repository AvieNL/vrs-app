import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import { pullSpeciesIfNeeded } from '../hooks/useSpeciesRef';
import { pullSpeciesOverrides } from '../hooks/useSpeciesOverrides';
import { pullVeldConfigIfNeeded } from '../hooks/useVeldConfig';

const SyncContext = createContext(null);

const MAX_ATTEMPTS = 5;

export function SyncProvider({ children }) {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSynced, setLastSynced] = useState(null);
  const [syncError, setSyncError] = useState('');
  const syncingRef = useRef(false);

  // Online/offline detectie
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Bij (her)inloggen: pending count ophalen en wachtrij verwerken
  useEffect(() => {
    if (!user) {
      setPendingCount(0);
      return;
    }
    refreshPendingCount();
    if (navigator.onLine) processQueue();
  }, [user]);  // eslint-disable-line react-hooks/exhaustive-deps

  // App wordt weer actief (bijv. terugkomen van achtergrond): sync uitvoeren
  useEffect(() => {
    function handleVisibility() {
      if (!document.hidden && navigator.onLine && user) {
        processQueue();
        pullSpeciesOverrides(user.id).catch(e => console.warn('Override pull mislukt:', e.message));
        pullSpeciesIfNeeded(false).catch(e => console.warn('Species pull mislukt:', e.message));
        pullVeldConfigIfNeeded(false).catch(e => console.warn('VeldConfig pull mislukt:', e.message));
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user]);  // eslint-disable-line react-hooks/exhaustive-deps

  async function refreshPendingCount() {
    const count = await db.sync_queue.count();
    setPendingCount(count);
  }

  /**
   * Voeg een mutatie toe aan de sync-wachtrij.
   * Wordt direct verwerkt als er internet is.
   */
  const addToQueue = useCallback(async (tableName, operation, data) => {
    await db.sync_queue.add({
      table_name: tableName,
      operation,       // 'upsert' | 'delete' | 'batch_upsert'
      data,
      createdAt: new Date().toISOString(),
      attempts: 0,
    });
    await refreshPendingCount();

    // Direct proberen als online
    if (navigator.onLine && user && !syncingRef.current) {
      processQueue();
    }
  }, [user]);  // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Verwerk de sync-wachtrij: verstuur pending mutaties naar Supabase.
   */
  const processQueue = useCallback(async () => {
    if (!user || syncingRef.current || !navigator.onLine) return;

    const pending = await db.sync_queue.orderBy('id').toArray();
    const speciesCount = await db.species.count();

    // Pull species basisdata als de cache leeg is (ongeacht queue)
    if (speciesCount === 0) {
      pullSpeciesIfNeeded(false).catch(e => console.warn('Species pull mislukt:', e.message));
    }

    if (pending.length === 0) return;

    syncingRef.current = true;
    setSyncing(true);
    setSyncError('');

    let hasErrors = false;

    for (const item of pending) {
      if (item.attempts >= MAX_ATTEMPTS) continue;

      try {
        await executeQueueItem(item, user.id);
        await db.sync_queue.delete(item.id);
      } catch (err) {
        hasErrors = true;
        await db.sync_queue.update(item.id, {
          attempts: (item.attempts || 0) + 1,
          lastError: err.message,
        });
        console.warn(`Sync mislukt (poging ${item.attempts + 1}/${MAX_ATTEMPTS}):`, err.message);
      }
    }

    await refreshPendingCount();
    syncingRef.current = false;
    setSyncing(false);

    if (!hasErrors) {
      setLastSynced(new Date());
      setSyncError('');
      if (user) {
        pullSpeciesOverrides(user.id).catch(e => console.warn('Override pull mislukt:', e.message));
      }
    } else {
      const stillPending = await db.sync_queue.count();
      if (stillPending > 0) {
        setSyncError('Synchronisatie gedeeltelijk mislukt. Wordt opnieuw geprobeerd.');
      }
    }
  }, [user]);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SyncContext.Provider value={{
      pendingCount,
      syncing,
      isOnline,
      lastSynced,
      syncError,
      addToQueue,
      processQueue,
      refreshPendingCount,
    }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync moet binnen een SyncProvider worden gebruikt');
  return ctx;
}

// --- Interne helper: voert één queue-item uit tegen Supabase ---

async function executeQueueItem(item, userId) {
  const { table_name, operation, data } = item;

  if (operation === 'upsert') {
    const { error } = await supabase.from(table_name).upsert(data);
    if (error) throw error;

  } else if (operation === 'delete') {
    const { error } = await supabase
      .from(table_name)
      .delete()
      .eq('id', data.id)
      .eq('user_id', userId);
    if (error) throw error;

  } else if (operation === 'batch_upsert') {
    // data is een array van rows
    const rows = data;
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await supabase.from(table_name).upsert(rows.slice(i, i + 100));
      if (error) throw error;
    }

  } else if (operation === 'species_override_upsert') {
    const { error } = await supabase
      .from('species_overrides')
      .upsert(data, { onConflict: 'user_id,soort_naam' });
    if (error) throw error;

  } else if (operation === 'species_override_delete') {
    const { error } = await supabase
      .from('species_overrides')
      .delete()
      .eq('user_id', data.user_id)
      .eq('soort_naam', data.soort_naam);
    if (error) throw error;

  } else if (operation === 'profile_update') {
    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', userId);
    if (error) throw error;

  } else if (operation === 'mark_uploaded') {
    const { error } = await supabase
      .from('vangsten')
      .update({ uploaded: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('id', data.ids);
    if (error) throw error;

  } else if (operation === 'soft_delete') {
    const { error } = await supabase
      .from('vangsten')
      .update({ deleted_at: data.deleted_at, updated_at: new Date().toISOString() })
      .eq('id', data.id)
      .eq('user_id', userId);
    if (error) throw error;

  } else if (operation === 'restore') {
    const { error } = await supabase
      .from('vangsten')
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq('id', data.id)
      .eq('user_id', userId);
    if (error) throw error;
  }
}
