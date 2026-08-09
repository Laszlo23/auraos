-- Weekly Boss Report: frozen shareable snapshots of the last 7 days

CREATE TABLE IF NOT EXISTS public.weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  week_end date NOT NULL,
  share_slug text,
  share_public boolean NOT NULL DEFAULT false,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS weekly_reports_company_week_uidx
  ON public.weekly_reports (company_id, week_start);

CREATE UNIQUE INDEX IF NOT EXISTS weekly_reports_share_slug_uidx
  ON public.weekly_reports (share_slug)
  WHERE share_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS weekly_reports_company_created_idx
  ON public.weekly_reports (company_id, created_at DESC);

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own weekly_reports" ON public.weekly_reports;
CREATE POLICY "own weekly_reports" ON public.weekly_reports
  FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));

DROP POLICY IF EXISTS "public read shared weekly_reports" ON public.weekly_reports;
CREATE POLICY "public read shared weekly_reports" ON public.weekly_reports
  FOR SELECT TO anon, authenticated
  USING (share_public = true AND share_slug IS NOT NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_reports TO authenticated;
GRANT SELECT ON public.weekly_reports TO anon;
GRANT ALL ON public.weekly_reports TO service_role;
