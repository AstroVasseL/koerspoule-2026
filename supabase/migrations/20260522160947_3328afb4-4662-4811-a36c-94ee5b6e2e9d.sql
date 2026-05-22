CREATE TABLE IF NOT EXISTS public.lefevere_rapporten (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id              uuid NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  stage_count           integer NOT NULL,
  directeurs_analyse    text NOT NULL,
  ploeg_karakterisering text NOT NULL,
  score                 numeric,
  model                 text,
  generated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entry_id, stage_count)
);

CREATE INDEX IF NOT EXISTS lefevere_rapporten_entry_idx
  ON public.lefevere_rapporten (entry_id, stage_count DESC);

ALTER TABLE public.lefevere_rapporten ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lefevere_rapporten_select ON public.lefevere_rapporten;
CREATE POLICY lefevere_rapporten_select ON public.lefevere_rapporten
FOR SELECT USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.id = lefevere_rapporten.entry_id AND e.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS lefevere_rapporten_insert ON public.lefevere_rapporten;
CREATE POLICY lefevere_rapporten_insert ON public.lefevere_rapporten
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.id = lefevere_rapporten.entry_id AND e.user_id = auth.uid()
  )
);