/*
 * Supabase SQL om de wing_scoring tabel aan te maken:
 *
 * CREATE TABLE public.wing_scoring (
 *   id          text PRIMARY KEY,
 *   capture_id  text NOT NULL,
 *   side        text NOT NULL CHECK (side IN ('L','R')),
 *   scores      jsonb NOT NULL DEFAULT '{}',
 *   created_at  timestamptz NOT NULL,
 *   updated_at  timestamptz NOT NULL,
 *   UNIQUE (capture_id, side)
 * );
 * ALTER TABLE public.wing_scoring ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Eigen wing scores" ON public.wing_scoring
 *   FOR ALL USING (true);  -- aanscherpen na koppeling capture_id <-> user_id
 */

import { supabase } from './supabase';

export async function upsertWingScoring(record) {
  return supabase
    .from('wing_scoring')
    .upsert(record, { onConflict: 'capture_id,side' });
}

export async function fetchWingScoring(capture_id, side) {
  const { data } = await supabase
    .from('wing_scoring')
    .select('*')
    .eq('capture_id', capture_id)
    .eq('side', side)
    .maybeSingle();
  return data ?? null;
}
