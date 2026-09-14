-- Allow any whole-USD AURA card buy (not only $29 / $111 / $299).
-- App still enforces min/max in checkout.

ALTER TABLE public.aura_buy_orders
  DROP CONSTRAINT IF EXISTS aura_buy_orders_pack_check;

ALTER TABLE public.aura_buy_orders
  ADD CONSTRAINT aura_buy_orders_pack_check
  CHECK (pack ~ '^[0-9]{1,6}$');

ALTER TABLE public.aura_buy_orders
  DROP CONSTRAINT IF EXISTS aura_buy_orders_amount_usd_check;

ALTER TABLE public.aura_buy_orders
  ADD CONSTRAINT aura_buy_orders_amount_usd_check
  CHECK (amount_usd >= 11 AND amount_usd <= 10000);

COMMENT ON TABLE public.aura_buy_orders IS
  'Stripe card buys for AURA. Any whole USD in [11, 10000]. Webhook records paid; fulfill buys the official Base book.';
