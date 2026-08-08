ALTER TABLE public.x402_calls
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'earned',
  ADD COLUMN IF NOT EXISTS platform_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS owner_share numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS treasury_share numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS session_key_id uuid REFERENCES public.agent_session_keys(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS x402_calls_direction_idx ON public.x402_calls (direction, created_at DESC);

INSERT INTO public.x402_endpoints (slug, name, description, path, price_usdc, network, active)
VALUES
  ('market-snapshot','Market Snapshot','Cross-asset market snapshot with regime read and volatility bands.','/api/public/x402/market-snapshot',0.01,'base-sepolia',true),
  ('property-valuation','Property Valuation','Indicative valuation and yield estimate for a residential address.','/api/public/x402/property-valuation',0.08,'base-sepolia',true),
  ('outreach-draft','Outreach Draft','Personalised cold outreach email drafted from a lead profile.','/api/public/x402/outreach-draft',0.03,'base-sepolia',true),
  ('website-copy','Website Copy','Landing page copy block written for a product and audience.','/api/public/x402/website-copy',0.03,'base-sepolia',true),
  ('astro-reading','Astro Reading','Personalised astrological reading from birth data.','/api/public/x402/astro-reading',0.02,'base-sepolia',true),
  ('imagebook-page','Image Book Page','Illustrated story page: prose plus an image prompt, in one call.','/api/public/x402/imagebook-page',0.04,'base-sepolia',true)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      path = EXCLUDED.path,
      price_usdc = EXCLUDED.price_usdc,
      active = EXCLUDED.active;

CREATE OR REPLACE FUNCTION public.agent_spend(_session_key_id uuid, _slug text, _amount numeric)
RETURNS public.x402_calls
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sk public.agent_session_keys;
  cents int;
  row public.x402_calls;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO sk FROM public.agent_session_keys WHERE id = _session_key_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'session_key_not_found'; END IF;
  IF NOT public.owns_company(sk.company_id) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF sk.status <> 'active' THEN RAISE EXCEPTION 'session_key_inactive'; END IF;
  IF sk.expires_at IS NOT NULL AND sk.expires_at < now() THEN RAISE EXCEPTION 'session_key_expired'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'bad_amount'; END IF;

  -- session key caps are stored in whole units of 1/100 USDC
  cents := ceil(_amount * 100)::int;
  IF sk.spent + cents > sk.spend_cap THEN RAISE EXCEPTION 'spend_cap_exceeded'; END IF;

  UPDATE public.agent_session_keys SET spent = spent + cents WHERE id = sk.id;

  INSERT INTO public.x402_calls (slug, payer, amount_usdc, network, status, company_id, agent_id, session_key_id, direction, platform_fee, owner_share, treasury_share)
  VALUES (_slug, sk.key_address, _amount, 'base-sepolia', 'dev', sk.company_id, sk.agent_id, sk.id, 'spent', 0, 0, 0)
  RETURNING * INTO row;

  RETURN row;
END; $$;

REVOKE EXECUTE ON FUNCTION public.agent_spend(uuid, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agent_spend(uuid, text, numeric) TO authenticated;