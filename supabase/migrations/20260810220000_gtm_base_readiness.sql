-- GTM readiness: hide owner key ciphertext from clients; paper-first trading defaults;
-- Nachbar check-in anti-abuse; B2B local peer invites.

-- 1) Column privilege: authenticated clients cannot SELECT owner_key_enc
REVOKE SELECT (owner_key_enc) ON public.wallet_bindings FROM authenticated;
REVOKE SELECT (owner_key_enc) ON public.wallet_bindings FROM anon;

-- 2) Paper / disarmed defaults for safer Base posture
ALTER TABLE public.companies
  ALTER COLUMN trading_paper SET DEFAULT true,
  ALTER COLUMN trading_armed SET DEFAULT false;

UPDATE public.companies
SET trading_paper = true
WHERE trading_armed = false
  AND COALESCE(trading_paper, false) = false;

-- 3) Nachbar: pending check-ins + one request per user/company/day + owner confirm
CREATE OR REPLACE FUNCTION public.nachbar_request_checkin(
  _code text,
  _source text DEFAULT 'qr'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  company public.companies;
  checkin public.nachbar_checkins;
  norm text;
  day_count int;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  PERFORM public.ensure_nachbar_profile();

  norm := upper(regexp_replace(COALESCE(_code, ''), '[^A-Z0-9]', '', 'g'));
  IF length(norm) < 6 THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

  SELECT * INTO company
  FROM public.companies
  WHERE nachbar_checkin_code = norm
  LIMIT 1;

  IF company.id IS NULL THEN
    RAISE EXCEPTION 'shop_not_found';
  END IF;

  SELECT count(*)::int INTO day_count
  FROM public.nachbar_checkins
  WHERE user_id = uid
    AND company_id = company.id
    AND created_at::date = CURRENT_DATE;

  IF day_count >= 1 THEN
    RAISE EXCEPTION 'checkin_limit_day';
  END IF;

  -- Staff confirm required — no silent auto-credit.
  INSERT INTO public.nachbar_checkins (user_id, company_id, status, source, confirmed_at)
  VALUES (
    uid,
    company.id,
    'pending',
    COALESCE(NULLIF(_source, ''), 'qr'),
    NULL
  )
  RETURNING * INTO checkin;

  INSERT INTO public.nachbar_shop_links (user_id, company_id, source)
  VALUES (uid, company.id, 'checkin')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'pending', true,
    'checkin_id', checkin.id,
    'company_id', company.id,
    'company_name', company.name,
    'google_review_url', company.google_review_url,
    'slug', company.slug,
    'message', 'Warte auf Bestätigung im Laden'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.nachbar_confirm_checkin(_checkin_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  checkin public.nachbar_checkins;
  company public.companies;
  week_count int;
  welcome_done boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO checkin FROM public.nachbar_checkins WHERE id = _checkin_id;
  IF checkin.id IS NULL THEN
    RAISE EXCEPTION 'checkin_not_found';
  END IF;
  IF checkin.status <> 'pending' THEN
    RAISE EXCEPTION 'checkin_not_pending';
  END IF;

  SELECT * INTO company FROM public.companies WHERE id = checkin.company_id;
  IF company.id IS NULL OR company.owner_id <> uid THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE public.nachbar_checkins
  SET status = 'confirmed', confirmed_at = now()
  WHERE id = checkin.id
  RETURNING * INTO checkin;

  SELECT welcome_granted_at IS NOT NULL INTO welcome_done
  FROM public.nachbar_profiles WHERE user_id = checkin.user_id;

  IF NOT welcome_done THEN
    UPDATE public.nachbar_profiles SET welcome_granted_at = now() WHERE user_id = checkin.user_id;
    PERFORM public._nachbar_credit(checkin.user_id, 50, 'grant', 'Willkommen bei Aura Nachbar', checkin.id);
  END IF;

  SELECT count(*)::int INTO week_count
  FROM public.nachbar_checkins
  WHERE user_id = checkin.user_id
    AND company_id = company.id
    AND status = 'confirmed'
    AND created_at > now() - interval '7 days'
    AND id <> checkin.id;

  IF week_count < 3 THEN
    PERFORM public._nachbar_credit(
      checkin.user_id,
      CASE WHEN week_count = 0 THEN 40 ELSE 10 END,
      'grant',
      'Check-in · ' || company.name,
      checkin.id
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'checkin_id', checkin.id,
    'user_id', checkin.user_id,
    'company_id', company.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.nachbar_confirm_checkin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nachbar_confirm_checkin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.owner_nachbar_pending_checkins()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  company_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  SELECT id INTO company_id FROM public.companies WHERE owner_id = uid ORDER BY created_at LIMIT 1;
  IF company_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', c.id,
      'user_id', c.user_id,
      'status', c.status,
      'source', c.source,
      'created_at', c.created_at,
      'display_name', p.display_name
    ) ORDER BY c.created_at DESC)
    FROM public.nachbar_checkins c
    LEFT JOIN public.nachbar_profiles p ON p.user_id = c.user_id
    WHERE c.company_id = company_id AND c.status = 'pending'
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.owner_nachbar_pending_checkins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_nachbar_pending_checkins() TO authenticated;

-- Optional column for peer attribution (must exist before accept_local_peer_invite)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS referred_by_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

-- 4) B2B peer invites (seated shop → peer shop)
CREATE TABLE IF NOT EXISTS public.local_peer_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  invitee_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'accepted', 'rewarded', 'revoked')),
  boost_grant integer NOT NULL DEFAULT 2500,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  rewarded_at timestamptz
);

