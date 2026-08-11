-- Stripe Connect (Accounts v2) — one connected merchant account per company
CREATE TABLE IF NOT EXISTS public.company_stripe_accounts (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  stripe_account_id text NOT NULL UNIQUE,
  country text NOT NULL DEFAULT 'AT',
  dashboard text NOT NULL DEFAULT 'full',
  charges_ready boolean NOT NULL DEFAULT false,
  payouts_ready boolean NOT NULL DEFAULT false,
  details_submitted boolean NOT NULL DEFAULT false,
  requirements_due jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_stripe_accounts_stripe_account_id_idx
  ON public.company_stripe_accounts (stripe_account_id);

ALTER TABLE public.company_stripe_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own company stripe account select" ON public.company_stripe_accounts;
CREATE POLICY "own company stripe account select"
  ON public.company_stripe_accounts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_id AND c.owner_id = auth.uid()
    )
  );

GRANT SELECT ON public.company_stripe_accounts TO authenticated;
GRANT ALL ON public.company_stripe_accounts TO service_role;
