-- =====================================================
-- VRS App - Admins automatisch als lid van alle projecten
-- Voer dit UIT in: Supabase dashboard → SQL Editor → New query
-- =====================================================

-- STAP 1: Voeg bestaande admins toe aan alle bestaande projecten
INSERT INTO public.project_members (project_id, user_id)
SELECT p.id, pr.id
FROM   public.projecten p
CROSS  JOIN public.profiles pr
WHERE  pr.role = 'admin'
  AND  pr.id <> p.user_id   -- eigenaar niet nogmaals toevoegen
ON CONFLICT DO NOTHING;

-- STAP 2: Trigger zodat nieuwe projecten automatisch alle admins als lid krijgen
CREATE OR REPLACE FUNCTION public.auto_add_admins_to_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id)
  SELECT NEW.id, pr.id
  FROM   public.profiles pr
  WHERE  pr.role = 'admin'
    AND  pr.id <> NEW.user_id
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_add_admins ON public.projecten;
CREATE TRIGGER trg_auto_add_admins
  AFTER INSERT ON public.projecten
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_admins_to_project();
