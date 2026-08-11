-- Free Aura Reputation audit leads (Lokal funnel)

CREATE TABLE IF NOT EXISTS public.reputation_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  city text NOT NULL DEFAULT '',
  niche text,
  google_url text,
  website_url text,
  email text,
  score integer NOT NULL DEFAULT 0,
  grade text NOT NULL DEFAULT 'D',
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text NOT NULL DEFAULT 'lokal_audit',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reputation_audits_created_at_idx
  ON public.reputation_audits (created_at DESC);

CREATE INDEX IF NOT EXISTS reputation_audits_email_idx
  ON public.reputation_audits (lower(email))
  WHERE email IS NOT NULL AND email <> '';

GRANT INSERT ON public.reputation_audits TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reputation_audits TO service_role;

ALTER TABLE public.reputation_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit reputation audits" ON public.reputation_audits;
CREATE POLICY "Anyone can submit reputation audits"
  ON public.reputation_audits
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
