import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import './DatabasesPage.css';

// ── Dexie schema (afgeleid uit db.js) ────────────────────────────────────────
const DEXIE_STORES = [
  {
    name: 'vangsten',
    pk: 'id',
    indexes: ['user_id', '[user_id+timestamp]', 'vogelnaam', 'vangstdatum', 'project', 'uploaded', 'bron', 'deleted_at'],
    desc: 'Lokale cache van vogelvangsten. Bevat alle ~65 Griel-velden als JSONB in data + losse querykolommen.',
    query: () => db.vangsten.count(),
  },
  {
    name: 'projecten',
    pk: 'id',
    indexes: ['user_id', 'naam'],
    desc: 'Ringprojecten van de ingelogde gebruiker.',
    query: () => db.projecten.count(),
  },
  {
    name: 'ringstrengen',
    pk: 'id',
    indexes: ['user_id'],
    desc: 'Ringstrengen inclusief huidige positie en ringmaten.',
    query: () => db.ringstrengen.count(),
  },
  {
    name: 'species_overrides',
    pk: '[user_id+soort_naam]',
    indexes: ['user_id', 'soort_naam'],
    desc: 'Eigen aanpassingen per soort (ringer-specifiek). Overschrijft basisdata uit species.',
    query: () => db.species_overrides.count(),
  },
  {
    name: 'species',
    pk: 'naam_nl',
    indexes: [],
    desc: 'Offline cache van alle 579 soorten (basisdata beheerd door admin via Supabase).',
    query: () => db.species.count(),
  },
  {
    name: 'sync_queue',
    pk: '++id (auto)',
    indexes: ['table_name', 'createdAt', 'attempts'],
    desc: 'Wachtrij voor mutaties die nog naar Supabase gestuurd moeten worden.',
    query: () => db.sync_queue.count(),
  },
  {
    name: 'meta',
    pk: 'key',
    indexes: [],
    desc: 'Sleutel-waarde opslag voor interne metadata (bijv. species_last_pull timestamp).',
    query: () => db.meta.count(),
  },
];

// ── Supabase schema (handmatig bijgehouden, afgeleid uit SQL-migraties) ───────
const SUPABASE_TABLES = [
  {
    name: 'profiles',
    rls: true,
    policy: 'Eigen profiel (auth.uid = id)',
    columns: [
      { name: 'id', type: 'uuid PK', note: 'FK → auth.users' },
      { name: 'ringer_naam', type: 'text' },
      { name: 'ringer_nummer', type: 'text' },
      { name: 'ringer_initiaal', type: 'text' },
      { name: 'hulp_modus', type: 'text', note: 'uitgebreid | compact' },
      { name: 'kleur', type: 'text' },
      { name: 'modus', type: 'text', note: 'donker | licht' },
      { name: 'rol', type: 'text', note: 'admin | ringer | viewer' },
      { name: 'created_at', type: 'timestamptz' },
      { name: 'updated_at', type: 'timestamptz' },
    ],
  },
  {
    name: 'vangsten',
    rls: true,
    policy: 'Eigen vangsten (auth.uid = user_id)',
    columns: [
      { name: 'id', type: 'text PK', note: 'App-gegenereerd ID' },
      { name: 'user_id', type: 'uuid', note: 'FK → profiles' },
      { name: 'vogelnaam', type: 'text' },
      { name: 'ringnummer', type: 'text' },
      { name: 'vangstdatum', type: 'text', note: 'dd-mm-yyyy' },
      { name: 'project', type: 'text' },
      { name: 'bron', type: 'text', note: 'app | griel_import' },
      { name: 'uploaded', type: 'boolean' },
      { name: 'deleted_at', type: 'timestamptz', note: 'null = actief' },
      { name: 'data', type: 'jsonb', note: 'Alle ~65 Griel-velden' },
      { name: 'created_at', type: 'timestamptz' },
      { name: 'updated_at', type: 'timestamptz' },
    ],
  },
  {
    name: 'projecten',
    rls: true,
    policy: 'Eigen projecten + gedeelde (via project_members)',
    columns: [
      { name: 'id', type: 'text PK' },
      { name: 'user_id', type: 'uuid', note: 'FK → profiles (eigenaar)' },
      { name: 'naam', type: 'text' },
      { name: 'locatie', type: 'text' },
      { name: 'nummer', type: 'text' },
      { name: 'actief', type: 'boolean' },
      { name: 'created_at', type: 'timestamptz' },
      { name: 'updated_at', type: 'timestamptz' },
    ],
  },
  {
    name: 'project_members',
    rls: true,
    policy: 'Eigenaar beheert leden; leden zien eigen memberships',
    columns: [
      { name: 'id', type: 'uuid PK' },
      { name: 'project_id', type: 'text', note: 'FK → projecten' },
      { name: 'user_id', type: 'uuid', note: 'FK → profiles' },
      { name: 'created_at', type: 'timestamptz' },
    ],
  },
  {
    name: 'ringstrengen',
    rls: true,
    policy: 'Eigen ringstrengen (auth.uid = user_id)',
    columns: [
      { name: 'id', type: 'text PK' },
      { name: 'user_id', type: 'uuid', note: 'FK → profiles' },
      { name: 'data', type: 'jsonb', note: 'Soort, maat, begin/eind, huidig nummer' },
      { name: 'created_at', type: 'timestamptz' },
      { name: 'updated_at', type: 'timestamptz' },
    ],
  },
  {
    name: 'species_overrides',
    rls: true,
    policy: 'Eigen overrides (auth.uid = user_id)',
    columns: [
      { name: 'id', type: 'uuid PK' },
      { name: 'user_id', type: 'uuid', note: 'FK → profiles' },
      { name: 'soort_naam', type: 'text', note: 'UNIQUE met user_id' },
      { name: 'data', type: 'jsonb', note: 'Delta t.o.v. species basisdata' },
      { name: 'created_at', type: 'timestamptz' },
      { name: 'updated_at', type: 'timestamptz' },
    ],
  },
  {
    name: 'species',
    rls: true,
    policy: 'Iedereen leest; alleen admin schrijft',
    columns: [
      { name: 'naam_nl', type: 'text PK' },
      { name: 'data', type: 'jsonb', note: 'Volledig soortobject (naam, ring, rui, nest, boeken, biometrie)' },
    ],
  },
];

