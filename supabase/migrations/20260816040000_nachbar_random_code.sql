-- Referral / check-in codes must not depend on extensions.gen_random_bytes.
-- ensure_nachbar_profile runs with search_path=public, so pgcrypto was invisible
-- and name + check-in both failed for new neighbors.

CREATE OR REPLACE FUNCTION public._nachbar_random_code(len int DEFAULT 8)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  out text := '';
  i int;
  n int := GREATEST(6, LEAST(COALESCE(len, 8), 12));
BEGIN
  FOR i IN 1..n LOOP
    out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN out;
END;
$$;
