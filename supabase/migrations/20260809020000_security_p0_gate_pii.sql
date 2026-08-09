-- P0 security: company seat gate, whitelist invite binding, akquise lead PII lockdown.

-- ---------------------------------------------------------------------------
-- 1. Companies INSERT requires an invite redemption or attributed referral.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_has_company_seat(_uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(_uid, auth.uid()) IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.invite_redemptions ir
        WHERE ir.user_id = COALESCE(_uid, auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.referrals r
        WHERE r.referred_id = COALESCE(_uid, auth.uid())
      )
    );
$$;

REVOKE ALL ON FUNCTION public.user_has_company_seat(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_company_seat(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "own companies" ON public.companies;

CREATE POLICY "own companies select"
  ON public.companies FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "own companies update"
  ON public.companies FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "own companies delete"
  ON public.companies FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "own companies insert with seat"
  ON public.companies FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND public.user_has_company_seat(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 2. Whitelist: never return invite_code without matching visitor_id.
-- ---------------------------------------------------------------------------
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
  vid text := left(trim(coalesce(_visitor_id, '')), 64);
  snap jsonb;
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
      'visits', '{}'::jsonb,
      'complete', false,
      'done_count', 0
    );
  END IF;

  snap := public._whitelist_snapshot(r);

  -- Bind minted codes to the visitor that earned them.
  IF r.invite_code IS NOT NULL AND (vid = '' OR r.visitor_id IS DISTINCT FROM vid) THEN
    snap := snap || jsonb_build_object('invite_code', null);
  END IF;

  RETURN snap;
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
    IF r.visitor_id IS DISTINCT FROM vid THEN
      RAISE EXCEPTION 'visitor_mismatch';
    END IF;
    RETURN jsonb_build_object('invite_code', r.invite_code, 'already', true);
  END IF;

  IF NOT (
    r.follow_x AND r.follow_farcaster AND r.like_post
    AND r.comment_post AND r.share_post AND r.chat_channel IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'incomplete';
  END IF;

  -- Prefer the visitor that completed the tasks when set.
  IF r.visitor_id IS NOT NULL AND r.visitor_id <> '' AND r.visitor_id IS DISTINCT FROM vid THEN
    RAISE EXCEPTION 'visitor_mismatch';
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

-- ---------------------------------------------------------------------------
-- 3. Akquise leads: no anon/public SELECT of PII rows.
-- Public share stays via getPublicAkquiseResult (service role / redacted).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "public read shared akquise leads" ON public.akquise_leads;
REVOKE SELECT ON TABLE public.akquise_leads FROM anon;
