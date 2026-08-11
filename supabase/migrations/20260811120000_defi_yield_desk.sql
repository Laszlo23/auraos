-- DeFi Yield Desk: LP, lending, prediction, and high-risk allocations.
-- Paper accrual by default; live requires founder arm + yield session key.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS yield_armed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS yield_paper boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_yield_notional_usdc numeric NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS max_yield_risk_tier text NOT NULL DEFAULT 'balanced'
    CHECK (max_yield_risk_tier IN ('conservative', 'balanced', 'aggressive', 'extreme')),
  ADD COLUMN IF NOT EXISTS yield_autopilot jsonb NOT NULL DEFAULT '{
    "idleRouter": true,
    "ilThermostat": true,
    "ilBudgetPct": 8,
    "epochHunter": true,
    "compoundCascade": true,
    "riskAutopilot": true,
    "quantReservePct": 25,
    "autoParkIdle": false,
    "idleCatalogId": "base_aave_usdc"
  }'::jsonb;

CREATE TABLE IF NOT EXISTS public.defi_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  catalog_id text NOT NULL,
  name text NOT NULL,
  chain text NOT NULL DEFAULT 'base',
  protocol text NOT NULL,
  kind text NOT NULL
    CHECK (kind IN ('lp', 'lending', 'farm', 've_lock', 'prediction', 'day_trade', 'arb')),
  risk_tier text NOT NULL
    CHECK (risk_tier IN ('conservative', 'balanced', 'aggressive', 'extreme')),
  target_apy_pct numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'active', 'paused', 'closed')),
  spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS defi_strategies_company_idx ON public.defi_strategies(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS defi_strategies_company_catalog_uidx
  ON public.defi_strategies(company_id, catalog_id);
ALTER TABLE public.defi_strategies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own defi_strategies" ON public.defi_strategies;
CREATE POLICY "own defi_strategies" ON public.defi_strategies
  FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.defi_strategies TO authenticated;
GRANT ALL ON public.defi_strategies TO service_role;

CREATE TABLE IF NOT EXISTS public.defi_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  strategy_id uuid REFERENCES public.defi_strategies(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  catalog_id text NOT NULL,
  chain text NOT NULL DEFAULT 'base',
  protocol text NOT NULL,
  kind text NOT NULL,
  risk_tier text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('pending', 'open', 'closing', 'closed', 'failed')),
  paper boolean NOT NULL DEFAULT true,
  principal_usdc numeric NOT NULL DEFAULT 0,
  mark_usdc numeric NOT NULL DEFAULT 0,
  accrued_usdc numeric NOT NULL DEFAULT 0,
  realized_pnl_usdc numeric NOT NULL DEFAULT 0,
  target_apy_pct numeric NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  last_accrual_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS defi_positions_company_idx ON public.defi_positions(company_id, status);
CREATE INDEX IF NOT EXISTS defi_positions_open_idx ON public.defi_positions(status, paper) WHERE status = 'open';
ALTER TABLE public.defi_positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own defi_positions" ON public.defi_positions;
CREATE POLICY "own defi_positions" ON public.defi_positions
  FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.defi_positions TO authenticated;
GRANT ALL ON public.defi_positions TO service_role;

CREATE TABLE IF NOT EXISTS public.defi_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  position_id uuid REFERENCES public.defi_positions(id) ON DELETE SET NULL,
  strategy_id uuid REFERENCES public.defi_strategies(id) ON DELETE SET NULL,
  kind text NOT NULL,
  message text NOT NULL,
  amount_usdc numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS defi_events_company_idx ON public.defi_events(company_id, created_at DESC);
ALTER TABLE public.defi_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own defi_events" ON public.defi_events;
CREATE POLICY "own defi_events" ON public.defi_events
  FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.defi_events TO authenticated;
GRANT ALL ON public.defi_events TO service_role;
