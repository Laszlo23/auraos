import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  agentsForMission,
  clampAutonomy,
  computeReputation,
  slugifyCompanyName,
  taskStatusForAutonomy,
  totalsFromLedger,
  COMPANY_MILESTONES,
} from "@/lib/company-economy";
import { AGENT_ROSTER } from "@/lib/agent-roster";
import { TASK_COST } from "@/lib/task-cost";

type LooseDb = { from: (table: string) => any };
function asDb(client: unknown): LooseDb {
  return client as LooseDb;
}

async function ownedCompany(supabase: { from: (t: string) => any }, userId: string) {
  const { data } = await supabase
    .from("companies")
    .select("id, name, slug, autonomy, daily_aura_budget, reputation, owner_id, tagline, strategy")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("Company not found");
  return data;
}

async function ensureSlug(
  supabase: { from: (t: string) => any },
  company: { id: string; name: string; slug?: string | null },
) {
  if (company.slug) return company.slug;
  const base = slugifyCompanyName(company.name);
  let candidate = base;
  for (let i = 0; i < 8; i++) {
    const { data } = await supabase
      .from("companies")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data || data.id === company.id) {
      await supabase.from("companies").update({ slug: candidate }).eq("id", company.id);
      return candidate;
    }
    candidate = `${base}-${i + 2}`;
  }
  return base;
}

async function auraSpentToday(supabase: LooseDb, companyId: string) {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { data } = await supabase
    .from("company_ledger_entries")
    .select("amount_aura")
    .eq("company_id", companyId)
    .eq("kind", "compute")
    .gte("created_at", dayStart.toISOString());
  return ((data ?? []) as { amount_aura?: number }[]).reduce(
    (s, r) => s + Math.abs(Number(r.amount_aura ?? 0)),
    0,
  );
}

export const getCompanyEconomy = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const company = await ownedCompany(asDb(context.supabase), context.userId);
    const slug = await ensureSlug(context.supabase, company);

    const { data: ledger } = await asDb(context.supabase)
      .from("company_ledger_entries")
      .select("kind, amount_usdc, amount_aura, status, description, created_at, agent_id, source")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(100);

    const totals = totalsFromLedger(
      (ledger ?? []) as { kind: string; amount_usdc: number; status: string }[],
    );

    const { count: agentCount } = await asDb(context.supabase)
      .from("agents")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .eq("paused", false);

    const { count: taskDone } = await asDb(context.supabase)
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .in("status", ["completed", "done"]);

    const { count: taskFailed } = await asDb(context.supabase)
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .eq("status", "failed");

    const { count: customers } = await asDb(context.supabase)
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id);

    const { count: knowledge } = await asDb(context.supabase)
      .from("knowledge_items")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id);

    const { count: decisions } = await asDb(context.supabase)
      .from("activity_events")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .eq("kind", "decision");

    const { data: channels } = await asDb(context.supabase)
      .from("channel_connections")
      .select("id, status")
      .eq("company_id", company.id);

    const connected = ((channels ?? []) as { status: string }[]).filter(
      (c) => c.status === "connected",
    ).length;

    const reputation = computeReputation({
      completedTasks: taskDone ?? 0,
      failedTasks: taskFailed ?? 0,
      connectedChannels: connected,
      agentsActive: agentCount ?? 0,
    });

    await asDb(context.supabase).from("companies").update({ reputation }).eq("id", company.id);

    const snapshot = {
      lifetimeRevenue: totals.lifetime,
      lifetimeExpenses: totals.expenses,
      customers: customers ?? 0,
      autonomy: clampAutonomy(company.autonomy),
      completedTasks: taskDone ?? 0,
    };
    const milestones = COMPANY_MILESTONES.map((m) => ({
      level: m.level,
      key: m.key,
      label: m.label,
      reached: m.test(snapshot),
    }));

    const spentToday = await auraSpentToday(context.supabase, company.id);

    return {
      companyId: company.id as string,
      name: company.name as string,
      slug,
      autonomy: clampAutonomy(company.autonomy),
      dailyAuraBudget: Number(company.daily_aura_budget ?? 120),
      auraSpentToday: spentToday,
      reputation,
      totals,
      agentsActive: agentCount ?? 0,
      tasksCompleted: taskDone ?? 0,
      customers: customers ?? 0,
      memory: {
        facts: knowledge ?? 0,
        decisions: decisions ?? 0,
        interactions: connected,
      },
      milestones,
      recent: (
        (ledger ?? []) as {
          kind: string;
          amount_usdc: number;
          description: string | null;
          created_at: string;
          status: string;
          source: string;
        }[]
      ).slice(0, 12),
      feeSplit: { owner: 82, aura: 10, compute: 8 },
    };
  });

