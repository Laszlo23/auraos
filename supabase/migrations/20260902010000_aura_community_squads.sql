-- AURA Community Squads: small crews (2–8) that work together, earn squad XP, show up on the hub.

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

ALTER TABLE public.aura_squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aura_squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aura_squad_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aura_squad_tasks ENABLE ROW LEVEL SECURITY;

-- Members see their squad metadata
DROP POLICY IF EXISTS "squad members read squads" ON public.aura_squads;
CREATE POLICY "squad members read squads" ON public.aura_squads
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.aura_squad_members m
       WHERE m.squad_id = id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "public read squads leaderboard" ON public.aura_squads;
CREATE POLICY "public read squads leaderboard" ON public.aura_squads
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "own squad membership" ON public.aura_squad_members;
CREATE POLICY "own squad membership" ON public.aura_squad_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.aura_squad_members m
       WHERE m.squad_id = squad_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "squad posts read" ON public.aura_squad_posts;
CREATE POLICY "squad posts read" ON public.aura_squad_posts
  FOR SELECT TO authenticated
  USING (
    share_world = true
    OR EXISTS (
      SELECT 1 FROM public.aura_squad_members m
       WHERE m.squad_id = squad_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "squad posts write" ON public.aura_squad_posts;
CREATE POLICY "squad posts write" ON public.aura_squad_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.aura_squad_members m
       WHERE m.squad_id = squad_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "squad tasks read" ON public.aura_squad_tasks;
CREATE POLICY "squad tasks read" ON public.aura_squad_tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.aura_squad_members m
       WHERE m.squad_id = squad_id AND m.user_id = auth.uid()
    )
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
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  base text := lower(regexp_replace(trim(coalesce(_name, '')), '[^a-z0-9]+', '-', 'g'));
  candidate text;
  i integer;
BEGIN
  base := trim(both '-' from base);
  IF length(base) < 2 THEN base := 'squad'; END IF;
  candidate := left(base, 42);
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public._squad_random_code()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));
$$;

