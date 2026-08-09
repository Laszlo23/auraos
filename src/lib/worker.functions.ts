import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Founder-triggered worker tick — runs with the user session, not WORKER_SECRET.
 * Used after Approve so agents actually process queued tasks immediately.
 * Pass taskId to execute that task first (plan → research → deliverable).
 * Always scoped to the caller's company (never global).
 */
export const triggerWorkerTick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { taskId?: string } | undefined) => {
    const out: { taskId?: string } = {};
    if (input?.taskId) out.taskId = String(input.taskId);
    return out;
  })
  .handler(async ({ data, context }) => {
    const { data: company } = await context.supabase
      .from("companies")
      .select("id")
      .eq("owner_id", context.userId)
      .limit(1)
      .maybeSingle();
    if (!company) throw new Error("No company");

    const companyId = company.id as string;

    const { processTaskQueue, processOneTask, publishDueChannelPosts, syncSocialEngagement } =
      await import("@/lib/task-worker.server");

    let one: { ok: boolean; error?: string } | null = null;
    if (data.taskId) {
      const { data: owned } = await context.supabase
        .from("tasks")
        .select("id")
        .eq("id", data.taskId)
        .eq("company_id", companyId)
        .maybeSingle();
      if (owned?.id) {
        one = await processOneTask(owned.id);
      }
    }

    // Tenant-scoped only — cron `/api/workers/tick` remains the global runner.
    const tasks = await processTaskQueue(data.taskId ? 4 : 8, companyId);
    const channels = await publishDueChannelPosts(20, companyId);
    const engagement = await syncSocialEngagement(20, companyId);

    const tasksProcessed = (one?.ok ? 1 : 0) + tasks.processed;
    return {
      ok: true as const,
      tasksProcessed,
      taskErrors: [
        ...(one && !one.ok && one.error ? [one.error] : []),
        ...tasks.errors,
      ],
      focusedTaskOk: one?.ok ?? null,
      channels,
      engagement,
    };
  });
