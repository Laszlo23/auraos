-- Founding wallet login (SIWE), crypto seat checkout, Hood giveaway codes.

-- Pending SIWE challenges (keyed by address — user may not exist yet).
CREATE TABLE public.siwe_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text NOT NULL,
  nonce text NOT NULL UNIQUE,
  domain text NOT NULL,
  uri text NOT NULL,
  chain_id integer NOT NULL DEFAULT 8453,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX siwe_challenges_address_idx ON public.siwe_challenges (address);
CREATE INDEX siwe_challenges_expires_idx ON public.siwe_challenges (expires_at);

ALTER TABLE public.siwe_challenges ENABLE ROW LEVEL SECURITY;
-- Service-role only. No client policies.

-- One verified wallet per user. Address is the login key.
CREATE TABLE public.wallet_identities (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  address text NOT NULL UNIQUE,
  verified_at timestamptz NOT NULL DEFAULT now(),
  last_nonce text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wallet_identities_address_fmt CHECK (address ~ '^0x[a-f0-9]{40}$')
);

CREATE INDEX wallet_identities_address_idx ON public.wallet_identities (address);

ALTER TABLE public.wallet_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own wallet identity read"
  ON public.wallet_identities FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Founding seat crypto (NOWPayments), parallel to local_crypto_checkouts.
CREATE TABLE public.founding_crypto_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  invite_code text,
  asset text NOT NULL,
  amount_usd numeric NOT NULL DEFAULT 299,
  status text NOT NULL DEFAULT 'pending',
  provider text NOT NULL DEFAULT 'nowpayments',
  provider_invoice_id text,
  provider_payment_id text,
  pay_address text,
  pay_amount text,
  pay_currency text,
  invoice_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX founding_crypto_checkouts_user_idx ON public.founding_crypto_checkouts (user_id);
CREATE INDEX founding_crypto_checkouts_status_idx ON public.founding_crypto_checkouts (status);

ALTER TABLE public.founding_crypto_checkouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own founding crypto checkouts read"
  ON public.founding_crypto_checkouts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Hood giveaway — one-time codes, mint on redeem. No founding seat.
CREATE TABLE public.hood_giveaway_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'issued'
    CHECK (status IN ('issued', 'redeemed', 'void')),
  issued_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  redeemed_at timestamptz,
  redeemed_wallet text,
  token_id integer,
  tx_hash text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hood_giveaway_code_fmt CHECK (code ~ '^HOOD-[A-Z0-9]{8}$')
);

CREATE INDEX hood_giveaway_codes_status_idx ON public.hood_giveaway_codes (status);

ALTER TABLE public.hood_giveaway_codes ENABLE ROW LEVEL SECURITY;
-- Service-role writes. Authenticated ops reads via serverFns.

COMMENT ON TABLE public.wallet_identities IS
  'SIWE login identity. One wallet ↔ one user. No silent merge with email accounts.';
COMMENT ON TABLE public.siwe_challenges IS
  'Short-lived SIWE nonces. Consumed on verify. Service-role only.';
COMMENT ON TABLE public.founding_crypto_checkouts IS
  'NOWPayments invoices for the $299 founding seat.';
COMMENT ON TABLE public.hood_giveaway_codes IS
  'One-time Hood NFT claim codes. Does not grant a founding seat.';
