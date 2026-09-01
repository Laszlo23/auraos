-- Wire award_progress into wheel, nachbar check-ins, local seat payment, and fix scout awards.

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
    SELECT 1 FROM public.progress_events
     WHERE user_id = _uid AND idempotency_key = idem
  ) THEN
    SELECT * INTO prog FROM public.user_progress WHERE user_id = _uid;
    RETURN jsonb_build_object(
      'duplicate', true,
      'xp', coalesce(prog.xp, 0),
      'rep', coalesce(prog.rep, 0),
      'level', coalesce(prog.level, 1),
      'achievements', '[]'::jsonb
    );
  END IF;

  INSERT INTO public.user_progress (user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO prog FROM public.user_progress WHERE user_id = _uid FOR UPDATE;

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
   WHERE user_id = _uid;

  INSERT INTO public.progress_events (user_id, event_key, xp_delta, rep_delta, company_id, idempotency_key, meta)
  VALUES (_uid, ek, xp_amt, rep_amt, _company_id, idem, coalesce(_meta, '{}'::jsonb));

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

  achievements := public._unlock_achievements_for_user(_uid, ek);

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
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF trim(coalesce(_event_key, '')) = '' THEN RAISE EXCEPTION 'invalid_event'; END IF;
  IF _company_id IS NOT NULL AND NOT public.owns_company(_company_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  RETURN public._award_progress_for_user(uid, _event_key, _xp_amount, _rep_amount, _company_id, _idempotency_key, _meta);
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
  portal_slug text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  PERFORM public._nachbar_expire_stale();

  SELECT * INTO checkin FROM public.nachbar_checkins WHERE id = _checkin_id;
  IF checkin.id IS NULL THEN RAISE EXCEPTION 'checkin_not_found'; END IF;
  IF checkin.status <> 'pending' THEN RAISE EXCEPTION 'checkin_not_pending'; END IF;

  SELECT * INTO company FROM public.companies WHERE id = checkin.company_id;
  IF company.id IS NULL OR company.owner_id <> uid THEN RAISE EXCEPTION 'not_authorized'; END IF;

  UPDATE public.nachbar_checkins
  SET status = 'confirmed', confirmed_at = now()
  WHERE id = checkin.id
  RETURNING * INTO checkin;

  IF checkin.user_id = company.owner_id THEN
    RETURN jsonb_build_object(
      'ok', true,
      'checkin_id', checkin.id,
      'user_id', checkin.user_id,
      'company_id', company.id,
      'company_name', company.name,
      'self', true
    );
  END IF;

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

  SELECT slug INTO portal_slug FROM public.aura_portals WHERE company_id = company.id AND active = true LIMIT 1;

  PERFORM public._award_progress_for_user(
    checkin.user_id,
    'portal:checkin',
    40,
    5,
    company.id,
    'nachbar:checkin:' || checkin.id::text,
    jsonb_build_object('company_id', company.id, 'company_name', company.name)
  );

  IF portal_slug IS NOT NULL THEN
    PERFORM public._award_progress_for_user(
      checkin.user_id,
      'portal:discovered',
      60,
      8,
      company.id,
      'portal:disc:' || portal_slug || ':' || checkin.user_id::text,
      jsonb_build_object('portal_slug', portal_slug)
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'checkin_id', checkin.id,
    'user_id', checkin.user_id,
    'company_id', company.id,
    'company_name', company.name,
    'self', false
  );
END;
$$;

-- Patch spin: sync user_progress after wheel (idempotent per day)
CREATE OR REPLACE FUNCTION public.spin_daily_wheel(_company_id uuid)
RETURNS public.wheel_spins
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prize record;
  roll numeric;
  acc numeric := 0;
  total numeric := 0;
  spin public.wheel_spins;
  xp_gain integer;
  cur public.founder_progress;
  new_xp integer;
  lvl integer := 1;
  rem integer;
  quests text[];
  today date := (now() AT TIME ZONE 'utc')::date;
  yesterday date := ((now() AT TIME ZONE 'utc')::date - 1);
  next_streak integer := 1;
  owner uuid;
BEGIN
  IF NOT public.owns_company(_company_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.wheel_spins w
     WHERE w.company_id = _company_id AND w.spun_on = today
  ) THEN
    RAISE EXCEPTION 'already_spun_today';
  END IF;

  FOR prize IN
    SELECT * FROM (
      VALUES
        ('tokens'::text, '250 AURA'::text, 250, 26::numeric, false),
        ('xp', '80 XP', 80, 22, false),
        ('tokens', '600 AURA', 600, 16, false),
        ('xp', '220 XP', 220, 14, false),
        ('tokens', '1,500 AURA', 1500, 9, false),
        ('perk', 'Agent slot', 300, 6, true),
        ('perk', 'Quant boost', 400, 5, true),
        ('tokens', '5,000 AURA', 5000, 2, true)
    ) AS p(kind, label, amount, weight, rare)
  LOOP
    acc := acc + prize.weight;
  END LOOP;
  total := acc;
  roll := random() * total;
  acc := 0;

  FOR prize IN
    SELECT * FROM (
      VALUES
        ('tokens'::text, '250 AURA'::text, 250, 26::numeric, false),
        ('xp', '80 XP', 80, 22, false),
        ('tokens', '600 AURA', 600, 16, false),
        ('xp', '220 XP', 220, 14, false),
        ('tokens', '1,500 AURA', 1500, 9, false),
        ('perk', 'Agent slot', 300, 6, true),
        ('perk', 'Quant boost', 400, 5, true),
        ('tokens', '5,000 AURA', 5000, 2, true)
    ) AS p(kind, label, amount, weight, rare)
  LOOP
    acc := acc + prize.weight;
    IF roll <= acc THEN EXIT; END IF;
  END LOOP;

  xp_gain := CASE WHEN prize.kind = 'xp' THEN prize.amount ELSE (prize.amount / 8)::int + 40 END;

  INSERT INTO public.wheel_spins (company_id, spun_on, prize_kind, amount, label, xp_awarded, rare, chain_status)
  VALUES (_company_id, today, prize.kind, prize.amount, prize.label, xp_gain, prize.rare, 'pending')
  RETURNING * INTO spin;

  IF prize.kind = 'tokens' OR prize.label = 'Agent slot' THEN
    PERFORM public.credit_wheel_aura(_company_id, prize.amount);
  END IF;

  IF prize.kind IN ('tokens','perk') THEN
    INSERT INTO public.token_ledger (company_id, kind, amount, reason)
    VALUES (_company_id, 'grant', prize.amount, 'Daily wheel — ' || prize.label);
  END IF;

  IF prize.label = 'Quant boost' THEN
    UPDATE public.companies
       SET quant_boost_until = greatest(coalesce(quant_boost_until, now()), now()) + interval '7 days',
           quant_boost_pct = 10
     WHERE id = _company_id;
  END IF;

  IF prize.label = 'Agent slot' THEN
    UPDATE public.companies
       SET agent_slot_bonus = coalesce(agent_slot_bonus, 0) + 1
     WHERE id = _company_id;
  END IF;

  INSERT INTO public.founder_progress (company_id, xp, level, streak_days, last_active, onboarded, completed_quests)
  VALUES (_company_id, 0, 1, 0, today, false, ARRAY[]::text[])
  ON CONFLICT (company_id) DO NOTHING;

  SELECT * INTO cur FROM public.founder_progress WHERE company_id = _company_id;

  IF cur.last_active = yesterday THEN
    next_streak := greatest(1, coalesce(cur.streak_days, 0) + 1);
  ELSIF cur.last_active = today THEN
    next_streak := greatest(1, coalesce(cur.streak_days, 1));
  ELSE
    next_streak := 1;
  END IF;

  new_xp := coalesce(cur.xp, 0) + xp_gain;
  rem := new_xp;
  lvl := 1;
  WHILE rem >= 400 + (lvl - 1) * 260 LOOP
    rem := rem - (400 + (lvl - 1) * 260);
    lvl := lvl + 1;
  END LOOP;

  quests := coalesce(cur.completed_quests, ARRAY[]::text[]);
  IF NOT ('company:spin' = ANY(quests)) THEN
    quests := quests || 'company:spin';
  END IF;

  UPDATE public.founder_progress
     SET xp = new_xp,
         level = lvl,
         completed_quests = quests,
         streak_days = next_streak,
         last_active = today
   WHERE company_id = _company_id;

  SELECT owner_id INTO owner FROM public.companies WHERE id = _company_id;
  IF owner IS NOT NULL THEN
    PERFORM public._award_progress_for_user(
      owner,
      'company:spin',
      xp_gain,
      3,
      _company_id,
      'wheel:' || _company_id::text || ':' || today::text,
      jsonb_build_object('spin_id', spin.id, 'prize', prize.label)
    );
  END IF;

  RETURN spin;
END;
$$;

REVOKE ALL ON FUNCTION public._award_progress_for_user(uuid, text, integer, integer, uuid, text, jsonb) FROM PUBLIC;

-- Backfill portals for existing local listings
INSERT INTO public.aura_portals (company_id, slug, label, active)
SELECT c.id, c.slug, coalesce(nullif(trim(c.name), ''), c.slug), true
FROM public.companies c
WHERE c.is_local_business = true
  AND c.slug IS NOT NULL
  AND length(trim(c.slug)) >= 2
ON CONFLICT (company_id) DO NOTHING;
