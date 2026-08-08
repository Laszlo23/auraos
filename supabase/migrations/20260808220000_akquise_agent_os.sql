-- Akquise Agent OS wedge: templates, plan/verify runs, shareable results

ALTER TABLE public.akquise_campaigns
  ADD COLUMN IF NOT EXISTS template text NOT NULL DEFAULT 'real_estate',
  ADD COLUMN IF NOT EXISTS goal text,
  ADD COLUMN IF NOT EXISTS target_count integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS artifact jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS verify jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS share_slug text,
  ADD COLUMN IF NOT EXISTS share_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aura_spent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agents_labeled text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS akquise_campaigns_share_slug_uidx
  ON public.akquise_campaigns (share_slug)
  WHERE share_slug IS NOT NULL;

-- Public read of shared campaigns (PII redacted in app layer)
DROP POLICY IF EXISTS "public read shared akquise" ON public.akquise_campaigns;
CREATE POLICY "public read shared akquise" ON public.akquise_campaigns
  FOR SELECT TO anon, authenticated
  USING (share_public = true AND share_slug IS NOT NULL);

GRANT SELECT ON public.akquise_campaigns TO anon;

ALTER TABLE public.akquise_leads
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Allow anon to read leads only for publicly shared campaigns
DROP POLICY IF EXISTS "public read shared akquise leads" ON public.akquise_leads;
CREATE POLICY "public read shared akquise leads" ON public.akquise_leads
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.akquise_campaigns c
      WHERE c.id = campaign_id
        AND c.share_public = true
        AND c.share_slug IS NOT NULL
    )
  );

GRANT SELECT ON public.akquise_leads TO anon;
