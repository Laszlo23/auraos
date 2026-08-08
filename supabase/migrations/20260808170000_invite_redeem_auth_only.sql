-- Invite redeem: authenticated-only, idempotent per user (one seat per account).

CREATE TABLE IF NOT EXISTS public.invite_redemptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  code text NOT NULL REFERENCES public.invite_codes (code),
  redeemed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.invite_redemptions TO authenticated;
GRANT ALL ON public.invite_redemptions TO service_role;
ALTER TABLE public.invite_redemptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'invite_redemptions'
      AND policyname = 'Users read own invite redemption'
  ) THEN
    CREATE POLICY "Users read own invite redemption"
      ON public.invite_redemptions
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.redeem_invite_code(_code text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  normalized text := upper(trim(_code));
  ok boolean;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  -- Already claimed a seat — idempotent success (no second burn).
  IF EXISTS (SELECT 1 FROM public.invite_redemptions WHERE user_id = uid) THEN
    RETURN true;
  END IF;

  UPDATE public.invite_codes
     SET uses = uses + 1
   WHERE code = normalized
     AND active
     AND uses < max_uses
  RETURNING true INTO ok;

  IF NOT COALESCE(ok, false) THEN
    RETURN false;
  END IF;

  INSERT INTO public.invite_redemptions (user_id, code)
  VALUES (uid, normalized);

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_invite_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_invite_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.redeem_invite_code(text) TO authenticated;
