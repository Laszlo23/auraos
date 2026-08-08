CREATE TABLE public.teaser_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  event TEXT NOT NULL,
  placement TEXT NOT NULL DEFAULT 'unknown',
  position_pct INTEGER,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX teaser_events_event_created_idx ON public.teaser_events (event, created_at DESC);
CREATE INDEX teaser_events_session_idx ON public.teaser_events (session_id);

GRANT INSERT ON public.teaser_events TO anon;
GRANT INSERT ON public.teaser_events TO authenticated;
GRANT ALL ON public.teaser_events TO service_role;

ALTER TABLE public.teaser_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a teaser event"
  ON public.teaser_events FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(session_id) BETWEEN 8 AND 64
    AND event IN ('open','view_start','q25','q50','q75','complete','cta_click','download')
    AND length(placement) <= 40
    AND (position_pct IS NULL OR position_pct BETWEEN 0 AND 100)
    AND (referrer IS NULL OR length(referrer) <= 500)
  );