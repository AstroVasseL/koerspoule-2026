
-- Updated: include picks (rider names) per entry per category
CREATE OR REPLACE FUNCTION public.subpoule_benchmark_data(p_subpoule_id uuid, p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_authorized boolean;
  v_entries jsonb;
  v_stages jsonb;
  v_categories jsonb;
  v_stage_points jsonb;
  v_category_points jsonb;
  v_picks jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;

  SELECT (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.subpoules s WHERE s.id = p_subpoule_id AND s.owner_user_id = auth.uid())
    OR public.is_subpoule_member(p_subpoule_id, auth.uid())
  ) INTO v_authorized;
  IF NOT v_authorized THEN RAISE EXCEPTION 'Geen toegang tot deze subpoule'; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', m.user_id,
    'display_name', COALESCE(p.display_name, 'Onbekend'),
    'entry_id', e.id,
    'team_name', e.team_name,
    'total_points', COALESCE(e.total_points, 0)
  ) ORDER BY COALESCE(e.total_points,0) DESC), '[]'::jsonb)
  INTO v_entries
  FROM public.subpoule_members m
  LEFT JOIN public.profiles p ON p.id = m.user_id
  LEFT JOIN public.entries e ON e.user_id = m.user_id AND e.game_id = p_game_id AND e.status = 'submitted'
  WHERE m.subpoule_id = p_subpoule_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', s.id, 'stage_number', s.stage_number, 'name', s.name,
    'date', s.date, 'approved_at', s.approved_at
  ) ORDER BY s.stage_number), '[]'::jsonb)
  INTO v_stages
  FROM public.stages s
  WHERE s.game_id = p_game_id AND s.results_status = 'approved'
    AND EXISTS (SELECT 1 FROM public.stage_results sr WHERE sr.stage_id = s.id);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id, 'name', c.name, 'short_name', c.short_name, 'sort_order', c.sort_order
  ) ORDER BY c.sort_order, c.name), '[]'::jsonb)
  INTO v_categories
  FROM public.categories c WHERE c.game_id = p_game_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'entry_id', sp.entry_id, 'stage_id', sp.stage_id, 'points', sp.points
  )), '[]'::jsonb)
  INTO v_stage_points
  FROM public.stage_points sp
  JOIN public.stages s ON s.id = sp.stage_id
  WHERE s.game_id = p_game_id AND s.results_status = 'approved'
    AND sp.entry_id IN (
      SELECT e.id FROM public.entries e
      JOIN public.subpoule_members m ON m.user_id = e.user_id
      WHERE m.subpoule_id = p_subpoule_id AND e.game_id = p_game_id
    );

  WITH approved_stages AS (
    SELECT id FROM public.stages WHERE game_id = p_game_id AND results_status = 'approved'
  ),
  rider_stage_pts AS (
    SELECT sr.stage_id, sr.rider_id, COALESCE(ps.points, 0) AS pts
    FROM public.stage_results sr
    JOIN approved_stages s ON s.id = sr.stage_id
    LEFT JOIN public.points_schema ps
      ON ps.game_id = p_game_id AND ps.classification = 'stage' AND ps.position = sr.finish_position
    WHERE sr.finish_position BETWEEN 1 AND 20 AND COALESCE(sr.did_finish, true) = true
  ),
  sub_entries AS (
    SELECT e.id AS entry_id FROM public.entries e
    JOIN public.subpoule_members m ON m.user_id = e.user_id
    WHERE m.subpoule_id = p_subpoule_id AND e.game_id = p_game_id AND e.status = 'submitted'
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'entry_id', entry_id, 'category_id', category_id, 'points', points
  )), '[]'::jsonb)
  INTO v_category_points
  FROM (
    SELECT ep.entry_id, ep.category_id,
      SUM(rsp.pts * CASE WHEN ej.rider_id IS NOT NULL THEN 2 ELSE 1 END)::int AS points
    FROM public.entry_picks ep
    JOIN sub_entries se ON se.entry_id = ep.entry_id
    JOIN rider_stage_pts rsp ON rsp.rider_id = ep.rider_id
    LEFT JOIN public.entry_jokers ej ON ej.entry_id = ep.entry_id AND ej.rider_id = ep.rider_id
    GROUP BY ep.entry_id, ep.category_id
  ) cp;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'entry_id', ep.entry_id,
    'category_id', ep.category_id,
    'rider_id', ep.rider_id,
    'rider_name', r.name,
    'country_code', r.country_code,
    'is_joker', (ej.rider_id IS NOT NULL)
  )), '[]'::jsonb)
  INTO v_picks
  FROM public.entry_picks ep
  JOIN public.entries e ON e.id = ep.entry_id
  JOIN public.subpoule_members m ON m.user_id = e.user_id
  LEFT JOIN public.riders r ON r.id = ep.rider_id
  LEFT JOIN public.entry_jokers ej ON ej.entry_id = ep.entry_id AND ej.rider_id = ep.rider_id
  WHERE m.subpoule_id = p_subpoule_id AND e.game_id = p_game_id AND e.status = 'submitted';

  RETURN jsonb_build_object(
    'entries', v_entries, 'stages', v_stages, 'categories', v_categories,
    'stage_points', v_stage_points, 'category_points', v_category_points,
    'picks', COALESCE(v_picks, '[]'::jsonb)
  );
