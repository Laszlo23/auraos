-- Community city loop: Nachbar-native ratings, extra guest missions,
-- richer public shop board. No Google-star rewards.

DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.nachbar_missions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%kind%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.nachbar_missions DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.nachbar_missions
  ADD CONSTRAINT nachbar_missions_kind_check
  CHECK (kind IN (
    'discover', 'visit', 'stamp', 'friend', 'share_after_visit',
    'ar_scan', 'feedback', 'rate', 'network', 'streak'
  ));

CREATE TABLE IF NOT EXISTS public.nachbar_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  checkin_id uuid NOT NULL REFERENCES public.nachbar_checkins (id) ON DELETE CASCADE,
  score smallint NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS nachbar_ratings_company_idx
  ON public.nachbar_ratings (company_id);

ALTER TABLE public.nachbar_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own nachbar ratings" ON public.nachbar_ratings;
CREATE POLICY "own nachbar ratings"
  ON public.nachbar_ratings FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_id AND c.owner_id = auth.uid()
    )
  );

GRANT SELECT ON public.nachbar_ratings TO authenticated;

INSERT INTO public.nachbar_missions (slug, kind, title, body, grant_amount, sort_order)
VALUES
  ('wien-besuch', 'visit', 'Heute einchecken', 'Ein bestätigter Besuch irgendwo in Wien.', 15, 1),
  ('wien-entdecken', 'discover', 'Neuen Laden finden', 'Erster bestätigter Besuch in einem Laden, den du noch nicht hattest.', 25, 2),
  ('wien-netz', 'network', 'Zwei Läden diese Woche', 'Zwei verschiedene Betriebe — so wächst die Stadt.', 30, 3),
  ('wien-stamm', 'streak', 'Zwei Tage in Folge', 'Gestern und heute bestätigt. Der Streak hält die Stadt warm.', 20, 4),
  ('wien-ar', 'ar_scan', 'AR-Blick am Tresen', 'QR / Marker im Laden scannen — Handy jetzt, Brille später.', 20, 5),
  ('wien-freund', 'friend', 'Freund bringt sich', 'Jemand den du eingeladen hast, checkt zum ersten Mal ein.', 20, 6),
  ('wien-stempel', 'stamp', 'Stempelkarte voll', 'Drei bestätigte Besuche in einem Laden diese Woche.', 40, 7),
  ('wien-teilen', 'share_after_visit', 'Win teilen', 'Nach einem echten Besuch die Karte schicken. Teilen allein zählt nicht.', 15, 8),
  ('wien-feedback', 'feedback', 'Kurzes Feedback', 'Zwei Sätze an den Laden — kein Google-Stern.', 15, 9),
  ('wien-bewerten', 'rate', 'Nachbar-Note', 'Nach dem Besuch 1–5. Die Zahl selbst bringt nichts — nur ehrlich sein.', 15, 10)
ON CONFLICT (slug) DO UPDATE SET
  kind = EXCLUDED.kind,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  grant_amount = EXCLUDED.grant_amount,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

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
  week_shops int;
  streak int;
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
  WHERE user_id = _checkin.user_id
  RETURNING streak_days INTO streak;

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

  IF streak >= 2 THEN
    PERFORM public._nachbar_complete_mission(_checkin.user_id, 'wien-stamm', _checkin.id);
  END IF;

  SELECT count(*)::int INTO prior_shop
  FROM public.nachbar_checkins
  WHERE user_id = _checkin.user_id
    AND company_id = _company.id
    AND status = 'confirmed'
    AND id <> _checkin.id;
  IF prior_shop = 0 THEN
    PERFORM public._nachbar_complete_mission(_checkin.user_id, 'wien-entdecken', _checkin.id);
  END IF;

  SELECT count(DISTINCT company_id)::int INTO week_shops
  FROM public.nachbar_checkins
  WHERE user_id = _checkin.user_id
    AND status = 'confirmed'
    AND ((confirmed_at AT TIME ZONE 'Europe/Vienna')::date) >= week_start;
  IF week_shops >= 2 THEN
    PERFORM public._nachbar_complete_mission(_checkin.user_id, 'wien-netz', _checkin.id);
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

