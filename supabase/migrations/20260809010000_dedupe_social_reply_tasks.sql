-- Deduplicate social reply approval tasks spawned by repeated worker syncs.
-- Old rows regenerated a new draft body each tick, so descriptions differ —
-- collapse by (company_id, title), keeping the oldest open task.

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY company_id, title
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.tasks
  WHERE status IN ('pending_approval', 'queued', 'pending')
    AND title LIKE 'Approve % reply to %'
)
DELETE FROM public.tasks t
USING ranked r
WHERE t.id = r.id
  AND r.rn > 1;

-- Prevent duplicate open reply-approval tasks for the same social mention
-- (worker stores source key in result: social-reply:provider:externalId).
CREATE UNIQUE INDEX IF NOT EXISTS tasks_company_social_reply_result_uidx
  ON public.tasks (company_id, result)
  WHERE result LIKE 'social-reply:%'
    AND status IN ('pending_approval', 'queued', 'pending', 'running');
