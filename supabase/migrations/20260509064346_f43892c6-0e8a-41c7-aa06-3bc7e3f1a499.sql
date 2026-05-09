CREATE OR REPLACE FUNCTION public.game_prediction_stats(p_game_id uuid)
 RETURNS TABLE(classification text, "position" int, rider_id uuid, pick_count int, total_entries int)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH submitted AS (
    SELECT id FROM entries WHERE game_id = p_game_id AND status = 'submitted'
  ),
  total AS (SELECT count(*)::int AS n FROM submitted)
  SELECT ep.classification,
         ep.position,
         ep.rider_id,
         count(*)::int AS pick_count,
         (SELECT n FROM total) AS total_entries
  FROM entry_predictions ep
  JOIN submitted s ON s.id = ep.entry_id
  GROUP BY ep.classification, ep.position, ep.rider_id;
$function$;

GRANT EXECUTE ON FUNCTION public.game_prediction_stats(uuid) TO anon, authenticated;