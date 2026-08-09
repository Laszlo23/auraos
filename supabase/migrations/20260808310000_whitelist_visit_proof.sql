-- Require a recorded link visit before whitelist task confirm (honor-system with proof trail).

ALTER TABLE public.whitelist_progress
  ADD COLUMN IF NOT EXISTS visits jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.whitelist_progress.visits IS
  'Per-task visit/confirm proof: { task_id: { opened_at, confirmed_at } }';

CREATE OR REPLACE FUNCTION public._whitelist_snapshot(r public.whitelist_progress)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'follow_x', r.follow_x,
    'follow_farcaster', r.follow_farcaster,
    'like_post', r.like_post,
    'comment_post', r.comment_post,
    'share_post', r.share_post,
    'chat_channel', r.chat_channel,
    'invite_code', r.invite_code,
    'visits', coalesce(r.visits, '{}'::jsonb),
    'complete', (
      r.follow_x
      AND r.follow_farcaster
      AND r.like_post
      AND r.comment_post
      AND r.share_post
      AND r.chat_channel IS NOT NULL
    ),
    'done_count', (
      (CASE WHEN r.follow_x THEN 1 ELSE 0 END)
      + (CASE WHEN r.follow_farcaster THEN 1 ELSE 0 END)
      + (CASE WHEN r.like_post THEN 1 ELSE 0 END)
      + (CASE WHEN r.comment_post THEN 1 ELSE 0 END)
      + (CASE WHEN r.share_post THEN 1 ELSE 0 END)
      + (CASE WHEN r.chat_channel IS NOT NULL THEN 1 ELSE 0 END)
    )
  );
$$;

CREATE OR REPLACE FUNCTION public._whitelist_ensure_row(_email text, _visitor_id text)
RETURNS public.whitelist_progress
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.whitelist_progress;
  em text := lower(trim(_email));
  vid text := left(trim(coalesce(_visitor_id, '')), 64);
BEGIN
  IF em IS NULL OR em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(em) > 255 THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;
  IF vid = '' THEN
    RAISE EXCEPTION 'invalid_visitor';
  END IF;

  SELECT * INTO r FROM public.whitelist_progress WHERE lower(email) = em FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.whitelist_progress (email, visitor_id)
    VALUES (em, vid)
    RETURNING * INTO r;
  ELSIF r.invite_code IS NULL THEN
    UPDATE public.whitelist_progress
       SET visitor_id = vid, updated_at = now()
     WHERE id = r.id
    RETURNING * INTO r;
  END IF;
  RETURN r;
END;
$$;

