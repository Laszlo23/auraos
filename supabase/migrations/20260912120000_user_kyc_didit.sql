-- Didit KYC: one row per user. Status only — never store ID images or document PII.

CREATE TABLE IF NOT EXISTS public.user_kyc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'didit',
  session_id text,
  workflow_id text,
  status text NOT NULL DEFAULT 'none',
  vendor_data text,
  last_decision jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_kyc_user_provider UNIQUE (user_id, provider),
  CONSTRAINT user_kyc_status_check CHECK (
    status IN (
      'none',
      'not_started',
      'in_progress',
      'in_review',
      'approved',
      'declined',
      'expired',
      'abandoned'
    )
  )
);

CREATE INDEX IF NOT EXISTS user_kyc_session_id_idx ON public.user_kyc (session_id);
CREATE INDEX IF NOT EXISTS user_kyc_user_id_idx ON public.user_kyc (user_id);

COMMENT ON TABLE public.user_kyc IS
  'Didit (or later) identity sessions. last_decision is status metadata only — no document images.';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS kyc_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS kyc_provider text;

ALTER TABLE public.user_kyc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_kyc_select_own ON public.user_kyc;
CREATE POLICY user_kyc_select_own
  ON public.user_kyc
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON public.user_kyc TO authenticated;
GRANT ALL ON public.user_kyc TO service_role;
