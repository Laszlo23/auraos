-- Onchain AI Trading Desk (Base)
-- Strategies, signals, orders, smart-money follow, desk risk settings.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS trading_armed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_risk_pct numeric NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS max_notional_usdc_day numeric NOT NULL DEFAULT 250,
  ADD COLUMN IF NOT EXISTS max_slippage_bps integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS allowed_symbols text[] NOT NULL DEFAULT ARRAY['WETH/USDC']::text[];

CREATE TABLE IF NOT EXISTS public.trading_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  name text NOT NULL,
  prompt text NOT NULL,
  summary text,
  spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'backtested', 'approved', 'paused')),
  backtest jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trading_strategies_company_idx ON public.trading_strategies(company_id);
ALTER TABLE public.trading_strategies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own trading_strategies" ON public.trading_strategies;
CREATE POLICY "own trading_strategies" ON public.trading_strategies
  FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trading_strategies TO authenticated;
GRANT ALL ON public.trading_strategies TO service_role;

CREATE TABLE IF NOT EXISTS public.trading_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  strategy_id uuid REFERENCES public.trading_strategies(id) ON DELETE SET NULL,
  symbol text NOT NULL,
  side text NOT NULL CHECK (side IN ('long', 'short', 'flat')),
  confidence numeric NOT NULL DEFAULT 0,
  notional_usdc numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'strategy'
    CHECK (source IN ('strategy', 'smart_money', 'manual')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'expired')),
  rationale text,
  entry_price numeric,
  mark_price numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);
CREATE INDEX IF NOT EXISTS trading_signals_company_idx ON public.trading_signals(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS trading_signals_status_idx ON public.trading_signals(status);
ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own trading_signals" ON public.trading_signals;
CREATE POLICY "own trading_signals" ON public.trading_signals
  FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trading_signals TO authenticated;
GRANT ALL ON public.trading_signals TO service_role;

CREATE TABLE IF NOT EXISTS public.trading_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  signal_id uuid REFERENCES public.trading_signals(id) ON DELETE SET NULL,
  strategy_id uuid REFERENCES public.trading_strategies(id) ON DELETE SET NULL,
  symbol text NOT NULL,
  side text NOT NULL,
  token_in text,
  token_out text,
  amount_in text,
  amount_out text,
  slippage_bps integer,
  quote_snapshot jsonb,
  tx_hash text,
  user_op_hash text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'submitted', 'confirmed', 'failed', 'cancelled')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);
CREATE INDEX IF NOT EXISTS trading_orders_company_idx ON public.trading_orders(company_id, created_at DESC);
ALTER TABLE public.trading_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own trading_orders" ON public.trading_orders;
CREATE POLICY "own trading_orders" ON public.trading_orders
  FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trading_orders TO authenticated;
GRANT ALL ON public.trading_orders TO service_role;

CREATE TABLE IF NOT EXISTS public.smart_money_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  label text NOT NULL,
  address text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  follow boolean NOT NULL DEFAULT false,
  curated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, address)
);
CREATE INDEX IF NOT EXISTS smart_money_wallets_company_idx ON public.smart_money_wallets(company_id);
ALTER TABLE public.smart_money_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own smart_money_wallets" ON public.smart_money_wallets;
CREATE POLICY "own smart_money_wallets" ON public.smart_money_wallets
  FOR ALL TO authenticated
  USING (company_id IS NULL OR public.owns_company(company_id))
  WITH CHECK (company_id IS NULL OR public.owns_company(company_id));
-- Curated global rows (company_id null) readable by authenticated
DROP POLICY IF EXISTS "read curated smart_money" ON public.smart_money_wallets;
CREATE POLICY "read curated smart_money" ON public.smart_money_wallets
  FOR SELECT TO authenticated
  USING (curated = true OR public.owns_company(company_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.smart_money_wallets TO authenticated;
GRANT ALL ON public.smart_money_wallets TO service_role;

CREATE TABLE IF NOT EXISTS public.smart_money_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  wallet_id uuid REFERENCES public.smart_money_wallets(id) ON DELETE SET NULL,
  wallet_address text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('in', 'out')),
  asset text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  amount_usd numeric,
  counterparty text,
  tx_hash text,
  block_num bigint,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS smart_money_events_company_idx ON public.smart_money_events(company_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS smart_money_events_tx_uniq
  ON public.smart_money_events(wallet_address, tx_hash, asset, direction)
  WHERE tx_hash IS NOT NULL;
ALTER TABLE public.smart_money_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own smart_money_events" ON public.smart_money_events;
CREATE POLICY "own smart_money_events" ON public.smart_money_events
  FOR ALL TO authenticated
  USING (company_id IS NULL OR public.owns_company(company_id))
  WITH CHECK (company_id IS NULL OR public.owns_company(company_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.smart_money_events TO authenticated;
GRANT ALL ON public.smart_money_events TO service_role;

-- Extend trades for onchain fills
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS strategy_id uuid REFERENCES public.trading_strategies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signal_id uuid REFERENCES public.trading_signals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tx_hash text,
  ADD COLUMN IF NOT EXISTS token_in text,
  ADD COLUMN IF NOT EXISTS token_out text,
  ADD COLUMN IF NOT EXISTS amount_in numeric,
  ADD COLUMN IF NOT EXISTS amount_out numeric,
  ADD COLUMN IF NOT EXISTS mark_price numeric,
  ADD COLUMN IF NOT EXISTS chain_id integer;

-- Curated Base smart-money seeds (global, company_id null)
INSERT INTO public.smart_money_wallets (company_id, label, address, tags, follow, curated)
VALUES
  (NULL, 'Virtuals Protocol treasury', '0x07bE53312eF77BbE5C8aF0f47eC47AFB2F9d8392', ARRAY['base','agent'], false, true),
  (NULL, 'Aerodrome voter', '0x16613524e02ad97eDfeF371bC883F2F5d6C480A5', ARRAY['base','dex'], false, true),
  (NULL, 'Base Bridge', '0x49048044D57e1C92A77f79988d21Fa8fAF74E97e', ARRAY['base','bridge'], false, true),
  (NULL, 'Coinbase Prime (example)', '0x20FE51A9229EEf2cF8Ad9E89d91CAb9312cF3b7A', ARRAY['base','cex'], false, true),
  (NULL, 'Jump Trading (public)', '0xF584F8728B874a6a5c7A8d4d387C9aae899F3086', ARRAY['base','mm'], false, true)
ON CONFLICT DO NOTHING;
