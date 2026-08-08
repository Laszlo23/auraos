-- Smart wallet security: encrypted owner keys, session key material, legacy flag,
-- and enforce allowed_actions on agent_spend.

ALTER TABLE public.wallet_bindings
  ADD COLUMN IF NOT EXISTS owner_key_enc text,
  ADD COLUMN IF NOT EXISTS legacy boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custody text NOT NULL DEFAULT 'platform';

COMMENT ON COLUMN public.wallet_bindings.owner_key_enc IS
  'AES-GCM encrypted Light Account owner private key. Requires APP_USER_CONNECTION_KEY_SECRET.';
COMMENT ON COLUMN public.wallet_bindings.legacy IS
  'True for pre-Account-Kit deterministic derivation rows; receive-only until re-provisioned.';
COMMENT ON COLUMN public.wallet_bindings.custody IS
  'platform = encrypted server key; external = user browser wallet; account_kit = embedded AA.';

ALTER TABLE public.agent_session_keys
  ADD COLUMN IF NOT EXISTS key_material_enc text,
  ADD COLUMN IF NOT EXISTS derivation_slot integer;

COMMENT ON COLUMN public.agent_session_keys.key_material_enc IS
  'AES-GCM encrypted session-key private key for signing agent spends.';

-- Enforce allowed_actions + active status.
CREATE OR REPLACE FUNCTION public.agent_spend(
  _session_key_id uuid,
  _slug text,
  _amount numeric,
  _action text DEFAULT 'api_buy'
)
RETURNS public.x402_calls
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sk public.agent_session_keys;
  cents int;
  row public.x402_calls;
  net text := coalesce(current_setting('app.x402_network', true), 'base-sepolia');
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO sk FROM public.agent_session_keys WHERE id = _session_key_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'session_key_not_found'; END IF;
  IF NOT public.owns_company(sk.company_id) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF sk.status <> 'active' THEN RAISE EXCEPTION 'session_key_inactive'; END IF;
  IF sk.expires_at IS NOT NULL AND sk.expires_at < now() THEN RAISE EXCEPTION 'session_key_expired'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'bad_amount'; END IF;

  IF sk.allowed_actions IS NOT NULL
     AND cardinality(sk.allowed_actions) > 0 THEN
    IF NOT (
      _action = ANY (sk.allowed_actions)
      OR (_action = 'api_buy' AND ('trade' = ANY (sk.allowed_actions) OR 'spend' = ANY (sk.allowed_actions)))
    ) THEN
      RAISE EXCEPTION 'action_not_allowed';
    END IF;
  END IF;

  cents := ceil(_amount * 100)::int;
  IF sk.spent + cents > sk.spend_cap THEN RAISE EXCEPTION 'spend_cap_exceeded'; END IF;

  UPDATE public.agent_session_keys SET spent = spent + cents WHERE id = sk.id;

  INSERT INTO public.x402_calls (
    slug, payer, amount_usdc, network, status, company_id, agent_id, session_key_id,
    direction, platform_fee, owner_share, treasury_share
  )
  VALUES (
    _slug, sk.key_address, _amount, net, 'pending', sk.company_id, sk.agent_id, sk.id,
    'spent', 0, 0, 0
  )
  RETURNING * INTO row;

  RETURN row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.agent_spend(uuid, text, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agent_spend(uuid, text, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.agent_spend(_session_key_id uuid, _slug text, _amount numeric)
RETURNS public.x402_calls
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.agent_spend(_session_key_id, _slug, _amount, 'api_buy');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.agent_spend(uuid, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agent_spend(uuid, text, numeric) TO authenticated;
