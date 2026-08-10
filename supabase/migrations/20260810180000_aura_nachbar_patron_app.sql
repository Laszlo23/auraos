-- Aura Nachbar: patron profiles, check-ins, referrals, ledger
-- (Compliant earn — rewards for check-ins/referrals, never for Google reviews)
-- Applied remotely; keep in sync.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS nachbar_checkin_code text;

UPDATE public.companies
SET nachbar_checkin_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE nachbar_checkin_code IS NULL
  AND COALESCE(is_local_business, false) = true;

CREATE UNIQUE INDEX IF NOT EXISTS companies_nachbar_checkin_code_uidx
  ON public.companies (nachbar_checkin_code)
  WHERE nachbar_checkin_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.nachbar_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text,
  city text,
  referral_code text NOT NULL UNIQUE,
  referred_by uuid REFERENCES auth.users (id),
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  welcome_granted_at timestamptz,
  home_company_id uuid REFERENCES public.companies (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nachbar_profiles_referral_format CHECK (referral_code ~ '^[A-Z0-9]{6,12}$')
);

CREATE TABLE IF NOT EXISTS public.nachbar_shop_links (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, company_id)
);

CREATE TABLE IF NOT EXISTS public.nachbar_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'rejected')),
  source text NOT NULL DEFAULT 'qr',
  review_invite_token text,
  confirmed_at timestamptz,
  confirmed_by uuid REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nachbar_checkins_company_pending_idx
  ON public.nachbar_checkins (company_id, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS nachbar_checkins_user_idx
  ON public.nachbar_checkins (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.nachbar_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('grant', 'spend', 'referral')),
  amount integer NOT NULL CHECK (amount <> 0),
  reason text NOT NULL,
  checkin_id uuid REFERENCES public.nachbar_checkins (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nachbar_ledger_user_idx
  ON public.nachbar_ledger (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.nachbar_friend_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'joined'
    CHECK (status IN ('joined', 'activated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  UNIQUE (invitee_id)
);

ALTER TABLE public.nachbar_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nachbar_shop_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nachbar_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nachbar_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nachbar_friend_links ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY nachbar_profiles_select_own ON public.nachbar_profiles
    FOR SELECT TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY nachbar_profiles_update_own ON public.nachbar_profiles
    FOR UPDATE TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY nachbar_shop_links_select_own ON public.nachbar_shop_links
    FOR SELECT TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY nachbar_checkins_select_own ON public.nachbar_checkins
    FOR SELECT TO authenticated
    USING (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.companies c
        WHERE c.id = company_id AND c.owner_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY nachbar_ledger_select_own ON public.nachbar_ledger
    FOR SELECT TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY nachbar_friend_links_select_own ON public.nachbar_friend_links
    FOR SELECT TO authenticated
    USING (inviter_id = auth.uid() OR invitee_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT, UPDATE ON public.nachbar_profiles TO authenticated;
GRANT SELECT ON public.nachbar_shop_links TO authenticated;
GRANT SELECT ON public.nachbar_checkins TO authenticated;
GRANT SELECT ON public.nachbar_ledger TO authenticated;
GRANT SELECT ON public.nachbar_friend_links TO authenticated;

CREATE OR REPLACE FUNCTION public._nachbar_random_code(len int DEFAULT 8)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  out text := '';
  i int;
BEGIN
  FOR i IN 1..len LOOP
    out := out || substr(alphabet, 1 + (get_byte(gen_random_bytes(1), 0) % length(alphabet)), 1);
  END LOOP;
  RETURN out;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_nachbar_checkin_code(_company_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
BEGIN
  SELECT nachbar_checkin_code INTO code FROM public.companies WHERE id = _company_id FOR UPDATE;
  IF code IS NOT NULL THEN
    RETURN code;
  END IF;
  LOOP
    code := public._nachbar_random_code(8);
    BEGIN
      UPDATE public.companies SET nachbar_checkin_code = code WHERE id = _company_id;
      RETURN code;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_nachbar_profile(
  _city text DEFAULT NULL,
  _display_name text DEFAULT NULL,
  _home_company_id uuid DEFAULT NULL,
  _friend_code text DEFAULT NULL
)
RETURNS public.nachbar_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  row public.nachbar_profiles;
  code text;
  inviter uuid;
  friend_norm text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO row FROM public.nachbar_profiles WHERE user_id = uid;
  IF FOUND THEN
    UPDATE public.nachbar_profiles
    SET
      city = COALESCE(NULLIF(trim(_city), ''), city),
      display_name = COALESCE(NULLIF(trim(_display_name), ''), display_name),
      home_company_id = COALESCE(_home_company_id, home_company_id),
      updated_at = now()
    WHERE user_id = uid
    RETURNING * INTO row;
  ELSE
    LOOP
      code := public._nachbar_random_code(8);
      BEGIN
        INSERT INTO public.nachbar_profiles (
          user_id, display_name, city, referral_code, home_company_id
        ) VALUES (
          uid,
          NULLIF(trim(_display_name), ''),
          NULLIF(trim(_city), ''),
          code,
          _home_company_id
        ) RETURNING * INTO row;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        NULL;
      END;
    END LOOP;

    friend_norm := upper(regexp_replace(COALESCE(_friend_code, ''), '[^A-Z0-9]', '', 'g'));
    IF friend_norm <> '' THEN
      SELECT user_id INTO inviter
      FROM public.nachbar_profiles
      WHERE referral_code = friend_norm AND user_id <> uid;
      IF inviter IS NOT NULL THEN
        UPDATE public.nachbar_profiles SET referred_by = inviter WHERE user_id = uid;
        INSERT INTO public.nachbar_friend_links (inviter_id, invitee_id, status)
        VALUES (inviter, uid, 'joined')
        ON CONFLICT (invitee_id) DO NOTHING;
      END IF;
    END IF;
  END IF;

  IF _home_company_id IS NOT NULL THEN
    INSERT INTO public.nachbar_shop_links (user_id, company_id, source)
    VALUES (uid, _home_company_id, 'onboarding')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN row;
END;
$$;

CREATE OR REPLACE FUNCTION public._nachbar_credit(
  _user_id uuid,
  _amount integer,
  _kind text,
  _reason text,
  _checkin_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _amount IS NULL OR _amount = 0 THEN
    RETURN;
  END IF;
  UPDATE public.nachbar_profiles
  SET balance = balance + _amount, updated_at = now()
  WHERE user_id = _user_id;
  INSERT INTO public.nachbar_ledger (user_id, kind, amount, reason, checkin_id)
  VALUES (_user_id, _kind, _amount, _reason, _checkin_id);
END;
$$;

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
  week_count int;
  inviter uuid;
  welcome_done boolean;
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

  INSERT INTO public.nachbar_checkins (user_id, company_id, status, source, confirmed_at)
  VALUES (
    uid,
    company.id,
    'confirmed',
    COALESCE(NULLIF(_source, ''), 'qr'),
    now()
  )
  RETURNING * INTO checkin;

  INSERT INTO public.nachbar_shop_links (user_id, company_id, source)
  VALUES (uid, company.id, 'checkin')
  ON CONFLICT DO NOTHING;

  SELECT welcome_granted_at IS NOT NULL INTO welcome_done
  FROM public.nachbar_profiles WHERE user_id = uid;

  IF NOT welcome_done THEN
    UPDATE public.nachbar_profiles SET welcome_granted_at = now() WHERE user_id = uid;
    PERFORM public._nachbar_credit(uid, 50, 'grant', 'Willkommen bei Aura Nachbar', checkin.id);
  END IF;

  SELECT count(*)::int INTO week_count
  FROM public.nachbar_checkins
  WHERE user_id = uid
    AND company_id = company.id
    AND status = 'confirmed'
    AND created_at > now() - interval '7 days'
    AND id <> checkin.id;

  IF week_count < 3 THEN
    PERFORM public._nachbar_credit(
      uid,
      CASE WHEN week_count = 0 THEN 40 ELSE 10 END,
      'grant',
      'Check-in · ' || company.name,
      checkin.id
    );
  END IF;

  SELECT inviter_id INTO inviter
  FROM public.nachbar_friend_links
  WHERE invitee_id = uid AND status = 'joined'
  LIMIT 1;

  IF inviter IS NOT NULL THEN
    UPDATE public.nachbar_friend_links
    SET status = 'activated', activated_at = now()
    WHERE invitee_id = uid AND status = 'joined';
    PERFORM public._nachbar_credit(inviter, 25, 'referral', 'Freund-Check-in', checkin.id);
    PERFORM public._nachbar_credit(uid, 25, 'referral', 'Eingeladen von Freund', checkin.id);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'checkin_id', checkin.id,
    'company_id', company.id,
    'company_name', company.name,
    'google_review_url', company.google_review_url,
    'slug', company.slug
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.nachbar_link_shop(_company_id uuid, _source text DEFAULT 'card')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  PERFORM public.ensure_nachbar_profile(NULL, NULL, _company_id, NULL);
  INSERT INTO public.nachbar_shop_links (user_id, company_id, source)
  VALUES (uid, _company_id, COALESCE(_source, 'card'))
  ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.nachbar_public_shops(_limit integer DEFAULT 24)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  city text,
  niche text,
  tagline text,
  homepage_url text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT c.id, c.name, c.slug, c.city, c.niche, c.tagline, c.homepage_url
  FROM public.companies c
  WHERE COALESCE(c.is_local_business, false) = true
    AND c.slug IS NOT NULL
    AND c.local_seat_paid_at IS NOT NULL
  ORDER BY c.local_cohort_number NULLS LAST, c.created_at
  LIMIT GREATEST(LEAST(COALESCE(_limit, 24), 50), 1);
$$;

CREATE OR REPLACE FUNCTION public.get_nachbar_hub()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  profile public.nachbar_profiles;
  ledger jsonb;
  shops jsonb;
  friends jsonb;
  checkins jsonb;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  profile := public.ensure_nachbar_profile();

  SELECT coalesce(jsonb_agg(x ORDER BY (x->>'created_at') DESC), '[]'::jsonb)
  INTO ledger
  FROM (
    SELECT jsonb_build_object(
      'id', l.id,
      'kind', l.kind,
      'amount', l.amount,
      'reason', l.reason,
      'created_at', l.created_at
    ) AS x
    FROM public.nachbar_ledger l
    WHERE l.user_id = uid
    ORDER BY l.created_at DESC
    LIMIT 30
  ) s;

  SELECT coalesce(jsonb_agg(x), '[]'::jsonb)
  INTO shops
  FROM (
    SELECT jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'slug', c.slug,
      'city', c.city,
      'niche', c.niche
    ) AS x
    FROM public.nachbar_shop_links sl
    JOIN public.companies c ON c.id = sl.company_id
    WHERE sl.user_id = uid
    ORDER BY sl.created_at DESC
    LIMIT 20
  ) s;

  SELECT coalesce(jsonb_agg(x), '[]'::jsonb)
  INTO friends
  FROM (
    SELECT jsonb_build_object(
      'invitee_id', f.invitee_id,
      'status', f.status,
      'created_at', f.created_at,
      'activated_at', f.activated_at
    ) AS x
    FROM public.nachbar_friend_links f
    WHERE f.inviter_id = uid
    ORDER BY f.created_at DESC
    LIMIT 30
  ) s;

  SELECT coalesce(jsonb_agg(x), '[]'::jsonb)
  INTO checkins
  FROM (
    SELECT jsonb_build_object(
      'id', ch.id,
      'company_name', c.name,
      'status', ch.status,
      'created_at', ch.created_at,
      'google_review_url', c.google_review_url
    ) AS x
    FROM public.nachbar_checkins ch
    JOIN public.companies c ON c.id = ch.company_id
    WHERE ch.user_id = uid
    ORDER BY ch.created_at DESC
    LIMIT 20
  ) s;

  RETURN jsonb_build_object(
    'profile', jsonb_build_object(
      'user_id', profile.user_id,
      'display_name', profile.display_name,
      'city', profile.city,
      'referral_code', profile.referral_code,
      'balance', profile.balance,
      'home_company_id', profile.home_company_id,
      'welcome_granted_at', profile.welcome_granted_at
    ),
    'ledger', ledger,
    'shops', shops,
    'friends', friends,
    'checkins', checkins
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_nachbar_checkin_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cid uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  SELECT id INTO cid FROM public.companies WHERE owner_id = uid ORDER BY created_at LIMIT 1;
  IF cid IS NULL THEN
    RAISE EXCEPTION 'company_not_found';
  END IF;
  RETURN public.ensure_nachbar_checkin_code(cid);
END;
$$;

REVOKE ALL ON FUNCTION public._nachbar_random_code(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._nachbar_credit(uuid, integer, text, text, uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.ensure_nachbar_checkin_code(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_nachbar_checkin_code(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.ensure_nachbar_profile(text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_nachbar_profile(text, text, uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.nachbar_request_checkin(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nachbar_request_checkin(text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.nachbar_link_shop(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nachbar_link_shop(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.nachbar_public_shops(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nachbar_public_shops(integer) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_nachbar_hub() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_nachbar_hub() TO authenticated;

REVOKE ALL ON FUNCTION public.owner_nachbar_checkin_code() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_nachbar_checkin_code() TO authenticated;
