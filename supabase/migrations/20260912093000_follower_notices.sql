-- Founder CSV allowlist for the official /drop notice page.
-- Not an AURA airdrop. No client policies — ops + server fns only.

CREATE TABLE public.follower_notices (
  wallet text PRIMARY KEY,
  batch text NOT NULL DEFAULT 'csv',
  imported_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  seen_at timestamptz,
  CONSTRAINT follower_notices_wallet_chk CHECK (wallet ~ '^0x[a-f0-9]{40}$')
);

CREATE INDEX follower_notices_created_idx ON public.follower_notices (created_at DESC);
CREATE INDEX follower_notices_seen_idx ON public.follower_notices (seen_at);

ALTER TABLE public.follower_notices ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.follower_notices TO service_role;
