-- Per-shop gallery + owner-editable public story for /b/$slug.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS public_story text;

COMMENT ON COLUMN public.companies.public_story IS
  'Owner-editable story on /b/$slug; falls back to editorial then default.';

CREATE TABLE IF NOT EXISTS public.shop_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  url text NOT NULL,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shop_media_company_sort_idx
  ON public.shop_media (company_id, sort_order ASC, created_at ASC);

ALTER TABLE public.shop_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own shop media" ON public.shop_media;
CREATE POLICY "own shop media"
  ON public.shop_media FOR ALL TO authenticated
  USING (
    company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "public read shop media" ON public.shop_media;
CREATE POLICY "public read shop media"
  ON public.shop_media FOR SELECT TO anon, authenticated
  USING (
    company_id IN (
      SELECT id FROM public.companies WHERE is_local_business = true
    )
  );

COMMENT ON TABLE public.shop_media IS 'Public gallery images for local shop profiles (/b/$slug).';
