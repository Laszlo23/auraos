-- Bookkeeper MVP: structured expenses from uploaded bills (founder-confirmed).
-- Assistive tax-prep only — not licensed tax advice / filing.

CREATE TABLE IF NOT EXISTS public.expense_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_id uuid REFERENCES public.files(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  vendor text,
  amount numeric,
  currency text NOT NULL DEFAULT 'EUR',
  invoice_date date,
  category text NOT NULL DEFAULT 'uncategorized'
    CHECK (category IN (
      'office',
      'software',
      'travel',
      'marketing',
      'professional_services',
      'equipment',
      'rent_utilities',
      'meals',
      'telecom',
      'banking_fees',
      'taxes_fees',
      'inventory_cogs',
      'personal',
      'uncategorized'
    )),
  tax_hint text NOT NULL DEFAULT 'unknown'
    CHECK (tax_hint IN (
      'likely_business',
      'input_vat_possible',
      'personal',
      'mixed',
      'unknown'
    )),
  vat_amount numeric,
  confidence numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'confirmed', 'rejected')),
  notes text,
  raw_extract jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expense_items_company_created_idx
  ON public.expense_items (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS expense_items_company_status_idx
  ON public.expense_items (company_id, status);

CREATE INDEX IF NOT EXISTS expense_items_file_idx
  ON public.expense_items (file_id)
  WHERE file_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_items TO authenticated;
GRANT ALL ON public.expense_items TO service_role;

ALTER TABLE public.expense_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own company expenses" ON public.expense_items;
CREATE POLICY "own company expenses"
  ON public.expense_items
  FOR ALL
  TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));
