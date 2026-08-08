import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AGENT_ROSTER } from "@/lib/agent-roster";
import {
  clampAutonomy,
  taskStatusForAutonomy,
  totalsFromLedger,
} from "@/lib/company-economy";
import { TASK_COST } from "@/lib/task-cost";
import {
  emptyAgentsStatus,
  isRevenueMissionGoal,
  makeShareSlug,
  parseTargetAmount,
  planRevenueMissionWithLlm,
  proposeNextBestActionWithLlm,
  type MissionPlan,
  type MissionProjected,
  type NextBestAction,
} from "@/lib/revenue-mission.server";

export { isRevenueMissionGoal, parseTargetAmount };

type LooseDb = { from: (table: string) => any };
function asDb(client: unknown): LooseDb {
  return client as LooseDb;
}

async function ownedCompany(supabase: LooseDb, userId: string) {
  const { data } = await supabase
    .from("companies")
    .select("id, name, slug, autonomy, daily_aura_budget, owner_id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("Company not found");
  return data as {
    id: string;
    name: string;
    slug?: string | null;
    autonomy?: number;
    daily_aura_budget?: number;
    owner_id: string;
  };
}

async function nextMissionNumber(supabase: LooseDb, companyId: string) {
  const { data } = await supabase
    .from("revenue_missions")
    .select("mission_number")
    .eq("company_id", companyId)
    .order("mission_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (Number(data?.mission_number) || 0) + 1;
}

async function appendEvent(
  supabase: LooseDb,
  opts: {
    companyId: string;
    missionId: string;
    agentName: string;
    kind: string;
    message: string;
    costAura?: number;
    costUsdc?: number;
    result?: string | null;
    status?: "ok" | "failed" | "pending";
  },
) {
  await supabase.from("revenue_mission_events").insert({
    company_id: opts.companyId,
    mission_id: opts.missionId,
    agent_name: opts.agentName,
    kind: opts.kind,
    message: opts.message,
    cost_aura: opts.costAura ?? 0,
    cost_usdc: opts.costUsdc ?? 0,
    result: opts.result ?? null,
    status: opts.status ?? "ok",
  });
}

async function missionActuals(supabase: LooseDb, companyId: string, missionId: string) {
  const { data } = await supabase
    .from("company_ledger_entries")
    .select("kind, amount_usdc, amount_aura, status")
    .eq("company_id", companyId)
    .eq("source", "mission")
    .eq("source_id", missionId);
  const rows = (data ?? []) as { kind: string; amount_usdc: number; status: string }[];
  const totals = totalsFromLedger(rows);
  return {
    revenue_usdc: totals.revenue,
    cost_usdc: totals.expenses,
    profit_usdc: totals.profit,
    pending_usdc: totals.pending,
    label: "actual" as const,
  };
}

async function ensureAgent(
  supabase: LooseDb,
  companyId: string,
  name: string,
  currentTask: string,
) {
  const def = AGENT_ROSTER[name];
  if (!def) return null;
  const { data: existing } = await supabase
    .from("agents")
    .select("id, paused")
    .eq("company_id", companyId)
    .eq("name", name)
    .maybeSingle();
  if (existing?.paused) return null;
  if (existing?.id) {
    await supabase
      .from("agents")
      .update({
        current_task: currentTask.slice(0, 120),
        activity: 85,
        status: "active",
        paused: false,
      })
      .eq("id", existing.id);
    return existing.id as string;
  }
  const { data: hired } = await supabase
    .from("agents")
    .insert({
      company_id: companyId,
      name: def.name,
      role: def.role,
      avatar: def.avatar,
      accent: def.accent,
      status: "active",
      current_task: currentTask.slice(0, 120),
      health: 100,
      performance: 0,
      activity: 70,
      revenue_generated: 0,
      credits_used: 0,
      tasks_completed: 0,
      lessons_count: 0,
      memory: def.memory,
      paused: false,
    })
    .select("id")
    .single();
  return (hired?.id as string) ?? null;
}

export type RevenueMissionRow = {
  id: string;
  company_id: string;
  mission_number: number;
  goal_text: string;
  target_usdc: number;
  deadline_at: string | null;
  budget_usdc: number;
  industry: string | null;
  location: string | null;
  risk: string;
  status: string;
  plan: MissionPlan;
  projected: MissionProjected;
  agents_status: Record<string, string>;
  next_best_action: NextBestAction | Record<string, never>;
  share_slug: string | null;
  share_public: boolean;
  akquise_campaign_id: string | null;
  interventions: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  actuals?: {
    revenue_usdc: number;
    cost_usdc: number;
    profit_usdc: number;
    pending_usdc: number;
    label: "actual";
  };
  progress?: number;
};

async function hydrateMission(
  supabase: LooseDb,
  row: Record<string, unknown>,
): Promise<RevenueMissionRow> {
  const id = row["id"] as string;
  const companyId = row["company_id"] as string;
  const actuals = await missionActuals(supabase, companyId, id);
  const target = Number(row["target_usdc"]) || 0;
  const progress = target > 0 ? Math.min(1, actuals.revenue_usdc / target) : 0;
  return {
    ...(row as unknown as RevenueMissionRow),
    plan: (row["plan"] || {}) as MissionPlan,
    projected: { ...(row["projected"] as MissionProjected), label: "projected" },
    agents_status: (row["agents_status"] || {}) as Record<string, string>,
    next_best_action: (row["next_best_action"] || {}) as NextBestAction,
    actuals,
    progress,
  };
}

/** Core create used by UI and dispatchMission bridge. */
export async function createRevenueMissionCore(
  supabase: unknown,
  userId: string,
  input: {
    goal: string;
    targetUsdc?: number;
    deadlineAt?: string | null;
    budgetUsdc?: number;
    industry?: string | null;
    location?: string | null;
    risk?: "low" | "medium" | "high";
  },
) {
  const db = asDb(supabase);
  const company = await ownedCompany(db, userId);
  const goal = input.goal.trim().slice(0, 500);
  if (goal.length < 8) throw new Error("Describe the mission (at least 8 characters).");

  const targetUsdc = input.targetUsdc ?? parseTargetAmount(goal);
  const { plan, projected, agents } = await planRevenueMissionWithLlm({
    goal,
    targetUsdc,
    industry: input.industry ?? null,
    location: input.location ?? null,
    risk: input.risk ?? "medium",
  });

  const num = await nextMissionNumber(db, company.id);
  const shareSlug = makeShareSlug();
  const agentsStatus = emptyAgentsStatus(agents);

  const { data: row, error } = await db
    .from("revenue_missions")
    .insert({
      company_id: company.id,
      mission_number: num,
      goal_text: goal,
      target_usdc: targetUsdc,
      deadline_at: input.deadlineAt || null,
      budget_usdc: input.budgetUsdc ?? 0,
      industry: input.industry || null,
      location: input.location || null,
      risk: input.risk || "medium",
      status: "planned",
      plan,
      projected,
      agents_status: agentsStatus,
      next_best_action: {},
      share_slug: shareSlug,
      share_public: false,
    })
    .select("*")
    .single();

  if (error || !row) throw new Error(error?.message || "Could not create mission");

  await appendEvent(db, {
    companyId: company.id,
    missionId: row.id as string,
    agentName: "Atlas",
    kind: "plan",
    message: "CEO · Building strategy",
    result: plan.summary,
  });

  await db.from("activity_events").insert({
    company_id: company.id,
    kind: "mission",
    message: `Revenue mission #${num} planned: "${goal.slice(0, 80)}"`,
  });

  return hydrateMission(db, row as Record<string, unknown>);
}

export const createRevenueMission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      goal: string;
      targetUsdc?: number;
      deadlineAt?: string | null;
      budgetUsdc?: number;
      industry?: string | null;
      location?: string | null;
      risk?: "low" | "medium" | "high";
    }) => ({
      goal: String(input.goal || "").trim(),
      targetUsdc: input.targetUsdc,
      deadlineAt: input.deadlineAt ?? null,
      budgetUsdc: input.budgetUsdc,
      industry: input.industry ?? null,
      location: input.location ?? null,
      risk: input.risk ?? "medium",
    }),
  )
  .handler(async ({ data, context }) => {
    const payload: {
      goal: string;
      targetUsdc?: number;
      deadlineAt?: string | null;
      budgetUsdc?: number;
      industry?: string | null;
      location?: string | null;
      risk?: "low" | "medium" | "high";
    } = { goal: data.goal, deadlineAt: data.deadlineAt, risk: data.risk };
    if (data.targetUsdc != null) payload.targetUsdc = data.targetUsdc;
    if (data.budgetUsdc != null) payload.budgetUsdc = data.budgetUsdc;
    if (data.industry != null) payload.industry = data.industry;
    if (data.location != null) payload.location = data.location;
    return createRevenueMissionCore(context.supabase, context.userId, payload);
  });

