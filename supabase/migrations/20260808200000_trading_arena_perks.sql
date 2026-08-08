-- Trading Arena (weekly seasons) + Quant boost / holder perk columns

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS quant_boost_until timestamptz,
  ADD COLUMN IF NOT EXISTS quant_boost_pct numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.trading_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'finalizing', 'closed')),
  prize_pool_aura integer NOT NULL DEFAULT 5000,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trading_seasons_window_idx
  ON public.trading_seasons (starts_at, ends_at);
ALTER TABLE public.trading_seasons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trading_seasons public read" ON public.trading_seasons;
CREATE POLICY "trading_seasons public read" ON public.trading_seasons
  FOR SELECT TO authenticated, anon USING (true);
GRANT SELECT ON public.trading_seasons TO anon, authenticated;
GRANT ALL ON public.trading_seasons TO service_role;

CREATE TABLE IF NOT EXISTS public.trading_season_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.trading_seasons(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_name text,
  realized_pnl numeric NOT NULL DEFAULT 0,
  open_pnl numeric NOT NULL DEFAULT 0,
  max_drawdown_pct numeric NOT NULL DEFAULT 0,
  trade_count integer NOT NULL DEFAULT 0,
  score numeric NOT NULL DEFAULT 0,
  rank integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, company_id)
);
CREATE INDEX IF NOT EXISTS trading_season_entries_season_score_idx
  ON public.trading_season_entries (season_id, score DESC);
ALTER TABLE public.trading_season_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trading_season_entries public read" ON public.trading_season_entries;
CREATE POLICY "trading_season_entries public read" ON public.trading_season_entries
  FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "own trading_season_entries write" ON public.trading_season_entries;
CREATE POLICY "own trading_season_entries write" ON public.trading_season_entries
  FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));
GRANT SELECT ON public.trading_season_entries TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trading_season_entries TO authenticated;
GRANT ALL ON public.trading_season_entries TO service_role;

-- Apply Quant boost (+10% daily notional for 7 days) when wheel lands on that perk
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

  IF prize.label = 'Quant boost' THEN
    UPDATE public.companies
       SET quant_boost_until = greatest(coalesce(quant_boost_until, now()), now()) + interval '7 days',
           quant_boost_pct = 10
     WHERE id = _company_id;
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
