-- Scout invite codes: any Vienna scout can mint a reusable referral_codes row
-- so /lokal?ref=CODE attributes into referrals → attribute_scout_business on Local seat pay.

CREATE OR REPLACE FUNCTION public.ensure_scout_referral_code()
RETURNS public.referral_codes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rc public.referral_codes;
  candidate text;
  tries int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.aura_scouts WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'scout_required'
      USING HINT = 'Join Scouts on /quest before minting a Scout invite.';
  END IF;

  SELECT * INTO rc FROM public.referral_codes WHERE user_id = auth.uid();
  IF FOUND THEN
    IF rc.active IS DISTINCT FROM true THEN
      UPDATE public.referral_codes SET active = true WHERE id = rc.id RETURNING * INTO rc;
    END IF;
    RETURN rc;
  END IF;

  LOOP
    tries := tries + 1;
    candidate := 'SC' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.referral_codes c WHERE c.code = candidate)
      AND NOT EXISTS (SELECT 1 FROM public.invite_codes i WHERE i.code = candidate);
    IF tries > 12 THEN RAISE EXCEPTION 'scout_code_generation_failed'; END IF;
  END LOOP;

  INSERT INTO public.referral_codes (user_id, code, uses, active)
  VALUES (auth.uid(), candidate, 0, true)
  RETURNING * INTO rc;
  RETURN rc;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_scout_referral_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_scout_referral_code() FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_scout_referral_code() TO authenticated;

COMMENT ON FUNCTION public.ensure_scout_referral_code() IS
  'Mint or return a reusable referral code for Aura Scouts (Local seat attribution).';
