-- =====================================================
-- VRS App - Fix RLS-recursie in projecten/project_members
-- Voer dit UIT in: Supabase dashboard → SQL Editor → New query
-- =====================================================

-- =====================================================
-- STAP 1: Helper-functies (SECURITY DEFINER = omzeilt RLS)
-- =====================================================

-- Controleer of de ingelogde gebruiker eigenaar is van een project
CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projecten
    WHERE id = p_project_id AND user_id = auth.uid()
  );
$$;

-- Controleer of de ingelogde gebruiker lid is van een project
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
$$;

-- Geef alle project-namen op waarvan de gebruiker lid is
CREATE OR REPLACE FUNCTION public.get_shared_project_names()
RETURNS TABLE(naam TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT p.naam
  FROM   public.projecten p
  JOIN   public.project_members pm ON pm.project_id = p.id
  WHERE  pm.user_id = auth.uid();
$$;

-- =====================================================
-- STAP 2: Vervang de recursieve policies
-- =====================================================

-- project_members: eigenaar-check via functie (niet direct op projecten-tabel)
DROP POLICY IF EXISTS "Projecteigenaar beheert leden" ON public.project_members;
CREATE POLICY "Projecteigenaar beheert leden"
  ON public.project_members FOR ALL
  USING (is_project_owner(project_id));

-- projecten: gedeeld-check via functie (niet direct op project_members-tabel)
DROP POLICY IF EXISTS "Gedeelde projecten zien" ON public.projecten;
CREATE POLICY "Gedeelde projecten zien"
  ON public.projecten FOR SELECT
  USING (is_project_member(id));

-- vangsten: gedeelde project-namen via functie (niet direct beide tabellen)
DROP POLICY IF EXISTS "Gedeelde project vangsten zien" ON public.vangsten;
CREATE POLICY "Gedeelde project vangsten zien"
  ON public.vangsten FOR SELECT
  USING (
    project IS NOT NULL AND
    project IN (SELECT naam FROM public.get_shared_project_names())
  );
