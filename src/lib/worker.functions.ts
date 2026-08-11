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

/** Re-queue failed AI tasks (e.g. freellm_unreachable) and run them now. */
export const retryFailedAiTasks = createServerFn({ method: "POST" })
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

    let q = context.supabase
      .from("tasks")
      .update({
        status: "queued",
        progress: 0,
        result: "Retrying after AI recovery…",
        completed_at: null,
      })
      .eq("company_id", companyId)
      .eq("status", "failed");
    if (data.taskId) q = q.eq("id", data.taskId);

    const { data: updated, error } = await q.select("id");
    if (error) throw error;
    const ids = (updated ?? []).map((r: { id: string }) => r.id);
    if (ids.length === 0) {
      return { ok: true as const, requeued: 0, tasksProcessed: 0 };
    }

    await context.supabase.from("activity_events").insert({
      company_id: companyId,
      kind: "task",
      message: `Founder retried ${ids.length} failed AI task${ids.length === 1 ? "" : "s"}`,
    });

    const { processTaskQueue, processOneTask } = await import("@/lib/task-worker.server");
    let processed = 0;
    for (const id of ids.slice(0, 5)) {
      const one = await processOneTask(id);
      if (one.ok) processed += 1;
    }
    const rest = await processTaskQueue(Math.max(0, 8 - processed), companyId);
    return {
      ok: true as const,
      requeued: ids.length,
      tasksProcessed: processed + rest.processed,
    };
  });
