-- =====================================================
-- VRS App - Supabase Database Schema
-- Voer dit UIT in: Supabase dashboard → SQL Editor → New query
-- =====================================================

-- =====================================================
-- PROFILES (verlengde gebruikersinformatie)
-- =====================================================
create table public.profiles (
  id            uuid references auth.users on delete cascade primary key,
  ringer_naam   text    default '',
  ringer_nummer text    default '',
  ringer_initiaal text  default '',
  hulp_modus    text    default 'uitgebreid',
  kleur         text    default 'blauw',
  modus         text    default 'donker',
  rol           text    not null default 'ringer'
                        check (rol in ('admin', 'ringer', 'viewer')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Eigen profiel lezen"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Eigen profiel bijwerken"
  on public.profiles for update
  using (auth.uid() = id);

-- Automatisch profiel aanmaken na registratie
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================
-- VANGSTEN (vogelvangsten / records)
-- =====================================================
create table public.vangsten (
  id          text    primary key,  -- app-gegenereerd ID, bewaard voor migratie
  user_id     uuid    references public.profiles(id) on delete cascade not null,
  -- Querybare kolommen:
  vogelnaam   text,
  ringnummer  text,
  vangstdatum text,
  project     text,
  bron        text    default 'app',
  uploaded    boolean default false,
  -- Volledig record als JSONB (alle ~65 Griel-velden):
  data        jsonb   not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.vangsten enable row level security;

create policy "Eigen vangsten beheren"
  on public.vangsten for all
  using (auth.uid() = user_id);

create index vangsten_user_id_idx    on public.vangsten(user_id);
create index vangsten_vogelnaam_idx  on public.vangsten(vogelnaam);
create index vangsten_vangstdatum_idx on public.vangsten(vangstdatum);
create index vangsten_project_idx    on public.vangsten(project);

-- =====================================================
-- PROJECTEN
-- =====================================================
create table public.projecten (
  id         text primary key,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  naam       text not null,
  locatie    text default '',
  nummer     text default '',
  actief     boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projecten enable row level security;

create policy "Eigen projecten beheren"
  on public.projecten for all
  using (auth.uid() = user_id);

create index projecten_user_id_idx on public.projecten(user_id);

-- =====================================================
-- RINGSTRENGEN
-- =====================================================
create table public.ringstrengen (
  id         text primary key,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  data       jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ringstrengen enable row level security;

create policy "Eigen ringstrengen beheren"
  on public.ringstrengen for all
  using (auth.uid() = user_id);

create index ringstrengen_user_id_idx on public.ringstrengen(user_id);

-- =====================================================
-- SOORTENOVERSCHRIJVINGEN
-- =====================================================
create table public.species_overrides (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade not null,
  soort_naam text not null,
  data       jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, soort_naam)
);

alter table public.species_overrides enable row level security;

create policy "Eigen soortenoverschrijvingen beheren"
  on public.species_overrides for all
  using (auth.uid() = user_id);

create index species_overrides_user_id_idx on public.species_overrides(user_id);