export const startRevenueMission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { missionId: string }) => ({
    missionId: String(input.missionId),
  }))
  .handler(async ({ data, context }) => {
    const db = asDb(context.supabase);
    const company = await ownedCompany(db, context.userId);

    const { data: mission } = await db
      .from("revenue_missions")
      .select("*")
      .eq("id", data.missionId)
      .eq("company_id", company.id)
      .maybeSingle();
    if (!mission) throw new Error("Mission not found");
    if (mission.status !== "planned" && mission.status !== "paused") {
      throw new Error("Mission is already started or finished.");
    }

    const plan = (mission.plan || {}) as MissionPlan;
    const agents = Array.from(
      new Set((plan.steps || []).map((s) => s.agent).filter(Boolean)),
    );
    if (!agents.includes("Atlas")) agents.unshift("Atlas");

    const agentsStatus: Record<string, string> = {};
    for (const a of agents) agentsStatus[a] = "waiting";

    const status = taskStatusForAutonomy({
      autonomy: company.autonomy,
      founderApproved: true,
      overDailyBudget: false,
    });

    let akquiseCampaignId: string | null = mission.akquise_campaign_id ?? null;
    const firstProspect = (plan.steps || []).find((s) => s.kind === "prospect");

    await appendEvent(db, {
      companyId: company.id,
      missionId: mission.id,
      agentName: "Atlas",
      kind: "start",
      message: "CEO · Mission started — activating employees",
    });

    for (const agent of agents) {
      agentsStatus[agent] = "coordinating";
      const agentId = await ensureAgent(
        db,
        company.id,
        agent,
        `Mission #${mission.mission_number}: ${mission.goal_text}`,
      );
      await appendEvent(db, {
        companyId: company.id,
        missionId: mission.id,
        agentName: agent,
        kind: "activate",
        message: `${agent} · Online for mission #${mission.mission_number}`,
      });

      const step = (plan.steps || []).find((s) => s.agent === agent && s.kind !== "prospect");
      if (step && agentId) {
        await db.from("tasks").insert({
          company_id: company.id,
          agent_id: agentId,
          mission_id: mission.id,
          title: `${agent}: ${step.title}`.slice(0, 120),
          description: `${step.detail}\n\nMission goal:\n${mission.goal_text}\n\nDo not invent revenue. File a concrete result.`,
          status,
          priority: "high",
          roi: 0,
          progress: 0,
        });
        agentsStatus[agent] = status === "queued" ? "working" : "waiting_approval";
      }
    }

    if (firstProspect) {
      try {
        const { runAkquiseForMission } = await import("@/lib/akquise.functions");
        const akquise = await runAkquiseForMission(
          context.supabase,
          company.id,
          `${mission.goal_text}\n\nFocus: ${firstProspect.detail}`,
        );
        akquiseCampaignId = akquise.campaignId;
        const { error: linkErr } = await db
          .from("akquise_campaigns")
          .update({ mission_id: mission.id })
          .eq("id", akquise.campaignId)
          .eq("company_id", company.id);
        if (linkErr && !/mission_id|schema cache|42703|PGRST204/i.test(linkErr.message || "")) {
          throw linkErr;
        }
        agentsStatus[firstProspect.agent] = "working";
        await appendEvent(db, {
          companyId: company.id,
          missionId: mission.id,
          agentName: firstProspect.agent,
          kind: "prospect",
          message: `${firstProspect.agent} · Lead research · ${akquise.added} prospects`,
          costAura: akquise.auraSpent,
          result: `${akquise.added} leads · ${akquise.scanned} pages`,
        });
      } catch (e) {
        await appendEvent(db, {
          companyId: company.id,
          missionId: mission.id,
          agentName: firstProspect.agent,
          kind: "prospect",
          message: `${firstProspect.agent} · Prospecting deferred`,
          result: e instanceof Error ? e.message : "failed",
          status: "failed",
        });
        agentsStatus[firstProspect.agent] = "waiting";
      }
    }

    const nba = await proposeNextBestActionWithLlm({
      goal: mission.goal_text,
      plan,
      status: "active",
      actualRevenue: 0,
      targetUsdc: Number(mission.target_usdc) || 0,
      recentEvents: ["Mission started"],
    });
    const autonomy = clampAutonomy(company.autonomy);
    if (autonomy <= 1) nba.status = "pending_approval";
    else nba.status = "ready";

    await db
      .from("revenue_missions")
      .update({
        status: "active",
        started_at: new Date().toISOString(),
        agents_status: agentsStatus,
        next_best_action: nba,
        akquise_campaign_id: akquiseCampaignId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mission.id);

    if (status === "queued") {
      try {
        const { processTaskQueue } = await import("@/lib/task-worker.server");
        await processTaskQueue(Math.min(6, agents.length));
      } catch {
        /* non-fatal */
      }
    }

    const { data: updated } = await db
      .from("revenue_missions")
      .select("*")
      .eq("id", mission.id)
      .single();

    return hydrateMission(db, (updated || mission) as Record<string, unknown>);
  });

export const listRevenueMissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = asDb(context.supabase);
    const company = await ownedCompany(db, context.userId);
    const { data } = await db
      .from("revenue_missions")
      .select("*")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(40);
    const rows = (data ?? []) as Record<string, unknown>[];
    return Promise.all(rows.map((r) => hydrateMission(db, r)));
  });

