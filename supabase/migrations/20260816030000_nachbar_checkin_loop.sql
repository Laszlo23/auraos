-- Check-in loop: pending for every owned shop, optional company QR,
-- slug check-in, hub marks owner-owned visits so Tresen can confirm.

CREATE OR REPLACE FUNCTION public.nachbar_request_checkin_for_slug(
  _slug text,
  _source text DEFAULT 'shop'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  norm text;
  code text;
BEGIN
  norm := lower(regexp_replace(COALESCE(_slug, ''), '[^a-z0-9-]', '', 'g'));
  IF length(norm) < 2 THEN
    RAISE EXCEPTION 'shop_not_found';
  END IF;
  SELECT nachbar_checkin_code INTO code
  FROM public.companies
  WHERE slug = norm
    AND COALESCE(is_local_business, false) = true
  LIMIT 1;
  IF code IS NULL OR length(code) < 6 THEN
    RAISE EXCEPTION 'shop_not_found';
  END IF;
  RETURN public.nachbar_request_checkin(code, COALESCE(NULLIF(_source, ''), 'shop'));
END;
$$;

DROP FUNCTION IF EXISTS public.owner_nachbar_checkin_code();
CREATE FUNCTION public.owner_nachbar_checkin_code(_company_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cid uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF _company_id IS NOT NULL THEN
    SELECT id INTO cid
    FROM public.companies
    WHERE id = _company_id AND owner_id = uid
    LIMIT 1;
  ELSE
    SELECT id INTO cid
    FROM public.companies
    WHERE owner_id = uid
    ORDER BY created_at
    LIMIT 1;
  END IF;
  IF cid IS NULL THEN
    RAISE EXCEPTION 'company_not_found';
  END IF;
  RETURN public.ensure_nachbar_checkin_code(cid);
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_nachbar_pending_checkins()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  week_start date := public._nachbar_week_start();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  PERFORM public._nachbar_expire_stale();
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', c.id,
      'user_id', c.user_id,
      'status', c.status,
      'source', c.source,
      'created_at', c.created_at,
      'display_name', p.display_name,
      'stamp_count', COALESCE(s.stamp_count, 0),
      'company_id', co.id,
      'company_name', co.name
    ) ORDER BY c.created_at DESC)
    FROM public.nachbar_checkins c
    JOIN public.companies co ON co.id = c.company_id
    LEFT JOIN public.nachbar_profiles p ON p.user_id = c.user_id
    LEFT JOIN public.nachbar_stamps s
      ON s.user_id = c.user_id
     AND s.company_id = c.company_id
     AND s.window_start = week_start
    WHERE co.owner_id = uid AND c.status = 'pending'
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.nachbar_request_checkin_for_slug(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nachbar_request_checkin_for_slug(text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.owner_nachbar_checkin_code(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_nachbar_checkin_code(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.owner_nachbar_pending_checkins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_nachbar_pending_checkins() TO authenticated;
