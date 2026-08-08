import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Founder-triggered worker tick — runs with the user session, not WORKER_SECRET.
 * Used after Approve so agents actually process queued tasks immediately.
 * Pass taskId to execute that task first (plan → research → deliverable).
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

    const { processTaskQueue, processOneTask, publishDueChannelPosts, syncSocialEngagement } =
      await import("@/lib/task-worker.server");
    const { runTradingTick } = await import("@/lib/trading-worker.server");

    let one: { ok: boolean; error?: string } | null = null;
    if (data.taskId) {
      const { data: owned } = await context.supabase
        .from("tasks")
        .select("id")
        .eq("id", data.taskId)
        .eq("company_id", company.id)
        .maybeSingle();
      if (owned?.id) {
        one = await processOneTask(owned.id);
      }
    }

    // Other queued work; skip re-running the focused task if it just completed
    const tasks = await processTaskQueue(data.taskId ? 4 : 8);
    const channels = await publishDueChannelPosts(20);
    const engagement = await syncSocialEngagement(20);
    const trading = await runTradingTick();

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
      trading,
    };
  });
