-- Shared Austrian real-estate portal catalog + per-company listing watches.

CREATE TABLE IF NOT EXISTS public.immo_portals (
  slug text PRIMARY KEY,
  name text NOT NULL,
  url text NOT NULL,
  host text NOT NULL UNIQUE,
  country text NOT NULL DEFAULT 'AT',
  kind text NOT NULL,
  search_hint text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 50,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT immo_portals_kind_check CHECK (
    kind IN ('marketplace', 'aggregator', 'classifieds', 'newspaper')
  ),
  CONSTRAINT immo_portals_country_check CHECK (country = 'AT')
);

CREATE TABLE IF NOT EXISTS public.immo_listing_watches (
  company_id uuid PRIMARY KEY REFERENCES public.companies (id) ON DELETE CASCADE,
  region text NOT NULL DEFAULT 'Wien',
  deal_types text[] NOT NULL DEFAULT ARRAY['mieten']::text[],
  property_types text[] NOT NULL DEFAULT ARRAY['wohnung', 'haus']::text[],
  prefer_private boolean NOT NULL DEFAULT true,
  min_score integer NOT NULL DEFAULT 55,
  enabled boolean NOT NULL DEFAULT true,
  campaign_id uuid REFERENCES public.akquise_campaigns (id) ON DELETE SET NULL,
  last_scout_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT immo_listing_watches_min_score CHECK (min_score BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS immo_listing_watches_enabled_idx
  ON public.immo_listing_watches (enabled)
  WHERE enabled = true;

ALTER TABLE public.immo_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.immo_listing_watches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read immo_portals" ON public.immo_portals;
CREATE POLICY "read immo_portals" ON public.immo_portals
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "own immo_listing_watches" ON public.immo_listing_watches;
CREATE POLICY "own immo_listing_watches" ON public.immo_listing_watches
  FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));

GRANT SELECT ON public.immo_portals TO authenticated;
GRANT ALL ON public.immo_portals TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.immo_listing_watches TO authenticated;
GRANT ALL ON public.immo_listing_watches TO service_role;

INSERT INTO public.immo_portals (slug, name, url, host, kind, search_hint, active, priority, notes)
VALUES
  ('willhaben', 'willhaben Immobilien', 'https://www.willhaben.at/iad/immobilien/', 'willhaben.at', 'marketplace', 'Wien Wohnung Haus mieten von Privat', true, 100, 'Largest AT classifieds — many private ads.'),
  ('flatbee', 'flatbee', 'https://flatbee.at/', 'flatbee.at', 'aggregator', 'Wien provisionsfrei Wohnung', true, 95, 'Commission-free listings an agent can take on.'),
  ('bazar', 'bazar.at', 'https://www.bazar.at/', 'bazar.at', 'classifieds', 'Wien Wohnung mieten', true, 90, 'Private classifieds (Krone).'),
  ('freeimmo', 'freeimmo', 'https://www.freeimmo.at/', 'freeimmo.at', 'classifieds', 'Wien Wohnung mieten provisionsfrei', true, 85, 'Free listing board.'),
  ('immobilienscout24', 'ImmoScout24 Österreich', 'https://www.immobilienscout24.at/', 'immobilienscout24.at', 'marketplace', 'Wien Wohnung OR Haus mieten', true, 80, 'Major AT portal.'),
  ('immosuchmaschine', 'immosuchmaschine.at', 'https://www.immosuchmaschine.at/', 'immosuchmaschine.at', 'aggregator', 'Wien Mietwohnung', true, 75, 'Meta-search across AT portals.'),
  ('findmyhome', 'FindMyHome', 'https://www.findmyhome.at/', 'findmyhome.at', 'marketplace', 'Wien Wohnung mieten', true, 70, 'Broker network + SuchAgentin.'),
  ('immowelt', 'Immowelt Österreich', 'https://www.immowelt.at/', 'immowelt.at', 'marketplace', 'Wien Wohnung mieten', true, 70, 'AT Immowelt.'),
  ('immobilien-net', 'immobilien.net', 'https://www.immobilien.net/', 'immobilien.net', 'marketplace', 'Wien Wohnung mieten', true, 65, ''),
  ('immodirekt', 'immodirekt', 'https://www.immodirekt.at/', 'immodirekt.at', 'marketplace', 'Wien Wohnung mieten', true, 65, ''),
  ('derstandard', 'DER STANDARD Immobilien', 'https://immobilien.derstandard.at/', 'immobilien.derstandard.at', 'newspaper', 'Wien Wohnung mieten', true, 60, ''),
  ('wohnnet', 'wohnnet', 'https://www.wohnnet.at/', 'wohnnet.at', 'newspaper', 'Wien Wohnung mieten', true, 55, 'Content + listings.'),
  ('kurier', 'KURIER Immo', 'https://immo.kurier.at/', 'immo.kurier.at', 'newspaper', 'Wien Wohnung mieten', true, 50, 'Partner dibeo.'),
  ('oe24', 'oe24 Immoads', 'https://immoads.oe24.at/', 'immoads.oe24.at', 'newspaper', 'Wien Wohnung mieten', true, 50, ''),
  ('immoagent', 'immoagent', 'https://www.immoagent.at/', 'immoagent.at', 'marketplace', 'Wien Wohnung mieten', true, 45, ''),
  ('immolive24', 'Immolive24', 'https://www.immolive24.com/', 'immolive24.com', 'marketplace', 'Wien Wohnung mieten', true, 45, ''),
  ('alle-gemeinsam', 'Alle Gemeinsam', 'https://www.alle-gemeinsam.at/', 'alle-gemeinsam.at', 'classifieds', 'Wien Wohnung mieten', true, 40, ''),
  ('sodala', 'Sodala Immobilien', 'https://immobilien.sodala.net/', 'immobilien.sodala.net', 'marketplace', 'Wien Wohnung mieten', true, 40, ''),
  ('123inserate', '123inserate', 'https://www.123inserate.net/', '123inserate.net', 'classifieds', 'Wien Wohnung mieten', false, 0, 'Domain appears parked / for sale (2026).')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  url = EXCLUDED.url,
  host = EXCLUDED.host,
  kind = EXCLUDED.kind,
  search_hint = EXCLUDED.search_hint,
  active = EXCLUDED.active,
  priority = EXCLUDED.priority,
  notes = EXCLUDED.notes,
  updated_at = now();

COMMENT ON TABLE public.immo_portals IS
  'Shared catalog of Austrian real-estate portals used by the listing scout for every realty desk.';
COMMENT ON TABLE public.immo_listing_watches IS
  'Per-company criteria for the AT listing scout (region, deal types, private-first).';
