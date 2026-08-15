-- Token-trust: waitlist emails must not be publicly readable.
-- Landing / greeter / access only INSERT. No SELECT after insert.
DROP POLICY IF EXISTS "Anyone can check waitlist email" ON public.waitlist_signups;
REVOKE SELECT ON public.waitlist_signups FROM anon, authenticated;
GRANT INSERT ON public.waitlist_signups TO anon, authenticated;
GRANT ALL ON public.waitlist_signups TO service_role;

-- Wien directory + owner lookups
CREATE INDEX IF NOT EXISTS companies_local_directory_idx
  ON public.companies (local_cohort_number)
  WHERE is_local_business = true;

CREATE INDEX IF NOT EXISTS companies_is_local_idx
  ON public.companies (is_local_business)
  WHERE is_local_business = true;

CREATE INDEX IF NOT EXISTS companies_owner_id_idx
  ON public.companies (owner_id);
