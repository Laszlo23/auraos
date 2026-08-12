/**
 * Keep revenue missions moving after task completion and on worker ticks.
 * Soft-fails — never blocks task success if mission refresh fails.
 */
import { AGENT_ROSTER } from "@/lib/agent-roster";
import { clampAutonomy, taskStatusForAutonomy } from "@/lib/company-economy";
import {
  proposeNextBestActionWithLlm,
  type MissionPlan,
  type NextBestAction,
} from "@/lib/revenue-mission.server";

type LooseDb = { from: (table: string) => any };

const OPEN_TASK = ["queued", "running", "pending_approval", "in_progress"] as const;

async function appendMissionEvent(
  db: LooseDb,
  opts: {
    companyId: string;
    missionId: string;
    agentName: string;
    kind: string;
    message: string;
    result?: string | null;
  },
) {
  await db.from("revenue_mission_events").insert({
    company_id: opts.companyId,
    mission_id: opts.missionId,
    agent_name: opts.agentName,
    kind: opts.kind,
    message: opts.message,
    cost_aura: 0,
    cost_usdc: 0,
    result: opts.result ?? null,
    status: "ok",
  });
}

async function missionActualRevenue(db: LooseDb, companyId: string, missionId: string) {
  const { data } = await db
    .from("company_ledger_entries")
    .select("amount_usdc, status, kind")
    .eq("company_id", companyId)
    .eq("source", "mission")
    .eq("source_id", missionId);
  const rows = (data ?? []) as { amount_usdc?: number; status?: string; kind?: string }[];
  return rows
    .filter((r) => r.status === "settled" && r.kind === "revenue")
    .reduce((s, r) => s + Number(r.amount_usdc ?? 0), 0);
}

async function ensureAgentId(db: LooseDb, companyId: string, name: string) {
  const def = AGENT_ROSTER[name];
  if (!def) return null;
  const { data: existing } = await db
    .from("agents")
    .select("id")
    .eq("company_id", companyId)
    .eq("name", name)
    .maybeSingle();
  if (existing?.id) return existing.id as string;
  const { data: created } = await db
    .from("agents")
    .insert({
      company_id: companyId,
      name,
      role: def.role,
      status: "active",
      current_task: "Standing by",
    })
    .select("id")
    .single();
  return (created?.id as string) ?? null;
}

async function proposeNba(
  db: LooseDb,
  mission: Record<string, unknown>,
  autonomy: number,
): Promise<NextBestAction> {
  const { data: events } = await db
    .from("revenue_mission_events")
    .select("message")
    .eq("mission_id", mission["id"])
    .order("created_at", { ascending: false })
    .limit(10);
  const actualRevenue = await missionActualRevenue(
    db,
    String(mission["company_id"]),
    String(mission["id"]),
  );
  const nba = await proposeNextBestActionWithLlm({
    goal: String(mission["goal_text"] ?? ""),
    plan: (mission["plan"] || {}) as MissionPlan,
    status: String(mission["status"] ?? "active"),
    actualRevenue,
    targetUsdc: Number(mission["target_usdc"]) || 0,
    recentEvents: ((events ?? []) as { message: string }[]).map((e) => e.message),
  });
  if (autonomy <= 1) nba.status = "pending_approval";
  return nba;
}

async function maybeDispatchNba(
  db: LooseDb,
  opts: {
    companyId: string;
    mission: Record<string, unknown>;
    nba: NextBestAction;
    autonomy: number;
  },
): Promise<{ dispatched: boolean }> {
  if (opts.autonomy < 2) return { dispatched: false };
  if (opts.nba.status === "pending_approval") return { dispatched: false };
  if (opts.nba.kind === "prospect") return { dispatched: false };

  const status = taskStatusForAutonomy({
    autonomy: opts.autonomy,
    founderApproved: true,
  });
  if (status !== "queued") return { dispatched: false };

  const agentId = await ensureAgentId(db, opts.companyId, opts.nba.assignee);
  if (!agentId) return { dispatched: false };

  await db.from("tasks").insert({
    company_id: opts.companyId,
    agent_id: agentId,
    mission_id: opts.mission["id"],
    title: `${opts.nba.assignee}: ${opts.nba.title}`.slice(0, 120),
    description: `${opts.nba.detail}\n\nMission:\n${String(opts.mission["goal_text"] ?? "")}\n\nDo not invent revenue. Never send email without founder approval.`,
    status: "queued",
    priority: "high",
    roi: 0,
    progress: 0,
  });

  const agentsStatus = {
    ...((opts.mission["agents_status"] || {}) as Record<string, string>),
    [opts.nba.assignee]: "queued",
  };
  await db
    .from("revenue_missions")
    .update({
      agents_status: agentsStatus,
      next_best_action: { ...opts.nba, status: "done" },
      updated_at: new Date().toISOString(),
    })
    .eq("id", opts.mission["id"]);

  await appendMissionEvent(db, {
    companyId: opts.companyId,
    missionId: String(opts.mission["id"]),
    agentName: opts.nba.assignee,
    kind: "nba",
    message: `${opts.nba.assignee} · auto-dispatched · ${opts.nba.title}`,
  });

  return { dispatched: true };
}