/** Founder mission → multi-agent tasks + optional worker kick. */
export const dispatchMission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { mission: string }) => {
    const mission = input.mission?.trim().slice(0, 500);
    if (!mission || mission.length < 8)
      throw new Error("Describe the mission (at least 8 characters).");
    return { mission };
  })
  .handler(async ({ data, context }) => {
    const company = await ownedCompany(asDb(context.supabase), context.userId);

    // Revenue outcomes → plan a Revenue Mission (founder must START; no auto-exec)
    const { isRevenueMissionGoal, createRevenueMissionCore } =
      await import("@/lib/revenue-mission.functions");
    if (isRevenueMissionGoal(data.mission)) {
      const mission = await createRevenueMissionCore(context.supabase, context.userId, {
        goal: data.mission,
      });
      const agents = Object.keys(mission.agents_status || {});
      return {
        mission: data.mission,
        activated: agents.map((agent) => ({
          agent,
          taskId: mission.id,
          status: "planned",
        })),
        status: "planned",
        overBudget: false,
        worker: { ok: true, tasksProcessed: 0 },
        shareText: `Revenue mission planned on Aura OS: "${data.mission.slice(0, 80)}" — target ${mission.target_usdc} (projected, not earned).`,
        revenueMission: {
          id: mission.id,
          status: mission.status,
          targetUsdc: mission.target_usdc,
          plan: mission.plan,
          projected: mission.projected,
          missionNumber: mission.mission_number,
        },
      };
    }

    // Lead/outreach/website goals → real Akquise tool pipeline (not LLM theater)
    const { isAkquiseMission, runAkquiseForMission } = await import("@/lib/akquise.functions");
    if (isAkquiseMission(data.mission)) {
      const akquise = await runAkquiseForMission(
        context.supabase,
        company.id as string,
        data.mission,
      );
      const names = akquise.agents;
      return {
        mission: data.mission,
        activated: names.map((agent) => ({
          agent,
          taskId: akquise.campaignId,
          status: akquise.status === "complete" ? "completed" : akquise.status,
        })),
        status: akquise.status,
        overBudget: false,
        worker: { ok: akquise.status === "complete", tasksProcessed: akquise.added },
        shareText: akquise.shareText,
        akquise: {
          campaignId: akquise.campaignId,
          added: akquise.added,
          scanned: akquise.scanned,
          auraSpent: akquise.auraSpent,
          verify: akquise.verify,
          template: akquise.template,
        },
      };
    }

    const names = agentsForMission(data.mission);
    const spent = await auraSpentToday(context.supabase, company.id);
    const budget = Number(company.daily_aura_budget ?? 120);
    const projected = spent + names.length * TASK_COST;
    const over = projected > budget && clampAutonomy(company.autonomy) >= 2;

    const status = taskStatusForAutonomy({
      autonomy: company.autonomy,
      founderApproved: true,
      overDailyBudget: over,
    });

    const created: { agent: string; taskId: string; status: string }[] = [];

    for (const name of names) {
      const def = AGENT_ROSTER[name];
      if (!def) continue;
      let agentId: string | null = null;
      const { data: existing } = await asDb(context.supabase)
        .from("agents")
        .select("id, paused")
        .eq("company_id", company.id)
        .eq("name", name)
        .maybeSingle();
      if (existing?.paused) continue;
      if (existing?.id) agentId = existing.id;
      else {
        const { data: hired } = await asDb(context.supabase)
          .from("agents")
          .insert({
            company_id: company.id,
            name: def.name,
            role: def.role,
            avatar: def.avatar,
            accent: def.accent,
            status: "active",
            current_task: "Just hired — awaiting first brief",
            health: 100,
            performance: 0,
            activity: 0,
            revenue_generated: 0,
            credits_used: 0,
            tasks_completed: 0,
            lessons_count: 0,
            memory: def.memory,
            paused: false,
          })
          .select("id")
          .single();
        agentId = hired?.id ?? null;
      }
      if (!agentId) continue;

      const { data: task } = await asDb(context.supabase)
        .from("tasks")
        .insert({
          company_id: company.id,
          agent_id: agentId,
          title: `${name}: ${data.mission.slice(0, 72)}`,
          description: `Company mission from founder:\n\n${data.mission}\n\nCoordinate with other activated employees. Do not invent revenue. File a concrete result.`,
          status,
          priority: "high",
          roi: 0,
          progress: 0,
        })
        .select("id")
        .single();

      if (task?.id) created.push({ agent: name, taskId: task.id as string, status });
    }

    await asDb(context.supabase)
      .from("activity_events")
      .insert({
        company_id: company.id,
        kind: "mission",
        message: `Mission launched: "${data.mission.slice(0, 100)}" · ${created.length} employees tasked`,
      });

    let worker: { ok: boolean; tasksProcessed?: number } | null = null;
    if (created.some((c) => c.status === "queued")) {
      try {
        const { processTaskQueue } = await import("@/lib/task-worker.server");
        const res = await processTaskQueue(Math.min(8, created.length), company.id);
        worker = { ok: true, tasksProcessed: res.processed };
      } catch {
        worker = { ok: false };
      }
    }

    return {
      mission: data.mission,
      activated: created,
      status,
      overBudget: over,
      worker,
      shareText: `Mission on Aura OS: "${data.mission.slice(0, 80)}" — ${created.length} AI employees activated.`,
    };
  });

