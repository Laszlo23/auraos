-- Per-agent learning curve counters (real progress, not seed revenue).
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS tasks_completed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lessons_count integer NOT NULL DEFAULT 0;

-- New companies default to Ask-me-first autonomy.
ALTER TABLE public.companies
  ALTER COLUMN autonomy SET DEFAULT 0;

COMMENT ON COLUMN public.agents.tasks_completed IS 'Tasks this agent finished after founder approval / dispatch';
COMMENT ON COLUMN public.agents.lessons_count IS 'Memory write-backs accumulated from completed work';
