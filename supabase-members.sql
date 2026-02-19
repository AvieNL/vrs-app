-- =====================================================
-- VRS App - Gedeelde projecten (project_members)
-- Voer dit UIT in: Supabase dashboard → SQL Editor → New query
-- =====================================================

-- =====================================================
-- STAP 1: project_members tabel
-- =====================================================
CREATE TABLE IF NOT EXISTS public.project_members (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT    NOT NULL REFERENCES public.projecten(id) ON DELETE CASCADE,
  user_id    UUID    NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Projecteigenaar kan leden beheren (toevoegen, verwijderen, zien)
CREATE POLICY "Projecteigenaar beheert leden"
  ON public.project_members FOR ALL
  USING (
    project_id IN (SELECT id FROM public.projecten WHERE user_id = auth.uid())
  );

-- Leden kunnen hun eigen memberships zien
CREATE POLICY "Leden zien eigen memberships"
  ON public.project_members FOR SELECT
  USING (user_id = auth.uid());

-- =====================================================
-- STAP 2: Gedeelde projecten zichtbaar maken
-- =====================================================
CREATE POLICY "Gedeelde projecten zien"
  ON public.projecten FOR SELECT
  USING (
    id IN (
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- STAP 3: Gedeelde vangsten zichtbaar maken
-- (vangsten.project is TEXT naam, niet UUID)
-- =====================================================
CREATE POLICY "Gedeelde project vangsten zien"
  ON public.vangsten FOR SELECT
  USING (
    project IS NOT NULL AND
    project IN (
      SELECT p.naam
      FROM   public.projecten p
      JOIN   public.project_members pm ON pm.project_id = p.id
      WHERE  pm.user_id = auth.uid()
    )
  );

-- =====================================================
-- STAP 4: Helper functies (SECURITY DEFINER)
-- =====================================================

-- Opzoeken user_id op e-mailadres
CREATE OR REPLACE FUNCTION public.lookup_user_id(p_email TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM public.profiles WHERE email = p_email LIMIT 1;
$$;

-- Projectleden ophalen met naam/email (omzeilt RLS op profiles)
CREATE OR REPLACE FUNCTION public.get_project_members(p_project_id TEXT)
RETURNS TABLE(user_id UUID, email TEXT, ringer_naam TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT pm.user_id, pr.email, pr.ringer_naam
  FROM   public.project_members pm
  JOIN   public.profiles pr ON pr.id = pm.user_id
  WHERE  pm.project_id = p_project_id
    AND (
      EXISTS (
        SELECT 1 FROM public.projecten
        WHERE id = p_project_id AND user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = p_project_id AND user_id = auth.uid()
      )
    );
$$;
