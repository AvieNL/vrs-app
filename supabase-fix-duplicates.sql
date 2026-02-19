-- =====================================================
-- VRS App - Verwijder dubbele projecten
-- Bewaart het oudste project per naam; de rest wordt verwijderd.
-- Vangsten blijven intact (die koppelen op naam, niet op ID).
-- =====================================================

DELETE FROM public.projecten
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, naam) id
  FROM public.projecten
  ORDER BY user_id, naam, created_at ASC
);
