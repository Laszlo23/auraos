-- Card fulfillment queue for /buy. Stripe webhook inserts paid rows.
-- Laszlo sends AURA from the launch treasury after T-0 (key stays off the VPS).

CREATE TABLE IF NOT EXISTS public.aura_buy_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies (id) ON DELETE SET NULL,
  wallet text NOT NULL,
  pack text NOT NULL CHECK (pack IN ('29', '111', '299')),
  amount_usd numeric(12, 2) NOT NULL,
  stripe_session text NOT NULL,
  status text NOT NULL DEFAULT 'paid'
    CHECK (status IN ('paid', 'sent', 'failed')),
  tx_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aura_buy_orders_stripe_session_key UNIQUE (stripe_session)
);

CREATE INDEX IF NOT EXISTS aura_buy_orders_status_idx
  ON public.aura_buy_orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS aura_buy_orders_user_idx
  ON public.aura_buy_orders (user_id, created_at DESC);

ALTER TABLE public.aura_buy_orders ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.aura_buy_orders FROM anon, authenticated;
GRANT SELECT ON public.aura_buy_orders TO authenticated;
GRANT ALL ON public.aura_buy_orders TO service_role;

CREATE POLICY aura_buy_orders_select_own
  ON public.aura_buy_orders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.aura_buy_orders IS
  'Stripe card packs for AURA. Webhook records paid; owner sends tokens after T-0.';
