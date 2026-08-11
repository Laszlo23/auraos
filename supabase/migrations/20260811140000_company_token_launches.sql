-- Per-company Clanker token launches (Base). Separate from platform AURA / compute ledger.

CREATE TABLE IF NOT EXISTS public.company_token_launches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'deploying', 'live', 'failed')),
  name text NOT NULL,
  symbol text NOT NULL,
  image_url text,
  chain_id integer NOT NULL DEFAULT 8453,
  token_address text,
  pool_tx_hash text,
  clanker_tx_hash text,
  token_admin text,
  reward_recipient text,
  preset_id text NOT NULL DEFAULT 'community_standard',
  spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deployed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS company_token_launches_one_live_uidx
  ON public.company_token_launches(company_id)
  WHERE status = 'live';

CREATE INDEX IF NOT EXISTS company_token_launches_company_idx
  ON public.company_token_launches(company_id, created_at DESC);

ALTER TABLE public.company_token_launches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own company_token_launches" ON public.company_token_launches;
CREATE POLICY "own company_token_launches" ON public.company_token_launches
  FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));

-- Public read of live launches only (for /company/$slug badge)
DROP POLICY IF EXISTS "public read live company tokens" ON public.company_token_launches;
CREATE POLICY "public read live company tokens" ON public.company_token_launches
  FOR SELECT TO anon, authenticated
  USING (status = 'live');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_token_launches TO authenticated;
GRANT SELECT ON public.company_token_launches TO anon;
GRANT ALL ON public.company_token_launches TO service_role;
