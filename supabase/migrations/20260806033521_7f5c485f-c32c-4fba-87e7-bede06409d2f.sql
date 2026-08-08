ALTER TABLE public.teaser_events
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS ref_code text,
  ADD COLUMN IF NOT EXISTS landing_path text;

CREATE INDEX IF NOT EXISTS teaser_events_source_idx
  ON public.teaser_events (utm_source, utm_campaign, created_at DESC);

CREATE INDEX IF NOT EXISTS teaser_events_ref_idx
  ON public.teaser_events (ref_code, created_at DESC);