import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { loadFromStorage } from '../../utils/storage';
import { toVangstRow } from '../../utils/supabase-helpers';
import './MigrationBanner.css';

const CHUNK_SIZE = 100;

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export default function MigrationBanner({ onComplete }) {
  const { user } = useAuth();
  const [status, setStatus] = useState('checking'); // checking | needed | migrating | done | dismissed
  const [counts, setCounts] = useState({ records: 0, projects: 0, ringstrengen: 0 });
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    checkMigrationNeeded();
  }, [user]);

  async function checkMigrationNeeded() {
    // Al gemigreerd voor deze gebruiker?
    const migratedKey = `vrs-migrated-${user.id}`;
    if (localStorage.getItem(migratedKey)) {
      setStatus('done');
      return;
    }

    // Check of Supabase al data heeft
    const { count } = await supabase
      .from('vangsten')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (count > 0) {
      // Supabase heeft al data, geen migratie nodig
      localStorage.setItem(migratedKey, 'true');
      setStatus('done');
      return;
    }

    // Check of localStorage zinvolle data bevat
    const records = loadFromStorage('vrs-records', []);
    const projects = loadFromStorage('vrs-projects', []);
    const ringStrengen = loadFromStorage('vrs-ringstreng', []);

    const localRecords = records.filter(r => r.bron !== 'griel_import' || records.length < 10);

    if (records.length === 0 && projects.length === 0) {
      localStorage.setItem(migratedKey, 'true');
      setStatus('done');
      return;
    }

    setCounts({ records: records.length, projects: projects.length, ringstrengen: ringStrengen.length });
    setStatus('needed');
  }

  async function startMigration() {
    setStatus('migrating');
    setError('');
    try {
      const records = loadFromStorage('vrs-records', []);
      const projects = loadFromStorage('vrs-projects', []);
      const ringStrengen = loadFromStorage('vrs-ringstreng', []);
      const overrides = loadFromStorage('vrs-species-overrides', {});
      const settings = loadFromStorage('vrs-settings', {});

      // 1. Vangsten (in chunks van 100)
      if (records.length > 0) {
        setProgress(`Vangsten uploaden (${records.length})...`);
        const rows = records.map(r => toVangstRow(r, user.id));
        for (const chunk of chunkArray(rows, CHUNK_SIZE)) {
          const { error: err } = await supabase.from('vangsten').upsert(chunk);
          if (err) throw err;
        }
      }

      // 2. Projecten
      if (projects.length > 0) {
        setProgress(`Projecten uploaden (${projects.length})...`);
        const rows = projects.map(p => ({
          id: p.id,
          user_id: user.id,
          naam: p.naam,
          locatie: p.locatie || '',
          nummer: p.nummer || '',
          actief: p.actief !== false,
          updated_at: new Date().toISOString(),
        }));
        const { error: err } = await supabase.from('projecten').upsert(rows);
        if (err) throw err;
      }

      // 3. Ringstrengen
      if (ringStrengen.length > 0) {
        setProgress(`Ringstrengen uploaden (${ringStrengen.length})...`);
        const rows = ringStrengen.map(r => ({
          id: r.id,
          user_id: user.id,
          data: r,
          updated_at: new Date().toISOString(),
        }));
        const { error: err } = await supabase.from('ringstrengen').upsert(rows);
        if (err) throw err;
      }

      // 4. Soortenoverschrijvingen
      const overrideEntries = Object.entries(overrides);
      if (overrideEntries.length > 0) {
        setProgress(`Soortenoverschrijvingen uploaden...`);
        const rows = overrideEntries.map(([soort_naam, data]) => ({
          user_id: user.id,
          soort_naam,
          data,
          updated_at: new Date().toISOString(),
        }));
        const { error: err } = await supabase
          .from('species_overrides')
          .upsert(rows, { onConflict: 'user_id,soort_naam' });
        if (err) throw err;
      }

      // 5. Profielinstellingen
      if (settings.ringerNaam || settings.ringerNummer) {
        setProgress('Profielinstellingen opslaan...');
        await supabase.from('profiles').update({
          ringer_naam: settings.ringerNaam || '',
          ringer_initiaal: settings.ringerInitiaal || '',
          ringer_nummer: settings.ringerNummer || '',
          hulp_modus: settings.hulpModus || 'uitgebreid',
          updated_at: new Date().toISOString(),
        }).eq('id', user.id);
      }

      // Markeer als gemigreerd
      localStorage.setItem(`vrs-migrated-${user.id}`, 'true');
      setStatus('success');
      setProgress('');
      onComplete?.();
      // Verberg succesmelding na 5 seconden
      setTimeout(() => setStatus('done'), 5000);
    } catch (err) {
      setError(`Migratie mislukt: ${err.message}`);
      setStatus('needed');
      setProgress('');
    }
  }

  if (status === 'checking' || status === 'done') return null;
  if (status === 'dismissed') return null;

  if (status === 'success') {
    return (
      <div className="migration-banner migration-banner--success">
        <span className="migration-success-icon">✓</span>
        <span>
          Migratie geslaagd — {counts.records} vangsten, {counts.projects} projecten
          {counts.ringstrengen > 0 ? `, ${counts.ringstrengen} ringstrengen` : ''} staan nu in de cloud.
        </span>
      </div>
    );
  }

  return (
    <div className="migration-banner">
      {status === 'needed' && (
        <>
          <div className="migration-banner__info">
            <strong>Lokale data gevonden</strong>
            <span>
              {counts.records} vangsten, {counts.projects} projecten
              {counts.ringstrengen > 0 ? `, ${counts.ringstrengen} ringstrengen` : ''}
              {' '}staan nog alleen lokaal. Zet ze over naar de cloud zodat je ze overal kunt gebruiken.
            </span>
          </div>
          <div className="migration-banner__actions">
            <button className="migration-banner__btn-primary" onClick={startMigration}>
              Migreer naar cloud
            </button>
            <button
              className="migration-banner__btn-dismiss"
              onClick={() => setStatus('dismissed')}
            >
              Later
            </button>
          </div>
        </>
      )}

      {status === 'migrating' && (
        <div className="migration-banner__progress">
          <div className="migration-spinner" />
          <span>{progress || 'Bezig met migreren...'}</span>
        </div>
      )}

      {error && (
        <div className="migration-banner__error">{error}</div>
      )}
    </div>
  );
}
