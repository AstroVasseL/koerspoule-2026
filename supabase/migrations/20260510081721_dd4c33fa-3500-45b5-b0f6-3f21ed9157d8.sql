CREATE OR REPLACE FUNCTION public.calculate_prediction_points(p_game_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_last_stage uuid;
  v_final_stage_number integer;
  v_gc_winner uuid;
  v_gc_2 uuid;
  v_gc_3 uuid;
  v_points_winner uuid;
  v_kom_winner uuid;
  v_youth_winner uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  -- Wis bestaande voorspellings-bonussen voor alle entries van deze game.
  -- Bonussen worden pas opnieuw geplaatst zodra de einduitslag bekend is.
  DELETE FROM public.entry_prediction_points
  WHERE entry_id IN (SELECT id FROM public.entries WHERE game_id = p_game_id);

  SELECT max(stage_number) INTO v_final_stage_number
  FROM public.stages
  WHERE game_id = p_game_id;

  SELECT id INTO v_last_stage
  FROM public.stages
  WHERE game_id = p_game_id
    AND stage_number = v_final_stage_number
    AND results_status = 'approved'
    AND EXISTS (SELECT 1 FROM public.stage_results sr WHERE sr.stage_id = stages.id)
  LIMIT 1;

  IF v_last_stage IS NULL THEN
    RETURN;
  END IF;

  -- Werkelijke eindstand: top 3 GC + truien-winnaars na de laatste etappe.
  SELECT rider_id INTO v_gc_winner
    FROM public.stage_results
   WHERE stage_id = v_last_stage AND gc_position = 1 LIMIT 1;
  SELECT rider_id INTO v_gc_2
    FROM public.stage_results
   WHERE stage_id = v_last_stage AND gc_position = 2 LIMIT 1;
  SELECT rider_id INTO v_gc_3
    FROM public.stage_results
   WHERE stage_id = v_last_stage AND gc_position = 3 LIMIT 1;
  SELECT rider_id INTO v_points_winner
    FROM public.stage_results
   WHERE stage_id = v_last_stage AND points_position = 1 LIMIT 1;
  SELECT rider_id INTO v_kom_winner
    FROM public.stage_results
   WHERE stage_id = v_last_stage AND mountain_position = 1 LIMIT 1;
  SELECT rider_id INTO v_youth_winner
    FROM public.stage_results
   WHERE stage_id = v_last_stage AND youth_position = 1 LIMIT 1;

  -- ----------- GC podium per entry (50 exact / 25 in podium, max 150) -----------
  INSERT INTO public.entry_prediction_points (entry_id, classification, position, points)
  SELECT
    p.entry_id,
    'gc',
    p.position,
    CASE
      WHEN p.position = 1 AND p.rider_id = v_gc_winner THEN 50
      WHEN p.position = 2 AND p.rider_id = v_gc_2      THEN 50
      WHEN p.position = 3 AND p.rider_id = v_gc_3      THEN 50
      WHEN p.rider_id IN (v_gc_winner, v_gc_2, v_gc_3)
       AND p.rider_id IS NOT NULL
       AND NOT (
         (p.position = 1 AND p.rider_id = v_gc_winner) OR
         (p.position = 2 AND p.rider_id = v_gc_2)      OR
         (p.position = 3 AND p.rider_id = v_gc_3)
       )
      THEN 25
      ELSE 0
    END AS points
  FROM public.entry_predictions p
  JOIN public.entries e ON e.id = p.entry_id AND e.game_id = p_game_id
  WHERE p.classification = 'gc' AND p.position BETWEEN 1 AND 3;

  -- ----------- Truien (winnaar = 25) -----------
  INSERT INTO public.entry_prediction_points (entry_id, classification, position, points)
  SELECT
    p.entry_id,
    p.classification,
    1,
    CASE
      WHEN p.classification = 'points' AND p.rider_id = v_points_winner THEN 25
      WHEN p.classification = 'kom'    AND p.rider_id = v_kom_winner    THEN 25
      WHEN p.classification = 'youth'  AND p.rider_id = v_youth_winner  THEN 25
      ELSE 0
    END
  FROM public.entry_predictions p
  JOIN public.entries e ON e.id = p.entry_id AND e.game_id = p_game_id
  WHERE p.classification IN ('points','kom','youth')
    AND p.position = 1;
END $function$;

WITH non_final_games AS (
  SELECT g.id AS game_id
  FROM public.games g
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.stages s
    WHERE s.game_id = g.id
      AND s.stage_number = (SELECT max(s2.stage_number) FROM public.stages s2 WHERE s2.game_id = g.id)
      AND s.results_status = 'approved'
      AND EXISTS (SELECT 1 FROM public.stage_results sr WHERE sr.stage_id = s.id)
  )
), affected_entries AS (
  SELECT e.id, e.game_id
  FROM public.entries e
  JOIN non_final_games nfg ON nfg.game_id = e.game_id
), deleted AS (
  DELETE FROM public.entry_prediction_points epp
  USING affected_entries ae
  WHERE epp.entry_id = ae.id
  RETURNING epp.entry_id
), recalculated AS (
  SELECT
    ae.id AS entry_id,
    COALESCE((
      SELECT SUM(sp.points)
      FROM public.stage_points sp
      JOIN public.stages s ON s.id = sp.stage_id
      WHERE sp.entry_id = ae.id
        AND s.game_id = ae.game_id
        AND s.results_status = 'approved'
    ), 0)::int AS total_points
  FROM affected_entries ae
)
INSERT INTO public.total_points(entry_id, total_points, updated_at)
SELECT entry_id, total_points, now()
FROM recalculated
ON CONFLICT (entry_id) DO UPDATE
  SET total_points = EXCLUDED.total_points,
      updated_at = now();

UPDATE public.entries e
SET total_points = COALESCE(tp.total_points, 0),
    updated_at = now()
FROM public.total_points tp
WHERE tp.entry_id = e.id
  AND e.game_id IN (
    SELECT g.id
    FROM public.games g
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.stages s
      WHERE s.game_id = g.id
        AND s.stage_number = (SELECT max(s2.stage_number) FROM public.stages s2 WHERE s2.game_id = g.id)
        AND s.results_status = 'approved'
        AND EXISTS (SELECT 1 FROM public.stage_results sr WHERE sr.stage_id = s.id)
    )
  );