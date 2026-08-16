-- AR mission only from nachbar_mark_ar. Guest balance is not a client column.

CREATE OR REPLACE FUNCTION public._nachbar_on_confirmed_visit(
  _checkin public.nachbar_checkins,
  _company public.companies
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prior_all int;
  prior_shop int;
  week_shops int;
  streak int;
  inviter uuid;
  link_status text;
  vienna_day date := ((now() AT TIME ZONE 'Europe/Vienna'))::date;
  week_start date := public._nachbar_week_start();
  stamps int;
  filled boolean := false;
  last_day date;
BEGIN
  PERFORM public._nachbar_ensure_progress(_checkin.user_id);

  SELECT last_confirmed_day INTO last_day
  FROM public.nachbar_progress WHERE user_id = _checkin.user_id;

  UPDATE public.nachbar_progress
  SET
    streak_days = CASE
      WHEN last_day = vienna_day THEN streak_days
      WHEN last_day = vienna_day - 1 THEN streak_days + 1
      ELSE 1
    END,
    last_confirmed_day = vienna_day,
    city_score = city_score + 10,
    aura_weight = aura_weight + 1,
    updated_at = now()
  WHERE user_id = _checkin.user_id
  RETURNING streak_days INTO streak;

  INSERT INTO public.nachbar_stamps (user_id, company_id, window_start, stamp_count)
  VALUES (_checkin.user_id, _company.id, week_start, 1)
  ON CONFLICT (user_id, company_id, window_start)
  DO UPDATE SET stamp_count = public.nachbar_stamps.stamp_count + 1
  RETURNING stamp_count, filled_at IS NOT NULL INTO stamps, filled;

  IF stamps >= 3 AND NOT filled THEN
    UPDATE public.nachbar_stamps
    SET filled_at = now()
    WHERE user_id = _checkin.user_id
      AND company_id = _company.id
      AND window_start = week_start
      AND filled_at IS NULL;
    IF FOUND THEN
      PERFORM public._nachbar_complete_mission(_checkin.user_id, 'wien-stempel', _checkin.id);
    END IF;
  END IF;

  PERFORM public._nachbar_complete_mission(_checkin.user_id, 'wien-besuch', _checkin.id);

  IF streak >= 2 THEN
    PERFORM public._nachbar_complete_mission(_checkin.user_id, 'wien-stamm', _checkin.id);
  END IF;

  SELECT count(*)::int INTO prior_shop
  FROM public.nachbar_checkins
  WHERE user_id = _checkin.user_id
    AND company_id = _company.id
    AND status = 'confirmed'
    AND id <> _checkin.id;
  IF prior_shop = 0 THEN
    PERFORM public._nachbar_complete_mission(_checkin.user_id, 'wien-entdecken', _checkin.id);
  END IF;

  SELECT count(DISTINCT company_id)::int INTO week_shops
  FROM public.nachbar_checkins
  WHERE user_id = _checkin.user_id
    AND status = 'confirmed'
    AND ((confirmed_at AT TIME ZONE 'Europe/Vienna')::date) >= week_start;
  IF week_shops >= 2 THEN
    PERFORM public._nachbar_complete_mission(_checkin.user_id, 'wien-netz', _checkin.id);
  END IF;

  -- source is analytics only. wien-ar is granted from nachbar_mark_ar.

  SELECT count(*)::int INTO prior_all
  FROM public.nachbar_checkins
  WHERE user_id = _checkin.user_id
    AND status = 'confirmed'
    AND id <> _checkin.id;

  IF prior_all = 0 THEN
    SELECT f.inviter_id, f.status INTO inviter, link_status
    FROM public.nachbar_friend_links f
    WHERE f.invitee_id = _checkin.user_id
    LIMIT 1;
    IF inviter IS NOT NULL AND link_status = 'joined' THEN
      UPDATE public.nachbar_friend_links
      SET status = 'activated', activated_at = now()
      WHERE invitee_id = _checkin.user_id AND status = 'joined';
      PERFORM public._nachbar_credit(inviter, 25, 'referral', 'Freund-Check-in', _checkin.id);
      PERFORM public._nachbar_credit(_checkin.user_id, 25, 'referral', 'Eingeladen von Freund', _checkin.id);
      PERFORM public._nachbar_ensure_progress(inviter);
      UPDATE public.nachbar_progress
      SET aura_weight = aura_weight + 1, updated_at = now()
      WHERE user_id = inviter;
      PERFORM public._nachbar_complete_mission(inviter, 'wien-freund', _checkin.id);
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public._nachbar_on_confirmed_visit(public.nachbar_checkins, public.companies) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS nachbar_profiles_update_own ON public.nachbar_profiles;
REVOKE UPDATE ON public.nachbar_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.nachbar_profiles TO authenticated;