export const getRevenueMission = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { missionId: string }) => ({
    missionId: String(input.missionId),
  }))
  .handler(async ({ data, context }) => {
    const db = asDb(context.supabase);
    const company = await ownedCompany(db, context.userId);
    const { data: mission } = await db
      .from("revenue_missions")
      .select("*")
      .eq("id", data.missionId)
      .eq("company_id", company.id)
      .maybeSingle();
    if (!mission) throw new Error("Mission not found");

    const { data: events } = await db
      .from("revenue_mission_events")
      .select("*")
      .eq("mission_id", mission.id)
      .order("created_at", { ascending: false })
      .limit(60);

    const { data: tasks } = await db
      .from("tasks")
      .select("id, title, status, result, agent_id, completed_at, created_at, progress")
      .eq("mission_id", mission.id)
      .order("created_at", { ascending: false })
      .limit(40);

    const hydrated = await hydrateMission(db, mission as Record<string, unknown>);
    return {
      mission: hydrated,
      events: events ?? [],
      tasks: tasks ?? [],
    };
  });

export const computeNextBestAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { missionId: string }) => ({
    missionId: String(input.missionId),
  }))
  .handler(async ({ data, context }) => {
    const db = asDb(context.supabase);
    const company = await ownedCompany(db, context.userId);
    const { data: mission } = await db
      .from("revenue_missions")
      .select("*")
      .eq("id", data.missionId)
      .eq("company_id", company.id)
      .maybeSingle();
    if (!mission) throw new Error("Mission not found");

    const actuals = await missionActuals(db, company.id, mission.id);
    const { data: events } = await db
      .from("revenue_mission_events")
      .select("message")
      .eq("mission_id", mission.id)
      .order("created_at", { ascending: false })
      .limit(10);

    const nba = await proposeNextBestActionWithLlm({
      goal: mission.goal_text,
      plan: (mission.plan || {}) as MissionPlan,
      status: mission.status,
      actualRevenue: actuals.revenue_usdc,
      targetUsdc: Number(mission.target_usdc) || 0,
      recentEvents: ((events ?? []) as { message: string }[]).map((e) => e.message),
    });

    const autonomy = clampAutonomy(company.autonomy);
    if (autonomy <= 1) nba.status = "pending_approval";

    await db
      .from("revenue_missions")
      .update({
        next_best_action: nba,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mission.id);

    return nba;
  });

export const executeNextBestAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { missionId: string }) => ({
    missionId: String(input.missionId),
  }))
  .handler(async ({ data, context }) => {
    const db = asDb(context.supabase);
    const company = await ownedCompany(db, context.userId);
    const { data: mission } = await db
      .from("revenue_missions")
      .select("*")
      .eq("id", data.missionId)
      .eq("company_id", company.id)
      .maybeSingle();
    if (!mission) throw new Error("Mission not found");
    if (mission.status !== "active") throw new Error("Mission is not active.");

    let nba = (mission.next_best_action || {}) as NextBestAction;
    if (!nba.title) {
      nba = await proposeNextBestActionWithLlm({
        goal: mission.goal_text,
        plan: (mission.plan || {}) as MissionPlan,
        status: mission.status,
        actualRevenue: 0,
        targetUsdc: Number(mission.target_usdc) || 0,
        recentEvents: [],
      });
    }

    const autonomy = clampAutonomy(company.autonomy);
    const taskStatus = taskStatusForAutonomy({
      autonomy: company.autonomy,
      founderApproved: true,
      overDailyBudget: false,
    });

    // Manual/Assisted: executing NBA is an explicit founder click → queue if assisted+approved click
    const effectiveStatus =
      autonomy === 0 ? "pending_approval" : autonomy === 1 ? "queued" : taskStatus;

    const agentsStatus = {
      ...((mission.agents_status || {}) as Record<string, string>),
    };
    agentsStatus[nba.assignee] = "working";

    await appendEvent(db, {
      companyId: company.id,
      missionId: mission.id,
      agentName: nba.assignee,
      kind: "nba",
      message: `${nba.assignee} · ${nba.title}`,
      costAura: nba.expected_cost_aura || TASK_COST,
      result: `projected upside ${nba.expected_upside_usdc} USDC`,
      status: "pending",
    });

    if (nba.kind === "prospect") {
      const { runAkquiseForMission } = await import("@/lib/akquise.functions");
      const akquise = await runAkquiseForMission(
        context.supabase,
        company.id,
        `${mission.goal_text}\n\n${nba.detail}`,
      );
      const { error: linkNbaErr } = await db
        .from("akquise_campaigns")
        .update({ mission_id: mission.id })
        .eq("id", akquise.campaignId);
      if (
        linkNbaErr &&
        !/mission_id|schema cache|42703|PGRST204/i.test(linkNbaErr.message || "")
      ) {
        throw linkNbaErr;
      }
      await db
        .from("revenue_missions")
        .update({
          akquise_campaign_id: akquise.campaignId,
          agents_status: agentsStatus,
          interventions: Number(mission.interventions || 0) + 1,
          next_best_action: { ...nba, status: "done" },
          updated_at: new Date().toISOString(),
        })
        .eq("id", mission.id);
      await appendEvent(db, {
        companyId: company.id,
        missionId: mission.id,
        agentName: nba.assignee,
        kind: "prospect",
        message: `${nba.assignee} · NBA prospecting · ${akquise.added} leads`,
        costAura: akquise.auraSpent,
        result: `${akquise.added} prospects`,
      });
      await writeMissionLearning(db, company.id, mission.id, mission.goal_text, {
        kind: "prospect",
        added: akquise.added,
        scanned: akquise.scanned,
      });
      return { ok: true, kind: "prospect" as const, akquise };
    }

    const agentId = await ensureAgent(
      db,
      company.id,
      nba.assignee,
      nba.title,
    );
    let taskId: string | null = null;
    if (agentId) {
      const { data: task } = await db
        .from("tasks")
        .insert({
          company_id: company.id,
          agent_id: agentId,
          mission_id: mission.id,
          title: `${nba.assignee}: ${nba.title}`.slice(0, 120),
          description: `${nba.detail}\n\nMission:\n${mission.goal_text}\n\nDo not invent revenue. Never send email without founder approval.`,
          status: effectiveStatus,
          priority: "high",
          roi: 0,
          progress: 0,
        })
        .select("id")
        .single();
      taskId = (task?.id as string) ?? null;
    }

    await db
      .from("revenue_missions")
      .update({
        agents_status: agentsStatus,
        interventions: Number(mission.interventions || 0) + 1,
        next_best_action: { ...nba, status: "done" },
        updated_at: new Date().toISOString(),
      })
      .eq("id", mission.id);

    if (effectiveStatus === "queued") {
      try {
        const { processTaskQueue } = await import("@/lib/task-worker.server");
        await processTaskQueue(2);
      } catch {
        /* ignore */
      }
    }

    await writeMissionLearning(db, company.id, mission.id, mission.goal_text, {
      kind: "task",
      title: nba.title,
      status: effectiveStatus,
    });

    return { ok: true, kind: "task" as const, taskId, status: effectiveStatus };
  });

