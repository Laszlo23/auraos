-- Public shop profile fields + claim tokens for seeded listings.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS public_email text,
  ADD COLUMN IF NOT EXISTS hours_note text,
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS owner_display_name text,
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS services text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.companies.street IS 'Street + number for public /b/$slug';
COMMENT ON COLUMN public.companies.featured IS 'Pin to the top of the Wien directory';
COMMENT ON COLUMN public.companies.services IS 'Short public service labels';

CREATE INDEX IF NOT EXISTS companies_local_featured_idx
  ON public.companies (featured DESC, local_cohort_number ASC NULLS LAST)
  WHERE is_local_business = true;

CREATE TABLE IF NOT EXISTS public.local_shop_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  claimed_by uuid REFERENCES auth.users (id)
);

CREATE INDEX IF NOT EXISTS local_shop_claims_company_idx
  ON public.local_shop_claims (company_id);

ALTER TABLE public.local_shop_claims ENABLE ROW LEVEL SECURITY;

-- Claims are redeemed only via service role / server functions.
