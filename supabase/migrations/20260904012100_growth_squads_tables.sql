-- Community squads + typed growth digital work (social / Spaces / scout / custom)

CREATE TABLE IF NOT EXISTS public.aura_squads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 48),
  slug text NOT NULL UNIQUE,
  emoji text NOT NULL DEFAULT '◈',
  invite_code text NOT NULL UNIQUE,
  city_id text NOT NULL DEFAULT 'wien',
  owner_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  squad_xp integer NOT NULL DEFAULT 0 CHECK (squad_xp >= 0),
  member_count integer NOT NULL DEFAULT 1 CHECK (member_count >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aura_squads_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,40}[a-z0-9]$'),
  CONSTRAINT aura_squads_invite_format CHECK (invite_code ~ '^[A-Z0-9]{6}$')
);

CREATE INDEX IF NOT EXISTS aura_squads_xp_idx ON public.aura_squads (squad_xp DESC);
CREATE INDEX IF NOT EXISTS aura_squads_city_idx ON public.aura_squads (city_id, squad_xp DESC);

CREATE TABLE IF NOT EXISTS public.aura_squad_members (
  squad_id uuid NOT NULL REFERENCES public.aura_squads (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies (id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (squad_id, user_id)
);

CREATE INDEX IF NOT EXISTS aura_squad_members_user_idx ON public.aura_squad_members (user_id);

CREATE TABLE IF NOT EXISTS public.aura_squad_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL REFERENCES public.aura_squads (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies (id) ON DELETE SET NULL,
  author_name text NOT NULL,
  author_avatar text NOT NULL DEFAULT '◎',
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 2000),
  share_world boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS aura_squad_posts_squad_created_idx
  ON public.aura_squad_posts (squad_id, created_at DESC);
CREATE INDEX IF NOT EXISTS aura_squad_posts_world_idx
  ON public.aura_squad_posts (created_at DESC)
  WHERE share_world = true;

CREATE TABLE IF NOT EXISTS public.aura_squad_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL REFERENCES public.aura_squads (id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 120),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  completed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  completed_at timestamptz,
  xp_reward integer NOT NULL DEFAULT 40 CHECK (xp_reward BETWEEN 10 AND 200),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS aura_squad_tasks_squad_status_idx
  ON public.aura_squad_tasks (squad_id, status, created_at DESC);

-- Growth digital-work columns
ALTER TABLE public.aura_squad_tasks
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS assignee_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS proof_url text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'aura_squad_tasks_kind_check'
  ) THEN
    ALTER TABLE public.aura_squad_tasks
      ADD CONSTRAINT aura_squad_tasks_kind_check
      CHECK (kind IN ('custom', 'social_post', 'space_showup', 'scout_invite', 'channels_publish'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS aura_squad_tasks_assignee_idx
  ON public.aura_squad_tasks (assignee_user_id)
  WHERE assignee_user_id IS NOT NULL AND status = 'open';

ALTER TABLE public.aura_squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aura_squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aura_squad_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aura_squad_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "squad members read squads" ON public.aura_squads;
CREATE POLICY "squad members read squads" ON public.aura_squads
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.aura_squad_members m WHERE m.squad_id = id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "public read squads leaderboard" ON public.aura_squads;
CREATE POLICY "public read squads leaderboard" ON public.aura_squads
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "own squad membership" ON public.aura_squad_members;
CREATE POLICY "own squad membership" ON public.aura_squad_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.aura_squad_members m WHERE m.squad_id = squad_id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "squad posts read" ON public.aura_squad_posts;
CREATE POLICY "squad posts read" ON public.aura_squad_posts
  FOR SELECT TO authenticated
  USING (
    share_world = true
    OR EXISTS (SELECT 1 FROM public.aura_squad_members m WHERE m.squad_id = squad_id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "squad posts write" ON public.aura_squad_posts;
CREATE POLICY "squad posts write" ON public.aura_squad_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.aura_squad_members m WHERE m.squad_id = squad_id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "squad tasks read" ON public.aura_squad_tasks;
CREATE POLICY "squad tasks read" ON public.aura_squad_tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.aura_squad_members m WHERE m.squad_id = squad_id AND m.user_id = auth.uid())
  );

GRANT SELECT ON public.aura_squads TO authenticated;
GRANT SELECT ON public.aura_squad_members TO authenticated;
GRANT SELECT, INSERT ON public.aura_squad_posts TO authenticated;
GRANT SELECT ON public.aura_squad_tasks TO authenticated;
GRANT ALL ON public.aura_squads TO service_role;
GRANT ALL ON public.aura_squad_members TO service_role;
GRANT ALL ON public.aura_squad_posts TO service_role;
GRANT ALL ON public.aura_squad_tasks TO service_role;

CREATE OR REPLACE FUNCTION public._squad_slugify(_name text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  base text := lower(regexp_replace(trim(coalesce(_name, '')), '[^a-z0-9]+', '-', 'g'));
BEGIN
  base := trim(both '-' from base);
  IF length(base) < 2 THEN base := 'squad'; END IF;
  RETURN left(base, 42);
END;
$$;

CREATE OR REPLACE FUNCTION public._squad_random_code()
RETURNS text LANGUAGE sql VOLATILE AS $$
  SELECT upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));
$$;
