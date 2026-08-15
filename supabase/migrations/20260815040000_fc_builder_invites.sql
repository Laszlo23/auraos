-- Founder-curated Farcaster builder invites (personal FID + test AURA).
-- Does not change founding-seat economics.

CREATE TABLE IF NOT EXISTS public.fc_builder_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  fid bigint NOT NULL,
  username text NOT NULL,
  display_name text,
  claim_token text NOT NULL,
  credits integer NOT NULL DEFAULT 240
    CHECK (credits > 0 AND credits <= 5000),
  status text NOT NULL DEFAULT 'drafted'
    CHECK (status IN ('drafted', 'casted', 'claimed', 'feedback')),
  target_cast_hash text,
  reply_hash text,
  cast_url text,
  claimed_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  claimed_at timestamptz,
  feedback text,
  feedback_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fid),
  UNIQUE (claim_token)
);

CREATE INDEX IF NOT EXISTS fc_builder_invites_company_idx
  ON public.fc_builder_invites (company_id, created_at DESC);

ALTER TABLE public.fc_builder_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own fc builder invites" ON public.fc_builder_invites;
CREATE POLICY "own fc builder invites" ON public.fc_builder_invites
  FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));

GRANT SELECT, INSERT, UPDATE ON public.fc_builder_invites TO authenticated;
GRANT ALL ON public.fc_builder_invites TO service_role;

COMMENT ON TABLE public.fc_builder_invites IS
  'Personal Farcaster builder invites. One FID, one welcome, test AURA after sign-in. Seat stays paid.';
