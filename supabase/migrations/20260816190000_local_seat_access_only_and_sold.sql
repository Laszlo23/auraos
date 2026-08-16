-- Local Seat = access only (boost grant may be 0).
-- Scarcity counts paid founding Local seats (not demo cohort stubs).

COMMENT ON COLUMN public.companies.local_seat_paid_at IS
  'When Local Seat / Aura Reputation was unlocked (card, Barzahlung, or crypto). Seat unlocks access; boost credits come from packs / monthly.';

CREATE OR REPLACE FUNCTION public.mark_local_seat_paid_stripe(
  _company_id uuid,
  _boost_grant integer DEFAULT 0
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  grant_amt integer := GREATEST(COALESCE(_boost_grant, 0), 0);
BEGIN
  UPDATE public.companies
  SET local_seat_paid_at = now(),
      ui_locale = 'de',
      is_local_business = true,
      network_backlink = true
  WHERE id = _company_id
    AND local_seat_paid_at IS NULL;

  IF FOUND THEN
    IF grant_amt > 0 THEN
      PERFORM public.grant_local_boost(
        _company_id,
        grant_amt,
        'Local Seat unlock · grant ' || grant_amt::text
      );
    END IF;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

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
  grant_amt integer;
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
      'company_id', company.id,
      'boost_grant', 0
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
      redeemed_at = now(),
      active = false
  WHERE id = row.id;

  UPDATE public.companies
  SET local_seat_paid_at = now(),
      ui_locale = 'de',
      entry_funnel = CASE WHEN entry_funnel IS NULL OR entry_funnel = '' THEN 'local' ELSE entry_funnel END,
      is_local_business = true,
      network_backlink = true
  WHERE id = company.id;

  grant_amt := GREATEST(COALESCE(row.boost_grant, 0), 0);
  IF grant_amt > 0 THEN
    PERFORM public.grant_local_boost(company.id, grant_amt, 'Local Seat Barzahlung · ' || norm);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'already_paid', false,
    'company_id', company.id,
    'boost_grant', grant_amt
  );
END;
$$;

-- Paid Local founding seats (excludes Aura demos + test listing).
CREATE OR REPLACE FUNCTION public.local_seats_sold()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int
  FROM public.companies c
  WHERE c.local_seat_paid_at IS NOT NULL
    AND c.is_local_business = true
    AND coalesce(c.slug, '') NOT IN (
      'salon-mira-test',
      'aura-os',
      'aura-lokal',
      'aura-nachbar',
      'aura-goods'
    );
$$;

CREATE OR REPLACE FUNCTION public.local_seats_remaining()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(0, public.local_cohort_cap() - public.local_seats_sold());
$$;

REVOKE ALL ON FUNCTION public.local_seats_sold() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.local_seats_remaining() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.local_seats_sold() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.local_seats_remaining() TO anon, authenticated, service_role;

-- Crypto checkout intents for Local Seat (NOWPayments or ops-confirmed).
CREATE TABLE IF NOT EXISTS public.local_crypto_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users (id),
  asset text NOT NULL CHECK (asset IN ('usdc', 'eth', 'btc', 'sol')),
  amount_eur numeric(10, 2) NOT NULL DEFAULT 99,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirming', 'paid', 'expired', 'failed')),
  provider text NOT NULL DEFAULT 'nowpayments',
  provider_invoice_id text,
  provider_payment_id text,
  pay_address text,
  pay_amount text,
  pay_currency text,
  invoice_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS local_crypto_checkouts_company_idx
  ON public.local_crypto_checkouts (company_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS local_crypto_checkouts_provider_invoice_uidx
  ON public.local_crypto_checkouts (provider_invoice_id)
  WHERE provider_invoice_id IS NOT NULL;

ALTER TABLE public.local_crypto_checkouts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.local_crypto_checkouts FROM PUBLIC;
REVOKE ALL ON public.local_crypto_checkouts FROM anon, authenticated;
GRANT ALL ON public.local_crypto_checkouts TO service_role;
