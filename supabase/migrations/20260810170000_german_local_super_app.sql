-- German local super-app: ui_locale, local seat Barzahlung codes, paid stamp
-- (Applied remotely via MCP; keep in sync.)

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS ui_locale text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS local_seat_paid_at timestamptz;

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_ui_locale_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_ui_locale_check
  CHECK (ui_locale IN ('en', 'de'));

COMMENT ON COLUMN public.companies.ui_locale IS 'UI locale for shell (de = German local super-app)';
COMMENT ON COLUMN public.companies.local_seat_paid_at IS 'When €99 Local Seat was unlocked (Barzahlung code or Stripe)';

CREATE TABLE IF NOT EXISTS public.local_seat_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  amount_eur integer NOT NULL DEFAULT 99,
  boost_grant integer NOT NULL DEFAULT 15000,
  sold_note text,
  redeemed_by uuid REFERENCES auth.users (id),
  redeemed_company_id uuid REFERENCES public.companies (id),
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT local_seat_codes_amount_check CHECK (amount_eur > 0),
  CONSTRAINT local_seat_codes_code_format CHECK (code ~ '^[A-Z0-9-]{6,32}$')
);

CREATE INDEX IF NOT EXISTS local_seat_codes_active_idx
  ON public.local_seat_codes (active) WHERE redeemed_at IS NULL;

ALTER TABLE public.local_seat_codes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.local_seat_codes FROM PUBLIC;
REVOKE ALL ON public.local_seat_codes FROM anon, authenticated;
GRANT ALL ON public.local_seat_codes TO service_role;

CREATE OR REPLACE FUNCTION public.grant_local_boost(
  _company_id uuid,
  _amount integer,
  _reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_id uuid;
  remaining integer;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN;
  END IF;

  SELECT id, tokens_remaining INTO sub_id, remaining
  FROM public.subscriptions
  WHERE company_id = _company_id
  FOR UPDATE;

  IF sub_id IS NULL THEN
    INSERT INTO public.subscriptions (
      company_id, plan, status, tokens_per_cycle, tokens_remaining, payment_mode
    ) VALUES (
      _company_id, 'local_seat', 'active', _amount, _amount, 'local_seat'
    );
  ELSE
    UPDATE public.subscriptions
    SET tokens_remaining = COALESCE(remaining, 0) + _amount,
        tokens_per_cycle = GREATEST(COALESCE(tokens_per_cycle, 0), _amount),
        status = 'active'
    WHERE id = sub_id;
  END IF;

  INSERT INTO public.token_ledger (company_id, kind, amount, reason)
  VALUES (_company_id, 'grant', _amount, _reason);
END;
$$;

REVOKE ALL ON FUNCTION public.grant_local_boost(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_local_boost(uuid, integer, text) TO service_role;

CREATE OR REPLACE FUNCTION public.redeem_local_seat_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  norm text := upper(trim(COALESCE(_code, '')));
  row public.local_seat_codes;
  company public.companies;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF norm IS NULL OR length(norm) < 6 THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

  SELECT * INTO company
  FROM public.companies
  WHERE owner_id = auth.uid()
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'company_not_found';
  END IF;

  IF company.local_seat_paid_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_paid', true,
      'company_id', company.id
    );
  END IF;

  SELECT * INTO row
  FROM public.local_seat_codes
  WHERE code = norm
  FOR UPDATE;

  IF NOT FOUND OR NOT row.active THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

  IF row.redeemed_at IS NOT NULL THEN
    RAISE EXCEPTION 'code_already_used';
  END IF;

  UPDATE public.local_seat_codes
  SET redeemed_by = auth.uid(),
      redeemed_company_id = company.id,
      redeemed_at = now()
  WHERE id = row.id;

  UPDATE public.companies
  SET local_seat_paid_at = now(),
      ui_locale = 'de',
      entry_funnel = CASE WHEN entry_funnel IS NULL OR entry_funnel = '' THEN 'local' ELSE entry_funnel END,
      is_local_business = true,
      network_backlink = true
  WHERE id = company.id;

  PERFORM public.grant_local_boost(company.id, row.boost_grant, 'Local Seat Barzahlung · ' || norm);

  RETURN jsonb_build_object(
    'ok', true,
    'already_paid', false,
    'company_id', company.id,
    'boost_grant', row.boost_grant
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_local_seat_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_local_seat_code(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_local_seat_paid_stripe(
  _company_id uuid,
  _boost_grant integer DEFAULT 15000
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.companies
  SET local_seat_paid_at = now(),
      ui_locale = 'de',
      is_local_business = true,
      network_backlink = true
  WHERE id = _company_id
    AND local_seat_paid_at IS NULL;

  IF FOUND THEN
    PERFORM public.grant_local_boost(
      _company_id,
      GREATEST(COALESCE(_boost_grant, 15000), 1),
      'Local Seat Stripe · €99'
    );
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_local_seat_paid_stripe(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_local_seat_paid_stripe(uuid, integer) TO service_role;
