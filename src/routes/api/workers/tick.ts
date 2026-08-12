import { createFileRoute } from "@tanstack/react-router";
import {
  processTaskQueue,
  publishDueChannelPosts,
  syncSocialEngagement,
} from "@/lib/task-worker.server";
import { runTradingTick } from "@/lib/trading-worker.server";
import { runSiteLeadsDraftTick, runSubscriptionContentTick } from "@/lib/sites-worker.server";

function authorizeWorker(request: Request): Response | null {
  const secret = process.env["WORKER_SECRET"];
  if (!secret) {
    console.error("[workers/tick] WORKER_SECRET is not set — refusing open worker endpoint");
    return Response.json({ error: "Worker not configured" }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

async function runTick(taskLimit: number) {
  const tasks = await processTaskQueue(taskLimit);
  const channels = await publishDueChannelPosts(20);
  const engagement = await syncSocialEngagement(20);
  const trading = await runTradingTick();
  const subscriptions = await runSubscriptionContentTick(20);
  const siteLeads = await runSiteLeadsDraftTick(25);

  let missions = { advanced: 0, dispatched: 0 };
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { advanceActiveMissions, writeWorkerHeartbeat } =
      await import("@/lib/mission-progress.server");
    missions = await advanceActiveMissions(supabaseAdmin as never, 12);
    await writeWorkerHeartbeat(supabaseAdmin as never, {
      tasks,
      channels,
      engagement,
      tradingOk: Boolean(trading),
      subscriptions,
      siteLeads,
      missions,
    });
  } catch (e) {
    console.warn("[workers/tick] mission advance failed", e instanceof Error ? e.message : e);
  }

  return { ok: true, tasks, channels, engagement, trading, subscriptions, siteLeads, missions };
}

export const Route = createFileRoute("/api/workers/tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = authorizeWorker(request);
        if (denied) return denied;
        return Response.json(await runTick(8));
      },
      // Cron-friendly GET still requires Bearer header (never ?secret= — leaks in logs).
      GET: async ({ request }) => {
        const denied = authorizeWorker(request);
        if (denied) return denied;
        return Response.json(await runTick(5));
      },
    },
  },
});
