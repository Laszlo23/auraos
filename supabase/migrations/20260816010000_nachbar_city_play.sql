-- Nachbar city play: stamps, weekly missions, friend bonus on confirm,
-- reject/expire, AURA reservation weight. Guest ledger only.

CREATE OR REPLACE FUNCTION public._nachbar_week_key()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT to_char((now() AT TIME ZONE 'Europe/Vienna'), 'IYYY-"W"IW');
$$;

CREATE OR REPLACE FUNCTION public._nachbar_week_start()
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT date_trunc('week', (now() AT TIME ZONE 'Europe/Vienna'))::date;
$$;

CREATE TABLE IF NOT EXISTS public.nachbar_progress (
  user_id uuid PRIMARY KEY REFERENCES public.nachbar_profiles (user_id) ON DELETE CASCADE,
  streak_days integer NOT NULL DEFAULT 0,
  last_confirmed_day date,
  city_score integer NOT NULL DEFAULT 0,
  aura_weight integer NOT NULL DEFAULT 0,
  last_share_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nachbar_stamps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  window_start date NOT NULL,
  stamp_count integer NOT NULL DEFAULT 0,
  filled_at timestamptz,
  UNIQUE (user_id, company_id, window_start)
);

CREATE TABLE IF NOT EXISTS public.nachbar_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN (
    'discover', 'visit', 'stamp', 'friend', 'share_after_visit', 'ar_scan', 'feedback'
  )),
  title text NOT NULL,
  body text NOT NULL,
  grant_amount integer NOT NULL DEFAULT 15,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.nachbar_mission_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES public.nachbar_missions (id) ON DELETE CASCADE,
  week_key text NOT NULL,
  checkin_id uuid REFERENCES public.nachbar_checkins (id) ON DELETE SET NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_id, week_key)
);

CREATE TABLE IF NOT EXISTS public.nachbar_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  checkin_id uuid REFERENCES public.nachbar_checkins (id) ON DELETE SET NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, checkin_id)
);

CREATE INDEX IF NOT EXISTS nachbar_stamps_user_idx
  ON public.nachbar_stamps (user_id, window_start DESC);
CREATE INDEX IF NOT EXISTS nachbar_mission_progress_user_idx
  ON public.nachbar_mission_progress (user_id, week_key);
CREATE INDEX IF NOT EXISTS nachbar_feedback_company_idx
  ON public.nachbar_feedback (company_id, created_at DESC);

ALTER TABLE public.nachbar_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nachbar_stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nachbar_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nachbar_mission_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nachbar_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own nachbar progress" ON public.nachbar_progress;
CREATE POLICY "own nachbar progress"
  ON public.nachbar_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own nachbar stamps" ON public.nachbar_stamps;
CREATE POLICY "own nachbar stamps"
  ON public.nachbar_stamps FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "read nachbar missions" ON public.nachbar_missions;
CREATE POLICY "read nachbar missions"
  ON public.nachbar_missions FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "own nachbar mission progress" ON public.nachbar_mission_progress;
CREATE POLICY "own nachbar mission progress"
  ON public.nachbar_mission_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own nachbar feedback" ON public.nachbar_feedback;
CREATE POLICY "own nachbar feedback"
  ON public.nachbar_feedback FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_id AND c.owner_id = auth.uid()
    )
  );

GRANT SELECT ON public.nachbar_progress TO authenticated;
GRANT SELECT ON public.nachbar_stamps TO authenticated;
GRANT SELECT ON public.nachbar_missions TO anon, authenticated;
GRANT SELECT ON public.nachbar_mission_progress TO authenticated;
GRANT SELECT ON public.nachbar_feedback TO authenticated;

