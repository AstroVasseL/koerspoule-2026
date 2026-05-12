CREATE OR REPLACE FUNCTION public.calculate_stage_scores(p_stage_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_game uuid;
  v_mult int;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT game_id INTO v_game FROM public.stages WHERE id = p_stage_id;
  IF v_game IS NULL THEN RAISE EXCEPTION 'Stage not found'; END IF;

  SELECT COALESCE(joker_multiplier, 2) INTO v_mult FROM public.games WHERE id = v_game;
  IF v_mult IS NULL THEN v_mult := 2; END IF;

  DELETE FROM public.stage_points WHERE stage_id = p_stage_id;

  WITH rider_pts AS (
    SELECT
      sr.rider_id,
      COALESCE(ps.points, 0) AS pts
    FROM public.stage_results sr
    LEFT JOIN public.points_schema ps
      ON ps.game_id = v_game
     AND ps.classification = 'stage'
     AND ps.position = sr.finish_position
    WHERE sr.stage_id = p_stage_id
      AND sr.finish_position IS NOT NULL
      AND sr.finish_position BETWEEN 1 AND 20
      AND COALESCE(sr.did_finish, true) = true
  ),
  entry_rider_pts AS (
    SELECT
      ep.entry_id,
      ep.rider_id,
      COALESCE(rp.pts, 0) AS base_pts,
      CASE WHEN ej.rider_id IS NOT NULL THEN v_mult ELSE 1 END AS mult
    FROM public.entry_picks ep
    JOIN public.entries e
      ON e.id = ep.entry_id
     AND e.game_id = v_game
     AND e.status = 'submitted'
    LEFT JOIN rider_pts rp ON rp.rider_id = ep.rider_id
    LEFT JOIN public.entry_jokers ej
      ON ej.entry_id = ep.entry_id
     AND ej.rider_id = ep.rider_id

    UNION ALL

    SELECT
      ej.entry_id,
      ej.rider_id,
      COALESCE(rp.pts, 0) AS base_pts,
      v_mult AS mult
    FROM public.entry_jokers ej
    JOIN public.entries e
      ON e.id = ej.entry_id
     AND e.game_id = v_game
     AND e.status = 'submitted'
    LEFT JOIN rider_pts rp ON rp.rider_id = ej.rider_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.entry_picks ep2
      WHERE ep2.entry_id = ej.entry_id
        AND ep2.rider_id = ej.rider_id
    )
  )
  INSERT INTO public.stage_points(stage_id, entry_id, points)
  SELECT p_stage_id, entry_id, SUM(base_pts * mult)::int
  FROM entry_rider_pts
  GROUP BY entry_id;
END $function$;