CREATE INDEX IF NOT EXISTS local_peer_invites_inviter_idx
  ON public.local_peer_invites(inviter_company_id, created_at DESC);

ALTER TABLE public.local_peer_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own local_peer_invites" ON public.local_peer_invites;
CREATE POLICY "own local_peer_invites" ON public.local_peer_invites
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = inviter_company_id AND c.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = invitee_company_id AND c.owner_id = auth.uid()
    )
  );

GRANT SELECT ON public.local_peer_invites TO authenticated;
GRANT ALL ON public.local_peer_invites TO service_role;

CREATE OR REPLACE FUNCTION public.create_local_peer_invite()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  company public.companies;
  code text;
  row public.local_peer_invites;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO company FROM public.companies WHERE owner_id = uid ORDER BY created_at LIMIT 1;
  IF company.id IS NULL THEN RAISE EXCEPTION 'no_company'; END IF;
  IF company.local_seat_paid_at IS NULL THEN RAISE EXCEPTION 'seat_required'; END IF;

  code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO public.local_peer_invites (inviter_company_id, code)
  VALUES (company.id, code)
  RETURNING * INTO row;

  RETURN jsonb_build_object(
    'ok', true,
    'code', row.code,
    'invite_id', row.id,
    'boost_grant', row.boost_grant,
    'path', '/lokal?peer=' || row.code
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_local_peer_invite() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_local_peer_invite() TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_local_peer_invite(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  company public.companies;
  inv public.local_peer_invites;
  norm text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  norm := upper(regexp_replace(COALESCE(_code, ''), '[^A-Z0-9]', '', 'g'));
  IF length(norm) < 6 THEN RAISE EXCEPTION 'invalid_code'; END IF;

  SELECT * INTO company FROM public.companies WHERE owner_id = uid ORDER BY created_at LIMIT 1;
  IF company.id IS NULL THEN RAISE EXCEPTION 'no_company'; END IF;

  SELECT * INTO inv FROM public.local_peer_invites WHERE code = norm AND status = 'open' LIMIT 1;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'invite_not_found'; END IF;
  IF inv.inviter_company_id = company.id THEN RAISE EXCEPTION 'self_invite'; END IF;

  UPDATE public.local_peer_invites
  SET status = 'accepted',
      invitee_company_id = company.id,
      accepted_at = now()
  WHERE id = inv.id;

  UPDATE public.companies
  SET referred_by_company_id = inv.inviter_company_id
  WHERE id = company.id
    AND referred_by_company_id IS NULL;

  RETURN jsonb_build_object('ok', true, 'inviter_company_id', inv.inviter_company_id);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_local_peer_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_local_peer_invite(text) TO authenticated;

-- Attach peer reward when Local Seat is paid (Stripe path)
CREATE OR REPLACE FUNCTION public.mark_local_seat_paid_stripe(
  _company_id uuid,
  _boost_grant integer DEFAULT 15000
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.local_peer_invites;
  paid boolean := false;
BEGIN
  UPDATE public.companies
  SET local_seat_paid_at = now(),
      ui_locale = 'de',
      is_local_business = true,
      network_backlink = true
  WHERE id = _company_id
    AND local_seat_paid_at IS NULL;

  IF FOUND THEN
    PERFORM public.grant_local_boost(
      _company_id,
      GREATEST(COALESCE(_boost_grant, 15000), 1),
      'Local Seat Stripe · €99'
    );
    paid := true;

    SELECT * INTO inv
    FROM public.local_peer_invites
    WHERE invitee_company_id = _company_id
      AND status = 'accepted'
    ORDER BY accepted_at DESC NULLS LAST
    LIMIT 1;

    IF inv.id IS NOT NULL THEN
      PERFORM public.grant_local_boost(
        inv.inviter_company_id,
        GREATEST(inv.boost_grant, 1),
        'Peer invite · Local Seat · ' || inv.code
      );
      UPDATE public.local_peer_invites
      SET status = 'rewarded', rewarded_at = now()
      WHERE id = inv.id;
    END IF;
  END IF;
  RETURN paid;
END;
$$;
