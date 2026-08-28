-- Public page views + funnel events that the client already fires.
DROP POLICY IF EXISTS "Anyone can record a teaser event" ON public.teaser_events;
CREATE POLICY "Anyone can record a teaser event"
ON public.teaser_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(session_id) >= 8 AND length(session_id) <= 64
  AND event = ANY (ARRAY[
    'landing_view','signup_view','open','view_start','q25','q50','q75',
    'complete','cta_click','download','share','social_join','launch_share',
    'idle_drop','exit_intent','scroll_drop','attention_nudge','page_view'
  ])
  AND length(placement) <= 200
  AND (position_pct IS NULL OR (position_pct >= 0 AND position_pct <= 100))
  AND (referrer IS NULL OR length(referrer) <= 500)
  AND (utm_source IS NULL OR length(utm_source) <= 120)
  AND (utm_medium IS NULL OR length(utm_medium) <= 120)
  AND (utm_campaign IS NULL OR length(utm_campaign) <= 120)
  AND (utm_content IS NULL OR length(utm_content) <= 120)
  AND (utm_term IS NULL OR length(utm_term) <= 120)
  AND (ref_code IS NULL OR length(ref_code) <= 60)
  AND (landing_path IS NULL OR length(landing_path) <= 200)
  AND public.teaser_insert_allowed(session_id)
);

CREATE OR REPLACE FUNCTION public.teaser_insert_allowed(p_session text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent int;
BEGIN
  SELECT count(*) INTO recent
  FROM public.teaser_events
  WHERE session_id = p_session
    AND created_at > now() - interval '1 minute';
  RETURN recent < 60;
END;
$$;
