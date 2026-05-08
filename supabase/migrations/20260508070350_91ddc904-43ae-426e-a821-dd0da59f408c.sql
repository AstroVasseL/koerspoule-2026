
-- Pick counts per (category, rider) for a given game, only from submitted entries
CREATE OR REPLACE FUNCTION public.game_pick_stats(p_game_id uuid)
RETURNS TABLE(category_id uuid, rider_id uuid, pick_count integer, total_entries integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH submitted AS (
    SELECT id FROM entries WHERE game_id = p_game_id AND status = 'submitted'
  ),
  total AS (SELECT count(*)::int AS n FROM submitted)
  SELECT ep.category_id,
         ep.rider_id,
         count(*)::int AS pick_count,
         (SELECT n FROM total) AS total_entries
  FROM entry_picks ep
  JOIN submitted s ON s.id = ep.entry_id
  GROUP BY ep.category_id, ep.rider_id;
$$;

GRANT EXECUTE ON FUNCTION public.game_pick_stats(uuid) TO authenticated;

-- Joker counts per rider
CREATE OR REPLACE FUNCTION public.game_joker_stats(p_game_id uuid)
RETURNS TABLE(rider_id uuid, joker_count integer, total_entries integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH submitted AS (
    SELECT id FROM entries WHERE game_id = p_game_id AND status = 'submitted'
  ),
  total AS (SELECT count(*)::int AS n FROM submitted)
  SELECT ej.rider_id,
         count(*)::int AS joker_count,
         (SELECT n FROM total) AS total_entries
  FROM entry_jokers ej
  JOIN submitted s ON s.id = ej.entry_id
  GROUP BY ej.rider_id;
$$;

GRANT EXECUTE ON FUNCTION public.game_joker_stats(uuid) TO authenticated;

-- Anonymous total points per submitted entry (for percentile calc)
CREATE OR REPLACE FUNCTION public.game_entry_totals(p_game_id uuid)
RETURNS TABLE(total_points integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(total_points, 0)::int
  FROM entries
  WHERE game_id = p_game_id AND status = 'submitted';
$$;

GRANT EXECUTE ON FUNCTION public.game_entry_totals(uuid) TO authenticated;
