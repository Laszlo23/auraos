-- Phase 0–1 integrity + CRM foundations

-- Company settings persistence
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS autonomy smallint NOT NULL DEFAULT 2
    CHECK (autonomy >= 0 AND autonomy <= 2),
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'dark'
    CHECK (theme IN ('dark', 'light'));

-- Allow share events in teaser funnel
DROP POLICY IF EXISTS "Anyone can record a teaser event" ON public.teaser_events;
CREATE POLICY "Anyone can record a teaser event"
ON public.teaser_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(session_id) >= 8 AND length(session_id) <= 64
  AND event = ANY (ARRAY[
    'landing_view','signup_view','open','view_start','q25','q50','q75',
    'complete','cta_click','download','share'
  ])
  AND length(placement) <= 40
  AND (position_pct IS NULL OR (position_pct >= 0 AND position_pct <= 100))
  AND (referrer IS NULL OR length(referrer) <= 500)
  AND (utm_source IS NULL OR length(utm_source) <= 120)
  AND (utm_medium IS NULL OR length(utm_medium) <= 120)
  AND (utm_campaign IS NULL OR length(utm_campaign) <= 120)
  AND (utm_content IS NULL OR length(utm_content) <= 120)
  AND (utm_term IS NULL OR length(utm_term) <= 120)
  AND (ref_code IS NULL OR length(ref_code) <= 60)
  AND (landing_path IS NULL OR length(landing_path) <= 200)
);

-- Soft rate limit helper for anon inserts (waitlist + teaser)
CREATE OR REPLACE FUNCTION public.teaser_insert_allowed(p_session text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent int;
BEGIN
  SELECT count(*) INTO recent
  FROM public.teaser_events
  WHERE session_id = p_session
    AND created_at > now() - interval '1 minute';
  RETURN recent < 30;
END;
$$;

DROP POLICY IF EXISTS "Anyone can record a teaser event" ON public.teaser_events;
CREATE POLICY "Anyone can record a teaser event"
ON public.teaser_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(session_id) >= 8 AND length(session_id) <= 64
  AND event = ANY (ARRAY[
    'landing_view','signup_view','open','view_start','q25','q50','q75',
    'complete','cta_click','download','share'
  ])
  AND length(placement) <= 40
  AND (position_pct IS NULL OR (position_pct >= 0 AND position_pct <= 100))
  AND (referrer IS NULL OR length(referrer) <= 500)
  AND (utm_source IS NULL OR length(utm_source) <= 120)
  AND (utm_medium IS NULL OR length(utm_medium) <= 120)
  AND (utm_campaign IS NULL OR length(utm_campaign) <= 120)
  AND (utm_content IS NULL OR length(utm_content) <= 120)
  AND (utm_term IS NULL OR length(utm_term) <= 120)
  AND (ref_code IS NULL OR length(ref_code) <= 60)
  AND (landing_path IS NULL OR length(landing_path) <= 200)
  AND public.teaser_insert_allowed(session_id)
);

-- Sales CRM
CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  stage text NOT NULL DEFAULT 'Inbound'
    CHECK (stage IN ('Inbound', 'Qualified', 'Negotiating', 'Won', 'Lost')),
  value numeric NOT NULL DEFAULT 0,
  note text,
  contact text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'won', 'lost')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deals_company_stage_idx ON public.deals (company_id, stage);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own deals" ON public.deals;
CREATE POLICY "own deals" ON public.deals FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO authenticated;
GRANT ALL ON public.deals TO service_role;

-- Marketing campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  channel text NOT NULL DEFAULT 'Email',
  progress int NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  value numeric NOT NULL DEFAULT 0,
  roas numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'paused', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS campaigns_company_idx ON public.campaigns (company_id);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own campaigns" ON public.campaigns;
CREATE POLICY "own campaigns" ON public.campaigns FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;

-- File storage path
ALTER TABLE public.files
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS size_bytes bigint;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS result text,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

ALTER TABLE public.channel_posts
  ADD COLUMN IF NOT EXISTS published_at timestamptz;


-- App product events (beyond teaser)
CREATE TABLE IF NOT EXISTS public.app_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  event text NOT NULL,
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_events_event_created_idx ON public.app_events (event, created_at DESC);
ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own app events insert" ON public.app_events;
CREATE POLICY "own app events insert" ON public.app_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "own app events select" ON public.app_events;
CREATE POLICY "own app events select" ON public.app_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
GRANT SELECT, INSERT ON public.app_events TO authenticated;
GRANT ALL ON public.app_events TO service_role;

-- Stripe customer linkage
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Storage bucket for company files (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-files', 'company-files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Company members read files" ON storage.objects;
CREATE POLICY "Company members read files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'company-files'
  AND public.owns_company((storage.foldername(name))[1]::uuid)
);

DROP POLICY IF EXISTS "Company members upload files" ON storage.objects;
CREATE POLICY "Company members upload files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'company-files'
  AND public.owns_company((storage.foldername(name))[1]::uuid)
);

DROP POLICY IF EXISTS "Company members delete files" ON storage.objects;
CREATE POLICY "Company members delete files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'company-files'
  AND public.owns_company((storage.foldername(name))[1]::uuid)
);
