-- Team Desk: internal sales/ops tool for Aura OS team.
-- Password-gated, not Supabase auth. Tracks team member sales activity.

CREATE TABLE IF NOT EXISTS public.team_desk_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closer text NOT NULL,
  product text NOT NULL CHECK (product IN ('founding_seat', 'local_monthly', 'local_paid_seat', 'other')),
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD')),
  customer_name text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_desk_sales_closer_idx
  ON public.team_desk_sales (closer, created_at DESC);
CREATE INDEX IF NOT EXISTS team_desk_sales_created_idx
  ON public.team_desk_sales (created_at DESC);

CREATE TABLE IF NOT EXISTS public.team_desk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closer text NOT NULL,
  kind text NOT NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_desk_events_created_idx
  ON public.team_desk_events (created_at DESC);

-- RLS: deny anon, allow service_role only (server functions).
ALTER TABLE public.team_desk_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_desk_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.team_desk_sales FROM PUBLIC;
REVOKE ALL ON public.team_desk_events FROM PUBLIC;
REVOKE ALL ON public.team_desk_sales FROM anon, authenticated;
REVOKE ALL ON public.team_desk_events FROM anon, authenticated;

GRANT ALL ON public.team_desk_sales TO service_role;
GRANT ALL ON public.team_desk_events TO service_role;

COMMENT ON TABLE public.team_desk_sales IS 'Team Desk: manual sales log (attributed to Laszlo/Martina/Darko/Evren/Mart).';
COMMENT ON TABLE public.team_desk_events IS 'Team Desk: activity feed for team dashboard.';