export const setAgentPaused = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { agentId: string; paused: boolean }) => input)
  .handler(async ({ data, context }) => {
    const company = await ownedCompany(asDb(context.supabase), context.userId);
    const { error } = await asDb(context.supabase)
      .from("agents")
      .update({
        paused: data.paused,
        status: data.paused ? "idle" : "active",
        current_task: data.paused ? "Paused by founder" : "Standing by",
      })
      .eq("id", data.agentId)
      .eq("company_id", company.id);
    if (error) throw error;
    return { ok: true };
  });

export const updateCompanyEconomySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { autonomy?: number; dailyAuraBudget?: number }) => input)
  .handler(async ({ data, context }) => {
    const company = await ownedCompany(asDb(context.supabase), context.userId);
    const autonomy = data.autonomy != null ? clampAutonomy(data.autonomy) : undefined;
    const daily_aura_budget =
      data.dailyAuraBudget != null
        ? Math.min(2000, Math.max(12, Number(data.dailyAuraBudget)))
        : undefined;
    const { error } = await asDb(context.supabase)
      .from("companies")
      .update({
        ...(autonomy != null ? { autonomy } : {}),
        ...(daily_aura_budget != null ? { daily_aura_budget } : {}),
      })
      .eq("id", company.id);
    if (error) throw error;
    return { ok: true as const, autonomy, daily_aura_budget };
  });

