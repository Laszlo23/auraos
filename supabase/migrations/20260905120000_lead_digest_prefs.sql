-- Lead digests: email new/recent akquise leads to the company owner 2× daily.

CREATE TABLE IF NOT EXISTS public.lead_digest_prefs (
  company_id uuid PRIMARY KEY REFERENCES public.companies (id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  email text NOT NULL,
  timezone text NOT NULL DEFAULT 'Europe/Vienna',
  -- Local hours (0–23) when digests should fire. Default: morning + afternoon.
  hours integer[] NOT NULL DEFAULT ARRAY[8, 16],
  language text NOT NULL DEFAULT 'de',
  -- Idempotency key: YYYY-MM-DD-HH in company timezone
  last_sent_slot text,
  last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_digest_prefs_hours_len CHECK (cardinality(hours) BETWEEN 1 AND 4),
  CONSTRAINT lead_digest_prefs_email_nonempty CHECK (length(trim(email)) >= 3)
);

CREATE TABLE IF NOT EXISTS public.lead_digest_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  slot text NOT NULL,
  to_email text NOT NULL,
  lead_count integer NOT NULL DEFAULT 0,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, slot)
);

CREATE INDEX IF NOT EXISTS lead_digest_prefs_enabled_idx
  ON public.lead_digest_prefs (enabled)
  WHERE enabled = true;

CREATE INDEX IF NOT EXISTS lead_digest_sends_company_idx
  ON public.lead_digest_sends (company_id, created_at DESC);

ALTER TABLE public.lead_digest_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_digest_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own lead_digest_prefs" ON public.lead_digest_prefs;
CREATE POLICY "own lead_digest_prefs" ON public.lead_digest_prefs
  FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));

DROP POLICY IF EXISTS "own lead_digest_sends" ON public.lead_digest_sends;
CREATE POLICY "own lead_digest_sends" ON public.lead_digest_sends
  FOR SELECT TO authenticated
  USING (public.owns_company(company_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_digest_prefs TO authenticated;
GRANT SELECT ON public.lead_digest_sends TO authenticated;
GRANT ALL ON public.lead_digest_prefs TO service_role;
GRANT ALL ON public.lead_digest_sends TO service_role;

COMMENT ON TABLE public.lead_digest_prefs IS
  'Per-company preference: email lead digests to the founder (e.g. 08:00 + 16:00 Europe/Vienna).';
