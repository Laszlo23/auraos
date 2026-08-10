-- Genesis Passport NFT purchases (pay first, server-gated mint). Seat-gated utility — not token launch.

CREATE TABLE IF NOT EXISTS public.genesis_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies (id) ON DELETE SET NULL,
  wallet text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'minted', 'failed')),
  stripe_session_id text UNIQUE,
  x402_payment_id text,
  amount_cents integer NOT NULL DEFAULT 9900,
  amount_usdc numeric(12, 2),
  token_id integer,
  tx_hash text,
  voucher_nonce text UNIQUE,
  error text,
  paid_at timestamptz,
  minted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS genesis_purchases_status_idx
  ON public.genesis_purchases (status, created_at);

GRANT SELECT ON public.genesis_purchases TO authenticated;
GRANT ALL ON public.genesis_purchases TO service_role;
ALTER TABLE public.genesis_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own genesis purchase" ON public.genesis_purchases;
CREATE POLICY "Users read own genesis purchase"
  ON public.genesis_purchases FOR SELECT TO authenticated
  USING (user_id = auth.uid());
