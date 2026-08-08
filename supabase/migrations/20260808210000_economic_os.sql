-- Economic OS: company ledger, slug, agent pause, agent listings, jobs

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS daily_aura_budget numeric NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS reputation numeric NOT NULL DEFAULT 50;

CREATE UNIQUE INDEX IF NOT EXISTS companies_slug_uidx
  ON public.companies (slug)
  WHERE slug IS NOT NULL;

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS daily_budget_aura numeric NOT NULL DEFAULT 40;

-- Company economic ledger (zeros OK; only write real settlements)
CREATE TABLE IF NOT EXISTS public.company_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN (
    'revenue', 'expense', 'fee', 'compute', 'royalty', 'transfer', 'adjustment'
  )),
  amount_usdc numeric NOT NULL DEFAULT 0,
  amount_aura numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USDC',
  status text NOT NULL DEFAULT 'settled'
    CHECK (status IN ('pending', 'settled', 'failed')),
  source text NOT NULL DEFAULT 'system',
  source_id text,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS company_ledger_company_idx
  ON public.company_ledger_entries (company_id, created_at DESC);
ALTER TABLE public.company_ledger_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own company_ledger" ON public.company_ledger_entries;
CREATE POLICY "own company_ledger" ON public.company_ledger_entries
  FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));
CREATE POLICY "public read settled ledger aggregates" ON public.company_ledger_entries
  FOR SELECT TO anon, authenticated
  USING (status = 'settled');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_ledger_entries TO authenticated;
GRANT ALL ON public.company_ledger_entries TO service_role;

-- Publishable agent listings (creator economy)
CREATE TABLE IF NOT EXISTS public.agent_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  creator_user_id uuid NOT NULL,
  name text NOT NULL,
  role text NOT NULL,
  category text NOT NULL DEFAULT 'Operations',
  summary text NOT NULL,
  instructions text NOT NULL DEFAULT '',
  skills text[] NOT NULL DEFAULT '{}',
  price_aura integer NOT NULL DEFAULT 0,
  price_usdc numeric NOT NULL DEFAULT 0,
  pricing_model text NOT NULL DEFAULT 'hire'
    CHECK (pricing_model IN ('hire', 'per_task', 'per_lead')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'paused')),
  rating numeric NOT NULL DEFAULT 0,
  tasks_completed integer NOT NULL DEFAULT 0,
  success_rate numeric NOT NULL DEFAULT 0,
  companies_using integer NOT NULL DEFAULT 0,
  revenue_aura numeric NOT NULL DEFAULT 0,
  royalty_bps integer NOT NULL DEFAULT 7000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_listings_status_idx ON public.agent_listings (status, category);
ALTER TABLE public.agent_listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read published listings" ON public.agent_listings;
CREATE POLICY "read published listings" ON public.agent_listings
  FOR SELECT TO anon, authenticated
  USING (status = 'published' OR public.owns_company(creator_company_id));
DROP POLICY IF EXISTS "own listings write" ON public.agent_listings;
CREATE POLICY "own listings write" ON public.agent_listings
  FOR ALL TO authenticated
  USING (public.owns_company(creator_company_id))
  WITH CHECK (public.owns_company(creator_company_id));
GRANT SELECT ON public.agent_listings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_listings TO authenticated;
GRANT ALL ON public.agent_listings TO service_role;

CREATE TABLE IF NOT EXISTS public.agent_hires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.agent_listings(id) ON DELETE CASCADE,
  hirer_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  price_aura integer NOT NULL DEFAULT 0,
  royalty_aura integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, hirer_company_id)
);
ALTER TABLE public.agent_hires ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hires" ON public.agent_hires
  FOR ALL TO authenticated
  USING (public.owns_company(hirer_company_id))
  WITH CHECK (public.owns_company(hirer_company_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_hires TO authenticated;
GRANT ALL ON public.agent_hires TO service_role;

-- Jobs marketplace
CREATE TABLE IF NOT EXISTS public.work_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  poster_label text NOT NULL DEFAULT 'Client',
  title text NOT NULL,
  brief text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  budget_usdc numeric NOT NULL DEFAULT 0,
  platform_fee_bps integer NOT NULL DEFAULT 1000,
  compute_estimate_usdc numeric NOT NULL DEFAULT 0,
  deadline_at timestamptz,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'accepted', 'delivered', 'paid', 'cancelled')),
  accepted_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  result_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS work_jobs_status_idx ON public.work_jobs (status, created_at DESC);
ALTER TABLE public.work_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read open jobs" ON public.work_jobs
  FOR SELECT TO anon, authenticated
  USING (
    status = 'open'
    OR (accepted_company_id IS NOT NULL AND public.owns_company(accepted_company_id))
    OR (poster_company_id IS NOT NULL AND public.owns_company(poster_company_id))
  );
CREATE POLICY "own jobs write" ON public.work_jobs
  FOR ALL TO authenticated
  USING (
    (poster_company_id IS NOT NULL AND public.owns_company(poster_company_id))
    OR (accepted_company_id IS NOT NULL AND public.owns_company(accepted_company_id))
  )
  WITH CHECK (
    poster_company_id IS NULL OR public.owns_company(poster_company_id)
  );
GRANT SELECT ON public.work_jobs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_jobs TO authenticated;
GRANT ALL ON public.work_jobs TO service_role;

-- Seed a few open jobs (real rows, not demo fake revenue)
INSERT INTO public.work_jobs (poster_label, title, brief, category, budget_usdc, compute_estimate_usdc, deadline_at, status)
VALUES
  (
    'Marketplace',
    'Find 50 qualified real-estate leads',
    'Qualified leads in a major EU city. Deliver list with contact + notes. No spam lists.',
    'Real Estate',
    150,
    20,
    now() + interval '24 hours',
    'open'
  ),
  (
    'Marketplace',
    'Draft 5 SEO landing pages',
    'B2B SaaS niche. Outline + draft copy for founder approval. Cite sources.',
    'SEO',
    80,
    12,
    now() + interval '48 hours',
    'open'
  ),
  (
    'Marketplace',
    'Competitor research brief',
    '10-competitor matrix: pricing, channels, positioning. Deliver markdown brief.',
    'Research',
    60,
    8,
    now() + interval '36 hours',
    'open'
  )
;
