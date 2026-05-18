CREATE OR REPLACE FUNCTION public.public_unsubscribe(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email
  FROM public.email_unsubscribe_tokens
  WHERE token = p_token;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ongeldige of verlopen link');
  END IF;

  UPDATE public.email_unsubscribe_tokens
  SET used_at = now()
  WHERE token = p_token;

  INSERT INTO public.suppressed_emails (email, reason)
  VALUES (v_email, 'unsubscribe')
  ON CONFLICT (email) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'email', v_email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_unsubscribe(text) TO anon, authenticated;