export const getPublicCompany = createServerFn({ method: "GET" })
  .validator((input: { slug: string }) => {
    const slug = input.slug
      ?.toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 64);
    if (!slug) throw new Error("slug required");
    return { slug };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = asDb(supabaseAdmin);
    const { data: company } = await admin
      .from("companies")
      .select("id, name, slug, tagline, reputation, autonomy, created_at, emoji")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!company) return null;

    const companyId = company.id as string;
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: ledger } = await asDb(supabaseAdmin)
      .from("company_ledger_entries")
      .select("kind, amount_usdc, status")
      .eq("company_id", companyId)
      .eq("status", "settled");
    const totals = totalsFromLedger(
      (ledger ?? []) as { kind: string; amount_usdc: number; status: string }[],
    );

    const [
      { count: agentsCount },
      { count: tasksCompleted },
      { count: actions24h },
      { data: progress },
      { data: agentRows },
      { data: events },
      { data: posts },
      { data: missions },
    ] = await Promise.all([
      asDb(supabaseAdmin)
        .from("agents")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId),
      asDb(supabaseAdmin)
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .in("status", ["completed", "done"]),
      asDb(supabaseAdmin)
        .from("activity_events")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("created_at", dayAgo),
      asDb(supabaseAdmin)
        .from("founder_progress")
        .select("xp, level, seat_number")
        .eq("company_id", companyId)
        .maybeSingle(),
      asDb(supabaseAdmin)
        .from("agents")
        .select("name, role, status, avatar, accent, current_task, performance, tasks_completed")
        .eq("company_id", companyId)
        .order("name")
        .limit(12),
      asDb(supabaseAdmin)
        .from("activity_events")
        .select("id, kind, message, value, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(24),
      asDb(supabaseAdmin)
        .from("channel_posts")
        .select("id, provider, body, status, published_at, external_url, agent_name")
        .eq("company_id", companyId)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(8),
      asDb(supabaseAdmin)
        .from("revenue_missions")
        .select("id, goal_text, status, share_slug, share_public, projected, target_usdc")
        .eq("company_id", companyId)
        .eq("share_public", true)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    return {
      name: company.name as string,
      slug: company.slug as string,
      tagline: (company.tagline as string | null) ?? null,
      emoji: (company.emoji as string | null) ?? "◎",
      reputation: Number(company.reputation ?? 50),
      autonomy: clampAutonomy(company.autonomy),
      level: Number(progress?.level ?? 1),
      seat: progress?.seat_number ?? null,
      agents: agentsCount ?? 0,
      tasksCompleted: tasksCompleted ?? 0,
      actions24h: actions24h ?? 0,
      revenue: totals.lifetime,
      profit: totals.profit,
      createdAt: company.created_at as string,
      roster: (
        (agentRows ?? []) as Array<{
          name: string | null;
          role: string | null;
          status: string | null;
          avatar: string | null;
          accent: string | null;
          current_task: string | null;
          performance: number | null;
          tasks_completed: number | null;
        }>
      ).map((a) => ({
        name: String(a.name ?? "Agent"),
        role: String(a.role ?? ""),
        status: String(a.status ?? "idle"),
        avatar: String(a.avatar ?? "◎"),
        accent: String(a.accent ?? "cyan"),
        currentTask: a.current_task ?? null,
        performance: Number(a.performance ?? 0),
        tasksCompleted: Number(a.tasks_completed ?? 0),
      })),
      receipts: (
        (events ?? []) as Array<{
          id: string;
          kind: string | null;
          message: string | null;
          value: number | null;
          created_at: string;
        }>
      ).map((e) => ({
        id: String(e.id),
        kind: String(e.kind ?? "system"),
        message: String(e.message ?? ""),
        value: e.value != null ? Number(e.value) : null,
        createdAt: String(e.created_at),
      })),
      posts: (
        (posts ?? []) as Array<{
          id: string;
          provider: string | null;
          body: string | null;
          published_at: string | null;
          external_url: string | null;
          agent_name: string | null;
        }>
      ).map((p) => ({
        id: String(p.id),
        provider: String(p.provider ?? ""),
        body: String(p.body ?? ""),
        publishedAt: p.published_at ?? null,
        externalUrl: p.external_url ?? null,
        agentName: p.agent_name ?? null,
      })),
      missions: (
        (missions ?? []) as Array<{
          id: string;
          goal_text: string | null;
          status: string | null;
          share_slug: string | null;
          share_public: boolean | null;
          projected: { revenue_usdc?: number } | null;
          target_usdc: number | null;
        }>
      ).map((m) => {
        const projected = m.projected ?? {};
        return {
          id: String(m.id),
          goal: String(m.goal_text ?? ""),
          status: String(m.status ?? ""),
          progress: 0,
          shareSlug: m.share_slug ?? null,
          targetUsdc: Number(m.target_usdc ?? 0),
          actualRevenue: Number(projected.revenue_usdc ?? 0),
        };
      }),
      token: await (async () => {
        const { getLiveCompanyToken } = await import("@/lib/company-token.functions");
        return getLiveCompanyToken(admin, companyId);
      })(),
    };
  });

export const listWorkJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await asDb(context.supabase)
      .from("work_jobs")
      .select("*")
      .in("status", ["open", "accepted", "delivered"])
      .order("created_at", { ascending: false })
      .limit(40);
    return (data ?? []) as Array<Record<string, string | number | null>>;
  });

