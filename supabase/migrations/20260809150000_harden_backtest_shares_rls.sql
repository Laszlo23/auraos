-- Harden trading_backtest_shares: no bulk anon enumeration.
-- Public access is slug-only via getPublicBacktestShare (service role).

DROP POLICY IF EXISTS "public read trading_backtest_shares" ON public.trading_backtest_shares;

REVOKE SELECT ON public.trading_backtest_shares FROM anon;
