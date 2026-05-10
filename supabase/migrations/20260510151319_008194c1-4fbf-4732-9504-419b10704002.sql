DO $$
DECLARE
  v_stage uuid := '786831a5-46c1-4ae7-ac42-1fea58451c34';
  v_game uuid;
  v_admin uuid := '8a212a2a-f8bb-4c66-b423-9c1c8bf9ceab';
BEGIN
  SELECT game_id INTO v_game FROM public.stages WHERE id = v_stage;

  UPDATE public.stages
     SET results_status = 'approved',
         approved_by = v_admin,
         approved_at = now(),
         submitted_for_approval_at = COALESCE(submitted_for_approval_at, now())
   WHERE id = v_stage;

  DELETE FROM public.stage_points WHERE stage_id = v_stage;

  WITH rider_pts AS (
    SELECT sr.rider_id, COALESCE(ps.points, 0) AS pts
    FROM public.stage_results sr
    LEFT JOIN public.points_schema ps
      ON ps.game_id = v_game
     AND ps.classification = 'stage'
     AND ps.position = sr.finish_position
    WHERE sr.stage_id = v_stage
      AND sr.finish_position BETWEEN 1 AND 20
      AND COALESCE(sr.did_finish, true) = true
  ),
  entry_rider_pts AS (
    SELECT ep.entry_id, ep.rider_id, COALESCE(rp.pts,0) AS base_pts,
           CASE WHEN ej.rider_id IS NOT NULL THEN 2 ELSE 1 END AS mult
    FROM public.entry_picks ep
    JOIN public.entries e ON e.id = ep.entry_id AND e.game_id = v_game AND e.status='submitted'
    LEFT JOIN rider_pts rp ON rp.rider_id = ep.rider_id
    LEFT JOIN public.entry_jokers ej ON ej.entry_id = ep.entry_id AND ej.rider_id = ep.rider_id
    UNION ALL
    SELECT ej.entry_id, ej.rider_id, COALESCE(rp.pts,0) AS base_pts, 2 AS mult
    FROM public.entry_jokers ej
    JOIN public.entries e ON e.id = ej.entry_id AND e.game_id = v_game AND e.status='submitted'
    LEFT JOIN rider_pts rp ON rp.rider_id = ej.rider_id
    WHERE NOT EXISTS (SELECT 1 FROM public.entry_picks ep2 WHERE ep2.entry_id = ej.entry_id AND ep2.rider_id = ej.rider_id)
  )
  INSERT INTO public.stage_points(stage_id, entry_id, points)
  SELECT v_stage, entry_id, SUM(base_pts*mult)::int
  FROM entry_rider_pts
  GROUP BY entry_id;

  INSERT INTO public.total_points(entry_id, total_points, updated_at)
  SELECT e.id,
         (COALESCE((SELECT SUM(sp.points) FROM public.stage_points sp
                     JOIN public.stages s ON s.id=sp.stage_id
                    WHERE sp.entry_id=e.id AND s.game_id=v_game),0)
        + COALESCE((SELECT SUM(epp.points) FROM public.entry_prediction_points epp
                    WHERE epp.entry_id=e.id),0))::int,
         now()
  FROM public.entries e
  WHERE e.game_id = v_game
  ON CONFLICT (entry_id) DO UPDATE
    SET total_points = EXCLUDED.total_points, updated_at = now();

  UPDATE public.entries e
     SET total_points = COALESCE(tp.total_points,0)
    FROM public.total_points tp
   WHERE tp.entry_id = e.id AND e.game_id = v_game;

  INSERT INTO public.results_approval_log(stage_id, action, actor_user_id, actor_display_name)
  VALUES (v_stage, 'approved', v_admin, 'koerspoule (handmatig via support)');
END $$;