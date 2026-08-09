-- Trading edge pack: paper desk + shareable backtests

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS trading_paper boolean NOT NULL DEFAULT false;

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS paper boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS trades_company_paper_idx
  ON public.trades(company_id, paper, status);

CREATE TABLE IF NOT EXISTS public.trading_backtest_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  strategy_id uuid REFERENCES public.trading_strategies(id) ON DELETE SET NULL,
  share_slug text NOT NULL UNIQUE,
  title text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trading_backtest_shares_slug_idx
  ON public.trading_backtest_shares(share_slug);

ALTER TABLE public.trading_backtest_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own trading_backtest_shares" ON public.trading_backtest_shares;
CREATE POLICY "own trading_backtest_shares" ON public.trading_backtest_shares
  FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));

-- Public slug reads go through getPublicBacktestShare (service role).
-- Do NOT grant anon SELECT — USING (true) would let anyone enumerate all shares.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trading_backtest_shares TO authenticated;
GRANT ALL ON public.trading_backtest_shares TO service_role;
