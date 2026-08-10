-- Exclusive paid founding seats (cap 1000), one-invite graph, local fields, founder reviews.
-- Free multi-use codes and whitelist free-seat minting are frozen.

-- ---------------------------------------------------------------------------
-- 1. Extend invite_codes for ownership + kind
-- ---------------------------------------------------------------------------
ALTER TABLE public.invite_codes
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'legacy';

CREATE INDEX IF NOT EXISTS invite_codes_owner_id_idx ON public.invite_codes (owner_id)
  WHERE owner_id IS NOT NULL;

COMMENT ON COLUMN public.invite_codes.kind IS
  'legacy | wave | founding_invite — wave/founding_invite unlock paid checkout; legacy frozen';

-- Freeze seeded free multi-use codes
UPDATE public.invite_codes
   SET active = false,
       uses = GREATEST(uses, max_uses),
       kind = 'legacy',
       label = COALESCE(label, 'Frozen free cohort')
 WHERE code IN ('AURORA', 'ATLAS', 'QUANT');

-- Freeze any previously minted whitelist BETA free invites (unused ones)
UPDATE public.invite_codes
   SET active = false,
       kind = 'legacy'
 WHERE code LIKE 'BETA-%'
   AND kind = 'legacy'
   AND active = true;

-- Bootstrap wave invites (right-to-buy, not free seats) — idempotent
DO $$
DECLARE
  i int;
  candidate text;
BEGIN
  FOR i IN 1..40 LOOP
    candidate := 'WAVE-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    INSERT INTO public.invite_codes (code, label, max_uses, uses, active, kind)
    VALUES (candidate, 'Founding wave invite', 1, 0, true, 'wave')
    ON CONFLICT (code) DO NOTHING;
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- 2. Founding seats (paid door)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.founding_seats (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  stripe_session_id text UNIQUE,
  stripe_payment_intent text,
  amount_cents integer NOT NULL DEFAULT 9900,
  invited_by_code text REFERENCES public.invite_codes (code),
  invited_by_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  outbound_invite_code text REFERENCES public.invite_codes (code),
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS founding_seats_paid_at_idx ON public.founding_seats (paid_at);

GRANT SELECT ON public.founding_seats TO authenticated;
GRANT ALL ON public.founding_seats TO service_role;
ALTER TABLE public.founding_seats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own founding seat" ON public.founding_seats;
CREATE POLICY "Users read own founding seat"
  ON public.founding_seats FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.founding_seat_cap()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 1000 $$;

CREATE OR REPLACE FUNCTION public.founding_seats_taken()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer FROM public.founding_seats;
$$;

REVOKE ALL ON FUNCTION public.founding_seats_taken() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.founding_seats_taken() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.founding_seats_remaining()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(0, public.founding_seat_cap() - public.founding_seats_taken());
$$;

REVOKE ALL ON FUNCTION public.founding_seats_remaining() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.founding_seats_remaining() TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Local business fields on companies
-- ---------------------------------------------------------------------------
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS niche text,
  ADD COLUMN IF NOT EXISTS is_local_business boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS network_backlink boolean NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------------
-- 4. Founder concierge review queue
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.founder_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  site_id uuid REFERENCES public.company_sites (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'reviewed')),
  notes text,
  founder_visible_note text,
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);

CREATE INDEX IF NOT EXISTS founder_reviews_status_idx ON public.founder_reviews (status, created_at);

GRANT SELECT ON public.founder_reviews TO authenticated;
GRANT ALL ON public.founder_reviews TO service_role;
ALTER TABLE public.founder_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners read own founder review" ON public.founder_reviews;
CREATE POLICY "Owners read own founder review"
  ON public.founder_reviews FOR SELECT TO authenticated
  USING (public.owns_company(company_id));

