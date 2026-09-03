-- Squad RPCs with typed growth digital work (assign social / Spaces / scout)

CREATE OR REPLACE FUNCTION public.create_aura_squad(_name text, _emoji text DEFAULT '◈')
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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
      VALUES (nm, CASE WHEN i = 0 THEN slug ELSE slug || '-' || (i + 1)::text END, em, code, uid)
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

  -- Seed growth digital-work templates for the new crew
  INSERT INTO public.aura_squad_tasks (squad_id, created_by, title, kind, xp_reward, meta) VALUES
    (sid, uid, 'Post Quest + Squads kit on X', 'social_post', 60,
      jsonb_build_object('share_post_id', 'quest-squads', 'platform', 'x', 'href', 'https://aibusiness.fun/share')),
    (sid, uid, 'Show up on the next Aura X Space', 'space_showup', 80,
      jsonb_build_object('platform', 'x_spaces', 'href', 'https://x.com/buildingcultu3', 'honor', true)),
    (sid, uid, 'Share your Scout /lokal?ref invite', 'scout_invite', 50,
      jsonb_build_object('href', 'https://aibusiness.fun/quest', 'hint', 'Join Scouts then copy invite'));

  RETURN jsonb_build_object(
    'squad_id', sid,
    'slug', (SELECT s.slug FROM public.aura_squads s WHERE s.id = sid),
    'invite_code', code,
    'name', nm
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.join_aura_squad(_invite_code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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
  UPDATE public.aura_squads SET member_count = member_count + 1, updated_at = now() WHERE id = sq.id;

  PERFORM public._award_progress_for_user(
    uid, 'squad:joined', 80, 12, co_id, 'squad:join:' || sq.id::text,
    jsonb_build_object('squad_id', sq.id)
  );

  RETURN jsonb_build_object('squad_id', sq.id, 'slug', sq.slug, 'name', sq.name);
END;
$$;

CREATE OR REPLACE FUNCTION public.post_squad_update(
  _squad_id uuid, _body text, _share_world boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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
  IF NOT EXISTS (SELECT 1 FROM public.aura_squad_members WHERE squad_id = _squad_id AND user_id = uid) THEN
    RAISE EXCEPTION 'not_member';
  END IF;

  SELECT c.* INTO co FROM public.companies c WHERE c.owner_id = uid ORDER BY c.created_at LIMIT 1;
  display := coalesce((SELECT h.display_name FROM public.handles h WHERE h.user_id = uid LIMIT 1), co.name, 'Founder');
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

CREATE OR REPLACE FUNCTION public.create_squad_task(
  _squad_id uuid,
  _title text,
  _kind text DEFAULT 'custom',
  _assignee_user_id uuid DEFAULT NULL,
  _meta jsonb DEFAULT '{}'::jsonb,
  _xp_reward integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  title text := left(trim(coalesce(_title, '')), 120);
  kind text := lower(trim(coalesce(_kind, 'custom')));
  xp integer;
  tid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF char_length(title) < 2 THEN RAISE EXCEPTION 'invalid_title'; END IF;
  IF kind NOT IN ('custom', 'social_post', 'space_showup', 'scout_invite', 'channels_publish') THEN
    RAISE EXCEPTION 'invalid_kind';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.aura_squad_members WHERE squad_id = _squad_id AND user_id = uid) THEN
    RAISE EXCEPTION 'not_member';
  END IF;
  IF _assignee_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.aura_squad_members WHERE squad_id = _squad_id AND user_id = _assignee_user_id
  ) THEN
    RAISE EXCEPTION 'assignee_not_member';
  END IF;

  xp := coalesce(
    _xp_reward,
    CASE kind
      WHEN 'social_post' THEN 60
      WHEN 'space_showup' THEN 80
      WHEN 'scout_invite' THEN 50
      WHEN 'channels_publish' THEN 70
      ELSE 40
    END
  );
  xp := greatest(10, least(xp, 200));

  INSERT INTO public.aura_squad_tasks (squad_id, created_by, title, kind, assignee_user_id, meta, xp_reward)
  VALUES (_squad_id, uid, title, kind, _assignee_user_id, coalesce(_meta, '{}'::jsonb), xp)
  RETURNING id INTO tid;

  RETURN jsonb_build_object('task_id', tid, 'kind', kind, 'xp_reward', xp);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_squad_task(
  _task_id uuid,
  _proof_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  t public.aura_squad_tasks;
  co_id uuid;
  growth_key text;
  growth_xp integer := 0;
  growth_rep integer := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO t FROM public.aura_squad_tasks WHERE id = _task_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'task_not_found'; END IF;
  IF t.status = 'done' THEN RAISE EXCEPTION 'already_done'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.aura_squad_members WHERE squad_id = t.squad_id AND user_id = uid) THEN
    RAISE EXCEPTION 'not_member';
  END IF;
  IF t.assignee_user_id IS NOT NULL AND t.assignee_user_id <> uid THEN
    RAISE EXCEPTION 'not_assignee';
  END IF;

  SELECT id INTO co_id FROM public.companies WHERE owner_id = uid ORDER BY created_at LIMIT 1;

  UPDATE public.aura_squad_tasks
     SET status = 'done', completed_by = uid, completed_at = now(),
         proof_url = NULLIF(left(trim(coalesce(_proof_url, '')), 500), '')
   WHERE id = t.id;

  UPDATE public.aura_squads
     SET squad_xp = squad_xp + t.xp_reward, updated_at = now()
   WHERE id = t.squad_id;

  PERFORM public._award_progress_for_user(
    uid, 'squad:task', t.xp_reward, 8, co_id, 'squad:task:' || t.id::text,
    jsonb_build_object('squad_id', t.squad_id, 'task_title', t.title, 'kind', t.kind)
  );

  IF t.kind = 'social_post' OR t.kind = 'channels_publish' THEN
    growth_key := 'growth:social-post';
    growth_xp := 40;
    growth_rep := 6;
  ELSIF t.kind = 'space_showup' THEN
    growth_key := 'growth:space-showup';
    growth_xp := 50;
    growth_rep := 8;
  ELSIF t.kind = 'scout_invite' THEN
    growth_key := 'growth:scout-share';
    growth_xp := 35;
    growth_rep := 5;
  END IF;

  IF growth_key IS NOT NULL THEN
    PERFORM public._award_progress_for_user(
      uid, growth_key, growth_xp, growth_rep, co_id, growth_key || ':' || t.id::text,
      jsonb_build_object('task_id', t.id, 'kind', t.kind, 'proof_url', _proof_url)
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'xp', t.xp_reward, 'kind', t.kind, 'growth_event', growth_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_community_hub(_squad_limit integer DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
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
    'id', s.id, 'name', s.name, 'slug', s.slug, 'emoji', s.emoji,
    'invite_code', s.invite_code, 'squad_xp', s.squad_xp,
    'member_count', s.member_count, 'role', m.role
  ) INTO my_squad
  FROM public.aura_squad_members m
  JOIN public.aura_squads s ON s.id = m.squad_id
  WHERE m.user_id = uid
  LIMIT 1;

  IF my_squad IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.joined_at), '[]'::jsonb) INTO members
    FROM (
      SELECT m.user_id, m.role, m.joined_at,
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
      SELECT id, title, status, xp_reward, created_at, completed_at,
             kind, assignee_user_id, meta, proof_url
      FROM public.aura_squad_tasks
      WHERE squad_id = (my_squad->>'id')::uuid
      ORDER BY status ASC, created_at DESC
      LIMIT 30
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
        SELECT p.id, s.name AS squad_name, s.emoji AS squad_emoji,
               p.author_name, p.body, p.created_at
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

REVOKE ALL ON FUNCTION public.create_aura_squad(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_aura_squad(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.post_squad_update(uuid, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_squad_task(uuid, text, text, uuid, jsonb, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_squad_task(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_community_hub(integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_aura_squad(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_aura_squad(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_squad_update(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_squad_task(uuid, text, text, uuid, jsonb, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_squad_task(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_hub(integer) TO authenticated;

-- Back-compat overload for older clients that only pass squad + title
CREATE OR REPLACE FUNCTION public.create_squad_task(_squad_id uuid, _title text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN public.create_squad_task(_squad_id, _title, 'custom', NULL, '{}'::jsonb, NULL);
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_squad_task(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_squad_task(_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN public.complete_squad_task(_task_id, NULL);
END;
$$;
GRANT EXECUTE ON FUNCTION public.complete_squad_task(uuid) TO authenticated;
