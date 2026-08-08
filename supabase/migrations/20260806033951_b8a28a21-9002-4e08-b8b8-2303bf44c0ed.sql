CREATE TABLE public.x402_endpoints (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  path text not null,
  price_usdc numeric(12,6) not null default 0.01,
  network text not null default 'base-sepolia',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

GRANT SELECT ON public.x402_endpoints TO anon;
GRANT SELECT ON public.x402_endpoints TO authenticated;
GRANT ALL ON public.x402_endpoints TO service_role;
ALTER TABLE public.x402_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active endpoints" ON public.x402_endpoints FOR SELECT TO anon, authenticated USING (active);

CREATE TABLE public.x402_calls (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  payer text,
  amount_usdc numeric(12,6) not null default 0,
  network text not null default 'base-sepolia',
  tx_hash text,
  status text not null default 'pending',
  latency_ms integer,
  created_at timestamptz not null default now()
);

CREATE INDEX x402_calls_created_idx ON public.x402_calls (created_at DESC);
CREATE INDEX x402_calls_slug_idx ON public.x402_calls (slug, created_at DESC);

GRANT SELECT ON public.x402_calls TO authenticated;
GRANT ALL ON public.x402_calls TO service_role;
ALTER TABLE public.x402_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can read the call log" ON public.x402_calls FOR SELECT TO authenticated USING (true);

INSERT INTO public.x402_endpoints (slug, name, description, path, price_usdc) VALUES
  ('quant-signal', 'Quant Signal', 'Risk-scored directional signal from the Quant desk for any listed asset.', '/api/public/x402/quant-signal', 0.010000),
  ('lead-enrich', 'Lead Enrichment', 'Firmographic + contact enrichment for a company domain, agent-researched.', '/api/public/x402/lead-enrich', 0.050000),
  ('company-brief', 'Company Brief', 'A concise strategic brief on any company or market, written by the Aura agents.', '/api/public/x402/company-brief', 0.020000);