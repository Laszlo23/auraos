CREATE TABLE public.akquise_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  objective text NOT NULL DEFAULT 'buy',
  brief text NOT NULL,
  region text,
  language text NOT NULL DEFAULT 'de',
  tone text NOT NULL DEFAULT 'warm-professional',
  seed_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'idle',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.akquise_campaigns TO authenticated;
GRANT ALL ON public.akquise_campaigns TO service_role;
ALTER TABLE public.akquise_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own company campaigns" ON public.akquise_campaigns FOR ALL TO authenticated
  USING (public.owns_company(company_id)) WITH CHECK (public.owns_company(company_id));

CREATE TABLE public.akquise_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.akquise_campaigns(id) ON DELETE CASCADE,
  name text,
  org text,
  email text,
  phone text,
  source_url text,
  address text,
  snippet text,
  score integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'found',
  draft_subject text,
  draft_body text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX akquise_leads_campaign_idx ON public.akquise_leads (campaign_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.akquise_leads TO authenticated;
GRANT ALL ON public.akquise_leads TO service_role;
ALTER TABLE public.akquise_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own company leads" ON public.akquise_leads FOR ALL TO authenticated
  USING (public.owns_company(company_id)) WITH CHECK (public.owns_company(company_id));

CREATE TABLE public.app_user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connector_id text NOT NULL,
  connection_key_ciphertext text NOT NULL,
  account_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connector_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user_connections TO service_role;
ALTER TABLE public.app_user_connections ENABLE ROW LEVEL SECURITY;