CREATE OR REPLACE FUNCTION public.claim_earnings(_company_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  total int := 0;
  total_xp int := 0;
BEGIN
  IF NOT public.owns_company(_company_id) THEN RAISE EXCEPTION 'not_authorized'; END IF;

  SELECT COALESCE(sum(amount),0), COALESCE(sum(xp),0) INTO total, total_xp
    FROM public.earnings_ledger
   WHERE user_id = auth.uid() AND status = 'claimable';

  IF total = 0 AND total_xp = 0 THEN RETURN 0; END IF;

  -- Never burn rewards into a reserve that does not exist yet.
  IF total > 0 AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions WHERE company_id = _company_id
  ) THEN
    RAISE EXCEPTION 'no_reserve';
  END IF;

  UPDATE public.earnings_ledger
     SET status = 'claimed', claimed_at = now(), company_id = COALESCE(company_id, _company_id)
   WHERE user_id = auth.uid() AND status = 'claimable';

  IF total > 0 THEN
    UPDATE public.subscriptions SET tokens_remaining = tokens_remaining + total WHERE company_id = _company_id;
    INSERT INTO public.token_ledger (company_id, kind, amount, reason)
    VALUES (_company_id, 'grant', total, 'Earnings claim');
  END IF;

  IF total_xp > 0 THEN
    UPDATE public.founder_progress SET xp = xp + total_xp WHERE company_id = _company_id;
  END IF;

  RETURN total;
END; $$;