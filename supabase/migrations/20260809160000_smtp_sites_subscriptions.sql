-- SMTP is stored as connector_id = 'smtp' in app_user_connections (encrypted JSON).
-- Company public landing sites, end-customer products, subscribers, drops, and leads.

CREATE TABLE public.company_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  slug text NOT NULL,
  template_id text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_sites_slug_format CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'),
  CONSTRAINT company_sites_slug_unique UNIQUE (slug)
);

CREATE INDEX company_sites_company_id_idx ON public.company_sites (company_id);
CREATE INDEX company_sites_status_idx ON public.company_sites (status);

ALTER TABLE public.company_sites ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_sites TO authenticated;
GRANT ALL ON public.company_sites TO service_role;

CREATE POLICY "own company sites"
  ON public.company_sites FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));

-- Public can read published sites (landing pages).
CREATE POLICY "public read published sites"
  ON public.company_sites FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE TABLE public.site_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.company_sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  stripe_price_id text NOT NULL,
  interval text NOT NULL DEFAULT 'month',
  amount_cents integer,
  currency text NOT NULL DEFAULT 'usd',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX site_products_site_id_idx ON public.site_products (site_id);

ALTER TABLE public.site_products ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_products TO authenticated;
GRANT ALL ON public.site_products TO service_role;

CREATE POLICY "own site products"
  ON public.site_products FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_sites s
      WHERE s.id = site_id AND public.owns_company(s.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_sites s
      WHERE s.id = site_id AND public.owns_company(s.company_id)
    )
  );

CREATE POLICY "public read active products for published sites"
  ON public.site_products FOR SELECT TO anon, authenticated
  USING (
    active = true
    AND EXISTS (
      SELECT 1 FROM public.company_sites s
      WHERE s.id = site_id AND s.status = 'published'
    )
  );

CREATE TABLE public.site_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.company_sites(id) ON DELETE CASCADE,
  email text NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_subscribers_site_email UNIQUE (site_id, email)
);

CREATE INDEX site_subscribers_site_id_idx ON public.site_subscribers (site_id);
CREATE INDEX site_subscribers_status_idx ON public.site_subscribers (status);

ALTER TABLE public.site_subscribers ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.site_subscribers TO authenticated;
GRANT ALL ON public.site_subscribers TO service_role;

CREATE POLICY "own site subscribers read"
  ON public.site_subscribers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_sites s
      WHERE s.id = site_id AND public.owns_company(s.company_id)
    )
  );

CREATE TABLE public.site_content_drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.company_sites(id) ON DELETE CASCADE,
  drop_date date NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'failed')),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_content_drops_unique UNIQUE (site_id, drop_date)
);

CREATE INDEX site_content_drops_site_date_idx ON public.site_content_drops (site_id, drop_date);

ALTER TABLE public.site_content_drops ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.site_content_drops TO authenticated;
GRANT ALL ON public.site_content_drops TO service_role;

CREATE POLICY "own site content drops"
  ON public.site_content_drops FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_sites s
      WHERE s.id = site_id AND public.owns_company(s.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_sites s
      WHERE s.id = site_id AND public.owns_company(s.company_id)
    )
  );

CREATE TABLE public.site_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.company_sites(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  source text NOT NULL DEFAULT 'landing_cta',
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'drafted', 'queued', 'sent')),
  draft_subject text,
  draft_body text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX site_leads_company_id_idx ON public.site_leads (company_id);
CREATE INDEX site_leads_status_idx ON public.site_leads (status);
CREATE INDEX site_leads_site_id_idx ON public.site_leads (site_id);

ALTER TABLE public.site_leads ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON public.site_leads TO authenticated;
GRANT ALL ON public.site_leads TO service_role;

CREATE POLICY "own site leads"
  ON public.site_leads FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));
