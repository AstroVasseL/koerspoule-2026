ALTER TABLE public.stages
  ADD COLUMN IF NOT EXISTS distance_km integer,
  ADD COLUMN IF NOT EXISTS is_gc boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS stages_one_gc_per_game
  ON public.stages (game_id) WHERE is_gc = true;