-- Social OAuth credentials + engagement inbox

ALTER TABLE public.channel_connections
  ADD COLUMN IF NOT EXISTS access_token_ciphertext text,
  ADD COLUMN IF NOT EXISTS refresh_token_ciphertext text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS scopes text,
  ADD COLUMN IF NOT EXISTS external_user_id text,
  ADD COLUMN IF NOT EXISTS meta_page_id text,
  ADD COLUMN IF NOT EXISTS meta_page_name text,
  ADD COLUMN IF NOT EXISTS ig_user_id text,
  ADD COLUMN IF NOT EXISTS reply_mode text NOT NULL DEFAULT 'auto'
    CHECK (reply_mode IN ('off', 'draft', 'auto'));

-- Ciphertext stays in the table; only service role should read it in app code.
-- Client queries still use select('*') — never render token fields in UI.

ALTER TABLE public.channel_posts
  ADD COLUMN IF NOT EXISTS external_post_id text,
  ADD COLUMN IF NOT EXISTS external_url text,
  ADD COLUMN IF NOT EXISTS error text,
  ADD COLUMN IF NOT EXISTS reply_to_external_id text;

CREATE TABLE IF NOT EXISTS public.social_oauth_states (
  state text PRIMARY KEY,
  provider text NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_verifier text NOT NULL,
  popup boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS social_oauth_states_created_idx ON public.social_oauth_states (created_at);
ALTER TABLE public.social_oauth_states ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.social_oauth_states TO service_role;

CREATE TABLE IF NOT EXISTS public.channel_engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.channel_connections(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.channel_posts(id) ON DELETE SET NULL,
  provider text NOT NULL,
  external_id text NOT NULL,
  kind text NOT NULL DEFAULT 'comment'
    CHECK (kind IN ('comment', 'mention', 'reply', 'dm')),
  author_handle text,
  author_name text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'drafted', 'replied', 'ignored', 'failed')),
  reply_body text,
  external_reply_id text,
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);
CREATE INDEX IF NOT EXISTS channel_engagements_company_status_idx
  ON public.channel_engagements (company_id, status, created_at DESC);
ALTER TABLE public.channel_engagements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own engagements" ON public.channel_engagements;
CREATE POLICY "own engagements" ON public.channel_engagements FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_engagements TO authenticated;
GRANT ALL ON public.channel_engagements TO service_role;
