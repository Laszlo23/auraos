import { createFileRoute } from "@tanstack/react-router";
import {
  processTaskQueue,
  publishDueChannelPosts,
  syncSocialEngagement,
} from "@/lib/task-worker.server";
import { runTradingTick } from "@/lib/trading-worker.server";

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

export const Route = createFileRoute("/api/workers/tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = authorizeWorker(request);
        if (denied) return denied;
        const tasks = await processTaskQueue(8);
        const channels = await publishDueChannelPosts(20);
        const engagement = await syncSocialEngagement(20);
        const trading = await runTradingTick();
        return Response.json({ ok: true, tasks, channels, engagement, trading });
      },
      // Cron-friendly GET still requires Bearer header (never ?secret= — leaks in logs).
      GET: async ({ request }) => {
        const denied = authorizeWorker(request);
        if (denied) return denied;
        const tasks = await processTaskQueue(5);
        const channels = await publishDueChannelPosts(20);
        const engagement = await syncSocialEngagement(20);
        const trading = await runTradingTick();
        return Response.json({ ok: true, tasks, channels, engagement, trading });
      },
    },
  },
});