-- Record that the user opened the external task link.
CREATE OR REPLACE FUNCTION public.mark_whitelist_visit(
  _email text,
  _visitor_id text,
  _task text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.whitelist_progress;
  task text := lower(trim(_task));
  allowed text[] := ARRAY[
    'follow_x', 'follow_farcaster', 'like_post', 'comment_post', 'share_post',
    'discord', 'telegram'
  ];
  opened_at timestamptz;
BEGIN
  IF NOT (task = ANY (allowed)) THEN
    RAISE EXCEPTION 'invalid_task';
  END IF;

  r := public._whitelist_ensure_row(_email, _visitor_id);

  IF r.invite_code IS NOT NULL THEN
    RETURN public._whitelist_snapshot(r);
  END IF;

  opened_at := now();
  UPDATE public.whitelist_progress
     SET visits = jsonb_set(
           coalesce(visits, '{}'::jsonb),
           ARRAY[task],
           coalesce(visits -> task, '{}'::jsonb) || jsonb_build_object('opened_at', opened_at),
           true
         ),
         updated_at = now()
   WHERE id = r.id
  RETURNING * INTO r;

  RETURN public._whitelist_snapshot(r);
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_whitelist_task(
  _email text,
  _visitor_id text,
  _task text,
  _chat_channel text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.whitelist_progress;
  em text := lower(trim(_email));
  vid text := left(trim(coalesce(_visitor_id, '')), 64);
  task text := lower(trim(_task));
  chat text := lower(trim(coalesce(_chat_channel, '')));
  visit_key text;
  opened_raw text;
  opened_at timestamptz;
  -- Must open the link and spend a moment on it before confirm is accepted.
  min_hold interval := interval '8 seconds';
BEGIN
  IF em IS NULL OR em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(em) > 255 THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;
  IF vid = '' THEN
    RAISE EXCEPTION 'invalid_visitor';
  END IF;

  r := public._whitelist_ensure_row(em, vid);

  -- Already claimed: return snapshot, ignore further task flips
  IF r.invite_code IS NOT NULL THEN
    RETURN public._whitelist_snapshot(r);
  END IF;

  IF task = 'chat' THEN
    IF chat NOT IN ('discord', 'telegram') THEN
      RAISE EXCEPTION 'invalid_chat_channel';
    END IF;
    visit_key := chat;
  ELSIF task IN ('follow_x', 'follow_farcaster', 'like_post', 'comment_post', 'share_post') THEN
    visit_key := task;
  ELSE
    RAISE EXCEPTION 'invalid_task';
  END IF;

  opened_raw := r.visits #>> ARRAY[visit_key, 'opened_at'];
  IF opened_raw IS NULL OR opened_raw = '' THEN
    RAISE EXCEPTION 'visit_required';
  END IF;
  BEGIN
    opened_at := opened_raw::timestamptz;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'visit_required';
  END;
  IF opened_at > now() - min_hold THEN
    RAISE EXCEPTION 'visit_too_soon';
  END IF;
  -- Stale opens older than 2 hours must re-open the link
  IF opened_at < now() - interval '2 hours' THEN
    RAISE EXCEPTION 'visit_expired';
  END IF;

  IF task = 'follow_x' THEN
    UPDATE public.whitelist_progress
       SET follow_x = true,
           visits = jsonb_set(
             coalesce(visits, '{}'::jsonb),
             ARRAY[visit_key],
             coalesce(visits -> visit_key, '{}'::jsonb) || jsonb_build_object('confirmed_at', now()),
             true
           ),
           updated_at = now()
     WHERE id = r.id;
  ELSIF task = 'follow_farcaster' THEN
    UPDATE public.whitelist_progress
       SET follow_farcaster = true,
           visits = jsonb_set(
             coalesce(visits, '{}'::jsonb),
             ARRAY[visit_key],
             coalesce(visits -> visit_key, '{}'::jsonb) || jsonb_build_object('confirmed_at', now()),
             true
           ),
           updated_at = now()
     WHERE id = r.id;
  ELSIF task = 'like_post' THEN
    UPDATE public.whitelist_progress
       SET like_post = true,
           visits = jsonb_set(
             coalesce(visits, '{}'::jsonb),
             ARRAY[visit_key],
             coalesce(visits -> visit_key, '{}'::jsonb) || jsonb_build_object('confirmed_at', now()),
             true
           ),
           updated_at = now()
     WHERE id = r.id;
  ELSIF task = 'comment_post' THEN
    UPDATE public.whitelist_progress
       SET comment_post = true,
           visits = jsonb_set(
             coalesce(visits, '{}'::jsonb),
             ARRAY[visit_key],
             coalesce(visits -> visit_key, '{}'::jsonb) || jsonb_build_object('confirmed_at', now()),
             true
           ),
           updated_at = now()
     WHERE id = r.id;
  ELSIF task = 'share_post' THEN
    UPDATE public.whitelist_progress
       SET share_post = true,
           visits = jsonb_set(
             coalesce(visits, '{}'::jsonb),
             ARRAY[visit_key],
             coalesce(visits -> visit_key, '{}'::jsonb) || jsonb_build_object('confirmed_at', now()),
             true
           ),
           updated_at = now()
     WHERE id = r.id;
  ELSIF task = 'chat' THEN
    UPDATE public.whitelist_progress
       SET chat_channel = chat,
           visits = jsonb_set(
             coalesce(visits, '{}'::jsonb),
             ARRAY[visit_key],
             coalesce(visits -> visit_key, '{}'::jsonb) || jsonb_build_object('confirmed_at', now()),
             true
           ),
           updated_at = now()
     WHERE id = r.id;
  END IF;

  SELECT * INTO r FROM public.whitelist_progress WHERE id = r.id;
  RETURN public._whitelist_snapshot(r);
END;
$$;

-- Keep get_whitelist_progress using updated snapshot (already via _whitelist_snapshot).

REVOKE ALL ON FUNCTION public._whitelist_ensure_row(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_whitelist_visit(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_whitelist_task(text, text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.mark_whitelist_visit(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_whitelist_task(text, text, text, text) TO anon, authenticated;
