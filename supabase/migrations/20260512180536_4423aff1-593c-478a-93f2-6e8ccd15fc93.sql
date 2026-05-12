CREATE OR REPLACE FUNCTION public.admin_stage_points_breakdown(p_stage_id uuid)
 RETURNS TABLE(entry_id uuid, team_name text, display_name text, total_stage_points integer, breakdown jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH game AS (
    SELECT game_id FROM public.stages WHERE id = p_stage_id
  ),
  game_mult AS (
    SELECT COALESCE(g.joker_multiplier, 2) AS mult
    FROM public.games g WHERE g.id = (SELECT game_id FROM game)
  ),
  rider_pts AS (
    SELECT
      sr.rider_id,
      sr.finish_position,
      COALESCE(sr.did_finish, true) AS did_finish,
      COALESCE(ps.points, 0) AS pts
    FROM public.stage_results sr
    LEFT JOIN public.points_schema ps
      ON ps.game_id = (SELECT game_id FROM game)
     AND ps.classification = 'stage'
     AND ps.position = sr.finish_position
    WHERE sr.stage_id = p_stage_id
  ),
  entry_riders AS (
    SELECT ep.entry_id, ep.rider_id,
           CASE WHEN ej.rider_id IS NOT NULL THEN (SELECT mult FROM game_mult) ELSE 1 END AS mult,
           (ej.rider_id IS NOT NULL) AS is_joker
    FROM public.entry_picks ep
    JOIN public.entries e ON e.id = ep.entry_id
                         AND e.game_id = (SELECT game_id FROM game)
                         AND e.status = 'submitted'
    LEFT JOIN public.entry_jokers ej
      ON ej.entry_id = ep.entry_id AND ej.rider_id = ep.rider_id

    UNION ALL

    SELECT ej.entry_id, ej.rider_id, (SELECT mult FROM game_mult) AS mult, true AS is_joker
    FROM public.entry_jokers ej
    JOIN public.entries e ON e.id = ej.entry_id
                         AND e.game_id = (SELECT game_id FROM game)
                         AND e.status = 'submitted'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.entry_picks ep2
      WHERE ep2.entry_id = ej.entry_id AND ep2.rider_id = ej.rider_id
    )
  ),
  rows AS (
    SELECT
      er.entry_id,
      er.rider_id,
      r.name AS rider_name,
      rp.finish_position,
      COALESCE(rp.pts, 0) AS base_pts,
      er.is_joker,
      er.mult,
      CASE
        WHEN rp.finish_position IS NOT NULL
         AND rp.finish_position BETWEEN 1 AND 20
         AND rp.did_finish
        THEN COALESCE(rp.pts, 0) * er.mult
        ELSE 0
      END AS total
    FROM entry_riders er
    LEFT JOIN public.riders r ON r.id = er.rider_id
    LEFT JOIN rider_pts rp ON rp.rider_id = er.rider_id
  )
  SELECT
    e.id AS entry_id,
    e.team_name,
    COALESCE(p.display_name, 'Onbekend') AS display_name,
    COALESCE(SUM(rows.total)::int, 0) AS total_stage_points,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'rider_id', rows.rider_id,
          'rider_name', rows.rider_name,
          'finish_position', rows.finish_position,
          'base_pts', rows.base_pts,
          'is_joker', rows.is_joker,
          'multiplier', rows.mult,
          'total', rows.total
        )
        ORDER BY rows.total DESC NULLS LAST, rows.rider_name
      ) FILTER (WHERE rows.rider_id IS NOT NULL),
      '[]'::jsonb
    ) AS breakdown
  FROM public.entries e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  LEFT JOIN rows ON rows.entry_id = e.id
  WHERE public.is_admin()
    AND e.game_id = (SELECT game_id FROM game)
    AND e.status = 'submitted'
  GROUP BY e.id, e.team_name, p.display_name
  ORDER BY total_stage_points DESC, COALESCE(p.display_name, '');
$function$;