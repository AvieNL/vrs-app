-- =====================================================
-- VRS App - Eigenaar ook zichtbaar in ledenlijst
-- Voer dit UIT in: Supabase dashboard → SQL Editor → New query
-- =====================================================

-- Verwijder eerst de oude versie (return type is gewijzigd)
DROP FUNCTION IF EXISTS public.get_project_members(TEXT);

-- Vervang get_project_members zodat de eigenaar ook terugkomt
-- is_owner = true betekent dat deze persoon de eigenaar is
CREATE OR REPLACE FUNCTION public.get_project_members(p_project_id TEXT)
RETURNS TABLE(user_id UUID, email TEXT, ringer_naam TEXT, is_owner BOOLEAN)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  -- Eigenaar van het project
  SELECT pr.id AS user_id, pr.email, pr.ringer_naam, TRUE AS is_owner
  FROM   public.projecten p
  JOIN   public.profiles pr ON pr.id = p.user_id
  WHERE  p.id = p_project_id
    AND (
      p.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = p_project_id AND user_id = auth.uid()
      )
    )

  UNION ALL

  -- Overige leden
  SELECT pm.user_id, pr.email, pr.ringer_naam, FALSE AS is_owner
  FROM   public.project_members pm
  JOIN   public.profiles pr ON pr.id = pm.user_id
  WHERE  pm.project_id = p_project_id
    AND (
      EXISTS (
        SELECT 1 FROM public.projecten
        WHERE id = p_project_id AND user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = p_project_id AND user_id = auth.uid()
      )
    );
$$;
