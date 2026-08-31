-- Complimentary preview passes for testers. Unlocks the company OS without a
-- paid founding seat, outbound invite, or a seat-cap increment.

COMMENT ON COLUMN public.invite_codes.kind IS
  'legacy | wave | founding_invite | preview — preview grants complimentary OS access; wave/founding_invite unlock paid checkout; legacy frozen';

INSERT INTO public.invite_codes (code, label, max_uses, uses, active, kind)
VALUES ('LOOK', 'Preview pass — testers', 50, 0, true, 'preview')
ON CONFLICT (code) DO UPDATE
  SET active = true,
      kind = 'preview',
      label = EXCLUDED.label,
      max_uses = GREATEST(public.invite_codes.max_uses, 50);

CREATE OR REPLACE FUNCTION public.check_invite_code(_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.invite_codes
    WHERE code = upper(trim(_code))
      AND active
      AND uses < max_uses
      AND kind IN ('wave', 'founding_invite', 'preview')
  );
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
  inv public.invite_codes;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  -- Idempotent for users who already have any seat path
  IF public.user_has_company_seat(uid) THEN
    RETURN true;
  END IF;

  SELECT * INTO inv FROM public.invite_codes WHERE code = normalized FOR UPDATE;
  IF NOT FOUND OR NOT inv.active OR inv.uses >= inv.max_uses OR inv.kind <> 'preview' THEN
    RAISE EXCEPTION 'paid_seat_required'
      USING HINT = 'Purchase a founding seat to unlock company access.';
  END IF;

  UPDATE public.invite_codes SET uses = uses + 1 WHERE code = normalized;

  INSERT INTO public.invite_redemptions (user_id, code)
  VALUES (uid, normalized)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.check_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_invite_code(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.redeem_invite_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_invite_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.redeem_invite_code(text) TO authenticated;
