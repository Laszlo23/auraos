-- AURA WORLD Phase A–C: unified user progress, achievements, scouts, portals

-- ─── User progress (XP + REP at account level) ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_progress (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  level integer NOT NULL DEFAULT 1 CHECK (level >= 1),
  rep integer NOT NULL DEFAULT 0 CHECK (rep >= 0),
  streak_days integer NOT NULL DEFAULT 0 CHECK (streak_days >= 0),
  last_active date,
  city_id text NOT NULL DEFAULT 'wien',
  genesis_number integer CHECK (genesis_number IS NULL OR (genesis_number >= 1 AND genesis_number <= 777)),
  completed_quests text[] NOT NULL DEFAULT '{}',
  joined_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_progress_rep_idx ON public.user_progress (rep DESC);
CREATE INDEX IF NOT EXISTS user_progress_xp_idx ON public.user_progress (xp DESC);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own user_progress" ON public.user_progress;
CREATE POLICY "own user_progress" ON public.user_progress
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.user_progress TO authenticated;
GRANT ALL ON public.user_progress TO service_role;

-- ─── Audit log (idempotent awards) ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.progress_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  event_key text NOT NULL,
  xp_delta integer NOT NULL DEFAULT 0,
  rep_delta integer NOT NULL DEFAULT 0,
  company_id uuid REFERENCES public.companies (id) ON DELETE SET NULL,
  idempotency_key text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS progress_events_idempotency_uidx
  ON public.progress_events (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS progress_events_user_created_idx
  ON public.progress_events (user_id, created_at DESC);

ALTER TABLE public.progress_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own progress_events read" ON public.progress_events;
CREATE POLICY "own progress_events read" ON public.progress_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON public.progress_events TO authenticated;
GRANT ALL ON public.progress_events TO service_role;

-- ─── Achievements ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.achievement_definitions (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  glyph text NOT NULL DEFAULT '◈',
  sort_order integer NOT NULL DEFAULT 0,
  unlock_event text,
  min_xp integer NOT NULL DEFAULT 0,
  min_rep integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  achievement_id text NOT NULL REFERENCES public.achievement_definitions (id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own user_achievements" ON public.user_achievements;
CREATE POLICY "own user_achievements" ON public.user_achievements
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
GRANT SELECT ON public.achievement_definitions TO authenticated, anon;
GRANT ALL ON public.achievement_definitions TO service_role;

INSERT INTO public.achievement_definitions (id, title, description, glyph, sort_order, unlock_event, min_xp, min_rep)
VALUES
  ('first-steps', 'First steps', 'Created your Aura profile and entered the world.', '◎', 10, 'world:joined', 0, 0),
  ('growth-starter', 'Growth starter', 'Completed the three signup growth quests.', '▲', 20, 'growth:first-mission', 0, 0),
  ('first-mission', 'Mission planner', 'Created your first revenue mission.', '◈', 30, 'mission:created', 0, 0),
  ('first-approval', 'Gatekeeper', 'Approved your first agent action.', '✓', 40, 'task:first_approve', 0, 0),
  ('mission-complete', 'Closer', 'Completed a mission with honest actuals.', '✓', 50, 'mission:complete', 0, 0),
  ('daily-spin', 'Lucky day', 'Spun the daily wheel.', '◍', 60, 'company:spin', 0, 0),
  ('streak-7', 'Week warrior', 'Seven-day activity streak.', '🔥', 70, NULL, 0, 0),
  ('wien-visitor', 'Wien visitor', 'Confirmed check-in at a Vienna partner.', '🏛', 80, 'portal:checkin', 0, 5),
  ('portal-discovered', 'Portal discovered', 'Found an AURA Portal in the city.', '🟣', 90, 'portal:discovered', 0, 0),
  ('scout-joined', 'Aura Scout', 'Joined the Scout program.', '🟣', 100, 'scout:joined', 0, 0),
  ('scout-connect', 'Connector', 'Onboarded a verified local business as a Scout.', '🔗', 110, 'scout:business', 0, 25),
  ('rep-50', 'Trusted voice', 'Earned 50 contribution REP.', '⭐', 120, NULL, 0, 50),
  ('rep-200', 'City builder', 'Earned 200 contribution REP.', '⭐', 130, NULL, 0, 200),
  ('level-5', 'Rising founder', 'Reached level 5.', '⚡', 140, NULL, 2000, 0),
  ('level-10', 'Veteran', 'Reached level 10.', '⚡', 150, NULL, 8000, 0),
  ('hood-genesis', 'Genesis circle', 'Minted a Hood in the first 777.', '🧬', 160, 'genesis:hood', 0, 0),
  ('community-seat', 'Founding member', 'Unlocked a founding seat.', '◈', 170, 'community:founding-seat', 0, 0),
  ('trading-armed', 'Desk armed', 'Armed the Quant trading desk.', '📈', 180, 'trading:arm', 0, 0),
  ('nachbar-regular', 'Regular', 'Five confirmed Nachbar check-ins.', '🤝', 190, NULL, 0, 15),
  ('quest-master', 'Quest master', 'Completed ten distinct quests.', '🎮', 200, NULL, 1500, 0)
ON CONFLICT (id) DO NOTHING;

-- ─── Scouts (Phase B) ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.aura_scouts (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  territory text NOT NULL DEFAULT 'wien',
  level integer NOT NULL DEFAULT 1 CHECK (level >= 1),
  businesses_onboarded integer NOT NULL DEFAULT 0 CHECK (businesses_onboarded >= 0),
  rep_earned integer NOT NULL DEFAULT 0 CHECK (rep_earned >= 0),
  joined_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scout_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'local_seat' CHECK (kind IN ('local_seat', 'referral', 'manual')),
  verified_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scout_user_id, company_id)
);

ALTER TABLE public.aura_scouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_attributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own aura_scouts" ON public.aura_scouts;
CREATE POLICY "own aura_scouts" ON public.aura_scouts
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "scout attributions read" ON public.scout_attributions;
CREATE POLICY "scout attributions read" ON public.scout_attributions
  FOR SELECT TO authenticated
  USING (scout_user_id = auth.uid() OR public.owns_company(company_id));

GRANT SELECT, INSERT, UPDATE ON public.aura_scouts TO authenticated;
GRANT SELECT ON public.scout_attributions TO authenticated;
GRANT ALL ON public.aura_scouts TO service_role;
GRANT ALL ON public.scout_attributions TO service_role;

-- ─── Portals (Phase C) ───────────────────────────────────────────────────────

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

-- ─── Level helper ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._progress_level_from_xp(_xp integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  lvl integer := 1;
  rem integer := greatest(0, coalesce(_xp, 0));
BEGIN
  WHILE rem >= 400 + (lvl - 1) * 260 LOOP
    rem := rem - (400 + (lvl - 1) * 260);
    lvl := lvl + 1;
  END LOOP;
  RETURN lvl;
END;
$$;

-- ─── Ensure row exists ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.ensure_user_progress(_uid uuid DEFAULT auth.uid())
RETURNS public.user_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.user_progress;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  INSERT INTO public.user_progress (user_id)
  VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO row FROM public.user_progress WHERE user_id = _uid;
  RETURN row;
END;
$$;

-- ─── Achievement unlock pass ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._unlock_achievements_for_user(_uid uuid, _event text DEFAULT NULL)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prog public.user_progress;
  unlocked text[] := '{}';
  def record;
  quest_count integer;
  checkin_count integer;
BEGIN
  SELECT * INTO prog FROM public.user_progress WHERE user_id = _uid;
  IF NOT FOUND THEN RETURN unlocked; END IF;

  SELECT count(*) INTO quest_count FROM unnest(prog.completed_quests);
  SELECT count(*) INTO checkin_count
    FROM public.nachbar_checkins
   WHERE user_id = _uid AND status = 'confirmed';

  FOR def IN SELECT * FROM public.achievement_definitions ORDER BY sort_order LOOP
    IF EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = _uid AND achievement_id = def.id) THEN
      CONTINUE;
    END IF;

    IF def.unlock_event IS NOT NULL AND _event IS NOT NULL AND def.unlock_event <> _event THEN
      CONTINUE;
    END IF;

    IF def.unlock_event IS NOT NULL AND NOT (def.unlock_event = ANY(prog.completed_quests)) THEN
      IF _event IS NULL OR def.unlock_event <> _event THEN
        CONTINUE;
      END IF;
    END IF;

    IF def.min_xp > prog.xp OR def.min_rep > prog.rep THEN
      IF def.unlock_event IS NULL OR NOT (def.unlock_event = ANY(prog.completed_quests)) THEN
        IF def.id IN ('streak-7', 'nachbar-regular', 'quest-master', 'rep-50', 'rep-200', 'level-5', 'level-10') THEN
          IF def.id = 'streak-7' AND prog.streak_days < 7 THEN CONTINUE; END IF;
          IF def.id = 'nachbar-regular' AND checkin_count < 5 THEN CONTINUE; END IF;
          IF def.id = 'quest-master' AND quest_count < 10 THEN CONTINUE; END IF;
          IF def.id = 'rep-50' AND prog.rep < 50 THEN CONTINUE; END IF;
          IF def.id = 'rep-200' AND prog.rep < 200 THEN CONTINUE; END IF;
          IF def.id = 'level-5' AND prog.level < 5 THEN CONTINUE; END IF;
          IF def.id = 'level-10' AND prog.level < 10 THEN CONTINUE; END IF;
        ELSE
          CONTINUE;
        END IF;
      END IF;
    END IF;

    IF def.unlock_event IS NOT NULL AND def.unlock_event = ANY(prog.completed_quests) THEN
      INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (_uid, def.id)
      ON CONFLICT DO NOTHING;
      IF FOUND THEN
        unlocked := array_append(unlocked, def.id);
      END IF;
    ELSIF def.id = 'streak-7' AND prog.streak_days >= 7 THEN
      INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (_uid, def.id) ON CONFLICT DO NOTHING;
      unlocked := array_append(unlocked, def.id);
    ELSIF def.id = 'nachbar-regular' AND checkin_count >= 5 THEN
      INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (_uid, def.id) ON CONFLICT DO NOTHING;
      unlocked := array_append(unlocked, def.id);
    ELSIF def.id = 'quest-master' AND quest_count >= 10 THEN
      INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (_uid, def.id) ON CONFLICT DO NOTHING;
      unlocked := array_append(unlocked, def.id);
    ELSIF def.id = 'rep-50' AND prog.rep >= 50 THEN
      INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (_uid, def.id) ON CONFLICT DO NOTHING;
      unlocked := array_append(unlocked, def.id);
    ELSIF def.id = 'rep-200' AND prog.rep >= 200 THEN
      INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (_uid, def.id) ON CONFLICT DO NOTHING;
      unlocked := array_append(unlocked, def.id);
    ELSIF def.id = 'level-5' AND prog.level >= 5 THEN
      INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (_uid, def.id) ON CONFLICT DO NOTHING;
      unlocked := array_append(unlocked, def.id);
    ELSIF def.id = 'level-10' AND prog.level >= 10 THEN
      INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (_uid, def.id) ON CONFLICT DO NOTHING;
      unlocked := array_append(unlocked, def.id);
    END IF;
  END LOOP;

  RETURN unlocked;
END;
$$;

-- ─── Core award RPC ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.award_progress(
  _event_key text,
  _xp_amount integer DEFAULT 0,
  _rep_amount integer DEFAULT 0,
  _company_id uuid DEFAULT NULL,
  _idempotency_key text DEFAULT NULL,
  _meta jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  ek text := left(trim(coalesce(_event_key, '')), 64);
  xp_amt integer := greatest(0, least(coalesce(_xp_amount, 0), 10000));
  rep_amt integer := greatest(0, least(coalesce(_rep_amount, 0), 500));
  idem text := NULLIF(left(trim(coalesce(_idempotency_key, '')), 128), '');
  prog public.user_progress;
  quests text[];
  new_xp integer;
  new_rep integer;
  new_level integer;
  today date := (now() AT TIME ZONE 'utc')::date;
  yesterday date := today - 1;
  next_streak integer := 1;
  achievements text[];
  owner uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF ek = '' THEN
    RAISE EXCEPTION 'invalid_event';
  END IF;

  IF _company_id IS NOT NULL AND NOT public.owns_company(_company_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF idem IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.progress_events
     WHERE user_id = uid AND idempotency_key = idem
  ) THEN
    SELECT * INTO prog FROM public.user_progress WHERE user_id = uid;
    RETURN jsonb_build_object(
      'duplicate', true,
      'xp', coalesce(prog.xp, 0),
      'rep', coalesce(prog.rep, 0),
      'level', coalesce(prog.level, 1),
      'achievements', '[]'::jsonb
    );
  END IF;

  PERFORM public.ensure_user_progress(uid);
  SELECT * INTO prog FROM public.user_progress WHERE user_id = uid FOR UPDATE;

  quests := coalesce(prog.completed_quests, ARRAY[]::text[]);
  IF NOT (ek = ANY(quests)) THEN
    quests := quests || ek;
  END IF;

  new_xp := prog.xp + xp_amt;
  new_rep := prog.rep + rep_amt;
  new_level := public._progress_level_from_xp(new_xp);

  IF prog.last_active = yesterday THEN
    next_streak := greatest(1, prog.streak_days + 1);
  ELSIF prog.last_active = today THEN
    next_streak := greatest(1, prog.streak_days);
  ELSIF xp_amt > 0 OR rep_amt > 0 THEN
    next_streak := 1;
  ELSE
    next_streak := prog.streak_days;
  END IF;

  UPDATE public.user_progress
     SET xp = new_xp,
         rep = new_rep,
         level = new_level,
         completed_quests = quests,
         streak_days = next_streak,
         last_active = CASE WHEN xp_amt > 0 OR rep_amt > 0 THEN today ELSE last_active END,
         updated_at = now()
   WHERE user_id = uid;

  INSERT INTO public.progress_events (user_id, event_key, xp_delta, rep_delta, company_id, idempotency_key, meta)
  VALUES (uid, ek, xp_amt, rep_amt, _company_id, idem, coalesce(_meta, '{}'::jsonb));

  -- Mirror XP/quests to company founder_progress when scoped
  IF _company_id IS NOT NULL THEN
    INSERT INTO public.founder_progress (company_id, xp, level, streak_days, last_active, onboarded, completed_quests)
    VALUES (_company_id, 0, 1, 0, today, false, ARRAY[]::text[])
    ON CONFLICT (company_id) DO NOTHING;

    UPDATE public.founder_progress
       SET xp = new_xp,
           level = new_level,
           completed_quests = quests,
           streak_days = next_streak,
           last_active = coalesce(last_active, today)
     WHERE company_id = _company_id;
  END IF;

  achievements := public._unlock_achievements_for_user(uid, ek);

  RETURN jsonb_build_object(
    'duplicate', false,
    'xp', new_xp,
    'rep', new_rep,
    'level', new_level,
    'streak_days', next_streak,
    'awarded_xp', xp_amt,
    'awarded_rep', rep_amt,
    'achievements', to_jsonb(achievements)
  );
END;
$$;

-- Merge signup growth XP into user_progress (once per user)
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

-- Scout join
CREATE OR REPLACE FUNCTION public.join_aura_scout(_territory text DEFAULT 'wien')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  terr text := left(lower(trim(coalesce(_territory, 'wien'))), 32);
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  INSERT INTO public.aura_scouts (user_id, territory)
  VALUES (uid, terr)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN public.award_progress('scout:joined', 120, 10, NULL, 'scout:joined:' || uid, jsonb_build_object('territory', terr));
END;
$$;

-- Scout attribution when local business pays seat (owner calls or system)
CREATE OR REPLACE FUNCTION public.attribute_scout_business(_company_id uuid, _scout_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  scout uuid := _scout_user_id;
  co public.companies;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
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

  IF FOUND THEN
    UPDATE public.aura_scouts
       SET businesses_onboarded = businesses_onboarded + 1,
           rep_earned = rep_earned + 25
     WHERE user_id = scout;

    PERFORM public.award_progress('scout:business', 80, 25, NULL, 'scout:biz:' || _company_id::text, jsonb_build_object('company_id', _company_id))
    FROM auth.users WHERE id = scout;
  END IF;

  RETURN jsonb_build_object('attributed', true, 'scout_user_id', scout);
END;
$$;

-- Portal discover (guest)
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

-- Vienna city leaderboard
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

REVOKE ALL ON FUNCTION public.ensure_user_progress(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.award_progress(text, integer, integer, uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.merge_signup_growth_progress() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_aura_scout(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.attribute_scout_business(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.discover_aura_portal(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vienna_city_leaderboard(integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.ensure_user_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_progress(text, integer, integer, uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merge_signup_growth_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_aura_scout(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attribute_scout_business(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.discover_aura_portal(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vienna_city_leaderboard(integer) TO authenticated, anon;
