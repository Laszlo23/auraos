CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  plan text NOT NULL DEFAULT 'starter',
  status text NOT NULL DEFAULT 'active',
  tokens_per_cycle integer NOT NULL DEFAULT 12000,
  tokens_remaining integer NOT NULL DEFAULT 12000,
  cycle_start timestamptz NOT NULL DEFAULT now(),
  cycle_end timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  payment_mode text NOT NULL DEFAULT 'credits',
  wallet_address text,
  tx_hash text,
  auto_renew boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subscription" ON public.subscriptions FOR ALL TO authenticated
  USING (public.owns_company(company_id)) WITH CHECK (public.owns_company(company_id));

CREATE TABLE public.token_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'burn',
  amount integer NOT NULL DEFAULT 0,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.token_ledger TO authenticated;
GRANT ALL ON public.token_ledger TO service_role;
ALTER TABLE public.token_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own token ledger" ON public.token_ledger FOR ALL TO authenticated
  USING (public.owns_company(company_id)) WITH CHECK (public.owns_company(company_id));
CREATE INDEX token_ledger_company_created_idx ON public.token_ledger (company_id, created_at DESC);