-- Business OS presets + custom menu prefs (mutable; entry_funnel stays immutable).
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS os_preset text,
  ADD COLUMN IF NOT EXISTS nav_prefs jsonb;

COMMENT ON COLUMN public.companies.os_preset IS
  'Mutable business template: realty | service | commerce | creator | community | reseller | full. Defaults nav when nav_prefs is null.';

COMMENT ON COLUMN public.companies.nav_prefs IS
  'JSON array of visible nav path strings (e.g. ["/console","/channels"]). Null = use os_preset defaults (or funnel navCore).';

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_os_preset_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_os_preset_check
  CHECK (
    os_preset IS NULL
    OR os_preset IN (
      'realty',
      'service',
      'commerce',
      'creator',
      'community',
      'reseller',
      'full'
    )
  );

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_nav_prefs_is_array;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_nav_prefs_is_array
  CHECK (nav_prefs IS NULL OR jsonb_typeof(nav_prefs) = 'array');
