-- Validate invite codes without consuming uses (burn only after successful signup).

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
      AND uses < max_uses
  );
$$;

REVOKE ALL ON FUNCTION public.check_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_invite_code(text) TO anon, authenticated;

-- Ensure seeded founding codes exist (idempotent)
INSERT INTO public.invite_codes (code, label, max_uses)
VALUES
  ('AURORA', 'Founding wave', 1000),
  ('ATLAS', 'Founding wave', 1000),
  ('QUANT', 'Founding wave', 1000)
ON CONFLICT (code) DO NOTHING;
