-- Fix daily wheel: credit AURA even when no subscriptions row exists;
-- make Agent slot a real perk; ensure settle RPC is the only stamp path.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS agent_slot_bonus integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.credit_wheel_aura(_company_id uuid, _amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_id uuid;
  remaining integer;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN;
  END IF;

  SELECT id, tokens_remaining INTO sub_id, remaining
  FROM public.subscriptions
  WHERE company_id = _company_id
  FOR UPDATE;

  IF sub_id IS NULL THEN
    INSERT INTO public.subscriptions (
      company_id, plan, status, tokens_per_cycle, tokens_remaining, payment_mode
    ) VALUES (
      _company_id, 'starter', 'active', greatest(_amount, 12000), _amount, 'credits'
    );
  ELSE
    UPDATE public.subscriptions
       SET tokens_remaining = coalesce(remaining, 0) + _amount,
           status = 'active'
     WHERE id = sub_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_wheel_aura(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.credit_wheel_aura(uuid, integer) TO authenticated, service_role;

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

  WITH prizes(kind, label, amount, weight, rare) AS (
    VALUES
      ('tokens'::text, '250 AURA'::text, 250, 26::numeric, false),
      ('xp', '80 XP', 80, 22, false),
      ('tokens', '600 AURA', 600, 16, false),
      ('xp', '220 XP', 220, 14, false),
      ('tokens', '1,500 AURA', 1500, 9, false),
      ('perk', 'Agent slot', 300, 6, true),
      ('perk', 'Quant boost', 400, 5, true),
      ('tokens', '5,000 AURA', 5000, 2, true)
  )
  SELECT sum(weight) INTO total FROM prizes;

  roll := random() * total;

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

  -- Tokens + agent-slot perk both credit spendable AURA (upsert subscription).
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

  RETURN spin;
END;
$$;

REVOKE ALL ON FUNCTION public.spin_daily_wheel(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spin_daily_wheel(uuid) TO authenticated;

-- Keep settle RPC available (idempotent recreate)
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