CREATE OR REPLACE FUNCTION public.nachbar_rate_shop(_checkin_id uuid, _score integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  checkin public.nachbar_checkins;
  done boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF _score IS NULL OR _score < 1 OR _score > 5 THEN
    RAISE EXCEPTION 'score_invalid';
  END IF;

  SELECT * INTO checkin
  FROM public.nachbar_checkins
  WHERE id = _checkin_id AND user_id = uid;
  IF checkin.id IS NULL OR checkin.status <> 'confirmed' THEN
    RAISE EXCEPTION 'visit_required';
  END IF;

  INSERT INTO public.nachbar_ratings (user_id, company_id, checkin_id, score)
  VALUES (uid, checkin.company_id, checkin.id, _score)
  ON CONFLICT (user_id, company_id) DO UPDATE
    SET score = EXCLUDED.score,
        checkin_id = EXCLUDED.checkin_id,
        updated_at = now();

  done := public._nachbar_complete_mission(uid, 'wien-bewerten', checkin.id);
  RETURN jsonb_build_object('ok', true, 'granted', done, 'score', _score);
END;
$$;

CREATE OR REPLACE FUNCTION public.nachbar_city_board()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT jsonb_build_object(
    'shops', COALESCE((
      SELECT jsonb_agg(x ORDER BY (x->>'featured') DESC, (x->>'name'))
      FROM (
        SELECT jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'slug', c.slug,
          'city', c.city,
          'niche', c.niche,
          'tagline', c.tagline,
          'homepage_url', c.homepage_url,
          'emoji', COALESCE(NULLIF(c.emoji, ''), '◎'),
          'district', c.district,
          'cover_url', c.cover_url,
          'featured', COALESCE(c.featured, false),
          'visit_count', COALESCE(v.visits, 0),
          'rating_avg', r.avg_score,
          'rating_count', COALESCE(r.n, 0)
        ) AS x
        FROM public.companies c
        LEFT JOIN LATERAL (
          SELECT count(*)::int AS visits
          FROM public.nachbar_checkins ch
          WHERE ch.company_id = c.id AND ch.status = 'confirmed'
        ) v ON true
        LEFT JOIN LATERAL (
          SELECT
            round(avg(nr.score)::numeric, 1) AS avg_score,
            count(*)::int AS n
          FROM public.nachbar_ratings nr
          WHERE nr.company_id = c.id
        ) r ON true
        WHERE COALESCE(c.is_local_business, false) = true
          AND c.slug IS NOT NULL
          AND (
            c.featured = true
            OR c.local_seat_paid_at IS NOT NULL
            OR c.local_cohort_number IS NOT NULL
          )
      ) s
    ), '[]'::jsonb),
    'missions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.id,
        'slug', m.slug,
        'kind', m.kind,
        'title', m.title,
        'body', m.body,
        'grant_amount', m.grant_amount
      ) ORDER BY m.sort_order)
      FROM public.nachbar_missions m
      WHERE m.is_active = true
    ), '[]'::jsonb)
  );
$$;

DROP FUNCTION IF EXISTS public.nachbar_public_shops(integer);
CREATE FUNCTION public.nachbar_public_shops(_limit integer DEFAULT 24)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  city text,
  niche text,
  tagline text,
  homepage_url text,
  emoji text,
  district text,
  cover_url text,
  featured boolean,
  visit_count integer,
  rating_avg numeric,
  rating_count integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    c.id,
    c.name,
    c.slug,
    c.city,
    c.niche,
    c.tagline,
    c.homepage_url,
    COALESCE(NULLIF(c.emoji, ''), '◎'),
    c.district,
    c.cover_url,
    COALESCE(c.featured, false),
    COALESCE((
      SELECT count(*)::int FROM public.nachbar_checkins ch
      WHERE ch.company_id = c.id AND ch.status = 'confirmed'
    ), 0),
    (
      SELECT round(avg(nr.score)::numeric, 1)
      FROM public.nachbar_ratings nr
      WHERE nr.company_id = c.id
    ),
    COALESCE((
      SELECT count(*)::int FROM public.nachbar_ratings nr
      WHERE nr.company_id = c.id
    ), 0)
  FROM public.companies c
  WHERE COALESCE(c.is_local_business, false) = true
    AND c.slug IS NOT NULL
    AND (
      c.featured = true
      OR c.local_seat_paid_at IS NOT NULL
      OR c.local_cohort_number IS NOT NULL
    )
  ORDER BY c.featured DESC, c.local_cohort_number ASC NULLS LAST, c.created_at
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
  owned_name text;
  has_company boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  PERFORM public._nachbar_expire_stale();
  profile := public.ensure_nachbar_profile();
  progress := public._nachbar_ensure_progress(uid);

  SELECT name INTO owned_name
  FROM public.companies
  WHERE owner_id = uid
  ORDER BY created_at
  LIMIT 1;
  has_company := owned_name IS NOT NULL;

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
      'google_review_url', c.google_review_url,
      'rated', EXISTS (
        SELECT 1 FROM public.nachbar_ratings r
        WHERE r.user_id = uid AND r.company_id = c.id
      )
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
    'has_company', has_company,
    'owned_company_name', owned_name,
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

REVOKE ALL ON FUNCTION public.nachbar_rate_shop(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nachbar_rate_shop(uuid, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.nachbar_city_board() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nachbar_city_board() TO anon, authenticated;
REVOKE ALL ON FUNCTION public.nachbar_public_shops(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nachbar_public_shops(integer) TO anon, authenticated;
