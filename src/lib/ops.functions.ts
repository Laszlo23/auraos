import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function utcDay() {
  return new Date().toISOString().slice(0, 10);
}

function opsAdminEmails(): Set<string> {
  const raw = process.env["OPS_ADMIN_EMAILS"]?.trim() || "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isOpsAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = opsAdminEmails();
  if (allow.size === 0) return false;
  return allow.has(email.trim().toLowerCase());
}

export type OpsDashboard = {
  email: string;
  lastHeartbeat: {
    ranAt: string;
    /** JSON-safe snapshot — avoid `unknown` (fails ValidateSerializable). */
    payload: Record<string, string | number | boolean | null>;
  } | null;
  activeMissionCount: number;
  stuckMissions: {
    id: string;
    company_id: string;
    goal_text: string;
    status: string;
    updated_at: string;
    next_best_action: { title: string; status: string } | null;
  }[];
  spinsToday: number;
  pendingChainSpins: number;
  companies: {
    id: string;
    name: string;
    autonomy: number | null;
    trading_paper: boolean | null;
    trading_armed: boolean | null;
    desk_network: string | null;
    updated_at: string;
  }[];
};

function jsonSafeRecord(raw: unknown): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    } else if (typeof v === "object") {
      out[k] = JSON.stringify(v).slice(0, 200);
    }
  }
  return out;
}

function nbaSafe(
  raw: unknown,
): { title: string; status: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = typeof o["title"] === "string" ? o["title"] : "";
  const status = typeof o["status"] === "string" ? o["status"] : "";
  if (!title && !status) return null;
  return { title, status };
}

async function emailFromContext(context: { claims?: unknown }): Promise<string | null> {
  const claims = context.claims as Record<string, unknown> | undefined;
  if (typeof claims?.["email"] === "string" && claims["email"]) return claims["email"];
  // Some JWTs nest email under user_metadata
  const meta = claims?.["user_metadata"] as Record<string, unknown> | undefined;
  if (typeof meta?.["email"] === "string" && meta["email"]) return meta["email"];
  return null;
}

export const getOpsDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = await emailFromContext(context);
    if (!isOpsAdminEmail(email)) throw new Error("Not authorized for ops");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as { from: (t: string) => any };

    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const today = utcDay();

    const [
      heartbeatRes,
      stuckMissionsRes,
      activeMissionsRes,
      spinsTodayRes,
      pendingSpinsRes,
      companiesRes,
    ] = await Promise.all([
      db
        .from("worker_heartbeats")
        .select("id, ran_at, payload")
        .order("ran_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from("revenue_missions")
        .select("id, company_id, goal_text, status, updated_at, next_best_action")
        .eq("status", "active")
        .lt("updated_at", thirtyMinAgo)
        .order("updated_at", { ascending: true })
        .limit(40),
      db
        .from("revenue_missions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      db
        .from("wheel_spins")
        .select("id", { count: "exact", head: true })
        .eq("spun_on", today),
      db
        .from("wheel_spins")
        .select("id", { count: "exact", head: true })
        .eq("spun_on", today)
        .eq("chain_status", "pending"),
      db
        .from("companies")
        .select("id, name, autonomy, trading_paper, trading_armed, desk_network, updated_at")
        .order("updated_at", { ascending: false })
        .limit(40),
    ]);

    const stuckRaw = (stuckMissionsRes.data ?? []) as {
      id: string;
      company_id: string;
      goal_text: string;
      status: string;
      updated_at: string;
      next_best_action: unknown;
    }[];

    return {
      email: email as string,
      lastHeartbeat: heartbeatRes.data
        ? {
            ranAt: String(heartbeatRes.data.ran_at),
            payload: jsonSafeRecord(heartbeatRes.data.payload),
          }
        : null,
      activeMissionCount: Number(activeMissionsRes.count ?? 0),
      stuckMissions: stuckRaw.map((m) => ({
        id: m.id,
        company_id: m.company_id,
        goal_text: m.goal_text,
        status: m.status,
        updated_at: m.updated_at,
        next_best_action: nbaSafe(m.next_best_action),
      })),
      spinsToday: Number(spinsTodayRes.count ?? 0),
      pendingChainSpins: Number(pendingSpinsRes.count ?? 0),
      companies: (companiesRes.data ?? []) as OpsDashboard["companies"],
    };
  });

/** Platform ops: advance missions + process task queue (admin only). */
export const triggerOpsTick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = await emailFromContext(context);
    if (!isOpsAdminEmail(email)) throw new Error("Not authorized for ops");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { processTaskQueue } = await import("@/lib/task-worker.server");
    const { advanceActiveMissions, writeWorkerHeartbeat } = await import(
      "@/lib/mission-progress.server"
    );

    const tasks = await processTaskQueue(8);
    const missions = await advanceActiveMissions(supabaseAdmin as never, 20);
    await writeWorkerHeartbeat(supabaseAdmin as never, {
      source: "ops_panel",
      tasksProcessed: tasks.processed,
      taskErrors: tasks.errors.length,
      missionsAdvanced: missions.advanced,
      missionsDispatched: missions.dispatched,
    });
    return {
      ok: true as const,
      tasksProcessed: tasks.processed,
      missionsAdvanced: missions.advanced,
      missionsDispatched: missions.dispatched,
    };
  });
