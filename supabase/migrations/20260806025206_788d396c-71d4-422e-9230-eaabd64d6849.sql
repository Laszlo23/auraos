-- 1. Smart wallet support on existing wallet slots
ALTER TABLE public.wallet_bindings
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'external',
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS owner_address text,
  ADD COLUMN IF NOT EXISTS deployed boolean NOT NULL DEFAULT false;

-- 2. Agent session keys with spend caps
CREATE TABLE IF NOT EXISTS public.agent_session_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
  wallet_id uuid REFERENCES public.wallet_bindings(id) ON DELETE SET NULL,
  key_address text NOT NULL,
  label text,
  spend_cap integer NOT NULL DEFAULT 0,
  spent integer NOT NULL DEFAULT 0,
  allowed_actions text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_session_keys TO authenticated;
GRANT ALL ON public.agent_session_keys TO service_role;
ALTER TABLE public.agent_session_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own session keys" ON public.agent_session_keys FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND public.owns_company(company_id));

-- 3. Referral codes
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  handle_id uuid REFERENCES public.handles(id) ON DELETE SET NULL,
  code text NOT NULL UNIQUE,
  uses integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.referral_codes TO authenticated;
GRANT SELECT ON public.referral_codes TO anon;
GRANT ALL ON public.referral_codes TO service_role;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own referral code" ON public.referral_codes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "referral codes are publicly checkable" ON public.referral_codes FOR SELECT TO anon, authenticated
  USING (active);

-- 4. Referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  referrer_id uuid NOT NULL,
  referred_id uuid,
  referred_email text,
  stage text NOT NULL DEFAULT 'joined',
  activated_at timestamptz,
  subscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referred_id)
);
GRANT SELECT, INSERT, UPDATE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see own referrals" ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- 5. Earnings ledger
CREATE TABLE IF NOT EXISTS public.earnings_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  referral_id uuid REFERENCES public.referrals(id) ON DELETE SET NULL,
  kind text NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  xp integer NOT NULL DEFAULT 0,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'claimable',
  claimed_at timestamptz,
  tx_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.earnings_ledger TO authenticated;
GRANT ALL ON public.earnings_ledger TO service_role;
ALTER TABLE public.earnings_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see own earnings" ON public.earnings_ledger FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS earnings_user_status_idx ON public.earnings_ledger (user_id, status);
CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals (referrer_id);

-- 6. Mint a referral code for the signed-in founder
CREATE OR REPLACE FUNCTION public.ensure_referral_code()
RETURNS public.referral_codes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  rc public.referral_codes;
  h record;
  candidate text;
  tries int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO rc FROM public.referral_codes WHERE user_id = auth.uid();
  IF FOUND THEN RETURN rc; END IF;

  SELECT id, handle INTO h FROM public.handles WHERE user_id = auth.uid() ORDER BY created_at LIMIT 1;

  LOOP
    tries := tries + 1;
    IF h.handle IS NOT NULL AND tries = 1 THEN
      candidate := upper(regexp_replace(h.handle, '[^a-zA-Z0-9]', '', 'g'));
    ELSE
      candidate := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    END IF;
    EXIT WHEN candidate <> '' AND NOT EXISTS (SELECT 1 FROM public.referral_codes c WHERE c.code = candidate);
    IF tries > 12 THEN RAISE EXCEPTION 'code_generation_failed'; END IF;
  END LOOP;

  INSERT INTO public.referral_codes (user_id, handle_id, code)
  VALUES (auth.uid(), h.id, candidate)
  RETURNING * INTO rc;
  RETURN rc;
END; $$;
REVOKE ALL ON FUNCTION public.ensure_referral_code() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ensure_referral_code() TO authenticated;

-- 7. Attribute a referral to the signed-in user and credit both sides
CREATE OR REPLACE FUNCTION public.attribute_referral(_code text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  rc public.referral_codes;
  ref public.referrals;
  norm text := upper(trim(_code));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = auth.uid()) THEN RETURN false; END IF;

  SELECT * INTO rc FROM public.referral_codes WHERE code = norm AND active;
  IF NOT FOUND OR rc.user_id = auth.uid() THEN RETURN false; END IF;

  INSERT INTO public.referrals (code, referrer_id, referred_id, stage)
  VALUES (norm, rc.user_id, auth.uid(), 'joined')
  RETURNING * INTO ref;

  UPDATE public.referral_codes SET uses = uses + 1 WHERE id = rc.id;

  INSERT INTO public.earnings_ledger (user_id, referral_id, kind, amount, xp, reason)
  VALUES (rc.user_id, ref.id, 'referral_join', 500, 60, 'Referral joined');

  INSERT INTO public.earnings_ledger (user_id, referral_id, kind, amount, xp, reason)
  VALUES (auth.uid(), ref.id, 'welcome', 1000, 0, 'Welcome bonus — invited founder');

  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.attribute_referral(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.attribute_referral(text) TO authenticated;

-- 8. Advance a referral stage (activation / subscription) and pay the referrer
CREATE OR REPLACE FUNCTION public.advance_referral(_stage text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  ref public.referrals;
  reward int;
  bonus_xp int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _stage NOT IN ('activated','subscribed') THEN RAISE EXCEPTION 'bad_stage'; END IF;

  SELECT * INTO ref FROM public.referrals WHERE referred_id = auth.uid();
  IF NOT FOUND THEN RETURN false; END IF;

  IF _stage = 'activated' THEN
    IF ref.activated_at IS NOT NULL THEN RETURN false; END IF;
    reward := 2000; bonus_xp := 150;
    UPDATE public.referrals SET stage = 'activated', activated_at = now() WHERE id = ref.id;
  ELSE
    IF ref.subscribed_at IS NOT NULL THEN RETURN false; END IF;
    reward := 5000; bonus_xp := 400;
    UPDATE public.referrals SET stage = 'subscribed', subscribed_at = now() WHERE id = ref.id;
  END IF;

  INSERT INTO public.earnings_ledger (user_id, referral_id, kind, amount, xp, reason)
  VALUES (ref.referrer_id, ref.id, 'referral_' || _stage, reward, bonus_xp,
          CASE WHEN _stage = 'activated' THEN 'Referral launched a company' ELSE 'Referral subscribed' END);

  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.advance_referral(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.advance_referral(text) TO authenticated;

-- 9. Claim all claimable earnings into the company AURA reserve
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
REVOKE ALL ON FUNCTION public.claim_earnings(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_earnings(uuid) TO authenticated;