-- Pulse: 3-minute ETH up/down prediction rounds (paper stakes v1).

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS pulse_paper_usdc numeric;

CREATE TABLE IF NOT EXISTS public.pulse_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot bigint NOT NULL,
  symbol text NOT NULL DEFAULT 'WETH/USDC',
  opens_at timestamptz NOT NULL,
  locks_at timestamptz NOT NULL,
  closes_at timestamptz NOT NULL,
  open_price numeric,
  close_price numeric,
  result text CHECK (result IN ('up', 'down', 'flat', 'void')),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'locked', 'settled', 'void')),
  price_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pulse_rounds_slot_unique UNIQUE (slot)
);

CREATE INDEX IF NOT EXISTS pulse_rounds_status_closes_idx
  ON public.pulse_rounds (status, closes_at DESC);

CREATE TABLE IF NOT EXISTS public.pulse_bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  round_id uuid NOT NULL REFERENCES public.pulse_rounds(id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('up', 'down')),
  stake_usdc numeric NOT NULL CHECK (stake_usdc > 0),
  payout_mult numeric NOT NULL DEFAULT 1.85,
  payout_usdc numeric,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'won', 'lost', 'refunded', 'void')),
  paper boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  CONSTRAINT pulse_bets_one_per_round UNIQUE (company_id, round_id)
);

CREATE INDEX IF NOT EXISTS pulse_bets_company_created_idx
  ON public.pulse_bets (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS pulse_bets_round_status_idx
  ON public.pulse_bets (round_id, status);

GRANT SELECT ON public.pulse_rounds TO authenticated;
GRANT ALL ON public.pulse_rounds TO service_role;

GRANT SELECT ON public.pulse_bets TO authenticated;
GRANT ALL ON public.pulse_bets TO service_role;

ALTER TABLE public.pulse_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_bets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated read pulse rounds" ON public.pulse_rounds;
CREATE POLICY "authenticated read pulse rounds"
  ON public.pulse_rounds
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "own company pulse bets" ON public.pulse_bets;
CREATE POLICY "own company pulse bets"
  ON public.pulse_bets
  FOR SELECT
  TO authenticated
  USING (public.owns_company(company_id));

-- Writes only via service role / server functions.
DROP POLICY IF EXISTS "no client write pulse rounds" ON public.pulse_rounds;
CREATE POLICY "no client write pulse rounds"
  ON public.pulse_rounds
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "no client write pulse bets" ON public.pulse_bets;
CREATE POLICY "no client write pulse bets"
  ON public.pulse_bets
  FOR INSERT
  TO authenticated
  WITH CHECK (false);
