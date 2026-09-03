-- Growth digital work: typed squad tasks (social / Spaces / scout) + awards.
-- Idempotent: safe if AURA World / squads partially applied.

-- Achievement seed (no-op if already present)
INSERT INTO public.achievement_definitions (id, title, description, glyph, sort_order, unlock_event, min_xp, min_rep)
VALUES
  ('first-steps', 'First steps', 'Created your Aura profile and entered the world.', '◎', 10, 'world:joined', 0, 0),
  ('growth-starter', 'Growth starter', 'Completed the three signup growth quests.', '▲', 20, 'growth:first-mission', 0, 0),
  ('scout-joined', 'Aura Scout', 'Joined the Scout program.', '🟣', 100, 'scout:joined', 0, 0),
  ('scout-connect', 'Connector', 'Onboarded a verified local business as a Scout.', '🔗', 110, 'scout:business', 0, 25),
  ('squad-founder', 'Squad founder', 'Started a crew — now recruit your people.', '👥', 210, 'squad:created', 0, 0),
  ('squad-member', 'Crew member', 'Joined a squad and showed up.', '🤝', 220, 'squad:joined', 0, 0),
  ('squad-builder', 'Squad builder', 'Closed five squad tasks together.', '⚡', 230, NULL, 0, 0),
  ('growth-social', 'Signal booster', 'Closed a social growth task for the crew.', '⌁', 240, 'growth:social-post', 0, 0),
  ('growth-spaces', 'Space presence', 'Showed up on an X Space for Aura growth.', '◎', 250, 'growth:space-showup', 0, 0)
ON CONFLICT (id) DO NOTHING;

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

CREATE OR REPLACE FUNCTION public.ensure_user_progress(_uid uuid DEFAULT auth.uid())
RETURNS public.user_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.user_progress;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  INSERT INTO public.user_progress (user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO row FROM public.user_progress WHERE user_id = _uid;
  RETURN row;
END;
$$;

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
BEGIN
  SELECT * INTO prog FROM public.user_progress WHERE user_id = _uid;
  IF NOT FOUND THEN RETURN unlocked; END IF;

  FOR def IN SELECT * FROM public.achievement_definitions ORDER BY sort_order LOOP
    IF EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = _uid AND achievement_id = def.id) THEN
      CONTINUE;
    END IF;
    IF def.unlock_event IS NULL THEN CONTINUE; END IF;
    IF _event IS NOT NULL AND def.unlock_event <> _event THEN CONTINUE; END IF;
    IF NOT (def.unlock_event = ANY(prog.completed_quests)) AND def.unlock_event IS DISTINCT FROM _event THEN
      CONTINUE;
    END IF;
    INSERT INTO public.user_achievements (user_id, achievement_id)
    VALUES (_uid, def.id)
    ON CONFLICT DO NOTHING;
    unlocked := array_append(unlocked, def.id);
  END LOOP;
  RETURN unlocked;
END;
$$;

CREATE OR REPLACE FUNCTION public._award_progress_for_user(
  _uid uuid,
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
BEGIN
  IF _uid IS NULL OR ek = '' THEN
    RETURN jsonb_build_object('duplicate', true, 'skipped', true);
  END IF;

  IF idem IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.progress_events WHERE user_id = _uid AND idempotency_key = idem
  ) THEN
    SELECT * INTO prog FROM public.user_progress WHERE user_id = _uid;
    RETURN jsonb_build_object(
      'duplicate', true,
      'xp', coalesce(prog.xp, 0),
      'rep', coalesce(prog.rep, 0),
      'level', coalesce(prog.level, 1)
    );
  END IF;

  PERFORM public.ensure_user_progress(_uid);
  SELECT * INTO prog FROM public.user_progress WHERE user_id = _uid FOR UPDATE;

  quests := coalesce(prog.completed_quests, ARRAY[]::text[]);
  IF NOT (ek = ANY(quests)) THEN quests := quests || ek; END IF;

  new_xp := prog.xp + xp_amt;
  new_rep := prog.rep + rep_amt;
  new_level := public._progress_level_from_xp(new_xp);

  IF prog.last_active = yesterday THEN next_streak := greatest(1, prog.streak_days + 1);
  ELSIF prog.last_active = today THEN next_streak := greatest(1, prog.streak_days);
  ELSIF xp_amt > 0 OR rep_amt > 0 THEN next_streak := 1;
  ELSE next_streak := prog.streak_days;
  END IF;

  UPDATE public.user_progress
     SET xp = new_xp, rep = new_rep, level = new_level, completed_quests = quests,
         streak_days = next_streak,
         last_active = CASE WHEN xp_amt > 0 OR rep_amt > 0 THEN today ELSE last_active END,
         updated_at = now()
   WHERE user_id = _uid;

  INSERT INTO public.progress_events (user_id, event_key, xp_delta, rep_delta, company_id, idempotency_key, meta)
  VALUES (_uid, ek, xp_amt, rep_amt, _company_id, idem, coalesce(_meta, '{}'::jsonb));

  achievements := public._unlock_achievements_for_user(_uid, ek);

  RETURN jsonb_build_object(
    'duplicate', false,
    'xp', new_xp,
    'rep', new_rep,
    'level', new_level,
    'awarded_xp', xp_amt,
    'awarded_rep', rep_amt,
    'achievements', to_jsonb(achievements)
  );
END;
$$;

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
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _company_id IS NOT NULL AND NOT public.owns_company(_company_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  RETURN public._award_progress_for_user(
    auth.uid(), _event_key, _xp_amount, _rep_amount, _company_id, _idempotency_key, _meta
  );
END;
$$;

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
  INSERT INTO public.aura_scouts (user_id, territory) VALUES (uid, terr) ON CONFLICT (user_id) DO NOTHING;
  RETURN public.award_progress('scout:joined', 120, 10, NULL, 'scout:joined:' || uid, jsonb_build_object('territory', terr));
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_user_progress(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.award_progress(text, integer, integer, uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_aura_scout(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_user_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_progress(text, integer, integer, uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_aura_scout(text) TO authenticated;