/**
 * After a mission-linked task completes: event + agents_status + next NBA.
 */
export async function onMissionTaskCompleted(
  db: LooseDb,
  opts: {
    companyId: string;
    missionId: string;
    agentName: string;
    taskTitle: string;
    summary?: string;
  },
): Promise<void> {
  try {
    const { data: mission } = await db
      .from("revenue_missions")
      .select("*")
      .eq("id", opts.missionId)
      .eq("company_id", opts.companyId)
      .maybeSingle();
    if (!mission || mission.status !== "active") return;

    await appendMissionEvent(db, {
      companyId: opts.companyId,
      missionId: opts.missionId,
      agentName: opts.agentName,
      kind: "task_completed",
      message: `${opts.agentName} finished · ${opts.taskTitle.slice(0, 100)}`,
      result: opts.summary?.slice(0, 400) ?? null,
    });

    const agentsStatus = {
      ...((mission.agents_status || {}) as Record<string, string>),
      [opts.agentName]: "done",
    };

    const { data: company } = await db
      .from("companies")
      .select("autonomy")
      .eq("id", opts.companyId)
      .maybeSingle();
    const autonomy = clampAutonomy(company?.autonomy);

    const { data: openTasks } = await db
      .from("tasks")
      .select("id")
      .eq("mission_id", opts.missionId)
      .in("status", [...OPEN_TASK])
      .limit(1);

    let nba: NextBestAction | null = null;
    if (!(openTasks ?? []).length) {
      nba = await proposeNba(db, mission as Record<string, unknown>, autonomy);
    }

    await db
      .from("revenue_missions")
      .update({
        agents_status: agentsStatus,
        ...(nba ? { next_best_action: nba } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", opts.missionId);

    if (nba) {
      await maybeDispatchNba(db, {
        companyId: opts.companyId,
        mission: { ...(mission as Record<string, unknown>), agents_status: agentsStatus },
        nba,
        autonomy,
      });
    }
  } catch (e) {
    console.warn("mission progress after task failed", e instanceof Error ? e.message : e);
  }
}

/**
 * Worker tick: for active missions with no open work and empty/done NBA, propose
 * (and auto-dispatch when autonomy ≥ 2).
 */
export async function advanceActiveMissions(
  db: LooseDb,
  limit = 12,
): Promise<{ advanced: number; dispatched: number }> {
  let advanced = 0;
  let dispatched = 0;
  try {
    const { data: missions } = await db
      .from("revenue_missions")
      .select("*")
      .eq("status", "active")
      .order("updated_at", { ascending: true })
      .limit(limit);

    for (const mission of (missions ?? []) as Record<string, unknown>[]) {
      const missionId = String(mission["id"]);
      const companyId = String(mission["company_id"]);

      const { data: openTasks } = await db
        .from("tasks")
        .select("id, status")
        .eq("mission_id", missionId)
        .in("status", [...OPEN_TASK])
        .limit(8);

      const open = (openTasks ?? []) as { id: string; status: string }[];
      if (
        open.some(
          (t) => t.status === "queued" || t.status === "running" || t.status === "in_progress",
        )
      ) {
        continue;
      }

      const { data: company } = await db
        .from("companies")
        .select("autonomy")
        .eq("id", companyId)
        .maybeSingle();
      const autonomy = clampAutonomy(company?.autonomy);

      const nbaRaw = (mission["next_best_action"] || {}) as NextBestAction;

      if (open.some((t) => t.status === "pending_approval")) {
        if (!nbaRaw.title) {
          const nba = await proposeNba(db, mission, autonomy);
          nba.status = "pending_approval";
          await db
            .from("revenue_missions")
            .update({
              next_best_action: nba,
              updated_at: new Date().toISOString(),
            })
            .eq("id", missionId);
          advanced += 1;
        }
        continue;
      }

      let nba = nbaRaw;
      if (!nbaRaw.title || nbaRaw.status === "done") {
        nba = await proposeNba(db, mission, autonomy);
        await db
          .from("revenue_missions")
          .update({
            next_best_action: nba,
            updated_at: new Date().toISOString(),
          })
          .eq("id", missionId);
        advanced += 1;
      } else if (nbaRaw.status === "pending_approval") {
        continue;
      }

      const result = await maybeDispatchNba(db, {
        companyId,
        mission,
        nba,
        autonomy,
      });
      if (result.dispatched) dispatched += 1;
    }
  } catch (e) {
    console.warn("advanceActiveMissions failed", e instanceof Error ? e.message : e);
  }
  return { advanced, dispatched };
}

export async function writeWorkerHeartbeat(
  db: LooseDb,
  summary: Record<string, unknown>,
): Promise<void> {
  try {
    await db.from("worker_heartbeats").insert({
      ran_at: new Date().toISOString(),
      payload: summary,
    });
  } catch (e) {
    console.warn("worker heartbeat write failed", e instanceof Error ? e.message : e);
  }
}
