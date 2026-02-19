-- =====================================================
-- VRS App - Soft Delete voor vangsten
-- Voer dit UIT in: Supabase dashboard → SQL Editor → New query
-- =====================================================

-- Voeg deleted_at kolom toe
ALTER TABLE public.vangsten
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Partial index voor actieve vangsten (sneller filteren)
CREATE INDEX IF NOT EXISTS vangsten_active_idx
  ON public.vangsten(user_id)
  WHERE deleted_at IS NULL;