CREATE OR REPLACE FUNCTION public.create_aura_squad(
  _name text,
  _emoji text DEFAULT '◈'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  nm text := left(trim(coalesce(_name, '')), 48);
  em text := left(trim(coalesce(_emoji, '◈')), 4);
  slug text;
  code text;
  sid uuid;
  co_id uuid;
  i integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF char_length(nm) < 2 THEN RAISE EXCEPTION 'invalid_name'; END IF;

  IF EXISTS (SELECT 1 FROM public.aura_squad_members WHERE user_id = uid) THEN
    RAISE EXCEPTION 'already_in_squad';
  END IF;

  SELECT id INTO co_id FROM public.companies WHERE owner_id = uid ORDER BY created_at LIMIT 1;

  slug := public._squad_slugify(nm);
  i := 0;
  LOOP
    code := public._squad_random_code();
    BEGIN
      INSERT INTO public.aura_squads (name, slug, emoji, invite_code, owner_user_id)
      VALUES (
        nm,
        CASE WHEN i = 0 THEN slug ELSE slug || '-' || (i + 1)::text END,
        em,
        code,
        uid
      )
      RETURNING id INTO sid;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      i := i + 1;
      IF i > 12 THEN RAISE; END IF;
    END;
  END LOOP;

  INSERT INTO public.aura_squad_members (squad_id, user_id, company_id, role)
  VALUES (sid, uid, co_id, 'owner');

  PERFORM public._award_progress_for_user(
    uid, 'squad:created', 100, 15, co_id, 'squad:create:' || sid::text,
    jsonb_build_object('squad_id', sid, 'squad_name', nm)
  );

  RETURN jsonb_build_object(
    'squad_id', sid,
    'slug', (SELECT slug FROM public.aura_squads WHERE id = sid),
    'invite_code', code,
    'name', nm
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.join_aura_squad(_invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  code text := upper(trim(coalesce(_invite_code, '')));
  sq public.aura_squads;
  co_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF code !~ '^[A-Z0-9]{6}$' THEN RAISE EXCEPTION 'invalid_code'; END IF;

  IF EXISTS (SELECT 1 FROM public.aura_squad_members WHERE user_id = uid) THEN
    RAISE EXCEPTION 'already_in_squad';
  END IF;

  SELECT * INTO sq FROM public.aura_squads WHERE invite_code = code;
  IF NOT FOUND THEN RAISE EXCEPTION 'squad_not_found'; END IF;
  IF sq.member_count >= 8 THEN RAISE EXCEPTION 'squad_full'; END IF;

  SELECT id INTO co_id FROM public.companies WHERE owner_id = uid ORDER BY created_at LIMIT 1;

  INSERT INTO public.aura_squad_members (squad_id, user_id, company_id, role)
  VALUES (sq.id, uid, co_id, 'member');

  UPDATE public.aura_squads
     SET member_count = member_count + 1, updated_at = now()
   WHERE id = sq.id;

  PERFORM public._award_progress_for_user(
    uid, 'squad:joined', 80, 12, co_id, 'squad:join:' || sq.id::text,
    jsonb_build_object('squad_id', sq.id)
  );

  RETURN jsonb_build_object('squad_id', sq.id, 'slug', sq.slug, 'name', sq.name);
END;
$$;

CREATE OR REPLACE FUNCTION public.post_squad_update(
  _squad_id uuid,
  _body text,
  _share_world boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  body text := left(trim(coalesce(_body, '')), 2000);
  co public.companies;
  display text;
  avatar text;
  post_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF char_length(body) < 1 THEN RAISE EXCEPTION 'empty_body'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.aura_squad_members WHERE squad_id = _squad_id AND user_id = uid
  ) THEN
    RAISE EXCEPTION 'not_member';
  END IF;

  SELECT c.* INTO co FROM public.companies c
   WHERE c.owner_id = uid ORDER BY c.created_at LIMIT 1;

  display := coalesce(
    (SELECT h.display_name FROM public.handles h WHERE h.user_id = uid LIMIT 1),
    co.name,
    'Founder'
  );
  avatar := coalesce(co.emoji, '◎');

  INSERT INTO public.aura_squad_posts (squad_id, user_id, company_id, author_name, author_avatar, body, share_world)
  VALUES (_squad_id, uid, co.id, display, avatar, body, coalesce(_share_world, false))
  RETURNING id INTO post_id;

  UPDATE public.aura_squads SET squad_xp = squad_xp + 15, updated_at = now() WHERE id = _squad_id;

  PERFORM public._award_progress_for_user(
    uid, 'squad:post', 35, 5, co.id, 'squad:post:' || post_id::text,
    jsonb_build_object('squad_id', _squad_id)
  );

  RETURN jsonb_build_object('post_id', post_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_squad_task(_squad_id uuid, _title text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  title text := left(trim(coalesce(_title, '')), 120);
  tid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF char_length(title) < 2 THEN RAISE EXCEPTION 'invalid_title'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.aura_squad_members WHERE squad_id = _squad_id AND user_id = uid
  ) THEN
    RAISE EXCEPTION 'not_member';
  END IF;

  INSERT INTO public.aura_squad_tasks (squad_id, created_by, title)
  VALUES (_squad_id, uid, title)
  RETURNING id INTO tid;

  RETURN jsonb_build_object('task_id', tid);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_squad_task(_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  t public.aura_squad_tasks;
  co_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO t FROM public.aura_squad_tasks WHERE id = _task_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'task_not_found'; END IF;
  IF t.status = 'done' THEN RAISE EXCEPTION 'already_done'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.aura_squad_members WHERE squad_id = t.squad_id AND user_id = uid
  ) THEN
    RAISE EXCEPTION 'not_member';
  END IF;

  SELECT id INTO co_id FROM public.companies WHERE owner_id = uid ORDER BY created_at LIMIT 1;

  UPDATE public.aura_squad_tasks
     SET status = 'done', completed_by = uid, completed_at = now()
   WHERE id = t.id;

  UPDATE public.aura_squads
     SET squad_xp = squad_xp + t.xp_reward, updated_at = now()
   WHERE id = t.squad_id;

  PERFORM public._award_progress_for_user(
    uid, 'squad:task', t.xp_reward, 8, co_id, 'squad:task:' || t.id::text,
    jsonb_build_object('squad_id', t.squad_id, 'task_title', t.title)
  );

  RETURN jsonb_build_object('ok', true, 'xp', t.xp_reward);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_community_hub(_squad_limit integer DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  my_squad jsonb;
  members jsonb;
  tasks jsonb;
  posts jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT jsonb_build_object(
    'id', s.id,
    'name', s.name,
    'slug', s.slug,
    'emoji', s.emoji,
    'invite_code', s.invite_code,
    'squad_xp', s.squad_xp,
    'member_count', s.member_count,
    'role', m.role
  ) INTO my_squad
  FROM public.aura_squad_members m
  JOIN public.aura_squads s ON s.id = m.squad_id
  WHERE m.user_id = uid
  LIMIT 1;

  IF my_squad IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.joined_at), '[]'::jsonb) INTO members
    FROM (
      SELECT
        m.user_id,
        m.role,
        m.joined_at,
        coalesce(h.display_name, p.email, 'Founder') AS display_name,
        coalesce(h.avatar, c.emoji, '◎') AS avatar,
        coalesce(up.level, 1) AS level,
        coalesce(up.rep, 0) AS rep
      FROM public.aura_squad_members m
      LEFT JOIN public.profiles p ON p.id = m.user_id
      LEFT JOIN public.handles h ON h.user_id = m.user_id
      LEFT JOIN public.companies c ON c.id = m.company_id
      LEFT JOIN public.user_progress up ON up.user_id = m.user_id
      WHERE m.squad_id = (my_squad->>'id')::uuid
    ) x;

    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.status, t.created_at DESC), '[]'::jsonb) INTO tasks
    FROM (
      SELECT id, title, status, xp_reward, created_at, completed_at
      FROM public.aura_squad_tasks
      WHERE squad_id = (my_squad->>'id')::uuid
      ORDER BY status ASC, created_at DESC
      LIMIT 20
    ) t;

    SELECT coalesce(jsonb_agg(row_to_json(p)::jsonb ORDER BY p.created_at DESC), '[]'::jsonb) INTO posts
    FROM (
      SELECT id, author_name, author_avatar, body, share_world, created_at
      FROM public.aura_squad_posts
      WHERE squad_id = (my_squad->>'id')::uuid
      ORDER BY created_at DESC
      LIMIT 30
    ) p;
  END IF;

  RETURN jsonb_build_object(
    'my_squad', my_squad,
    'members', coalesce(members, '[]'::jsonb),
    'tasks', coalesce(tasks, '[]'::jsonb),
    'posts', coalesce(posts, '[]'::jsonb),
    'top_squads', (
      SELECT coalesce(jsonb_agg(row_to_json(s)::jsonb ORDER BY s.squad_xp DESC), '[]'::jsonb)
      FROM (
        SELECT id, name, slug, emoji, squad_xp, member_count
        FROM public.aura_squads
        ORDER BY squad_xp DESC, member_count DESC
        LIMIT greatest(1, least(coalesce(_squad_limit, 10), 20))
      ) s
    ),
    'world_pulse', (
      SELECT coalesce(jsonb_agg(row_to_json(w)::jsonb ORDER BY w.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT
          p.id,
          s.name AS squad_name,
          s.emoji AS squad_emoji,
          p.author_name,
          p.body,
          p.created_at
        FROM public.aura_squad_posts p
        JOIN public.aura_squads s ON s.id = p.squad_id
        WHERE p.share_world = true
        ORDER BY p.created_at DESC
        LIMIT 15
      ) w
    )
  );
END;
$$;

INSERT INTO public.achievement_definitions (id, title, description, glyph, sort_order, unlock_event, min_xp, min_rep)
VALUES
  ('squad-founder', 'Squad founder', 'Started a crew — now recruit your people.', '👥', 210, 'squad:created', 0, 0),
  ('squad-member', 'Crew member', 'Joined a squad and showed up.', '🤝', 220, 'squad:joined', 0, 0),
  ('squad-builder', 'Squad builder', 'Closed five squad tasks together.', '⚡', 230, NULL, 0, 0)
ON CONFLICT (id) DO NOTHING;

REVOKE ALL ON FUNCTION public.create_aura_squad(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_aura_squad(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.post_squad_update(uuid, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_squad_task(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_squad_task(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_community_hub(integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_aura_squad(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_aura_squad(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_squad_update(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_squad_task(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_squad_task(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_hub(integer) TO authenticated;