async function writeMissionLearning(
  supabase: LooseDb,
  companyId: string,
  missionId: string,
  goal: string,
  fact: Record<string, unknown>,
) {
  await supabase.from("knowledge_items").insert({
    company_id: companyId,
    cluster: "Mission learning",
    title: `Mission fact · ${String(fact["kind"] || "step")}`,
    summary: JSON.stringify({
      mission_id: missionId,
      goal: goal.slice(0, 200),
      verified: true,
      ...fact,
      note: "Verified operational fact only — not settled revenue unless ledger says so.",
    }).slice(0, 2000),
    source: "revenue_mission",
  });
}

export const completeRevenueMission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { missionId: string }) => ({
    missionId: String(input.missionId),
  }))
  .handler(async ({ data, context }) => {
    const db = asDb(context.supabase);
    const company = await ownedCompany(db, context.userId);
    const { data: mission } = await db
      .from("revenue_missions")
      .select("*")
      .eq("id", data.missionId)
      .eq("company_id", company.id)
      .maybeSingle();
    if (!mission) throw new Error("Mission not found");

    const actuals = await missionActuals(db, company.id, mission.id);
    await db
      .from("revenue_missions")
      .update({
        status: "complete",
        completed_at: new Date().toISOString(),
        share_public: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mission.id);

    await appendEvent(db, {
      companyId: company.id,
      missionId: mission.id,
      agentName: "Atlas",
      kind: "complete",
      message: "CEO · Mission marked complete",
      result: `actual revenue ${actuals.revenue_usdc} USDC`,
    });

    await writeMissionLearning(db, company.id, mission.id, mission.goal_text, {
      kind: "complete",
      actual_revenue_usdc: actuals.revenue_usdc,
      actual_cost_usdc: actuals.cost_usdc,
      actual_profit_usdc: actuals.profit_usdc,
    });

    const { data: updated } = await db
      .from("revenue_missions")
      .select("*")
      .eq("id", mission.id)
      .single();
    return hydrateMission(db, (updated || mission) as Record<string, unknown>);
  });

export const getPublicMission = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => ({
    slug: String(input.slug || "").slice(0, 32),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const supabase = asDb(supabaseAdmin);
    const { data: mission } = await supabase
      .from("revenue_missions")
      .select(
        "id, goal_text, target_usdc, status, plan, projected, share_slug, share_public, interventions, started_at, completed_at, created_at, company_id, mission_number",
      )
      .eq("share_slug", data.slug)
      .eq("share_public", true)
      .maybeSingle();
    if (!mission) return null;

    const { data: company } = await supabase
      .from("companies")
      .select("name, slug")
      .eq("id", mission.company_id)
      .maybeSingle();

    const actuals = await missionActuals(supabase, mission.company_id, mission.id);
    const { data: events } = await supabase
      .from("revenue_mission_events")
      .select("agent_name, kind, message, cost_aura, result, status, created_at")
      .eq("mission_id", mission.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const complete = mission.status === "complete";
    return {
      goal: mission.goal_text,
      status: mission.status,
      missionNumber: mission.mission_number,
      companyName: company?.name ?? "Aura company",
      companySlug: company?.slug ?? null,
      targetUsdc: Number(mission.target_usdc) || 0,
      plan: mission.plan as MissionPlan,
      projected: { ...(mission.projected as MissionProjected), label: "projected" as const },
      actuals: complete
        ? actuals
        : {
            revenue_usdc: 0,
            cost_usdc: 0,
            profit_usdc: 0,
            pending_usdc: 0,
            label: "actual" as const,
            note: "Actuals shown only when mission is complete and ledger-settled.",
          },
      interventions: mission.interventions,
      startedAt: mission.started_at,
      completedAt: mission.completed_at,
      events: events ?? [],
      showActuals: complete,
    };
  });