-- ---------------------------------------------------------------------------
-- 5. Seat gate: paid founding seat OR legacy invite/referral grandfather
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_has_company_seat(_uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(_uid, auth.uid()) IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.founding_seats fs
        WHERE fs.user_id = COALESCE(_uid, auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.invite_redemptions ir
        WHERE ir.user_id = COALESCE(_uid, auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.referrals r
        WHERE r.referred_id = COALESCE(_uid, auth.uid())
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- 6. Invite checks — only active wave / founding invites (or remaining uses)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_invite_code(_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.invite_codes
    WHERE code = upper(trim(_code))
      AND active
      AND uses < max_uses
      AND kind IN ('wave', 'founding_invite')
  );
$$;

CREATE OR REPLACE FUNCTION public.referral_code_valid(_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.invite_codes
    WHERE code = upper(trim(_code))
      AND active
      AND uses < max_uses
      AND kind IN ('wave', 'founding_invite')
  )
  OR EXISTS (
    SELECT 1 FROM public.referral_codes
    WHERE code = upper(trim(_code))
      AND active
      AND EXISTS (
        SELECT 1 FROM public.founding_seats fs
        WHERE fs.user_id = referral_codes.user_id
          AND fs.outbound_invite_code = referral_codes.code
      )
      AND EXISTS (
        SELECT 1 FROM public.invite_codes ic
        WHERE ic.code = referral_codes.code
          AND ic.active
          AND ic.uses < ic.max_uses
      )
  );
$$;

-- Stop free invite redemption from granting new seats
CREATE OR REPLACE FUNCTION public.redeem_invite_code(_code text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  -- Idempotent for users who already have any seat path
  IF public.user_has_company_seat(uid) THEN
    RETURN true;
  END IF;

  -- Free redeem disabled — paid founding seat only
  RAISE EXCEPTION 'paid_seat_required'
    USING HINT = 'Purchase a founding seat with a valid invite to unlock company access.';
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_invite_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_invite_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.redeem_invite_code(text) TO authenticated;

-- Whitelist no longer mints free seats
CREATE OR REPLACE FUNCTION public.claim_whitelist_invite(_email text, _visitor_id text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'paid_seats_only'
    USING HINT = 'Founding seats are paid ($99). Use an invite to unlock checkout.';
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Paid reward tiers on referral advance
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.advance_referral(_stage text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref public.referrals;
  reward int;
  bonus_xp int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _stage NOT IN ('activated', 'subscribed') THEN RAISE EXCEPTION 'bad_stage'; END IF;

  SELECT * INTO ref FROM public.referrals WHERE referred_id = auth.uid();
  IF NOT FOUND THEN RETURN false; END IF;

  IF _stage = 'activated' THEN
    IF ref.activated_at IS NOT NULL THEN RETURN false; END IF;
    reward := 1500;
    bonus_xp := 150;
    UPDATE public.referrals SET stage = 'activated', activated_at = now() WHERE id = ref.id;
  ELSE
    IF ref.subscribed_at IS NOT NULL THEN RETURN false; END IF;
    reward := 3500;
    bonus_xp := 400;
    UPDATE public.referrals SET stage = 'subscribed', subscribed_at = now() WHERE id = ref.id;
  END IF;

  INSERT INTO public.earnings_ledger (user_id, referral_id, kind, amount, xp, reason)
  VALUES (
    ref.referrer_id,
    ref.id,
    'referral_' || _stage,
    reward,
    bonus_xp,
    CASE
      WHEN _stage = 'activated' THEN 'Invitee activated company + published site'
      ELSE 'Invitee started AURA compute subscription'
    END
  );

  RETURN true;
END;
$$;

-- attribute_referral: do not grant free seats / join rewards anymore.
-- Paid conversion rewards are granted inside grant_founding_seat.
CREATE OR REPLACE FUNCTION public.attribute_referral(_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  norm text := upper(trim(_code));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = auth.uid()) THEN
    RETURN false;
  END IF;
  -- Soft no-op for clients that still call this; seat requires payment.
  IF NOT public.check_invite_code(norm) AND NOT public.referral_code_valid(norm) THEN
    RETURN false;
  END IF;
  RETURN false;
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. Ensure referral code = founding outbound invite (single-use)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_referral_code()
RETURNS public.referral_codes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rc public.referral_codes;
  seat public.founding_seats;
  inv public.invite_codes;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO seat FROM public.founding_seats WHERE user_id = auth.uid();
  IF NOT FOUND OR seat.outbound_invite_code IS NULL THEN
    -- Legacy: return existing viral code if any
    SELECT * INTO rc FROM public.referral_codes WHERE user_id = auth.uid();
    IF FOUND THEN RETURN rc; END IF;
    RAISE EXCEPTION 'founding_seat_required'
      USING HINT = 'Buy a founding seat to receive your single invite.';
  END IF;

  SELECT * INTO inv FROM public.invite_codes WHERE code = seat.outbound_invite_code;

  SELECT * INTO rc FROM public.referral_codes WHERE user_id = auth.uid();
  IF FOUND THEN
    UPDATE public.referral_codes
       SET code = seat.outbound_invite_code,
           uses = COALESCE(inv.uses, 0),
           active = COALESCE(inv.active, true)
     WHERE id = rc.id
    RETURNING * INTO rc;
    RETURN rc;
  END IF;

  INSERT INTO public.referral_codes (user_id, code, uses, active)
  VALUES (auth.uid(), seat.outbound_invite_code, COALESCE(inv.uses, 0), COALESCE(inv.active, true))
  RETURNING * INTO rc;
  RETURN rc;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_founding_invite()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seat public.founding_seats;
  inv public.invite_codes;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO seat FROM public.founding_seats WHERE user_id = auth.uid();
  IF NOT FOUND OR seat.outbound_invite_code IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT * INTO inv FROM public.invite_codes WHERE code = seat.outbound_invite_code;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'code', inv.code,
    'uses', inv.uses,
    'max_uses', inv.max_uses,
    'active', inv.active,
    'used', inv.uses >= inv.max_uses OR NOT inv.active,
    'paid_at', seat.paid_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_founding_invite() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_founding_invite() TO authenticated;

-- ---------------------------------------------------------------------------
-- 9. Grant founding seat (service role / webhook)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_founding_seat(
  _user_id uuid,
  _stripe_session_id text,
  _invite_code text DEFAULT NULL,
  _amount_cents integer DEFAULT 9900,
  _payment_intent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing public.founding_seats;
  inv public.invite_codes;
  norm text := NULLIF(upper(trim(COALESCE(_invite_code, ''))), '');
  outbound text;
  attempts int := 0;
  ref public.referrals;
  referrer uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'user_required';
  END IF;

  SELECT * INTO existing FROM public.founding_seats WHERE user_id = _user_id;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already', true,
      'outbound_invite_code', existing.outbound_invite_code
    );
  END IF;

  IF _stripe_session_id IS NOT NULL THEN
    SELECT * INTO existing FROM public.founding_seats WHERE stripe_session_id = _stripe_session_id;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', true,
        'already', true,
        'outbound_invite_code', existing.outbound_invite_code
      );
    END IF;
  END IF;

  IF public.founding_seats_taken() >= public.founding_seat_cap() THEN
    RAISE EXCEPTION 'seats_sold_out';
  END IF;

  -- Invite required when seats_taken >= 50 (early open wave without invite for first 50)
  IF norm IS NOT NULL THEN
    SELECT * INTO inv FROM public.invite_codes WHERE code = norm FOR UPDATE;
    IF NOT FOUND OR NOT inv.active OR inv.uses >= inv.max_uses
       OR inv.kind NOT IN ('wave', 'founding_invite') THEN
      RAISE EXCEPTION 'invalid_invite';
    END IF;
    IF inv.owner_id IS NOT NULL AND inv.owner_id = _user_id THEN
      RAISE EXCEPTION 'self_invite';
    END IF;
    referrer := inv.owner_id;
  ELSIF public.founding_seats_taken() >= 50 THEN
    RAISE EXCEPTION 'invite_required';
  END IF;

  -- Mint exactly one outbound invite for this founder
  LOOP
    attempts := attempts + 1;
    outbound := 'INV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    BEGIN
      INSERT INTO public.invite_codes (code, label, max_uses, uses, active, owner_id, kind)
      VALUES (outbound, 'Founding invite', 1, 0, true, _user_id, 'founding_invite');
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF attempts > 10 THEN RAISE EXCEPTION 'invite_mint_failed'; END IF;
    END;
  END LOOP;

  INSERT INTO public.founding_seats (
    user_id,
    stripe_session_id,
    stripe_payment_intent,
    amount_cents,
    invited_by_code,
    invited_by_user_id,
    outbound_invite_code,
    paid_at
  ) VALUES (
    _user_id,
    _stripe_session_id,
    _payment_intent,
    COALESCE(_amount_cents, 9900),
    norm,
    referrer,
    outbound,
    now()
  );

  IF norm IS NOT NULL THEN
    UPDATE public.invite_codes SET uses = uses + 1 WHERE code = norm;
  END IF;

  -- Sync single-use referral_codes row for Earn UI / share links
  INSERT INTO public.referral_codes (user_id, code, uses, active)
  VALUES (_user_id, outbound, 0, true)
  ON CONFLICT (user_id) DO UPDATE
    SET code = EXCLUDED.code,
        uses = 0,
        active = true;

  -- Paid conversion rewards
  IF referrer IS NOT NULL THEN
    INSERT INTO public.referrals (code, referrer_id, referred_id, stage)
    VALUES (norm, referrer, _user_id, 'joined')
    ON CONFLICT (referred_id) DO NOTHING
    RETURNING * INTO ref;

    IF ref.id IS NULL THEN
      SELECT * INTO ref FROM public.referrals WHERE referred_id = _user_id;
    END IF;

    IF ref.id IS NOT NULL THEN
      INSERT INTO public.earnings_ledger (user_id, referral_id, kind, amount, xp, reason)
      VALUES (referrer, ref.id, 'referral_paid_seat', 2500, 200, 'Invitee paid founding seat');

      INSERT INTO public.earnings_ledger (user_id, referral_id, kind, amount, xp, reason)
      VALUES (_user_id, ref.id, 'welcome', 1000, 0, 'Welcome — founding seat (in-app AURA)');

      UPDATE public.referral_codes SET uses = uses + 1 WHERE user_id = referrer AND code = norm;
    END IF;
  ELSE
    -- No referrer: still give invitee a small welcome? Plan says welcome 1000 on invitee pays with invite.
    -- Without invite (early wave): skip welcome.
    NULL;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'already', false,
    'outbound_invite_code', outbound
  );
END;
$$;

REVOKE ALL ON FUNCTION public.grant_founding_seat(uuid, text, text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_founding_seat(uuid, text, text, integer, text) TO service_role;

-- ---------------------------------------------------------------------------
-- 10. Enqueue founder review (on first publish)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_founder_review(_company_id uuid, _site_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rid uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.owns_company(_company_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  INSERT INTO public.founder_reviews (company_id, site_id, status)
  VALUES (_company_id, _site_id, 'queued')
  ON CONFLICT (company_id) DO UPDATE
    SET site_id = COALESCE(EXCLUDED.site_id, public.founder_reviews.site_id)
  RETURNING id INTO rid;
  RETURN rid;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_founder_review(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_founder_review(uuid, uuid) TO authenticated, service_role;

-- Public peer strip for founding network (opt-in local businesses with published sites)
CREATE OR REPLACE FUNCTION public.founding_network_peers(_limit integer DEFAULT 6)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  FROM (
    SELECT
      cs.slug,
      c.name AS company_name,
      c.city,
      c.niche
    FROM public.company_sites cs
    JOIN public.companies c ON c.id = cs.company_id
    WHERE cs.status = 'published'
      AND c.network_backlink = true
      AND c.is_local_business = true
    ORDER BY cs.published_at DESC NULLS LAST
    LIMIT GREATEST(1, LEAST(COALESCE(_limit, 6), 12))
  ) t;
$$;

REVOKE ALL ON FUNCTION public.founding_network_peers(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.founding_network_peers(integer) TO anon, authenticated, service_role;
