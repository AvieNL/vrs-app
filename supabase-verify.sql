-- =====================================================
-- VRS App - Verificatie van alle migraties
-- Plak dit in: Supabase dashboard → SQL Editor → New query
-- Alle rijen moeten status 'OK' tonen.
-- =====================================================

SELECT check_name, status, detail FROM (

  -- 1. Soft delete: deleted_at kolom op vangsten
  SELECT
    'vangsten.deleted_at kolom' AS check_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'vangsten'
        AND column_name  = 'deleted_at'
    ) THEN 'OK' ELSE 'ONTBREEKT' END AS status,
    'Voer supabase-softdelete.sql uit' AS detail

  UNION ALL

  -- 2. project_members tabel
  SELECT
    'project_members tabel' AS check_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name   = 'project_members'
    ) THEN 'OK' ELSE 'ONTBREEKT' END AS status,
    'Voer supabase-members.sql uit'

  UNION ALL

  -- 3. RLS policy: leden zien memberships
  SELECT
    'RLS: Leden zien eigen memberships' AS check_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND policyname = 'Leden zien eigen memberships'
    ) THEN 'OK' ELSE 'ONTBREEKT' END AS status,
    'Voer supabase-members.sql uit'

  UNION ALL

  -- 4. RLS policy: gedeelde projecten
  SELECT
    'RLS: Gedeelde projecten zien' AS check_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND policyname = 'Gedeelde projecten zien'
    ) THEN 'OK' ELSE 'ONTBREEKT' END AS status,
    'Voer supabase-members.sql uit'

  UNION ALL

  -- 5. RLS policy: gedeelde vangsten
  SELECT
    'RLS: Gedeelde project vangsten zien' AS check_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND policyname = 'Gedeelde project vangsten zien'
    ) THEN 'OK' ELSE 'ONTBREEKT' END AS status,
    'Voer supabase-members.sql uit'

  UNION ALL

  -- 6. Functie lookup_user_id
  SELECT
    'Functie lookup_user_id' AS check_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name   = 'lookup_user_id'
    ) THEN 'OK' ELSE 'ONTBREEKT' END AS status,
    'Voer supabase-members.sql uit'

  UNION ALL

  -- 7. Functie get_project_members
  SELECT
    'Functie get_project_members' AS check_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name   = 'get_project_members'
    ) THEN 'OK' ELSE 'ONTBREEKT' END AS status,
    'Voer supabase-members.sql uit'

  UNION ALL

  -- 8. is_admin functie (fase 3, eerder uitgevoerd)
  SELECT
    'Functie is_admin' AS check_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name   = 'is_admin'
    ) THEN 'OK' ELSE 'ONTBREEKT' END AS status,
    'Voer supabase-phase3.sql uit'

  UNION ALL

  -- 9. Email kolom op profiles (fase 3)
  SELECT
    'profiles.email kolom' AS check_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'profiles'
        AND column_name  = 'email'
    ) THEN 'OK' ELSE 'ONTBREEKT' END AS status,
    'Voer supabase-phase3.sql uit'

) checks
ORDER BY status DESC, check_name;
