import { createFileRoute } from "@tanstack/react-router";
import {
  processTaskQueue,
  publishDueChannelPosts,
  syncSocialEngagement,
} from "@/lib/task-worker.server";
import { extendLaunchDrips } from "@/lib/launch-drip.server";
import { runTradingTick } from "@/lib/trading-worker.server";
import { runSiteLeadsDraftTick, runSubscriptionContentTick } from "@/lib/sites-worker.server";
import { runAuraBuyLpTick } from "@/lib/aura-buy-lp-worker.server";
import { runLeadDigestTick } from "@/lib/lead-digest.server";
import { runImmoListingScoutTick } from "@/lib/immo-listing-scout.server";

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

async function safe<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.warn(`[workers/tick] ${label} failed`, e instanceof Error ? e.message : e);
    return fallback;
  }
}

async function runTick(taskLimit: number) {
  // Channels + drip first so social never waits behind trading timeouts.
  const drip = await safe(
    "drip",
    () => extendLaunchDrips(),
    {
      companies: 0,
      created: 0,
      skipped: 0,
      farcasterCreated: 0,
      farcasterSkipped: 0,
      linkedinCreated: 0,
      linkedinSkipped: 0,
      catchUpCreated: 0,
      catchUpSkipped: 0,
      t0Created: 0,
      t0Skipped: 0,
    },
  );
  const channels = await safe("channels", () => publishDueChannelPosts(20), {
    published: 0,
    skipped: 0,
    errors: [] as string[],
  });
  const engagement = await safe("engagement", () => syncSocialEngagement(20), {
    ingested: 0,
    replied: 0,
  });
  const tasks = await safe("tasks", () => processTaskQueue(taskLimit), {
    processed: 0,
    errors: [] as string[],
  });
  const trading = await safe("trading", () => runTradingTick(), null);
  const subscriptions = await safe("subscriptions", () => runSubscriptionContentTick(20), {
    drops: 0,
    sent: 0,
    errors: [] as string[],
  });
  const siteLeads = await safe("siteLeads", () => runSiteLeadsDraftTick(25), {
    drafted: 0,
    errors: [] as string[],
  });
  const listingScout = await safe("immoListingScout", () => runImmoListingScoutTick(6), {
    checked: 0,
    inserted: 0,
    errors: [] as string[],
  });
  const leadDigests = await safe("leadDigests", () => runLeadDigestTick(40), {
    checked: 0,
    sent: 0,
    errors: [] as string[],
  });
  const auraBuyLp = await safe(
    "auraBuyLp",
    () => runAuraBuyLpTick(8),
    {
      rail: "float" as const,
      scanned: 0,
      reserved: 0,
      floated: 0,
      fulfilled: 0,
      held: 0,
      errors: [] as string[],
      floatUsdc: null,
    },
  );

  let missions = { advanced: 0, dispatched: 0 };
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { advanceActiveMissions, writeWorkerHeartbeat } =
      await import("@/lib/mission-progress.server");
    missions = await advanceActiveMissions(supabaseAdmin as never, 12);
    await writeWorkerHeartbeat(supabaseAdmin as never, {
      tasks,
      channels,
      drip,
      engagement,
      tradingOk: Boolean(trading),
      subscriptions,
      siteLeads,
      listingScout,
      leadDigests,
      missions,
    });
  } catch (e) {
    console.warn("[workers/tick] mission advance failed", e instanceof Error ? e.message : e);
  }

  return {
    ok: true,
    tasks,
    channels,
    drip,
    engagement,
    trading,
    subscriptions,
    siteLeads,
    listingScout,
    leadDigests,
    auraBuyLp,
    missions,
  };
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
