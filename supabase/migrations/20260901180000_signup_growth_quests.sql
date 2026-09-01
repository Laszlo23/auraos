-- User-level growth quests for sign-ups before they have a company or customers.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS growth_xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS growth_quests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS founder_goal text;

CREATE OR REPLACE FUNCTION public.award_signup_growth(_quest text, _amount integer)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  quests text[];
  xp int;
  q text := left(trim(coalesce(_quest, '')), 64);
  amt int := greatest(0, least(coalesce(_amount, 0), 5000));
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF q = '' THEN
    RAISE EXCEPTION 'invalid_quest';
  END IF;

  SELECT growth_quests, growth_xp INTO quests, xp
    FROM public.profiles
   WHERE id = uid
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_profile';
  END IF;

  IF q = ANY(quests) THEN
    RETURN jsonb_build_object(
      'xp', xp,
      'quests', quests,
      'awarded', 0,
      'duplicate', true
    );
  END IF;

  quests := array_append(quests, q);
  xp := xp + amt;

  UPDATE public.profiles
     SET growth_xp = xp,
         growth_quests = quests
   WHERE id = uid;

  RETURN jsonb_build_object(
    'xp', xp,
    'quests', quests,
    'awarded', amt,
    'duplicate', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.save_founder_goal(_goal text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  goal text := left(trim(coalesce(_goal, '')), 280);
  snap jsonb;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF length(goal) < 4 THEN
    RAISE EXCEPTION 'goal_too_short';
  END IF;

  UPDATE public.profiles
     SET founder_goal = goal
   WHERE id = uid;

  snap := public.award_signup_growth('growth:first-mission', 250);
  RETURN snap || jsonb_build_object('goal', goal);
END;
$$;

REVOKE ALL ON FUNCTION public.award_signup_growth(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_founder_goal(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.award_signup_growth(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_founder_goal(text) TO authenticated;
