ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_visited_karavaan timestamptz;

CREATE OR REPLACE FUNCTION public.touch_karavaan_visit()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET last_visited_karavaan = now()
  WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.touch_karavaan_visit() FROM public;
GRANT EXECUTE ON FUNCTION public.touch_karavaan_visit() TO authenticated;