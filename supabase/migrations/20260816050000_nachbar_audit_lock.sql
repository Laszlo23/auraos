-- Audit lock: internals are not client RPCs. Owner self-confirm stays
-- visible for the Tresen demo but does not mint guest points.

CREATE OR REPLACE FUNCTION public._nachbar_credit(
  _user_id uuid,
  _amount integer,
  _kind text,
  _reason text,
  _checkin_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN;
  END IF;
  UPDATE public.nachbar_profiles
  SET balance = balance + _amount, updated_at = now()
  WHERE user_id = _user_id;
  INSERT INTO public.nachbar_ledger (user_id, kind, amount, reason, checkin_id)
  VALUES (_user_id, _kind, _amount, _reason, _checkin_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.nachbar_confirm_checkin(_checkin_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  checkin public.nachbar_checkins;
  company public.companies;
  week_count int;
  welcome_done boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  PERFORM public._nachbar_expire_stale();

  SELECT * INTO checkin FROM public.nachbar_checkins WHERE id = _checkin_id;
  IF checkin.id IS NULL THEN
    RAISE EXCEPTION 'checkin_not_found';
  END IF;
  IF checkin.status <> 'pending' THEN
    RAISE EXCEPTION 'checkin_not_pending';
  END IF;

  SELECT * INTO company FROM public.companies WHERE id = checkin.company_id;
  IF company.id IS NULL OR company.owner_id <> uid THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE public.nachbar_checkins
  SET status = 'confirmed', confirmed_at = now()
  WHERE id = checkin.id
  RETURNING * INTO checkin;

  -- Shop owner confirming their own visit: demo loop only, no guest mint.
  IF checkin.user_id = company.owner_id THEN
    RETURN jsonb_build_object(
      'ok', true,
      'checkin_id', checkin.id,
      'user_id', checkin.user_id,
      'company_id', company.id,
      'company_name', company.name,
      'self', true
    );
  END IF;

  SELECT welcome_granted_at IS NOT NULL INTO welcome_done
  FROM public.nachbar_profiles WHERE user_id = checkin.user_id;

  IF NOT welcome_done THEN
    UPDATE public.nachbar_profiles SET welcome_granted_at = now() WHERE user_id = checkin.user_id;
    PERFORM public._nachbar_credit(checkin.user_id, 50, 'grant', 'Willkommen bei Aura Nachbar', checkin.id);
  END IF;

  SELECT count(*)::int INTO week_count
  FROM public.nachbar_checkins
  WHERE user_id = checkin.user_id
    AND company_id = company.id
    AND status = 'confirmed'
    AND created_at > now() - interval '7 days'
    AND id <> checkin.id;

  IF week_count < 3 THEN
    PERFORM public._nachbar_credit(
      checkin.user_id,
      CASE WHEN week_count = 0 THEN 40 ELSE 10 END,
      'grant',
      'Check-in · ' || company.name,
      checkin.id
    );
  END IF;

  PERFORM public._nachbar_on_confirmed_visit(checkin, company);

  RETURN jsonb_build_object(
    'ok', true,
    'checkin_id', checkin.id,
    'user_id', checkin.user_id,
    'company_id', company.id,
    'company_name', company.name,
    'self', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public._nachbar_credit(uuid, integer, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._nachbar_complete_mission(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._nachbar_ensure_progress(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._nachbar_expire_stale() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._nachbar_on_confirmed_visit(public.nachbar_checkins, public.companies) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._nachbar_random_code(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._nachbar_week_key() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._nachbar_week_start() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ensure_nachbar_checkin_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_nachbar_checkin_code(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.ensure_nachbar_profile(text, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_nachbar_profile(text, text, uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_nachbar_hub() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_nachbar_hub() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.nachbar_confirm_checkin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nachbar_confirm_checkin(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.nachbar_leave_feedback(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nachbar_leave_feedback(uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.nachbar_link_shop(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nachbar_link_shop(uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.nachbar_mark_ar(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nachbar_mark_ar(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.nachbar_rate_shop(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nachbar_rate_shop(uuid, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.nachbar_reject_checkin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nachbar_reject_checkin(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.nachbar_request_checkin(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nachbar_request_checkin(text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.nachbar_request_checkin_for_slug(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nachbar_request_checkin_for_slug(text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.nachbar_share_win() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nachbar_share_win() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.owner_nachbar_checkin_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_nachbar_checkin_code(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.owner_nachbar_pending_checkins() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_nachbar_pending_checkins() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.nachbar_city_board() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nachbar_city_board() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.nachbar_public_shops(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nachbar_public_shops(integer) TO anon, authenticated, service_role;