export const acceptWorkJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { jobId: string }) => input)
  .handler(async ({ data, context }) => {
    const company = await ownedCompany(asDb(context.supabase), context.userId);
    const { data: job } = await asDb(context.supabase)
      .from("work_jobs")
      .select("*")
      .eq("id", data.jobId)
      .eq("status", "open")
      .maybeSingle();
    if (!job) throw new Error("Job not available");

    const { error } = await asDb(context.supabase)
      .from("work_jobs")
      .update({
        status: "accepted",
        accepted_company_id: company.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    if (error) throw error;

    const atlas = await asDb(context.supabase)
      .from("agents")
      .select("id")
      .eq("company_id", company.id)
      .eq("name", "Atlas")
      .maybeSingle();

    await asDb(context.supabase)
      .from("tasks")
      .insert({
        company_id: company.id,
        agent_id: atlas.data?.id ?? null,
        title: `Job: ${job.title}`,
        description: `${job.brief}\n\nBudget: $${job.budget_usdc} USDC. Deliver a concrete result for founder review.`,
        status: "pending_approval",
        priority: "high",
        roi: Number(job.budget_usdc) || 0,
        progress: 0,
      });

    await asDb(context.supabase)
      .from("activity_events")
      .insert({
        company_id: company.id,
        kind: "job",
        message: `Accepted job: ${job.title}`,
        value: Number(job.budget_usdc),
      });

    return { ok: true as const, jobId: job.id as string };
  });

export const deliverWorkJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { jobId: string; resultSummary: string }) => {
    if (!input.resultSummary?.trim()) throw new Error("Result summary required");
    return { jobId: input.jobId, resultSummary: input.resultSummary.trim().slice(0, 2000) };
  })
  .handler(async ({ data, context }) => {
    const company = await ownedCompany(asDb(context.supabase), context.userId);
    const { data: job } = await asDb(context.supabase)
      .from("work_jobs")
      .select("*")
      .eq("id", data.jobId)
      .eq("accepted_company_id", company.id)
      .eq("status", "accepted")
      .maybeSingle();
    if (!job) throw new Error("Job not found");

    const budget = Number(job.budget_usdc) || 0;
    const feeBps = Number(job.platform_fee_bps) || 1000;
    const compute = Number(job.compute_estimate_usdc) || 0;
    const fee = (budget * feeBps) / 10_000;
    const earnings = Math.max(0, budget - fee - compute);

    await asDb(context.supabase)
      .from("work_jobs")
      .update({
        status: "paid",
        result_summary: data.resultSummary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    const rows = [
      {
        company_id: company.id,
        kind: "revenue",
        amount_usdc: budget,
        status: "settled",
        source: "job",
        source_id: job.id,
        description: `Job revenue: ${job.title}`,
      },
      {
        company_id: company.id,
        kind: "fee",
        amount_usdc: -fee,
        status: "settled",
        source: "job",
        source_id: job.id,
        description: `Aura platform fee (${feeBps / 100}%)`,
      },
      {
        company_id: company.id,
        kind: "compute",
        amount_usdc: -compute,
        amount_aura: 0,
        status: "settled",
        source: "job",
        source_id: job.id,
        description: "Estimated compute",
      },
    ];
    await asDb(context.supabase).from("company_ledger_entries").insert(rows);

    await asDb(context.supabase)
      .from("activity_events")
      .insert({
        company_id: company.id,
        kind: "revenue",
        message: `Job paid: ${job.title} · company earnings $${earnings.toFixed(2)}`,
        value: earnings,
      });

    return {
      ok: true as const,
      budget,
      fee,
      compute,
      earnings,
    };
  });

export const publishAgentListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      name: string;
      role: string;
      category: string;
      summary: string;
      instructions: string;
      skills: string[];
      priceAura: number;
    }) => {
      if (!input.name?.trim() || !input.summary?.trim())
        throw new Error("Name and summary required");
      return {
        name: input.name.trim().slice(0, 80),
        role: input.role.trim().slice(0, 80) || "Specialist",
        category: input.category.trim().slice(0, 40) || "Operations",
        summary: input.summary.trim().slice(0, 400),
        instructions: (input.instructions ?? "").trim().slice(0, 4000),
        skills: (input.skills ?? []).slice(0, 12),
        priceAura: Math.max(0, Math.min(50_000, Math.floor(input.priceAura || 0))),
      };
    },
  )
  .handler(async ({ data, context }) => {
    const company = await ownedCompany(asDb(context.supabase), context.userId);
    const { data: row, error } = await asDb(context.supabase)
      .from("agent_listings")
      .insert({
        creator_company_id: company.id,
        creator_user_id: context.userId,
        name: data.name,
        role: data.role,
        category: data.category,
        summary: data.summary,
        instructions: data.instructions,
        skills: data.skills,
        price_aura: data.priceAura,
        status: "published",
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id as string };
  });

export const listAgentListings = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = asDb(supabaseAdmin);
  const { data } = await admin
    .from("agent_listings")
    .select(
      "id, name, role, category, summary, price_aura, price_usdc, pricing_model, rating, tasks_completed, success_rate, companies_using, revenue_aura, creator_company_id, status",
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as Array<Record<string, string | number | null>>;
});

