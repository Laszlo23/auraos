-- Creator NFT collections on Robinhood Chain (4663).

CREATE TABLE IF NOT EXISTS public.nft_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  symbol text NOT NULL,
  description text,
  chain_id integer NOT NULL DEFAULT 4663,
  contract_address text,
  mint_desk_address text,
  max_supply integer NOT NULL CHECK (max_supply > 0 AND max_supply <= 10000),
  mint_price_wei text NOT NULL DEFAULT '0',
  mint_asset text NOT NULL DEFAULT 'usdg'
    CHECK (mint_asset IN ('usdg', 'eth')),
  royalty_bps integer NOT NULL DEFAULT 500 CHECK (royalty_bps >= 0 AND royalty_bps <= 10000),
  payout_wallet text,
  metadata_base_uri text,
  cover_image_url text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'deploying', 'live', 'paused', 'sold_out', 'failed')),
  deploy_tx_hash text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS nft_collections_slug_uidx ON public.nft_collections (lower(slug));
CREATE INDEX IF NOT EXISTS nft_collections_company_idx ON public.nft_collections (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS nft_collections_status_idx ON public.nft_collections (status) WHERE status = 'live';

CREATE TABLE IF NOT EXISTS public.nft_collection_mints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.nft_collections(id) ON DELETE CASCADE,
  token_id integer NOT NULL CHECK (token_id > 0),
  minter_wallet text NOT NULL,
  tx_hash text,
  price_paid_wei text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, token_id)
);

CREATE INDEX IF NOT EXISTS nft_collection_mints_collection_idx
  ON public.nft_collection_mints (collection_id, created_at DESC);

ALTER TABLE public.nft_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nft_collection_mints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own nft_collections" ON public.nft_collections;
CREATE POLICY "own nft_collections" ON public.nft_collections
  FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));

DROP POLICY IF EXISTS "public read live nft_collections" ON public.nft_collections;
CREATE POLICY "public read live nft_collections" ON public.nft_collections
  FOR SELECT TO anon, authenticated
  USING (status IN ('live', 'paused', 'sold_out'));

DROP POLICY IF EXISTS "own nft_collection_mints" ON public.nft_collection_mints;
CREATE POLICY "own nft_collection_mints" ON public.nft_collection_mints
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nft_collections c
      WHERE c.id = collection_id AND public.owns_company(c.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.nft_collections c
      WHERE c.id = collection_id AND public.owns_company(c.company_id)
    )
  );

DROP POLICY IF EXISTS "public read nft_collection_mints" ON public.nft_collection_mints;
CREATE POLICY "public read nft_collection_mints" ON public.nft_collection_mints
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nft_collections c
      WHERE c.id = collection_id AND c.status IN ('live', 'paused', 'sold_out')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nft_collections TO authenticated;
GRANT SELECT ON public.nft_collections TO anon;
GRANT ALL ON public.nft_collections TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nft_collection_mints TO authenticated;
GRANT SELECT ON public.nft_collection_mints TO anon;
GRANT ALL ON public.nft_collection_mints TO service_role;
