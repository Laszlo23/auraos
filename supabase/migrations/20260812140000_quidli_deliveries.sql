-- Quidli delivery ledger: USDC tips to social handles (idempotent, capped).

CREATE TABLE IF NOT EXISTS public.quidli_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_id uuid REFERENCES public.referrals(id) ON DELETE SET NULL,
  idempotency_key text NOT NULL,
  platform text NOT NULL,
  handle text NOT NULL,
  amount_usdc numeric NOT NULL DEFAULT 1,
  token_address text NOT NULL,
  chain_id integer NOT NULL DEFAULT 8453,
  campaign text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'submitted', 'completed', 'failed')),
  quidli_ref text,
  error text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quidli_deliveries_idempotency_key_unique UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS quidli_deliveries_created_idx
  ON public.quidli_deliveries (created_at DESC);

CREATE INDEX IF NOT EXISTS quidli_deliveries_status_idx
  ON public.quidli_deliveries (status);

CREATE INDEX IF NOT EXISTS quidli_deliveries_company_idx
  ON public.quidli_deliveries (company_id)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS quidli_deliveries_user_day_idx
  ON public.quidli_deliveries (platform, handle, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.quidli_deliveries TO authenticated;
GRANT ALL ON public.quidli_deliveries TO service_role;

ALTER TABLE public.quidli_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own company quidli deliveries" ON public.quidli_deliveries;
CREATE POLICY "own company quidli deliveries"
  ON public.quidli_deliveries
  FOR SELECT
  TO authenticated
  USING (
    (company_id IS NOT NULL AND public.owns_company(company_id))
    OR user_id = auth.uid()
  );

-- Inserts/updates go through service role / server fns; authenticated may not insert.
DROP POLICY IF EXISTS "no client write quidli deliveries" ON public.quidli_deliveries;
CREATE POLICY "no client write quidli deliveries"
  ON public.quidli_deliveries
  FOR INSERT
  TO authenticated
  WITH CHECK (false);
