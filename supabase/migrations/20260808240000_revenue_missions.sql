-- Revenue Missions: goal → strategy → execution → result → learning

CREATE TABLE IF NOT EXISTS public.revenue_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  mission_number integer NOT NULL DEFAULT 1,
  goal_text text NOT NULL,
  target_usdc numeric NOT NULL DEFAULT 0,
  deadline_at timestamptz,
  budget_usdc numeric NOT NULL DEFAULT 0,
  industry text,
  location text,
  risk text NOT NULL DEFAULT 'medium'
    CHECK (risk IN ('low', 'medium', 'high')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'planned', 'active', 'paused', 'complete', 'failed')),
  plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  projected jsonb NOT NULL DEFAULT '{}'::jsonb,
  agents_status jsonb NOT NULL DEFAULT '{}'::jsonb,
  next_best_action jsonb NOT NULL DEFAULT '{}'::jsonb,
  share_slug text,
  share_public boolean NOT NULL DEFAULT false,
  akquise_campaign_id uuid REFERENCES public.akquise_campaigns(id) ON DELETE SET NULL,
  interventions integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS revenue_missions_company_number_uidx
  ON public.revenue_missions (company_id, mission_number);
CREATE UNIQUE INDEX IF NOT EXISTS revenue_missions_share_slug_uidx
  ON public.revenue_missions (share_slug)
  WHERE share_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS revenue_missions_company_status_idx
  ON public.revenue_missions (company_id, status, created_at DESC);

ALTER TABLE public.revenue_missions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own revenue_missions" ON public.revenue_missions;
CREATE POLICY "own revenue_missions" ON public.revenue_missions
  FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));
DROP POLICY IF EXISTS "public read shared missions" ON public.revenue_missions;
CREATE POLICY "public read shared missions" ON public.revenue_missions
  FOR SELECT TO anon, authenticated
  USING (share_public = true AND share_slug IS NOT NULL);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revenue_missions TO authenticated;
GRANT SELECT ON public.revenue_missions TO anon;
GRANT ALL ON public.revenue_missions TO service_role;

CREATE TABLE IF NOT EXISTS public.revenue_mission_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES public.revenue_missions(id) ON DELETE CASCADE,
  agent_name text NOT NULL DEFAULT 'Atlas',
  kind text NOT NULL DEFAULT 'work',
  message text NOT NULL,
  cost_aura numeric NOT NULL DEFAULT 0,
  cost_usdc numeric NOT NULL DEFAULT 0,
  result text,
  status text NOT NULL DEFAULT 'ok'
    CHECK (status IN ('ok', 'failed', 'pending')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS revenue_mission_events_mission_idx
  ON public.revenue_mission_events (mission_id, created_at DESC);
ALTER TABLE public.revenue_mission_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own mission events" ON public.revenue_mission_events;
CREATE POLICY "own mission events" ON public.revenue_mission_events
  FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));
DROP POLICY IF EXISTS "public read shared mission events" ON public.revenue_mission_events;
CREATE POLICY "public read shared mission events" ON public.revenue_mission_events
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.revenue_missions m
      WHERE m.id = mission_id AND m.share_public = true AND m.share_slug IS NOT NULL
    )
  );
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revenue_mission_events TO authenticated;
GRANT SELECT ON public.revenue_mission_events TO anon;
GRANT ALL ON public.revenue_mission_events TO service_role;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS mission_id uuid REFERENCES public.revenue_missions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS tasks_mission_id_idx ON public.tasks (mission_id)
  WHERE mission_id IS NOT NULL;

ALTER TABLE public.akquise_campaigns
  ADD COLUMN IF NOT EXISTS mission_id uuid REFERENCES public.revenue_missions(id) ON DELETE SET NULL;
