-- Serialize squad joins so concurrent invites cannot exceed max 8 members.

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

  SELECT * INTO sq FROM public.aura_squads WHERE invite_code = code FOR UPDATE;
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