export const hirePublishedAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { listingId: string }) => input)
  .handler(async ({ data, context }) => {
    const company = await ownedCompany(asDb(context.supabase), context.userId);
    const { data: listing } = await asDb(context.supabase)
      .from("agent_listings")
      .select("*")
      .eq("id", data.listingId)
      .eq("status", "published")
      .maybeSingle();
    if (!listing) throw new Error("Listing not found");
    if (listing.creator_company_id === company.id) {
      throw new Error("You already own this agent listing.");
    }

    const price = Number(listing.price_aura) || 0;
    if (price > 0) {
      const { data: sub } = await asDb(context.supabase)
        .from("subscriptions")
        .select("id, tokens_remaining")
        .eq("company_id", company.id)
        .maybeSingle();
      if (!sub || (sub.tokens_remaining ?? 0) < price) {
        throw new Error(`Need ${price} AURA to hire this agent.`);
      }
      await asDb(context.supabase)
        .from("subscriptions")
        .update({ tokens_remaining: sub.tokens_remaining - price })
        .eq("id", sub.id);
      await asDb(context.supabase)
        .from("token_ledger")
        .insert({
          company_id: company.id,
          kind: "spend",
          amount: -price,
          reason: `Hired agent · ${listing.name}`,
        });

      const royalty = Math.floor((price * (Number(listing.royalty_bps) || 7000)) / 10_000);
      if (royalty > 0) {
        const { data: creatorSub } = await asDb(context.supabase)
          .from("subscriptions")
          .select("id, tokens_remaining")
          .eq("company_id", listing.creator_company_id)
          .maybeSingle();
        if (creatorSub) {
          await asDb(context.supabase)
            .from("subscriptions")
            .update({ tokens_remaining: (creatorSub.tokens_remaining ?? 0) + royalty })
            .eq("id", creatorSub.id);
        }
        await asDb(context.supabase)
          .from("company_ledger_entries")
          .insert({
            company_id: listing.creator_company_id,
            kind: "royalty",
            amount_aura: royalty,
            amount_usdc: 0,
            status: "settled",
            source: "agent_hire",
            source_id: listing.id,
            description: `Royalty from ${listing.name} hire`,
          });
        await asDb(context.supabase)
          .from("token_ledger")
          .insert({
            company_id: listing.creator_company_id,
            kind: "grant",
            amount: royalty,
            reason: `Royalty · ${listing.name}`,
          });
      }
    }

    const { data: agent } = await asDb(context.supabase)
      .from("agents")
      .insert({
        company_id: company.id,
        name: String(listing.name).slice(0, 40),
        role: listing.role,
        avatar: "◇",
        accent: "primary",
        status: "active",
        current_task: "Just hired — awaiting first brief",
        health: 100,
        performance: 0,
        activity: 0,
        revenue_generated: 0,
        credits_used: 0,
        tasks_completed: 0,
        lessons_count: 0,
        memory: listing.instructions || listing.summary,
        paused: false,
      })
      .select("id")
      .single();

    await asDb(context.supabase)
      .from("agent_hires")
      .upsert(
        {
          listing_id: listing.id,
          hirer_company_id: company.id,
          agent_id: agent?.id,
          price_aura: price,
          royalty_aura: Math.floor((price * (Number(listing.royalty_bps) || 7000)) / 10_000),
        },
        { onConflict: "listing_id,hirer_company_id" },
      );

    await asDb(context.supabase)
      .from("agent_listings")
      .update({
        companies_using: Number(listing.companies_using ?? 0) + 1,
        revenue_aura: Number(listing.revenue_aura ?? 0) + price,
        updated_at: new Date().toISOString(),
      })
      .eq("id", listing.id);

    return { ok: true as const, agentId: agent?.id as string };
  });

export const getMyCreatorStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const company = await ownedCompany(asDb(context.supabase), context.userId);
    const { data: listings } = await asDb(context.supabase)
      .from("agent_listings")
      .select("*")
      .eq("creator_company_id", company.id);
    const list = (listings ?? []) as {
      name: string;
      companies_using: number;
      tasks_completed: number;
      revenue_aura: number;
      status: string;
    }[];
    const royalties = list.reduce((s, l) => s + Number(l.revenue_aura || 0) * 0.7, 0);
    return {
      listings: list,
      companies: list.reduce((s, l) => s + (l.companies_using || 0), 0),
      tasks: list.reduce((s, l) => s + (l.tasks_completed || 0), 0),
      revenueAura: list.reduce((s, l) => s + Number(l.revenue_aura || 0), 0),
      royaltiesAura: Math.floor(royalties),
    };
  });
