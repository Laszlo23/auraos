-- Didit webhook idempotency + extra session statuses from the V3 state machine.

ALTER TABLE public.user_kyc DROP CONSTRAINT IF EXISTS user_kyc_status_check;
ALTER TABLE public.user_kyc ADD CONSTRAINT user_kyc_status_check CHECK (
  status IN (
    'none',
    'not_started',
    'in_progress',
    'awaiting_user',
    'in_review',
    'approved',
    'declined',
    'resubmitted',
    'abandoned',
    'expired',
    'kyc_expired'
  )
);

CREATE TABLE IF NOT EXISTS public.didit_webhook_events (
  event_id text PRIMARY KEY,
  session_id text,
  status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.didit_webhook_events IS
  'Didit webhook event_id dedupe. Service role only — no document PII.';

ALTER TABLE public.didit_webhook_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.didit_webhook_events TO service_role;
