-- Card-pack net proceeds + official-book LP rail.
-- Stripe fiat stays off-chain until the fulfillment wallet swaps USDC on the published Uni v4 book.

ALTER TABLE public.aura_buy_orders
  ADD COLUMN IF NOT EXISTS amount_cents integer,
  ADD COLUMN IF NOT EXISTS fee_cents integer,
  ADD COLUMN IF NOT EXISTS net_usd numeric(12, 2),
  ADD COLUMN IF NOT EXISTS fee_usd numeric(12, 2),
  ADD COLUMN IF NOT EXISTS fee_estimated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS usdc_units numeric(20, 0),
  ADD COLUMN IF NOT EXISTS payment_intent text,
  ADD COLUMN IF NOT EXISTS funds_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lp_status text NOT NULL DEFAULT 'reserved',
  ADD COLUMN IF NOT EXISTS usdc_tx_hash text,
  ADD COLUMN IF NOT EXISTS swap_tx_hash text;

ALTER TABLE public.aura_buy_orders
  DROP CONSTRAINT IF EXISTS aura_buy_orders_lp_status_check;

ALTER TABLE public.aura_buy_orders
  ADD CONSTRAINT aura_buy_orders_lp_status_check
  CHECK (lp_status IN ('reserved', 'usdc_onchain', 'swapped', 'sent'));

UPDATE public.aura_buy_orders
SET
  amount_cents = COALESCE(amount_cents, ROUND(amount_usd * 100)::integer),
  net_usd = COALESCE(net_usd, amount_usd),
  usdc_units = COALESCE(usdc_units, ROUND(amount_usd * 1000000)),
  lp_status = CASE
    WHEN status = 'sent' THEN 'sent'
    WHEN status = 'failed' THEN lp_status
    ELSE COALESCE(NULLIF(lp_status, ''), 'reserved')
  END
WHERE amount_cents IS NULL OR net_usd IS NULL OR usdc_units IS NULL;

CREATE INDEX IF NOT EXISTS aura_buy_orders_lp_status_idx
  ON public.aura_buy_orders (lp_status, created_at ASC);

CREATE INDEX IF NOT EXISTS aura_buy_orders_receipts_idx
  ON public.aura_buy_orders (lp_status, created_at DESC)
  WHERE lp_status = 'sent';

COMMENT ON COLUMN public.aura_buy_orders.lp_status IS
  'Card reserve → float USDC → official v4 swap → AURA sent. Never a second pool.';

COMMENT ON TABLE public.aura_buy_orders IS
  'Stripe AURA card packs. Net after fees becomes USDC on the official locked Uni v4 AURA/USDC book.';
