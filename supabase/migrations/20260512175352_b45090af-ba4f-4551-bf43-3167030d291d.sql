ALTER TABLE public.games ADD COLUMN IF NOT EXISTS joker_multiplier integer NOT NULL DEFAULT 2;

COMMENT ON COLUMN public.games.joker_multiplier IS 'Multiplier voor joker punten: 1 = normaal, 2 = verdubbeld';