INSERT INTO public.nachbar_missions (slug, kind, title, body, grant_amount, sort_order)
VALUES
  ('wien-besuch', 'visit', 'Heute einchecken', 'Ein bestätigter Besuch irgendwo in Wien.', 15, 1),
  ('wien-entdecken', 'discover', 'Neuen Laden finden', 'Erster bestätigter Besuch in einem Laden, den du noch nicht hattest.', 25, 2),
  ('wien-ar', 'ar_scan', 'AR-Blick am Tresen', 'QR / Marker im Laden scannen — Handy jetzt, Brille später.', 20, 3),
  ('wien-freund', 'friend', 'Freund bringt sich', 'Jemand den du eingeladen hast, checkt zum ersten Mal ein.', 20, 4),
  ('wien-stempel', 'stamp', 'Stempelkarte voll', 'Drei bestätigte Besuche in einem Laden diese Woche.', 40, 5),
  ('wien-teilen', 'share_after_visit', 'Win teilen', 'Nach einem echten Besuch die Karte schicken. Teilen allein zählt nicht.', 15, 6),
  ('wien-feedback', 'feedback', 'Kurzes Feedback', 'Zwei Sätze an den Laden — kein Google-Stern.', 15, 7)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  grant_amount = EXCLUDED.grant_amount,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

CREATE OR REPLACE FUNCTION public._nachbar_ensure_progress(_user_id uuid)
RETURNS public.nachbar_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.nachbar_progress;
BEGIN
  INSERT INTO public.nachbar_progress (user_id)
  VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO row FROM public.nachbar_progress WHERE user_id = _user_id;
  RETURN row;
END;
$$;

CREATE OR REPLACE FUNCTION public._nachbar_expire_stale()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.nachbar_checkins
  SET status = 'rejected'
  WHERE status = 'pending'
    AND created_at < now() - interval '48 hours';
END;
$$;