function DexieCard({ store }) {
  const [open, setOpen] = useState(false);
  const count = useLiveQuery(store.query, [], null);

  return (
    <div className="db-card">
      <button className="db-card-header" onClick={() => setOpen(o => !o)}>
        <span className="db-card-name">{store.name}</span>
        <span className="db-card-count">
          {count === null ? '…' : count}
        </span>
        <span className="db-card-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="db-card-body">
          <p className="db-card-desc">{store.desc}</p>
          <div className="db-schema">
            <div className="db-schema-row db-schema-pk">
              <span className="db-field-name">{store.pk}</span>
              <span className="db-field-type">PRIMARY KEY</span>
            </div>
            {store.indexes.map(idx => (
              <div key={idx} className="db-schema-row">
                <span className="db-field-name">{idx}</span>
                <span className="db-field-type db-field-index">INDEX</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SupabaseCard({ table }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="db-card">
      <button className="db-card-header" onClick={() => setOpen(o => !o)}>
        <span className="db-card-name">{table.name}</span>
        <span className="db-card-rls">RLS</span>
        <span className="db-card-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="db-card-body">
          <p className="db-card-policy">⛨ {table.policy}</p>
          <div className="db-schema">
            {table.columns.map(col => (
              <div key={col.name} className="db-schema-row">
                <span className="db-field-name">{col.name}</span>
                <span className={`db-field-type${col.type.includes('PK') ? ' db-field-pk' : ''}`}>
                  {col.type}
                </span>
                {col.note && <span className="db-field-note">{col.note}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DatabasesPage() {
  return (
    <div className="page databases-page">
      <h2 className="db-page-title">Databases</h2>

      <section className="db-section">
        <h3 className="db-section-title">
          <span className="db-section-icon">⊡</span>
          Lokaal — IndexedDB (Dexie)
          <span className="db-section-version">v3</span>
        </h3>
        <p className="db-section-desc">
          Offline-first cache. Werkt zonder internet. Wordt gesynchroniseerd met Supabase via de sync-wachtrij.
        </p>
        <div className="db-cards">
          {DEXIE_STORES.map(store => (
            <DexieCard key={store.name} store={store} />
          ))}
        </div>
      </section>

      <section className="db-section">
        <h3 className="db-section-title">
          <span className="db-section-icon">☁</span>
          Remote — Supabase (PostgreSQL)
        </h3>
        <p className="db-section-desc">
          Cloud-database met Row Level Security. Alleen de eigen data is zichtbaar per gebruiker, behalve gedeelde tabellen (species, gedeelde projecten).
        </p>
        <div className="db-cards">
          {SUPABASE_TABLES.map(table => (
            <SupabaseCard key={table.name} table={table} />
          ))}
        </div>
      </section>
    </div>
  );
}
