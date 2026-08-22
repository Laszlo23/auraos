-- Add Gigerl (Stadtheuriger) to Wien local business directory
-- Traditional Viennese Heuriger in the city center

INSERT INTO public.companies (
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
  owner_id
)
SELECT 
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
  ARRAY['Heurigenbuffet', 'Wiener Küche', 'Weinverkostung', 'Gastgarten', 'Kaiserschmarrn', 'BIO-zertifiziert'],
  true,
  false,
  (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM public.companies WHERE slug = 'gigerl'
);

-- Comment with business details
COMMENT ON COLUMN public.companies.services IS 'Gigerl offers traditional Viennese heuriger experience with 75% organic certification, extensive wine selection, and both buffet and à la carte options. Located near Stephansdom in the historic Rauhensteingasse.';
