-- Cash private-sale queue. Team Desk logs; only Laszlo sends pAURA on-chain.

CREATE TABLE IF NOT EXISTS public.private_sale_cash_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  wallet text NOT NULL,
  amount_usdc numeric(18, 6) NOT NULL,
  p_aura_amount numeric(28, 8) NOT NULL,
  status text NOT NULL DEFAULT 'logged'
    CHECK (status IN ('logged', 'sent', 'canceled')),
  tx_hash text,
  closer text NOT NULL,
  notes text,
  sent_by text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS private_sale_cash_orders_status_idx
  ON public.private_sale_cash_orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS private_sale_cash_orders_created_idx
  ON public.private_sale_cash_orders (created_at DESC);

ALTER TABLE public.private_sale_cash_orders ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.private_sale_cash_orders FROM anon, authenticated;
GRANT ALL ON public.private_sale_cash_orders TO service_role;

COMMENT ON TABLE public.private_sale_cash_orders IS
  'Desk-logged cash buys of pAURA. On-chain credit is owner-only (Laszlo).';
