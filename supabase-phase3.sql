-- =====================================================
-- VRS App - Fase 3: Rollen & Admin beleid
-- Voer dit UIT in: Supabase dashboard → SQL Editor → New query
-- =====================================================

-- =====================================================
-- STAP 1: is_admin() helper functie
-- SECURITY DEFINER: omzeilt RLS om oneindige recursie te vermijden.
-- =====================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and rol = 'admin'
  );
$$;

-- =====================================================
-- STAP 2: Email-kolom toevoegen aan profiles
-- Zodat admin de e-mailadressen van gebruikers kan zien.
-- =====================================================
alter table public.profiles
  add column if not exists email text;

-- Update bestaande gebruikers met hun e-mailadres
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

-- Trigger bijwerken: e-mail opslaan bij registratie
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = new.email;
  return new;
end;
$$ language plpgsql security definer;

-- =====================================================
-- STAP 3: Stel jezelf in als admin
-- Vervang 'jouw@email.nl' met jouw e-mailadres!
-- =====================================================
update public.profiles p
set rol = 'admin'
from auth.users u
where p.id = u.id
  and u.email = 'jouw@email.nl';  -- <-- VERVANG DIT

-- =====================================================
-- STAP 4: Admin RLS-beleid voor alle tabellen
-- Admins kunnen alle data van alle gebruikers zien en beheren.
-- =====================================================

-- Profiles
create policy "Admin kan alle profielen zien"
  on public.profiles for select
  using (is_admin());

create policy "Admin kan alle profielen bijwerken"
  on public.profiles for update
  using (is_admin());

-- Vangsten
create policy "Admin kan alle vangsten zien"
  on public.vangsten for select
  using (is_admin());

create policy "Admin kan alle vangsten beheren"
  on public.vangsten for all
  using (is_admin());

-- Projecten
create policy "Admin kan alle projecten zien"
  on public.projecten for select
  using (is_admin());

create policy "Admin kan alle projecten beheren"
  on public.projecten for all
  using (is_admin());

-- Ringstrengen
create policy "Admin kan alle ringstrengen zien"
  on public.ringstrengen for select
  using (is_admin());

create policy "Admin kan alle ringstrengen beheren"
  on public.ringstrengen for all
  using (is_admin());

-- Soortenoverschrijvingen
create policy "Admin kan alle soortenoverschrijvingen zien"
  on public.species_overrides for select
  using (is_admin());

create policy "Admin kan alle soortenoverschrijvingen beheren"
  on public.species_overrides for all
  using (is_admin());
