-- Serialize founding seat grants and auto-protect the hard cap.

CREATE OR REPLACE FUNCTION public.grant_founding_seat(
  _user_id uuid,
  _stripe_session_id text,
  _invite_code text DEFAULT NULL,
  _amount_cents integer DEFAULT 9900,
  _payment_intent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing public.founding_seats;
  inv public.invite_codes;
  norm text := NULLIF(upper(trim(COALESCE(_invite_code, ''))), '');
  outbound text;
  attempts int := 0;
  ref public.referrals;
  referrer uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'user_required';
  END IF;

  -- One grant at a time so cap checks cannot race concurrent webhooks.
  PERFORM pg_advisory_xact_lock(87201401);

  SELECT * INTO existing FROM public.founding_seats WHERE user_id = _user_id;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already', true,
      'outbound_invite_code', existing.outbound_invite_code
    );
  END IF;

  IF _stripe_session_id IS NOT NULL THEN
    SELECT * INTO existing FROM public.founding_seats WHERE stripe_session_id = _stripe_session_id;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', true,
        'already', true,
        'outbound_invite_code', existing.outbound_invite_code
      );
    END IF;
  END IF;

  IF public.founding_seats_taken() >= public.founding_seat_cap() THEN
    RAISE EXCEPTION 'seats_sold_out';
  END IF;

  IF norm IS NOT NULL THEN
    SELECT * INTO inv FROM public.invite_codes WHERE code = norm FOR UPDATE;
    IF NOT FOUND OR NOT inv.active OR inv.uses >= inv.max_uses
       OR inv.kind NOT IN ('wave', 'founding_invite') THEN
      RAISE EXCEPTION 'invalid_invite';
    END IF;
    IF inv.owner_id IS NOT NULL AND inv.owner_id = _user_id THEN
      RAISE EXCEPTION 'self_invite';
    END IF;
    referrer := inv.owner_id;
  ELSIF public.founding_seats_taken() >= 50 THEN
    RAISE EXCEPTION 'invite_required';
  END IF;

  LOOP
    attempts := attempts + 1;
    outbound := 'INV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    BEGIN
      INSERT INTO public.invite_codes (code, label, max_uses, uses, active, owner_id, kind)
      VALUES (outbound, 'Founding invite', 1, 0, true, _user_id, 'founding_invite');
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF attempts > 10 THEN RAISE EXCEPTION 'invite_mint_failed'; END IF;
    END;
  END LOOP;

  INSERT INTO public.founding_seats (
    user_id,
    stripe_session_id,
    stripe_payment_intent,
    amount_cents,
    invited_by_code,
    invited_by_user_id,
    outbound_invite_code,
    paid_at
  ) VALUES (
    _user_id,
    _stripe_session_id,
    _payment_intent,
    COALESCE(_amount_cents, 9900),
    norm,
    referrer,
    outbound,
    now()
  );

  IF norm IS NOT NULL THEN
    UPDATE public.invite_codes SET uses = uses + 1 WHERE code = norm;
  END IF;

  INSERT INTO public.referral_codes (user_id, code, uses, active)
  VALUES (_user_id, outbound, 0, true)
  ON CONFLICT (user_id) DO UPDATE
    SET code = EXCLUDED.code,
        uses = 0,
        active = true;

  IF referrer IS NOT NULL THEN
    INSERT INTO public.referrals (code, referrer_id, referred_id, stage)
    VALUES (norm, referrer, _user_id, 'joined')
    ON CONFLICT (referred_id) DO NOTHING
    RETURNING * INTO ref;

    IF ref.id IS NULL THEN
      SELECT * INTO ref FROM public.referrals WHERE referred_id = _user_id;
    END IF;

    IF ref.id IS NOT NULL THEN
      INSERT INTO public.earnings_ledger (user_id, referral_id, kind, amount, xp, reason)
      VALUES (referrer, ref.id, 'referral_paid_seat', 2500, 200, 'Invitee paid founding seat');

      INSERT INTO public.earnings_ledger (user_id, referral_id, kind, amount, xp, reason)
      VALUES (_user_id, ref.id, 'welcome', 1000, 0, 'Welcome — founding seat (in-app AURA)');

      UPDATE public.referral_codes SET uses = uses + 1 WHERE user_id = referrer AND code = norm;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'already', false,
    'outbound_invite_code', outbound
  );
END;
$$;

CREATE INDEX IF NOT EXISTS tasks_company_id_created_idx
  ON public.tasks (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS activity_events_company_id_created_idx
  ON public.activity_events (company_id, created_at DESC);
