-- Entry funnel for multi-GTM landings. Web3 OS stays default 'os' (founding seat required).
-- Non-os funnels may create a company without a founding seat.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS entry_funnel text NOT NULL DEFAULT 'os';

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_entry_funnel_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_entry_funnel_check
  CHECK (entry_funnel IN ('os', 'agencies', 'sales', 'start', 'realty'));

COMMENT ON COLUMN public.companies.entry_funnel IS
  'Public entry funnel that woke this company: os | agencies | sales | start | realty';

CREATE INDEX IF NOT EXISTS companies_entry_funnel_idx ON public.companies (entry_funnel);

-- Allow INSERT when founder has a web3 seat OR is waking a non-os funnel company.
DROP POLICY IF EXISTS "own companies insert with seat" ON public.companies;

CREATE POLICY "own companies insert with seat"
  ON public.companies FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (
      public.user_has_company_seat(auth.uid())
      OR (entry_funnel IS NOT NULL AND entry_funnel <> 'os')
    )
  );
