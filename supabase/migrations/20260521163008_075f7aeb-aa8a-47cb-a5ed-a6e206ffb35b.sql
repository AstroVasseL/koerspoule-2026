CREATE TABLE IF NOT EXISTS public.etappe_commentaren (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id      uuid NOT NULL REFERENCES public.stages(id) ON DELETE CASCADE,
  subpoule_id   uuid NOT NULL REFERENCES public.subpoules(id) ON DELETE CASCADE,
  michel_tekst  text NOT NULL,
  jose_tekst    text NOT NULL,
  model         text,
  generated_at  timestamptz NOT NULL DEFAULT now(),
  generated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (stage_id, subpoule_id)
);

CREATE INDEX IF NOT EXISTS etappe_commentaren_subpoule_idx
  ON public.etappe_commentaren (subpoule_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS etappe_commentaren_stage_idx
  ON public.etappe_commentaren (stage_id);

ALTER TABLE public.etappe_commentaren ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS etappe_commentaren_select ON public.etappe_commentaren;
CREATE POLICY etappe_commentaren_select ON public.etappe_commentaren
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.subpoules s
      WHERE s.id = etappe_commentaren.subpoule_id
        AND s.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.subpoule_members m
      WHERE m.subpoule_id = etappe_commentaren.subpoule_id
        AND m.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS etappe_commentaren_admin_write ON public.etappe_commentaren;
CREATE POLICY etappe_commentaren_admin_write ON public.etappe_commentaren
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'etappe_commentaren'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.etappe_commentaren;
  END IF;
END $$;