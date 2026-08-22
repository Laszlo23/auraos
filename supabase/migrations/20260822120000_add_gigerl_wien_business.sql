-- Add Gigerl (Stadtheuriger) to Wien local business directory
-- Traditional Viennese Heuriger in the city center
-- 99€ Local Seat already paid

DO $$
DECLARE
  v_owner_id uuid;
  v_company_id uuid;
BEGIN
  -- Use first available user as owner (adjust as needed)
  SELECT id INTO v_owner_id FROM auth.users ORDER BY created_at LIMIT 1;
  
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'No user found to assign as owner';
  END IF;

  -- Insert Gigerl if it doesn't exist
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
    true,    -- is_local_business
    false,   -- featured
    'local',
    'de',
    NOW(),   -- local_seat_paid_at (marks as PAID)
    true     -- network_backlink
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_company_id;

  IF v_company_id IS NOT NULL THEN
    -- Assign local cohort number
    PERFORM public.assign_local_cohort(v_company_id);
    
    -- Grant initial boost credits
    PERFORM public.grant_local_boost(
      v_company_id,
      200,
      'Local Seat unlock (Gigerl) – initial grant'
    );
    
    RAISE NOTICE 'Gigerl added successfully! Company ID: %', v_company_id;
  ELSE
    RAISE NOTICE 'Gigerl already exists (slug: gigerl)';
  END IF;
END $$;
