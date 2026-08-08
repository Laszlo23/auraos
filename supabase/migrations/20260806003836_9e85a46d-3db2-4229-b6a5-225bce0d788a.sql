ALTER TABLE public.wheel_spins
  ADD COLUMN IF NOT EXISTS xp_awarded integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rare boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS chain_network text,
  ADD COLUMN IF NOT EXISTS chain_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS tx_hash text,
  ADD COLUMN IF NOT EXISTS settled_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS wheel_spins_company_day_uidx
  ON public.wheel_spins (company_id, spun_on);

CREATE INDEX IF NOT EXISTS wheel_spins_company_created_idx
  ON public.wheel_spins (company_id, created_at DESC);

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
BEGIN
  IF NOT public.owns_company(_company_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF EXISTS (SELECT 1 FROM public.wheel_spins w WHERE w.company_id = _company_id AND w.spun_on = (now() AT TIME ZONE 'utc')::date) THEN
    RAISE EXCEPTION 'already_spun_today';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _wheel_prizes (kind text, label text, amount int, weight numeric, rare boolean) ON COMMIT DROP;
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
  VALUES (_company_id, (now() AT TIME ZONE 'utc')::date, prize.kind, prize.amount, prize.label, xp_gain, prize.rare, 'pending')
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

  SELECT * INTO cur FROM public.founder_progress WHERE company_id = _company_id;
  IF FOUND THEN
    new_xp := cur.xp + xp_gain;
    rem := new_xp;
    WHILE rem >= 400 + (lvl - 1) * 260 LOOP
      rem := rem - (400 + (lvl - 1) * 260);
      lvl := lvl + 1;
    END LOOP;
    quests := cur.completed_quests;
    IF NOT ('company:spin' = ANY(coalesce(quests, ARRAY[]::text[]))) THEN
      quests := coalesce(quests, ARRAY[]::text[]) || 'company:spin';
    END IF;
    UPDATE public.founder_progress
       SET xp = new_xp, level = lvl, completed_quests = quests, last_active = (now() AT TIME ZONE 'utc')::date
     WHERE company_id = _company_id;
  END IF;

  RETURN spin;
END;
$$;

REVOKE ALL ON FUNCTION public.spin_daily_wheel(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spin_daily_wheel(uuid) TO authenticated;