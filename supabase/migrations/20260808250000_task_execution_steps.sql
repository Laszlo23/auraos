-- Live task execution: step trail + research artifact for proof of work

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS artifact jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.tasks.steps IS 'Live execution steps: plan / search / scrape / synthesize';
COMMENT ON COLUMN public.tasks.artifact IS 'Sources and plan from real tool use (never invented revenue)';
