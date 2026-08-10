-- Marketing Studio: campaign briefs, post media, funnels, public creative bucket

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS brief text;

ALTER TABLE public.channel_posts
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_kind text,
  ADD COLUMN IF NOT EXISTS share_post_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'channel_posts_media_kind_check'
  ) THEN
    ALTER TABLE public.channel_posts
      ADD CONSTRAINT channel_posts_media_kind_check
      CHECK (media_kind IS NULL OR media_kind IN ('image', 'video', 'share_clip'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.marketing_funnels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Growth funnel',
  stages jsonb NOT NULL DEFAULT '[
    {"id":"awareness","title":"Awareness","hint":"Reach and content","count":0,"notes":""},
    {"id":"waitlist","title":"Waitlist","hint":"Emails and interest","count":0,"notes":""},
    {"id":"seat","title":"Founding seat","hint":"Paid access","count":0,"notes":""},
    {"id":"activated","title":"Activated","hint":"Company running","count":0,"notes":""}
  ]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_funnels_company_unique UNIQUE (company_id)
);

CREATE INDEX IF NOT EXISTS marketing_funnels_company_idx
  ON public.marketing_funnels (company_id);

ALTER TABLE public.marketing_funnels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own marketing funnels" ON public.marketing_funnels;
CREATE POLICY "own marketing funnels" ON public.marketing_funnels
  FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_funnels TO authenticated;
GRANT ALL ON public.marketing_funnels TO service_role;

INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-assets', 'marketing-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "marketing assets read" ON storage.objects;
CREATE POLICY "marketing assets read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'marketing-assets');

DROP POLICY IF EXISTS "marketing assets owner write" ON storage.objects;
CREATE POLICY "marketing assets owner write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'marketing-assets'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "marketing assets owner update" ON storage.objects;
CREATE POLICY "marketing assets owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'marketing-assets'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "marketing assets owner delete" ON storage.objects;
CREATE POLICY "marketing assets owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'marketing-assets'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.companies WHERE owner_id = auth.uid()
    )
  );