END;
$$;

-- New: global benchmark across all submitted entries in a game
CREATE OR REPLACE FUNCTION public.game_benchmark_data(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_entries jsonb;
  v_stages jsonb;
  v_categories jsonb;
  v_stage_points jsonb;
  v_category_points jsonb;
  v_picks jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', e.user_id,
    'display_name', COALESCE(p.display_name, 'Onbekend'),
    'entry_id', e.id,
    'team_name', e.team_name,
    'total_points', COALESCE(e.total_points, 0)
  ) ORDER BY COALESCE(e.total_points,0) DESC), '[]'::jsonb)
  INTO v_entries
  FROM public.entries e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  WHERE e.game_id = p_game_id AND e.status = 'submitted';

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', s.id, 'stage_number', s.stage_number, 'name', s.name,
    'date', s.date, 'approved_at', s.approved_at
  ) ORDER BY s.stage_number), '[]'::jsonb)
  INTO v_stages
  FROM public.stages s
  WHERE s.game_id = p_game_id AND s.results_status = 'approved'
    AND EXISTS (SELECT 1 FROM public.stage_results sr WHERE sr.stage_id = s.id);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id, 'name', c.name, 'short_name', c.short_name, 'sort_order', c.sort_order
  ) ORDER BY c.sort_order, c.name), '[]'::jsonb)
  INTO v_categories
  FROM public.categories c WHERE c.game_id = p_game_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'entry_id', sp.entry_id, 'stage_id', sp.stage_id, 'points', sp.points
  )), '[]'::jsonb)
  INTO v_stage_points
  FROM public.stage_points sp
  JOIN public.stages s ON s.id = sp.stage_id
  JOIN public.entries e ON e.id = sp.entry_id
  WHERE s.game_id = p_game_id AND s.results_status = 'approved'
    AND e.game_id = p_game_id AND e.status = 'submitted';

  WITH approved_stages AS (
    SELECT id FROM public.stages WHERE game_id = p_game_id AND results_status = 'approved'
  ),
  rider_stage_pts AS (
    SELECT sr.stage_id, sr.rider_id, COALESCE(ps.points, 0) AS pts
    FROM public.stage_results sr
    JOIN approved_stages s ON s.id = sr.stage_id
    LEFT JOIN public.points_schema ps
      ON ps.game_id = p_game_id AND ps.classification = 'stage' AND ps.position = sr.finish_position
    WHERE sr.finish_position BETWEEN 1 AND 20 AND COALESCE(sr.did_finish, true) = true
  ),
  game_entries AS (
    SELECT id AS entry_id FROM public.entries WHERE game_id = p_game_id AND status = 'submitted'
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'entry_id', entry_id, 'category_id', category_id, 'points', points
  )), '[]'::jsonb)
  INTO v_category_points
  FROM (
    SELECT ep.entry_id, ep.category_id,
      SUM(rsp.pts * CASE WHEN ej.rider_id IS NOT NULL THEN 2 ELSE 1 END)::int AS points
    FROM public.entry_picks ep
    JOIN game_entries ge ON ge.entry_id = ep.entry_id
    JOIN rider_stage_pts rsp ON rsp.rider_id = ep.rider_id
    LEFT JOIN public.entry_jokers ej ON ej.entry_id = ep.entry_id AND ej.rider_id = ep.rider_id
    GROUP BY ep.entry_id, ep.category_id
  ) cp;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'entry_id', ep.entry_id,
    'category_id', ep.category_id,
    'rider_id', ep.rider_id,
    'rider_name', r.name,
    'country_code', r.country_code,
    'is_joker', (ej.rider_id IS NOT NULL)
  )), '[]'::jsonb)
  INTO v_picks
  FROM public.entry_picks ep
  JOIN public.entries e ON e.id = ep.entry_id
  LEFT JOIN public.riders r ON r.id = ep.rider_id
  LEFT JOIN public.entry_jokers ej ON ej.entry_id = ep.entry_id AND ej.rider_id = ep.rider_id
  WHERE e.game_id = p_game_id AND e.status = 'submitted';

  RETURN jsonb_build_object(
    'entries', v_entries, 'stages', v_stages, 'categories', v_categories,
    'stage_points', v_stage_points, 'category_points', v_category_points,
    'picks', COALESCE(v_picks, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.game_benchmark_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.subpoule_benchmark_data(uuid, uuid) TO authenticated;
