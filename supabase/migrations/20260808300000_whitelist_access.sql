-- Whitelist / beta access: honor-system growth tasks → one-use invite code.

CREATE TABLE public.whitelist_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  visitor_id text NOT NULL,
  follow_x boolean NOT NULL DEFAULT false,
  follow_farcaster boolean NOT NULL DEFAULT false,
  like_post boolean NOT NULL DEFAULT false,
  comment_post boolean NOT NULL DEFAULT false,
  share_post boolean NOT NULL DEFAULT false,
  chat_channel text CHECK (chat_channel IS NULL OR chat_channel IN ('discord', 'telegram')),
  invite_code text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE UNIQUE INDEX whitelist_progress_email_key
  ON public.whitelist_progress (lower(email));

CREATE INDEX whitelist_progress_visitor_idx
  ON public.whitelist_progress (visitor_id);

ALTER TABLE public.whitelist_progress ENABLE ROW LEVEL SECURITY;
-- No direct client policies — progress only via SECURITY DEFINER RPCs.

GRANT ALL ON public.whitelist_progress TO service_role;

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

CREATE OR REPLACE FUNCTION public.get_whitelist_progress(_email text, _visitor_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.whitelist_progress;
  em text := lower(trim(_email));
BEGIN
  IF em IS NULL OR em = '' OR length(em) > 255 THEN
    RETURN jsonb_build_object('error', 'invalid_email');
  END IF;
  SELECT * INTO r FROM public.whitelist_progress WHERE lower(email) = em;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'follow_x', false,
      'follow_farcaster', false,
      'like_post', false,
      'comment_post', false,
      'share_post', false,
      'chat_channel', null,
      'invite_code', null,
      'complete', false,
      'done_count', 0
    );
  END IF;
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

  -- Already claimed: return snapshot, ignore further task flips
  IF r.invite_code IS NOT NULL THEN
    RETURN public._whitelist_snapshot(r);
  END IF;

  IF task = 'follow_x' THEN
    UPDATE public.whitelist_progress SET follow_x = true, updated_at = now() WHERE id = r.id;
  ELSIF task = 'follow_farcaster' THEN
    UPDATE public.whitelist_progress SET follow_farcaster = true, updated_at = now() WHERE id = r.id;
  ELSIF task = 'like_post' THEN
    UPDATE public.whitelist_progress SET like_post = true, updated_at = now() WHERE id = r.id;
  ELSIF task = 'comment_post' THEN
    UPDATE public.whitelist_progress SET comment_post = true, updated_at = now() WHERE id = r.id;
  ELSIF task = 'share_post' THEN
    UPDATE public.whitelist_progress SET share_post = true, updated_at = now() WHERE id = r.id;
  ELSIF task = 'chat' THEN
    IF chat NOT IN ('discord', 'telegram') THEN
      RAISE EXCEPTION 'invalid_chat_channel';
    END IF;
    UPDATE public.whitelist_progress
       SET chat_channel = chat, updated_at = now()
     WHERE id = r.id;
  ELSE
    RAISE EXCEPTION 'invalid_task';
  END IF;

  SELECT * INTO r FROM public.whitelist_progress WHERE id = r.id;
  RETURN public._whitelist_snapshot(r);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_whitelist_invite(_email text, _visitor_id text)
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
  new_code text;
  attempts int := 0;
BEGIN
  IF em IS NULL OR em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(em) > 255 THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;
  IF vid = '' THEN
    RAISE EXCEPTION 'invalid_visitor';
  END IF;

  SELECT * INTO r FROM public.whitelist_progress WHERE lower(email) = em FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'incomplete';
  END IF;

  IF r.invite_code IS NOT NULL THEN
    RETURN jsonb_build_object('invite_code', r.invite_code, 'already', true);
  END IF;

  IF NOT (
    r.follow_x AND r.follow_farcaster AND r.like_post
    AND r.comment_post AND r.share_post AND r.chat_channel IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'incomplete';
  END IF;

  LOOP
    attempts := attempts + 1;
    new_code := 'BETA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    BEGIN
      INSERT INTO public.invite_codes (code, label, max_uses, uses, active)
      VALUES (new_code, 'Whitelist beta', 1, 0, true);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF attempts > 8 THEN
        RAISE EXCEPTION 'code_mint_failed';
      END IF;
    END;
  END LOOP;

  UPDATE public.whitelist_progress
     SET invite_code = new_code,
         visitor_id = vid,
         completed_at = now(),
         updated_at = now()
   WHERE id = r.id;

  RETURN jsonb_build_object('invite_code', new_code, 'already', false);
END;
$$;

REVOKE ALL ON FUNCTION public._whitelist_snapshot(public.whitelist_progress) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_whitelist_progress(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_whitelist_task(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_whitelist_invite(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_whitelist_progress(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_whitelist_task(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_whitelist_invite(text, text) TO anon, authenticated;
