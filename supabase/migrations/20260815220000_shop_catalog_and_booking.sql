-- Public shop catalog (services / products / tickets) + booking requests.
-- Also open Nachbar discovery to featured/cohort shops, not only paid seats.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS booking_url text;

COMMENT ON COLUMN public.companies.booking_url IS 'External booking/ticketing URL (Calendly, Treatwell, own shop).';

CREATE TABLE IF NOT EXISTS public.shop_catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('service', 'product', 'ticket')),
  name text NOT NULL,
  description text,
  price_cents integer,
  currency text NOT NULL DEFAULT 'EUR',
  duration_min integer,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_public boolean NOT NULL DEFAULT true,
  booking_mode text NOT NULL DEFAULT 'request'
    CHECK (booking_mode IN ('none', 'link', 'request')),
  booking_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shop_catalog_items_company_public_idx
  ON public.shop_catalog_items (company_id, sort_order)
  WHERE is_public = true;

ALTER TABLE public.shop_catalog_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own shop catalog" ON public.shop_catalog_items;
CREATE POLICY "own shop catalog"
  ON public.shop_catalog_items FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));

DROP POLICY IF EXISTS "public read shop catalog" ON public.shop_catalog_items;
CREATE POLICY "public read shop catalog"
  ON public.shop_catalog_items FOR SELECT TO anon, authenticated
  USING (
    is_public = true
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_id AND c.slug IS NOT NULL
    )
  );

CREATE TABLE IF NOT EXISTS public.shop_booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  catalog_item_id uuid REFERENCES public.shop_catalog_items (id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  preferred_at timestamptz,
  party_size integer,
  message text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shop_booking_requests_company_idx
  ON public.shop_booking_requests (company_id, created_at DESC);

ALTER TABLE public.shop_booking_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own shop bookings" ON public.shop_booking_requests;
CREATE POLICY "own shop bookings"
  ON public.shop_booking_requests FOR SELECT TO authenticated
  USING (public.owns_company(company_id));

DROP POLICY IF EXISTS "own shop bookings update" ON public.shop_booking_requests;
CREATE POLICY "own shop bookings update"
  ON public.shop_booking_requests FOR UPDATE TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));

-- Inserts go through service-role server functions only.

CREATE OR REPLACE FUNCTION public.nachbar_public_shops(_limit integer DEFAULT 24)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  city text,
  niche text,
  tagline text,
  homepage_url text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT c.id, c.name, c.slug, c.city, c.niche, c.tagline, c.homepage_url
  FROM public.companies c
  WHERE COALESCE(c.is_local_business, false) = true
    AND c.slug IS NOT NULL
    AND (
      c.featured = true
      OR c.local_seat_paid_at IS NOT NULL
      OR c.local_cohort_number IS NOT NULL
    )
  ORDER BY c.featured DESC, c.local_cohort_number ASC NULLS LAST, c.created_at
  LIMIT GREATEST(LEAST(COALESCE(_limit, 24), 50), 1);
$$;
