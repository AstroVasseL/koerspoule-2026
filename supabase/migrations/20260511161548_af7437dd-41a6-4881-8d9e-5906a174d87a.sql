
-- 1. Uitbreidingen op chat_messages
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS mentions uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS chat_messages_subpoule_created_idx
  ON public.chat_messages (subpoule_id, created_at DESC);

-- Allow UPDATE on own messages (was forbidden before)
DROP POLICY IF EXISTS chat_messages_update_own ON public.chat_messages;
CREATE POLICY chat_messages_update_own ON public.chat_messages
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- 2. chat_read_states
CREATE TABLE IF NOT EXISTS public.chat_read_states (
  subpoule_id uuid NOT NULL,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subpoule_id, user_id)
);
ALTER TABLE public.chat_read_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_read_states_select ON public.chat_read_states;
CREATE POLICY chat_read_states_select ON public.chat_read_states
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS chat_read_states_upsert ON public.chat_read_states;
CREATE POLICY chat_read_states_upsert ON public.chat_read_states
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS chat_read_states_update ON public.chat_read_states;
CREATE POLICY chat_read_states_update ON public.chat_read_states
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. chat_message_reactions
CREATE TABLE IF NOT EXISTS public.chat_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_reactions_select ON public.chat_message_reactions;
CREATE POLICY chat_reactions_select ON public.chat_message_reactions
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE m.id = chat_message_reactions.message_id
        AND (
          m.subpoule_id IS NULL
          OR public.is_admin()
          OR public.is_subpoule_member(m.subpoule_id, auth.uid())
          OR EXISTS (SELECT 1 FROM public.subpoules s WHERE s.id = m.subpoule_id AND s.owner_user_id = auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS chat_reactions_insert ON public.chat_message_reactions;
CREATE POLICY chat_reactions_insert ON public.chat_message_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE m.id = chat_message_reactions.message_id
        AND (
          m.subpoule_id IS NULL
          OR public.is_admin()
          OR public.is_subpoule_member(m.subpoule_id, auth.uid())
          OR EXISTS (SELECT 1 FROM public.subpoules s WHERE s.id = m.subpoule_id AND s.owner_user_id = auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS chat_reactions_delete ON public.chat_message_reactions;
CREATE POLICY chat_reactions_delete ON public.chat_message_reactions
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

-- 4. chat_polls + chat_poll_votes
CREATE TABLE IF NOT EXISTS public.chat_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subpoule_id uuid NOT NULL,
  message_id uuid REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL,
  deadline timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_polls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_polls_select ON public.chat_polls;
CREATE POLICY chat_polls_select ON public.chat_polls
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      public.is_admin()
      OR public.is_subpoule_member(subpoule_id, auth.uid())
      OR EXISTS (SELECT 1 FROM public.subpoules s WHERE s.id = chat_polls.subpoule_id AND s.owner_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS chat_polls_insert ON public.chat_polls;
CREATE POLICY chat_polls_insert ON public.chat_polls
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND (
      public.is_admin()
      OR public.is_subpoule_member(subpoule_id, auth.uid())
      OR EXISTS (SELECT 1 FROM public.subpoules s WHERE s.id = chat_polls.subpoule_id AND s.owner_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS chat_polls_delete ON public.chat_polls;
CREATE POLICY chat_polls_delete ON public.chat_polls
  FOR DELETE USING (created_by = auth.uid() OR public.is_admin());

CREATE TABLE IF NOT EXISTS public.chat_poll_votes (
  poll_id uuid NOT NULL REFERENCES public.chat_polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  option_index int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)
);
ALTER TABLE public.chat_poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_poll_votes_select ON public.chat_poll_votes;
CREATE POLICY chat_poll_votes_select ON public.chat_poll_votes
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chat_polls p
      WHERE p.id = chat_poll_votes.poll_id
        AND (
          public.is_admin()
          OR public.is_subpoule_member(p.subpoule_id, auth.uid())
          OR EXISTS (SELECT 1 FROM public.subpoules s WHERE s.id = p.subpoule_id AND s.owner_user_id = auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS chat_poll_votes_insert ON public.chat_poll_votes;
CREATE POLICY chat_poll_votes_insert ON public.chat_poll_votes
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.chat_polls p
      WHERE p.id = chat_poll_votes.poll_id
        AND (p.deadline IS NULL OR p.deadline > now())
        AND (
          public.is_admin()
          OR public.is_subpoule_member(p.subpoule_id, auth.uid())
          OR EXISTS (SELECT 1 FROM public.subpoules s WHERE s.id = p.subpoule_id AND s.owner_user_id = auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS chat_poll_votes_delete ON public.chat_poll_votes;
CREATE POLICY chat_poll_votes_delete ON public.chat_poll_votes
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

-- 5. RPC's

-- Mark subpoule as read
CREATE OR REPLACE FUNCTION public.mark_subpoule_read(p_subpoule_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  INSERT INTO public.chat_read_states (subpoule_id, user_id, last_read_at, updated_at)
  VALUES (p_subpoule_id, auth.uid(), now(), now())
  ON CONFLICT (subpoule_id, user_id)
  DO UPDATE SET last_read_at = now(), updated_at = now();
END $$;

-- Unread counts per subpoule for this user (for a given game)
CREATE OR REPLACE FUNCTION public.subpoule_unread_counts(p_game_id uuid)
RETURNS TABLE(subpoule_id uuid, unread_count int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH my_subs AS (
    SELECT s.id, s.owner_user_id
    FROM public.subpoules s
    WHERE s.game_id = p_game_id
      AND (s.owner_user_id = auth.uid() OR public.is_subpoule_member(s.id, auth.uid()))
  ),
  reads AS (
    SELECT subpoule_id, last_read_at FROM public.chat_read_states WHERE user_id = auth.uid()
  )
  SELECT ms.id AS subpoule_id,
    COALESCE((
      SELECT count(*)::int FROM public.chat_messages m
      WHERE m.subpoule_id = ms.id
        AND m.user_id <> auth.uid()
        AND m.deleted_at IS NULL
        AND (m.created_at > COALESCE((SELECT last_read_at FROM reads r WHERE r.subpoule_id = ms.id), 'epoch'::timestamptz))
    ), 0)
  FROM my_subs ms;
$$;

-- Edit own message
CREATE OR REPLACE FUNCTION public.edit_chat_message(p_message_id uuid, p_body text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  IF p_body IS NULL OR length(trim(p_body)) = 0 THEN RAISE EXCEPTION 'Leeg bericht'; END IF;
  IF length(p_body) > 2000 THEN RAISE EXCEPTION 'Bericht te lang'; END IF;
  SELECT user_id INTO v_owner FROM public.chat_messages WHERE id = p_message_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Bericht niet gevonden'; END IF;
  IF v_owner <> auth.uid() AND NOT public.is_admin() THEN RAISE EXCEPTION 'Niet toegestaan'; END IF;
  UPDATE public.chat_messages
     SET body = p_body, edited_at = now()
   WHERE id = p_message_id AND deleted_at IS NULL;
END $$;

-- Soft delete
CREATE OR REPLACE FUNCTION public.soft_delete_chat_message(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  SELECT user_id INTO v_owner FROM public.chat_messages WHERE id = p_message_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Bericht niet gevonden'; END IF;
  IF v_owner <> auth.uid() AND NOT public.is_admin() THEN RAISE EXCEPTION 'Niet toegestaan'; END IF;
  UPDATE public.chat_messages
     SET deleted_at = now(), body = ''
   WHERE id = p_message_id;
END $$;

-- Toggle reaction
CREATE OR REPLACE FUNCTION public.toggle_chat_reaction(p_message_id uuid, p_emoji text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_existing uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  IF p_emoji IS NULL OR length(p_emoji) = 0 OR length(p_emoji) > 16 THEN RAISE EXCEPTION 'Ongeldige emoji'; END IF;
  SELECT id INTO v_existing FROM public.chat_message_reactions
   WHERE message_id = p_message_id AND user_id = auth.uid() AND emoji = p_emoji;
  IF v_existing IS NOT NULL THEN
    DELETE FROM public.chat_message_reactions WHERE id = v_existing;
  ELSE
    INSERT INTO public.chat_message_reactions(message_id, user_id, emoji)
    VALUES (p_message_id, auth.uid(), p_emoji);
  END IF;
END $$;

-- Create poll (also creates a chat_messages row tying it to the chat stream)
CREATE OR REPLACE FUNCTION public.create_chat_poll(
  p_subpoule_id uuid, p_game_id uuid, p_question text, p_options jsonb, p_deadline timestamptz
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_msg uuid; v_poll uuid; v_count int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  IF p_question IS NULL OR length(trim(p_question)) < 3 THEN RAISE EXCEPTION 'Vraag te kort'; END IF;
  IF length(p_question) > 200 THEN RAISE EXCEPTION 'Vraag te lang'; END IF;
  IF jsonb_typeof(p_options) <> 'array' THEN RAISE EXCEPTION 'Opties moeten een lijst zijn'; END IF;
  v_count := jsonb_array_length(p_options);
  IF v_count < 2 OR v_count > 6 THEN RAISE EXCEPTION 'Tussen 2 en 6 opties'; END IF;
  IF NOT (
    public.is_admin()
    OR public.is_subpoule_member(p_subpoule_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.subpoules s WHERE s.id = p_subpoule_id AND s.owner_user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Geen toegang tot deze subpoule';
  END IF;

  INSERT INTO public.chat_messages(subpoule_id, game_id, user_id, body)
  VALUES (p_subpoule_id, p_game_id, auth.uid(), '[poll]')
  RETURNING id INTO v_msg;

  INSERT INTO public.chat_polls(subpoule_id, message_id, question, options, deadline, created_by)
  VALUES (p_subpoule_id, v_msg, trim(p_question), p_options, p_deadline, auth.uid())
  RETURNING id INTO v_poll;

  RETURN v_poll;
END $$;

-- Cast vote (one per user; toggling allowed by replacing)
CREATE OR REPLACE FUNCTION public.cast_chat_poll_vote(p_poll_id uuid, p_option_index int)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_deadline timestamptz; v_count int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  SELECT deadline, jsonb_array_length(options) INTO v_deadline, v_count
    FROM public.chat_polls WHERE id = p_poll_id;
  IF v_count IS NULL THEN RAISE EXCEPTION 'Poll niet gevonden'; END IF;
  IF v_deadline IS NOT NULL AND v_deadline <= now() THEN RAISE EXCEPTION 'Poll is gesloten'; END IF;
  IF p_option_index < 0 OR p_option_index >= v_count THEN RAISE EXCEPTION 'Ongeldige optie'; END IF;
  INSERT INTO public.chat_poll_votes(poll_id, user_id, option_index)
  VALUES (p_poll_id, auth.uid(), p_option_index)
  ON CONFLICT (poll_id, user_id) DO UPDATE SET option_index = EXCLUDED.option_index, created_at = now();
END $$;

-- 6. Realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reactions;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_polls;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_poll_votes;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_message_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.chat_polls REPLICA IDENTITY FULL;
ALTER TABLE public.chat_poll_votes REPLICA IDENTITY FULL;
