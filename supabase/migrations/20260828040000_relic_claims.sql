-- Seven Relics hunt claims. Service role only. Never store plaintext phrases.

CREATE TABLE IF NOT EXISTS public.relic_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet text NOT NULL,
  token_id integer NOT NULL CHECK (token_id >= 1 AND token_id <= 7),
  phrase_hash text NOT NULL,
  tx_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wallet),
  UNIQUE (token_id)
);

CREATE INDEX IF NOT EXISTS relic_claims_created_idx
  ON public.relic_claims (created_at);

REVOKE ALL ON public.relic_claims FROM PUBLIC;
REVOKE ALL ON public.relic_claims FROM anon;
REVOKE ALL ON public.relic_claims FROM authenticated;
GRANT ALL ON public.relic_claims TO service_role;

ALTER TABLE public.relic_claims ENABLE ROW LEVEL SECURITY;
