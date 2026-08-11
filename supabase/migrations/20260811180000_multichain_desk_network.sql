-- True multichain desks: per-company preferred network + per-chain deploy flags on the Light Account row.
-- Light Account address is CREATE2-stable across chains; one smart wallet row, many chain deployments.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS desk_network text NOT NULL DEFAULT 'base';

COMMENT ON COLUMN public.companies.desk_network IS
  'Preferred trading/wallet chain for this company (base | bsc | robinhood | …). x402 settle stays on Base.';

ALTER TABLE public.wallet_bindings
  ADD COLUMN IF NOT EXISTS deployed_chains jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.wallet_bindings.deployed_chains IS
  'Map of AuraNetwork → boolean for Light Account bytecode presence, e.g. {"base":true,"robinhood":false}.';
