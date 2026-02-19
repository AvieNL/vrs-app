-- Species tabel: basisdata van alle soorten, beheerd door admin
-- Voer uit in Supabase SQL Editor vóór supabase-species-data.sql
--
-- Vereisten: public.is_admin() functie moet al bestaan (supabase-phase3.sql)

CREATE TABLE IF NOT EXISTS public.species (
  naam_nl   text PRIMARY KEY,
  data      jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE public.species ENABLE ROW LEVEL SECURITY;

-- Alle ingelogde gebruikers mogen lezen
CREATE POLICY "Iedereen leest soorten"
  ON public.species
  FOR SELECT
  TO authenticated
  USING (true);

-- Alleen admin mag schrijven (INSERT, UPDATE, DELETE)
CREATE POLICY "Admin beheert soorten"
  ON public.species
  FOR ALL
  USING (public.is_admin());
