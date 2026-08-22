-- Add Gigerl as a paid Local Business (99€ already paid)
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

-- Step 1: Insert Gigerl company (if owner exists, use their ID, otherwise use service account)
DO $$
DECLARE
  v_owner_id uuid;
  v_company_id uuid;
BEGIN
  -- Try to find the owner account (adjust email if needed)
  SELECT id INTO v_owner_id 
  FROM auth.users 
  WHERE email ILIKE '%gigerl%' OR email ILIKE '%laszlo%'
  LIMIT 1;
  
  -- If no specific owner, use the first admin/service user
  IF v_owner_id IS NULL THEN
    SELECT id INTO v_owner_id FROM auth.users ORDER BY created_at LIMIT 1;
  END IF;

  -- Insert Gigerl company
  INSERT INTO public.companies (
    owner_id,
    name,
    slug,
    tagline,
    emoji,
    city,
    niche,
    homepage_url,
    google_review_url,
    street,
    postal_code,
    district,
    phone,
    public_email,
    hours_note,
    services,
    is_local_business,
    featured,
    entry_funnel,
    ui_locale,
    local_seat_paid_at,
    network_backlink
  )
  VALUES (
    v_owner_id,
    'Gigerl',
    'gigerl',
    'Traditioneller Stadtheuriger im Herzen Wiens – 75% BIO-zertifiziert',
    '🍷',
    'Wien',
    'Heuriger',
    'https://www.gigerl.at/',
    'https://www.google.com/maps/search/?api=1&query=Stadtheuriger+Gigerl,Rauhensteingasse+3,1010+Wien',
    'Rauhensteingasse 3 (Eingang Blumenstockgasse 2)',
    '1010',
    '1. Bezirk',
    '+43 1 513 44 31',
    'office@gigerl.at',
    'Mo–Sa 16:00–24:00 Uhr | Warme Küche bis 23:00 | Sonntag geschlossen',
    ARRAY['Heurigenbuffet', 'Wiener Küche', 'Weinverkostung', 'Gastgarten', 'Kaiserschmarrn', 'BIO-zertifiziert']::text[],
    true,  -- is_local_business
    false, -- featured (set to true if you want it at the top)
    'local',
    'de',
    NOW(), -- local_seat_paid_at (marks as PAID)
    true   -- network_backlink
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    homepage_url = EXCLUDED.homepage_url,
    google_review_url = EXCLUDED.google_review_url,
    street = EXCLUDED.street,
    phone = EXCLUDED.phone,
    public_email = EXCLUDED.public_email,
    hours_note = EXCLUDED.hours_note,
    services = EXCLUDED.services,
    local_seat_paid_at = COALESCE(companies.local_seat_paid_at, NOW())
  RETURNING id INTO v_company_id;

  -- Step 2: Assign a local cohort number (1-1000)
  PERFORM public.assign_local_cohort(v_company_id);

  -- Step 3: Grant initial boost credits (optional - 200 tokens)
  -- Comment out if not needed
  PERFORM public.grant_local_boost(
    v_company_id,
    200,
    'Local Seat unlock (Gigerl) – initial grant'
  );

  RAISE NOTICE 'Gigerl added successfully! Company ID: %', v_company_id;
  
END $$;

-- Verify the insertion
SELECT 
  id,
  name,
  slug,
  city,
  is_local_business,
  local_seat_paid_at,
  local_cohort_number,
  homepage_url,
  phone
FROM public.companies
WHERE slug = 'gigerl';
