-- 1. Referral codes: stop exposing raw rows (user_id) to anon/authenticated
DROP POLICY IF EXISTS "referral codes are publicly checkable" ON public.referral_codes;

CREATE OR REPLACE FUNCTION public.referral_code_valid(_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.referral_codes
    WHERE code = upper(trim(_code)) AND active
  );
$$;

REVOKE ALL ON FUNCTION public.referral_code_valid(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.referral_code_valid(text) TO anon, authenticated;

-- 2. x402 call log: scope to owning company
ALTER TABLE public.x402_calls ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS x402_calls_company_id_idx ON public.x402_calls (company_id);

DROP POLICY IF EXISTS "Founders can read the call log" ON public.x402_calls;
CREATE POLICY "Owners read their own call log"
ON public.x402_calls FOR SELECT TO authenticated
USING (company_id IS NOT NULL AND public.owns_company(company_id));

-- 3. Lock down SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_entry_stakes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_milestone_cheers() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.owns_company(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_company(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.advance_referral(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.advance_referral(text) TO authenticated;

REVOKE ALL ON FUNCTION public.attribute_referral(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attribute_referral(text) TO authenticated;

REVOKE ALL ON FUNCTION public.claim_earnings(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_earnings(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.ensure_referral_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_referral_code() TO authenticated;

REVOKE ALL ON FUNCTION public.recompute_entry_score(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recompute_entry_score(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.spin_daily_wheel(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spin_daily_wheel(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.redeem_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_invite_code(text) TO anon, authenticated;