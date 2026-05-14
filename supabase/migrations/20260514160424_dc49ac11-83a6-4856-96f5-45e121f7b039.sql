DROP TABLE IF EXISTS public.rubriek_votes  CASCADE;
DROP TABLE IF EXISTS public.rubriek_options CASCADE;
DROP TABLE IF EXISTS public.rubriek_items  CASCADE;

CREATE TABLE public.rubriek_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('text', 'poll')) DEFAULT 'text',
  content     text,
  question    text,
  options     jsonb,
  deadline    timestamptz,
  is_active   boolean NOT NULL DEFAULT false,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.rubriek_votes (
  rubriek_id   uuid NOT NULL REFERENCES public.rubriek_items(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL,
  option_index int  NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (rubriek_id, user_id)
);

ALTER TABLE public.rubriek_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubriek_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rubriek_items_read"  ON public.rubriek_items FOR SELECT USING (true);
CREATE POLICY "rubriek_items_write" ON public.rubriek_items FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "rubriek_votes_read"   ON public.rubriek_votes FOR SELECT USING (true);
CREATE POLICY "rubriek_votes_insert" ON public.rubriek_votes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "rubriek_votes_update" ON public.rubriek_votes FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.cast_rubriek_vote(p_rubriek_id uuid, p_option_index int)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deadline timestamptz;
  v_count    int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;

  SELECT deadline, jsonb_array_length(options)
    INTO v_deadline, v_count
    FROM public.rubriek_items
   WHERE id = p_rubriek_id AND type = 'poll';

  IF v_count IS NULL THEN RAISE EXCEPTION 'Poll niet gevonden'; END IF;
  IF v_deadline IS NOT NULL AND v_deadline <= now() THEN RAISE EXCEPTION 'Poll is gesloten'; END IF;
  IF p_option_index < 0 OR p_option_index >= v_count THEN RAISE EXCEPTION 'Ongeldige optie'; END IF;

  INSERT INTO public.rubriek_votes (rubriek_id, user_id, option_index)
  VALUES (p_rubriek_id, auth.uid(), p_option_index)
  ON CONFLICT (rubriek_id, user_id)
    DO UPDATE SET option_index = EXCLUDED.option_index, created_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_rubriek_vote(uuid, int) TO authenticated;