/**
 * Honest automation desk — surfaces what the worker cron actually runs.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { triggerWorkerTick } from "@/lib/worker.functions";

export type AutomationJobKey =
  | "tasks"
  | "channels"
  | "engagement"
  | "trading"
  | "site_leads"
  | "subscriptions";

export type AutomationDeskStatus = {
  companyId: string;
  tradingArmed: boolean;
  tradingPaper: boolean;
  tasks: {
    pendingApproval: number;
    queued: number;
    running: number;
    done24h: number;
  };
  channelsDue: number;
  activity24h: number;
  jobs: Array<{
    key: AutomationJobKey;
    name: string;
    description: string;
    nodes: string[];
    live: boolean;
    detail: string;
  }>;
};

const REAL_JOBS: Array<{
  key: AutomationJobKey;
  name: string;
  description: string;
  nodes: string[];
}> = [
  {
    key: "tasks",
    name: "Agent task queue",
    description: "Approved tasks: plan → research → deliverable, with AURA burn and memory.",
    nodes: ["Approve", "Queue", "Execute", "File result"],
  },
  {
    key: "channels",
    name: "Channel publish",
    description: "Posts marked Autopublish / due drip go out when the worker ticks.",
    nodes: ["Due posts", "Provider send", "Mark published"],
  },
  {
    key: "engagement",
    name: "Social engagement sync",
    description: "Pulls inbound mentions/replies so you can approve real responses.",
    nodes: ["Fetch", "Score", "Queue reply"],
  },
  {
    key: "trading",
    name: "Trading desk",
    description: "Evaluates approved strategies and executes when armed (paper or live Base).",
    nodes: ["Signals", "Risk gates", "OKX / paper fill"],
  },
  {
    key: "site_leads",
    name: "Site lead drafts",
    description: "Drafts follow-ups for inbound site leads awaiting founder send.",
    nodes: ["New lead", "Draft", "Await send"],
  },
  {
    key: "subscriptions",
    name: "Subscription content",
    description: "Daily drops for published subscription sites with active subscribers.",
    nodes: ["Subscribers", "Generate", "Deliver"],
  },
];

export const getAutomationDeskStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AutomationDeskStatus> => {
    const { data: company } = await context.supabase
      .from("companies")
      .select("id, trading_armed, trading_paper")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!company?.id) throw new Error("No company");

    const companyId = company.id as string;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: pendingApproval },
      { count: queued },
      { count: running },
      { count: done24h },
      { count: channelsDue },
      { count: activity24h },
    ] = await Promise.all([
      context.supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "pending_approval"),
      context.supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "queued"),
      context.supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "running"),
      context.supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "done")
        .gte("updated_at", since),
      context.supabase
        .from("channel_posts")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "scheduled"),
      context.supabase
        .from("activity_events")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("created_at", since),
    ]);

    const tradingArmed = Boolean(company.trading_armed);
    const tradingPaper = Boolean((company as { trading_paper?: boolean }).trading_paper);

    const jobs = REAL_JOBS.map((job) => {
      let live = true;
      let detail = "Runs on worker tick (cron ~10m) or Run now.";
      switch (job.key) {
        case "tasks":
          detail = `${pendingApproval ?? 0} awaiting approval · ${queued ?? 0} queued · ${running ?? 0} running · ${done24h ?? 0} done/24h`;
          break;
        case "channels":
          detail = `${channelsDue ?? 0} scheduled posts waiting`;
          break;
        case "trading":
          live = tradingArmed;
          detail = tradingArmed
            ? tradingPaper
              ? "Armed · paper fills (no chain)"
              : "Armed · live Base swaps when signals fire"
            : "Disarmed — no live or paper execution";
          break;
        case "engagement":
          detail = "Syncs when Channels are connected";
          break;
        case "site_leads":
          detail = "Drafts when /s/$slug has inbound leads";
          break;
        case "subscriptions":
          detail = "Needs published site + active Stripe subscribers";
          break;
        default: {
          const _exhaustive: never = job.key;
          void _exhaustive;
          break;
        }
      }
      return { ...job, live, detail };
    });

    return {
      companyId,
      tradingArmed,
      tradingPaper,
      tasks: {
        pendingApproval: pendingApproval ?? 0,
        queued: queued ?? 0,
        running: running ?? 0,
        done24h: done24h ?? 0,
      },
      channelsDue: channelsDue ?? 0,
      activity24h: activity24h ?? 0,
      jobs,
    };
  });

/** Founder-triggered company-scoped worker pass (tasks + channels + engagement). */
export const runAutomationDeskNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return triggerWorkerTick({ data: {} });
  });
