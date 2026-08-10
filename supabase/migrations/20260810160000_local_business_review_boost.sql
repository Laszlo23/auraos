-- Local funnel + Review Boost cohort + company site fields

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_entry_funnel_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_entry_funnel_check
  CHECK (entry_funnel IN ('os', 'agencies', 'sales', 'start', 'realty', 'local'));

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS homepage_url text,
  ADD COLUMN IF NOT EXISTS google_review_url text,
  ADD COLUMN IF NOT EXISTS local_cohort_number integer;

COMMENT ON COLUMN public.companies.homepage_url IS 'External homepage / landing the business already runs';
COMMENT ON COLUMN public.companies.google_review_url IS 'Google Business review / write-a-review URL';
COMMENT ON COLUMN public.companies.local_cohort_number IS 'Review Boost cohort seat 1..1000 for entry_funnel=local';

CREATE UNIQUE INDEX IF NOT EXISTS companies_local_cohort_number_uidx
  ON public.companies (local_cohort_number)
  WHERE local_cohort_number IS NOT NULL;

CREATE OR REPLACE FUNCTION public.local_cohort_cap()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 1000 $$;

CREATE OR REPLACE FUNCTION public.local_cohort_taken()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer FROM public.companies WHERE local_cohort_number IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.local_cohort_taken() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.local_cohort_taken() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.local_cohort_remaining()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(0, public.local_cohort_cap() - public.local_cohort_taken());
$$;

REVOKE ALL ON FUNCTION public.local_cohort_remaining() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.local_cohort_remaining() TO anon, authenticated, service_role;

-- Race-safe cohort assignment for local funnel companies
CREATE OR REPLACE FUNCTION public.assign_local_cohort(_company_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_num integer;
  next_num integer;
BEGIN
  SELECT local_cohort_number INTO current_num
  FROM public.companies
  WHERE id = _company_id
    AND owner_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'company_not_found';
  END IF;

  IF current_num IS NOT NULL THEN
    RETURN current_num;
  END IF;

  IF public.local_cohort_taken() >= public.local_cohort_cap() THEN
    RAISE EXCEPTION 'local_cohort_full';
  END IF;

  SELECT COALESCE(MAX(local_cohort_number), 0) + 1 INTO next_num
  FROM public.companies
  WHERE local_cohort_number IS NOT NULL;

  IF next_num > public.local_cohort_cap() THEN
    RAISE EXCEPTION 'local_cohort_full';
  END IF;

  UPDATE public.companies
  SET local_cohort_number = next_num,
      is_local_business = true,
      network_backlink = true
  WHERE id = _company_id
    AND owner_id = auth.uid()
    AND local_cohort_number IS NULL;

  RETURN next_num;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_local_cohort(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_local_cohort(uuid) TO authenticated;

-- Review Boost tables
CREATE TABLE IF NOT EXISTS public.review_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  goal_invites integer NOT NULL DEFAULT 999,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_campaigns_status_check CHECK (status IN ('active', 'paused', 'completed')),
  CONSTRAINT review_campaigns_goal_check CHECK (goal_invites > 0 AND goal_invites <= 999)
);

CREATE UNIQUE INDEX IF NOT EXISTS review_campaigns_one_active_uidx
  ON public.review_campaigns (company_id)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.review_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.review_campaigns (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  recipient_name text,
  recipient_email text,
  status text NOT NULL DEFAULT 'draft',
  tracking_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  invite_body text,
  sent_at timestamptz,
  clicked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_invites_status_check CHECK (
    status IN ('draft', 'queued', 'sent', 'clicked', 'completed')
  )
);

CREATE INDEX IF NOT EXISTS review_invites_campaign_idx ON public.review_invites (campaign_id);
CREATE INDEX IF NOT EXISTS review_invites_company_idx ON public.review_invites (company_id);
CREATE INDEX IF NOT EXISTS review_invites_token_idx ON public.review_invites (tracking_token);

ALTER TABLE public.review_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners manage review campaigns" ON public.review_campaigns;
CREATE POLICY "owners manage review campaigns"
  ON public.review_campaigns FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));

DROP POLICY IF EXISTS "owners manage review invites" ON public.review_invites;
CREATE POLICY "owners manage review invites"
  ON public.review_invites FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_invites TO authenticated;
GRANT ALL ON public.review_campaigns TO service_role;
GRANT ALL ON public.review_invites TO service_role;

-- Public click tracking via token (service / anon edge handled in app route with admin)
CREATE OR REPLACE FUNCTION public.mark_review_invite_clicked(_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.review_invites;
  review_url text;
BEGIN
  SELECT * INTO inv
  FROM public.review_invites
  WHERE tracking_token = trim(_token)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF inv.status IN ('draft', 'queued') THEN
    -- Not sent yet — still allow redirect if URL exists, but don't invent sent
    NULL;
  ELSIF inv.status = 'sent' THEN
    UPDATE public.review_invites
    SET status = 'clicked', clicked_at = COALESCE(clicked_at, now())
    WHERE id = inv.id;
  ELSIF inv.status = 'clicked' THEN
    NULL;
  END IF;

  SELECT google_review_url INTO review_url
  FROM public.companies
  WHERE id = inv.company_id;

  RETURN review_url;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_review_invite_clicked(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_review_invite_clicked(text) TO anon, authenticated, service_role;
