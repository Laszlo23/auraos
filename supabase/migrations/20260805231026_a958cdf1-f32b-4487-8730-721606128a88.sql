
CREATE TABLE public.channel_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider text NOT NULL,
  handle text,
  status text NOT NULL DEFAULT 'disconnected',
  followers integer NOT NULL DEFAULT 0,
  engagement numeric NOT NULL DEFAULT 0,
  reach integer NOT NULL DEFAULT 0,
  auto_publish boolean NOT NULL DEFAULT false,
  agent_name text,
  last_sync timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_connections TO authenticated;
GRANT ALL ON public.channel_connections TO service_role;
ALTER TABLE public.channel_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own company channels" ON public.channel_connections FOR ALL TO authenticated
  USING (public.owns_company(company_id)) WITH CHECK (public.owns_company(company_id));

CREATE TABLE public.channel_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  impressions integer NOT NULL DEFAULT 0,
  likes integer NOT NULL DEFAULT 0,
  reposts integer NOT NULL DEFAULT 0,
  agent_name text,
  scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_posts TO authenticated;
GRANT ALL ON public.channel_posts TO service_role;
ALTER TABLE public.channel_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own company channel posts" ON public.channel_posts FOR ALL TO authenticated
  USING (public.owns_company(company_id)) WITH CHECK (public.owns_company(company_id));

CREATE TABLE public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  side text NOT NULL DEFAULT 'long',
  size numeric NOT NULL DEFAULT 0,
  entry numeric NOT NULL DEFAULT 0,
  exit numeric,
  pnl numeric NOT NULL DEFAULT 0,
  confidence integer NOT NULL DEFAULT 70,
  status text NOT NULL DEFAULT 'open',
  rationale text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trades TO authenticated;
GRANT ALL ON public.trades TO service_role;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own company trades" ON public.trades FOR ALL TO authenticated
  USING (public.owns_company(company_id)) WITH CHECK (public.owns_company(company_id));

CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_role text,
  avatar text,
  topic text NOT NULL DEFAULT 'general',
  body text NOT NULL,
  likes integer NOT NULL DEFAULT 0,
  replies integer NOT NULL DEFAULT 0,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own company community" ON public.community_posts FOR ALL TO authenticated
  USING (public.owns_company(company_id)) WITH CHECK (public.owns_company(company_id));

CREATE TABLE public.founder_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  streak_days integer NOT NULL DEFAULT 1,
  last_active date NOT NULL DEFAULT current_date,
  onboarded boolean NOT NULL DEFAULT false,
  completed_quests text[] NOT NULL DEFAULT '{}',
  seat_number integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.founder_progress TO authenticated;
GRANT ALL ON public.founder_progress TO service_role;
ALTER TABLE public.founder_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own company progress" ON public.founder_progress FOR ALL TO authenticated
  USING (public.owns_company(company_id)) WITH CHECK (public.owns_company(company_id));