CREATE OR REPLACE FUNCTION public._nachbar_complete_mission(
  _user_id uuid,
  _slug text,
  _checkin_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mission public.nachbar_missions;
  inserted int := 0;
BEGIN
  SELECT * INTO mission FROM public.nachbar_missions WHERE slug = _slug AND is_active = true;
  IF mission.id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.nachbar_mission_progress (user_id, mission_id, week_key, checkin_id)
  VALUES (_user_id, mission.id, public._nachbar_week_key(), _checkin_id)
  ON CONFLICT (user_id, mission_id, week_key) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;

  IF inserted > 0 AND mission.grant_amount > 0 THEN
    PERFORM public._nachbar_credit(
      _user_id,
      mission.grant_amount,
      'grant',
      'Mission · ' || mission.title,
      _checkin_id
    );
    UPDATE public.nachbar_progress
    SET
      city_score = city_score + 5,
      aura_weight = aura_weight + 1,
      updated_at = now()
    WHERE user_id = _user_id;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public._nachbar_on_confirmed_visit(
  _checkin public.nachbar_checkins,
  _company public.companies
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prior_all int;
  prior_shop int;
  inviter uuid;
  link_status text;
  vienna_day date := ((now() AT TIME ZONE 'Europe/Vienna'))::date;
  week_start date := public._nachbar_week_start();
  stamps int;
  filled boolean := false;
  last_day date;
BEGIN
  PERFORM public._nachbar_ensure_progress(_checkin.user_id);

  SELECT last_confirmed_day INTO last_day
  FROM public.nachbar_progress WHERE user_id = _checkin.user_id;

  UPDATE public.nachbar_progress
  SET
    streak_days = CASE
      WHEN last_day = vienna_day THEN streak_days
      WHEN last_day = vienna_day - 1 THEN streak_days + 1
      ELSE 1
    END,
    last_confirmed_day = vienna_day,
    city_score = city_score + 10,
    aura_weight = aura_weight + 1,
    updated_at = now()
  WHERE user_id = _checkin.user_id;

  INSERT INTO public.nachbar_stamps (user_id, company_id, window_start, stamp_count)
  VALUES (_checkin.user_id, _company.id, week_start, 1)
  ON CONFLICT (user_id, company_id, window_start)
  DO UPDATE SET stamp_count = public.nachbar_stamps.stamp_count + 1
  RETURNING stamp_count, filled_at IS NOT NULL INTO stamps, filled;

  IF stamps >= 3 AND NOT filled THEN
    UPDATE public.nachbar_stamps
    SET filled_at = now()
    WHERE user_id = _checkin.user_id
      AND company_id = _company.id
      AND window_start = week_start
      AND filled_at IS NULL;
    IF FOUND THEN
      PERFORM public._nachbar_complete_mission(_checkin.user_id, 'wien-stempel', _checkin.id);
    END IF;
  END IF;

  PERFORM public._nachbar_complete_mission(_checkin.user_id, 'wien-besuch', _checkin.id);

  SELECT count(*)::int INTO prior_shop
  FROM public.nachbar_checkins
  WHERE user_id = _checkin.user_id
    AND company_id = _company.id
    AND status = 'confirmed'
    AND id <> _checkin.id;
  IF prior_shop = 0 THEN
    PERFORM public._nachbar_complete_mission(_checkin.user_id, 'wien-entdecken', _checkin.id);
  END IF;

  IF _checkin.source = 'ar' AND COALESCE(_company.featured, false) = true THEN
    PERFORM public._nachbar_complete_mission(_checkin.user_id, 'wien-ar', _checkin.id);
  END IF;

  SELECT count(*)::int INTO prior_all
  FROM public.nachbar_checkins
  WHERE user_id = _checkin.user_id
    AND status = 'confirmed'
    AND id <> _checkin.id;

  IF prior_all = 0 THEN
    SELECT f.inviter_id, f.status INTO inviter, link_status
    FROM public.nachbar_friend_links f
    WHERE f.invitee_id = _checkin.user_id
    LIMIT 1;
    IF inviter IS NOT NULL AND link_status = 'joined' THEN
      UPDATE public.nachbar_friend_links
      SET status = 'activated', activated_at = now()
      WHERE invitee_id = _checkin.user_id AND status = 'joined';
      PERFORM public._nachbar_credit(inviter, 25, 'referral', 'Freund-Check-in', _checkin.id);
      PERFORM public._nachbar_credit(_checkin.user_id, 25, 'referral', 'Eingeladen von Freund', _checkin.id);
      PERFORM public._nachbar_ensure_progress(inviter);
      UPDATE public.nachbar_progress
      SET aura_weight = aura_weight + 1, updated_at = now()
      WHERE user_id = inviter;
      PERFORM public._nachbar_complete_mission(inviter, 'wien-freund', _checkin.id);
    END IF;
  END IF;
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

  PERFORM public._nachbar_expire_stale();

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

  PERFORM public._nachbar_on_confirmed_visit(checkin, company);

  RETURN jsonb_build_object(
    'ok', true,
    'checkin_id', checkin.id,
    'user_id', checkin.user_id,
    'company_id', company.id,
    'company_name', company.name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.nachbar_reject_checkin(_checkin_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  checkin public.nachbar_checkins;
  company public.companies;
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
  UPDATE public.nachbar_checkins SET status = 'rejected' WHERE id = checkin.id;
  RETURN jsonb_build_object('ok', true, 'checkin_id', checkin.id, 'status', 'rejected');
END;
$$;

CREATE OR REPLACE FUNCTION public.nachbar_share_win()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  recent public.nachbar_checkins;
  done boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  PERFORM public.ensure_nachbar_profile();
  PERFORM public._nachbar_ensure_progress(uid);

  SELECT * INTO recent
  FROM public.nachbar_checkins
  WHERE user_id = uid
    AND status = 'confirmed'
    AND confirmed_at > now() - interval '36 hours'
  ORDER BY confirmed_at DESC
  LIMIT 1;

  IF recent.id IS NULL THEN
    RAISE EXCEPTION 'visit_required';
  END IF;

  done := public._nachbar_complete_mission(uid, 'wien-teilen', recent.id);
  UPDATE public.nachbar_progress
  SET last_share_at = now(), updated_at = now()
  WHERE user_id = uid;

  RETURN jsonb_build_object('ok', true, 'granted', done, 'checkin_id', recent.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.nachbar_leave_feedback(_checkin_id uuid, _note text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  checkin public.nachbar_checkins;
  note text;
  done boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  note := trim(COALESCE(_note, ''));
  IF char_length(note) < 8 OR char_length(note) > 400 THEN
    RAISE EXCEPTION 'note_invalid';
  END IF;
  SELECT * INTO checkin FROM public.nachbar_checkins WHERE id = _checkin_id AND user_id = uid;
  IF checkin.id IS NULL OR checkin.status <> 'confirmed' THEN
    RAISE EXCEPTION 'visit_required';
  END IF;

  INSERT INTO public.nachbar_feedback (user_id, company_id, checkin_id, note)
  VALUES (uid, checkin.company_id, checkin.id, note)
  ON CONFLICT (user_id, checkin_id) DO NOTHING;

  done := public._nachbar_complete_mission(uid, 'wien-feedback', checkin.id);
  RETURN jsonb_build_object('ok', true, 'granted', done);
END;
$$;

CREATE OR REPLACE FUNCTION public.nachbar_mark_ar(_code text)
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
  done boolean := false;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  norm := upper(regexp_replace(COALESCE(_code, ''), '[^A-Z0-9]', '', 'g'));
  IF length(norm) < 6 THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;
  SELECT * INTO company FROM public.companies WHERE nachbar_checkin_code = norm LIMIT 1;
  IF company.id IS NULL THEN
    RAISE EXCEPTION 'shop_not_found';
  END IF;
  IF COALESCE(company.featured, false) = false THEN
    RAISE EXCEPTION 'ar_not_ready';
  END IF;

  SELECT * INTO checkin
  FROM public.nachbar_checkins
  WHERE user_id = uid
    AND company_id = company.id
    AND created_at::date = CURRENT_DATE
    AND status IN ('pending', 'confirmed')
  ORDER BY created_at DESC
  LIMIT 1;

  IF checkin.id IS NULL THEN
    RAISE EXCEPTION 'visit_required';
  END IF;

  IF checkin.status = 'confirmed' THEN
    done := public._nachbar_complete_mission(uid, 'wien-ar', checkin.id);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'pending', checkin.status = 'pending',
    'granted', done,
    'company_name', company.name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_nachbar_pending_checkins()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  company_id uuid;
  week_start date := public._nachbar_week_start();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  PERFORM public._nachbar_expire_stale();
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
      'display_name', p.display_name,
      'stamp_count', COALESCE(s.stamp_count, 0)
    ) ORDER BY c.created_at DESC)
    FROM public.nachbar_checkins c
    LEFT JOIN public.nachbar_profiles p ON p.user_id = c.user_id
    LEFT JOIN public.nachbar_stamps s
      ON s.user_id = c.user_id
     AND s.company_id = c.company_id
     AND s.window_start = week_start
    WHERE c.company_id = company_id AND c.status = 'pending'
  ), '[]'::jsonb);
END;
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
  progress public.nachbar_progress;
  ledger jsonb;
  shops jsonb;
  friends jsonb;
  checkins jsonb;
  stamps jsonb;
  missions jsonb;
  next_shop jsonb;
  week_key text := public._nachbar_week_key();
  week_start date := public._nachbar_week_start();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  PERFORM public._nachbar_expire_stale();
  profile := public.ensure_nachbar_profile();
  progress := public._nachbar_ensure_progress(uid);

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
      'display_name', p.display_name,
      'status', f.status,
      'created_at', f.created_at,
      'activated_at', f.activated_at
    ) AS x
    FROM public.nachbar_friend_links f
    LEFT JOIN public.nachbar_profiles p ON p.user_id = f.invitee_id
    WHERE f.inviter_id = uid
    ORDER BY f.created_at DESC
    LIMIT 30
  ) s;

  SELECT coalesce(jsonb_agg(x), '[]'::jsonb)
  INTO checkins
  FROM (
    SELECT jsonb_build_object(
      'id', ch.id,
      'company_id', c.id,
      'company_name', c.name,
      'slug', c.slug,
      'status', ch.status,
      'source', ch.source,
      'created_at', ch.created_at,
      'google_review_url', c.google_review_url
    ) AS x
    FROM public.nachbar_checkins ch
    JOIN public.companies c ON c.id = ch.company_id
    WHERE ch.user_id = uid
    ORDER BY ch.created_at DESC
    LIMIT 20
  ) s;

  SELECT coalesce(jsonb_agg(x), '[]'::jsonb)
  INTO stamps
  FROM (
    SELECT jsonb_build_object(
      'company_id', c.id,
      'company_name', c.name,
      'slug', c.slug,
      'stamp_count', s.stamp_count,
      'filled', s.filled_at IS NOT NULL
    ) AS x
    FROM public.nachbar_stamps s
    JOIN public.companies c ON c.id = s.company_id
    WHERE s.user_id = uid AND s.window_start = week_start
    ORDER BY s.stamp_count DESC, c.name
    LIMIT 12
  ) s;

  SELECT coalesce(jsonb_agg(x), '[]'::jsonb)
  INTO missions
  FROM (
    SELECT jsonb_build_object(
      'id', m.id,
      'slug', m.slug,
      'kind', m.kind,
      'title', m.title,
      'body', m.body,
      'grant_amount', m.grant_amount,
      'done', mp.id IS NOT NULL
    ) AS x
    FROM public.nachbar_missions m
    LEFT JOIN public.nachbar_mission_progress mp
      ON mp.mission_id = m.id AND mp.user_id = uid AND mp.week_key = week_key
    WHERE m.is_active = true
    ORDER BY m.sort_order
  ) s;

  SELECT jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'slug', c.slug,
    'city', c.city,
    'niche', c.niche,
    'featured', c.featured
  )
  INTO next_shop
  FROM public.companies c
  WHERE COALESCE(c.is_local_business, false) = true
    AND c.slug IS NOT NULL
    AND (
      c.featured = true
      OR c.local_seat_paid_at IS NOT NULL
      OR c.local_cohort_number IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.nachbar_checkins ch
      WHERE ch.user_id = uid AND ch.company_id = c.id AND ch.status = 'confirmed'
    )
  ORDER BY c.featured DESC, c.local_cohort_number ASC NULLS LAST
  LIMIT 1;

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
    'progress', jsonb_build_object(
      'streak_days', progress.streak_days,
      'last_confirmed_day', progress.last_confirmed_day,
      'city_score', progress.city_score,
      'aura_weight', progress.aura_weight
    ),
    'ledger', ledger,
    'shops', shops,
    'friends', friends,
    'checkins', checkins,
    'stamps', stamps,
    'missions', missions,
    'next_shop', next_shop,
    'week_key', week_key
  );
END;
$$;

REVOKE ALL ON FUNCTION public.nachbar_reject_checkin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nachbar_reject_checkin(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.nachbar_share_win() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nachbar_share_win() TO authenticated;
REVOKE ALL ON FUNCTION public.nachbar_leave_feedback(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nachbar_leave_feedback(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.nachbar_mark_ar(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nachbar_mark_ar(text) TO authenticated;
REVOKE ALL ON FUNCTION public._nachbar_week_key() FROM PUBLIC;
REVOKE ALL ON FUNCTION public._nachbar_week_start() FROM PUBLIC;
REVOKE ALL ON FUNCTION public._nachbar_ensure_progress(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._nachbar_expire_stale() FROM PUBLIC;
REVOKE ALL ON FUNCTION public._nachbar_complete_mission(uuid, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._nachbar_on_confirmed_visit(public.nachbar_checkins, public.companies) FROM PUBLIC;
