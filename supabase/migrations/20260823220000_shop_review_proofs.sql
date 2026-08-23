-- Review-screenshot proofs per local shop. Team Desk uploads (WhatsApp/Telegram).
-- Public read for /b/$slug and /tisch. Writes via service role only.

CREATE TABLE IF NOT EXISTS public.shop_review_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  source text NOT NULL DEFAULT 'google_screenshot',
  sort_order integer NOT NULL DEFAULT 0,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shop_review_proofs_company_sort_idx
  ON public.shop_review_proofs (company_id, sort_order ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS shop_review_proofs_created_idx
  ON public.shop_review_proofs (created_at DESC);

ALTER TABLE public.shop_review_proofs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read shop review proofs" ON public.shop_review_proofs;
CREATE POLICY "public read shop review proofs"
  ON public.shop_review_proofs FOR SELECT TO anon, authenticated
  USING (
    company_id IN (
      SELECT id FROM public.companies WHERE is_local_business = true
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.shop_review_proofs FROM anon, authenticated;
GRANT SELECT ON public.shop_review_proofs TO anon, authenticated;
GRANT ALL ON public.shop_review_proofs TO service_role;

COMMENT ON TABLE public.shop_review_proofs IS
  'Google/community review screenshots shown as Beweis on /b/$slug and /tisch.';
