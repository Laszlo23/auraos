-- Engagement loop: wheel settle RPC, streak on spin, worker heartbeats for ops

CREATE TABLE IF NOT EXISTS public.worker_heartbeats (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ran_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS worker_heartbeats_ran_at_idx ON public.worker_heartbeats (ran_at DESC);

ALTER TABLE public.worker_heartbeats ENABLE ROW LEVEL SECURITY;

-- Service role only (worker writes via supabaseAdmin)
REVOKE ALL ON public.worker_heartbeats FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.worker_heartbeats TO service_role;

-- Stamp chain settlement without granting broad UPDATE on wheel_spins
CREATE OR REPLACE FUNCTION public.settle_wheel_spin(
  _spin_id uuid,
  _tx_hash text,
  _chain_network text,
  _chain_status text
)
RETURNS public.wheel_spins
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  spin public.wheel_spins;
BEGIN
  SELECT * INTO spin FROM public.wheel_spins WHERE id = _spin_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'spin_not_found';
  END IF;
  IF NOT public.owns_company(spin.company_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE public.wheel_spins
     SET tx_hash = _tx_hash,
         chain_network = _chain_network,
         chain_status = coalesce(nullif(_chain_status, ''), 'anchored'),
         settled_at = now()
   WHERE id = _spin_id
  RETURNING * INTO spin;

  RETURN spin;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_wheel_spin(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_wheel_spin(uuid, text, text, text) TO authenticated;

-- Daily wheel: upsert progress, streak, quest — labels aligned with client WHEEL_PRIZES
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
  total numeric;
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

  CREATE TEMP TABLE IF NOT EXISTS _wheel_prizes (
    kind text, label text, amount int, weight numeric, rare boolean
  ) ON COMMIT DROP;
  DELETE FROM _wheel_prizes;
  INSERT INTO _wheel_prizes VALUES
    ('tokens','250 AURA',250,26,false),
    ('xp','80 XP',80,22,false),
    ('tokens','600 AURA',600,16,false),
    ('xp','220 XP',220,14,false),
    ('tokens','1,500 AURA',1500,9,false),
    ('perk','Agent slot',300,6,true),
    ('perk','Quant boost',400,5,true),
    ('tokens','5,000 AURA',5000,2,true);

  SELECT sum(weight) INTO total FROM _wheel_prizes;
  roll := random() * total;

  FOR prize IN SELECT * FROM _wheel_prizes LOOP
    acc := acc + prize.weight;
    IF roll <= acc THEN EXIT; END IF;
  END LOOP;

  xp_gain := CASE WHEN prize.kind = 'xp' THEN prize.amount ELSE (prize.amount / 8)::int + 40 END;

  INSERT INTO public.wheel_spins (company_id, spun_on, prize_kind, amount, label, xp_awarded, rare, chain_status)
  VALUES (_company_id, today, prize.kind, prize.amount, prize.label, xp_gain, prize.rare, 'pending')
  RETURNING * INTO spin;

  IF prize.kind = 'tokens' THEN
    UPDATE public.subscriptions
       SET tokens_remaining = tokens_remaining + prize.amount
     WHERE company_id = _company_id;
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

  -- Ensure progress row exists
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

  RETURN spin;
END;
$$;

REVOKE ALL ON FUNCTION public.spin_daily_wheel(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spin_daily_wheel(uuid) TO authenticated;
