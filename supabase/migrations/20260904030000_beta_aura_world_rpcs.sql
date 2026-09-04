-- Beta readiness: missing AURA World pieces (portals, merge, scout attribute, leaderboard).
-- Idempotent against growth_progress_core already applied on prod.

-- Signup growth columns (never applied remotely)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS growth_xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS growth_quests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS founder_goal text;

CREATE OR REPLACE FUNCTION public.award_signup_growth(_quest text, _amount integer)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  quests text[];
  xp int;
  q text := left(trim(coalesce(_quest, '')), 64);
  amt int := greatest(0, least(coalesce(_amount, 0), 5000));
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF q = '' THEN RAISE EXCEPTION 'invalid_quest'; END IF;

  SELECT growth_quests, growth_xp INTO quests, xp
    FROM public.profiles WHERE id = uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'no_profile'; END IF;

  IF q = ANY(quests) THEN
    RETURN jsonb_build_object('xp', xp, 'quests', quests, 'awarded', 0, 'duplicate', true);
  END IF;

  quests := array_append(quests, q);
  xp := xp + amt;
  UPDATE public.profiles SET growth_xp = xp, growth_quests = quests WHERE id = uid;
  RETURN jsonb_build_object('xp', xp, 'quests', quests, 'awarded', amt, 'duplicate', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.save_founder_goal(_goal text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  goal text := left(trim(coalesce(_goal, '')), 280);
  snap jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF length(goal) < 4 THEN RAISE EXCEPTION 'goal_too_short'; END IF;
  UPDATE public.profiles SET founder_goal = goal WHERE id = uid;
  snap := public.award_signup_growth('growth:first-mission', 250);
  RETURN snap || jsonb_build_object('goal', goal);
END;
$$;

REVOKE ALL ON FUNCTION public.award_signup_growth(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_founder_goal(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_signup_growth(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_founder_goal(text) TO authenticated;

-- Portals
CREATE TABLE IF NOT EXISTS public.aura_portals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies (id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  lat double precision,
  lng double precision,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aura_portals_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$')
);

CREATE INDEX IF NOT EXISTS aura_portals_active_idx ON public.aura_portals (active) WHERE active = true;

ALTER TABLE public.aura_portals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read active portals" ON public.aura_portals;
CREATE POLICY "public read active portals" ON public.aura_portals
  FOR SELECT TO anon, authenticated
  USING (active = true);

DROP POLICY IF EXISTS "own company portals" ON public.aura_portals;
CREATE POLICY "own company portals" ON public.aura_portals
  FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));

GRANT SELECT ON public.aura_portals TO anon, authenticated;
GRANT ALL ON public.aura_portals TO service_role;

ALTER TABLE public.nachbar_checkins
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

INSERT INTO public.achievement_definitions (id, title, description, glyph, sort_order, unlock_event, min_xp, min_rep)
VALUES
  ('first-steps', 'First steps', 'Created your Aura profile and entered the world.', '◎', 10, 'world:joined', 0, 0),
  ('growth-starter', 'Growth starter', 'Completed the three signup growth quests.', '▲', 20, 'growth:first-mission', 0, 0),
  ('first-mission', 'Mission planner', 'Created your first revenue mission.', '◈', 30, 'mission:created', 0, 0),
  ('first-approval', 'Gatekeeper', 'Approved your first agent action.', '✓', 40, 'task:first_approve', 0, 0),
  ('mission-complete', 'Closer', 'Completed a mission with honest actuals.', '✓', 50, 'mission:complete', 0, 0),
  ('portal-discovered', 'Portal discovered', 'Found an AURA Portal in the city.', '🟣', 90, 'portal:discovered', 0, 0),
  ('scout-joined', 'Aura Scout', 'Joined the Scout program.', '🟣', 100, 'scout:joined', 0, 0),
  ('scout-connect', 'Connector', 'Onboarded a verified local business as a Scout.', '🔗', 110, 'scout:business', 0, 25),
  ('wien-visitor', 'Wien visitor', 'Confirmed check-in at a Vienna partner.', '🏛', 80, 'portal:checkin', 0, 5)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.merge_signup_growth_progress()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  gx integer;
  gq text[];
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT growth_xp, growth_quests INTO gx, gq FROM public.profiles WHERE id = uid;
  IF coalesce(gx, 0) <= 0 AND coalesce(array_length(gq, 1), 0) = 0 THEN
    RETURN jsonb_build_object('merged', false);
  END IF;

  PERFORM public.ensure_user_progress(uid);

  UPDATE public.user_progress up
     SET xp = up.xp + coalesce(gx, 0),
         level = public._progress_level_from_xp(up.xp + coalesce(gx, 0)),
         completed_quests = (
           SELECT array_agg(DISTINCT q) FROM unnest(up.completed_quests || coalesce(gq, ARRAY[]::text[])) AS q
         ),
         updated_at = now()
   WHERE up.user_id = uid;

  PERFORM public._unlock_achievements_for_user(uid, NULL);
  RETURN jsonb_build_object('merged', true, 'xp_added', gx);
END;
$$;

CREATE OR REPLACE FUNCTION public.attribute_scout_business(_company_id uuid, _scout_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  co public.companies;
  scout uuid := _scout_user_id;
  inserted integer := 0;
BEGIN
  SELECT * INTO co FROM public.companies WHERE id = _company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'company_not_found'; END IF;

  IF scout IS NULL THEN
    SELECT r.referrer_id INTO scout
      FROM public.referrals r
     WHERE r.referred_id = co.owner_id
     LIMIT 1;
  END IF;

  IF scout IS NULL OR NOT EXISTS (SELECT 1 FROM public.aura_scouts WHERE user_id = scout) THEN
    RETURN jsonb_build_object('attributed', false);
  END IF;

  IF co.local_seat_paid_at IS NULL AND co.entry_funnel <> 'local' THEN
    RETURN jsonb_build_object('attributed', false, 'reason', 'not_local');
  END IF;

  INSERT INTO public.scout_attributions (scout_user_id, company_id, kind)
  VALUES (scout, _company_id, 'local_seat')
  ON CONFLICT (scout_user_id, company_id) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted > 0 THEN
    UPDATE public.aura_scouts
       SET businesses_onboarded = businesses_onboarded + 1,
           rep_earned = rep_earned + 25
     WHERE user_id = scout;

    PERFORM public._award_progress_for_user(
      scout,
      'scout:business',
      80,
      25,
      NULL,
      'scout:biz:' || _company_id::text,
      jsonb_build_object('company_id', _company_id)
    );
  END IF;

  RETURN jsonb_build_object('attributed', inserted > 0, 'scout_user_id', scout);
END;
$$;

CREATE OR REPLACE FUNCTION public.discover_aura_portal(_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  slug text := lower(regexp_replace(trim(coalesce(_slug, '')), '[^a-z0-9-]', '', 'g'));
  portal public.aura_portals;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF length(slug) < 2 THEN RAISE EXCEPTION 'invalid_slug'; END IF;

  SELECT * INTO portal FROM public.aura_portals WHERE slug = slug AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'portal_not_found'; END IF;

  RETURN public.award_progress(
    'portal:discovered',
    60,
    8,
    portal.company_id,
    'portal:disc:' || slug || ':' || uid::text,
    jsonb_build_object('portal_slug', slug, 'portal_label', portal.label)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.vienna_city_leaderboard(_limit integer DEFAULT 20)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  xp integer,
  rep integer,
  level integer,
  is_scout boolean,
  businesses_onboarded integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    up.user_id,
    coalesce(h.display_name, p.email, 'Founder') AS display_name,
    up.xp,
    up.rep,
    up.level,
    (s.user_id IS NOT NULL) AS is_scout,
    coalesce(s.businesses_onboarded, 0) AS businesses_onboarded
  FROM public.user_progress up
  LEFT JOIN public.profiles p ON p.id = up.user_id
  LEFT JOIN public.handles h ON h.user_id = up.user_id AND h.is_public = true
  LEFT JOIN public.aura_scouts s ON s.user_id = up.user_id
  WHERE up.city_id = 'wien'
  ORDER BY up.rep DESC, up.xp DESC
  LIMIT greatest(1, least(coalesce(_limit, 20), 50));
$$;

-- Wire local seat paid → scout attribution
CREATE OR REPLACE FUNCTION public.mark_local_seat_paid_stripe(
  _company_id uuid,
  _boost_grant integer DEFAULT 0
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  grant_amt integer := GREATEST(COALESCE(_boost_grant, 0), 0);
  paid integer := 0;
BEGIN
  UPDATE public.companies
  SET local_seat_paid_at = now(),
      ui_locale = 'de',
      is_local_business = true,
      network_backlink = true
  WHERE id = _company_id
    AND local_seat_paid_at IS NULL;

  GET DIAGNOSTICS paid = ROW_COUNT;
  IF paid > 0 THEN
    IF grant_amt > 0 THEN
      PERFORM public.grant_local_boost(
        _company_id,
        grant_amt,
        'Local Seat unlock · grant ' || grant_amt::text
      );
    END IF;
    PERFORM public.attribute_scout_business(_company_id, NULL);
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.merge_signup_growth_progress() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.attribute_scout_business(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.discover_aura_portal(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vienna_city_leaderboard(integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.merge_signup_growth_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION public.attribute_scout_business(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.discover_aura_portal(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vienna_city_leaderboard(integer) TO authenticated, anon;

-- Backfill portals for local businesses
INSERT INTO public.aura_portals (company_id, slug, label, active)
SELECT c.id, c.slug, coalesce(nullif(trim(c.name), ''), c.slug), true
FROM public.companies c
WHERE c.is_local_business = true
  AND c.slug IS NOT NULL
  AND length(trim(c.slug)) >= 2
ON CONFLICT (company_id) DO NOTHING;
