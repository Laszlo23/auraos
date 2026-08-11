/**
 * Real task execution: plan → (optional) web search → synthesize.
 * Writes live steps so founders see proof the agent is working.
 */

import { formatMemoryContext, mergeAgentMemory } from "@/lib/agent-memory";
import { TASK_COST } from "@/lib/task-cost";
import { agentJson } from "@/lib/x402-ai";

export type TaskStep = {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "failed" | "skipped";
  detail?: string;
  at?: string;
};

export type TaskArtifact = {
  plan: string[];
  sources: { url: string; title: string; snippet: string }[];
  searchQuery?: string;
  searched: boolean;
  searchSkippedReason?: string;
};

type LooseDb = {
  from: (table: string) => any;
};

function nowIso() {
  return new Date().toISOString();
}

function needsWebResearch(title: string, description: string | null): boolean {
  const t = `${title} ${description ?? ""}`.toLowerCase();
  return /research|search|find|look\s*up|competitor|market|lead|outreach|website|seo|news|price|benchmark|survey|prospect|customer|vendor|supplier|trend|analyze|analys/.test(
    t,
  );
}

async function persistSteps(
  db: LooseDb,
  taskId: string,
  steps: TaskStep[],
  progress: number,
  extra: Record<string, unknown> = {},
) {
  const { error } = await db
    .from("tasks")
    .update({
      steps,
      progress,
      ...extra,
    })
    .eq("id", taskId);
  // If steps column missing (migration not applied), still update progress/status
  if (error && /steps|artifact|schema cache|42703|PGRST204/i.test(error.message || "")) {
    const { steps: _s, artifact: _a, ...rest } = extra as Record<string, unknown> & {
      steps?: unknown;
      artifact?: unknown;
    };
    await db
      .from("tasks")
      .update({ progress, ...rest })
      .eq("id", taskId);
  } else if (error) {
    throw error;
  }
}

function markStep(
  steps: TaskStep[],
  id: string,
  status: TaskStep["status"],
  detail?: string,
): TaskStep[] {
  return steps.map((s) => {
    if (s.id !== id) return s;
    const next: TaskStep = { id: s.id, label: s.label, status, at: nowIso() };
    const d = detail ?? s.detail;
    if (d != null) next.detail = d;
    return next;
  });
}

/**
 * Execute a single queued/running task with visible steps and optional Firecrawl research.
 */
export async function executeTask(
  db: LooseDb,
  taskId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: task, error } = await db
    .from("tasks")
    .select("id, company_id, agent_id, title, description, status, progress, mission_id")
    .eq("id", taskId)
    .maybeSingle();
  if (error || !task) return { ok: false, error: error?.message || "Task not found" };
  if (task.status === "pending_approval") {
    return { ok: false, error: "Task still needs founder approval" };
  }
  if (task.status === "completed" || task.status === "done" || task.status === "failed") {
    return { ok: true };
  }

  const { requireAuraBalance, burnAuraHard, InsufficientAuraError } =
    await import("@/lib/aura-spend.server");
  try {
    await requireAuraBalance(db, task.company_id, TASK_COST);
  } catch (e) {
    if (e instanceof InsufficientAuraError) {
      await db
        .from("tasks")
        .update({
          status: "pending_approval",
          result: e.message,
        })
        .eq("id", task.id);
      return { ok: false, error: e.message };
    }
    throw e;
  }

  const { data: company } = await db
    .from("companies")
    .select("name, tagline, strategy, autonomy, daily_aura_budget")
    .eq("id", task.company_id)
    .maybeSingle();

  const autonomy = typeof company?.autonomy === "number" ? company.autonomy : 0;

  if (autonomy >= 2) {
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const { data: spentRows } = await db
      .from("company_ledger_entries")
      .select("amount_aura")
      .eq("company_id", task.company_id)
      .eq("kind", "compute")
      .gte("created_at", dayStart.toISOString());
    const spent = ((spentRows ?? []) as { amount_aura?: number }[]).reduce(
      (s, r) => s + Math.abs(Number(r.amount_aura ?? 0)),
      0,
    );
    const budget = Number(company?.daily_aura_budget ?? 120);
    if (spent + TASK_COST > budget) {
      await db
        .from("tasks")
        .update({
          status: "pending_approval",
          result: "Held — daily AURA budget would be exceeded. Approve to override.",
        })
        .eq("id", task.id);
      return { ok: false, error: "Over daily AURA budget" };
    }
  }

  let agentName = "Atlas";
  let agentRole = "Chief Executive";
  let agentMemory: string | null = null;
  let agentCredits = 0;
  let agentTasksCompleted = 0;
  let agentLessons = 0;

  if (task.agent_id) {
    const { data: agent } = await db
      .from("agents")
      .select("name, role, memory, credits_used, tasks_completed, lessons_count, paused")
      .eq("id", task.agent_id)
      .maybeSingle();
    if (agent?.paused) {
      await db
        .from("tasks")
        .update({
          status: "pending_approval",
          result: "Agent paused by founder — re-approve when ready.",
        })
        .eq("id", task.id);
      return { ok: false, error: "Agent paused" };
    }
    if (agent) {
      agentName = agent.name;
      agentRole = agent.role;
      agentMemory = agent.memory;
      agentCredits = agent.credits_used ?? 0;
      agentTasksCompleted = agent.tasks_completed ?? 0;
      agentLessons = agent.lessons_count ?? 0;
    }
  }

  const doSearch = needsWebResearch(task.title, task.description);

  let steps: TaskStep[] = [
    { id: "plan", label: "Build step-by-step plan", status: "pending" },
    {
      id: "search",
      label: doSearch ? "Web research" : "Skip web search (desk work)",
      status: "pending",
    },
    { id: "synthesize", label: "Write deliverable from evidence", status: "pending" },
    { id: "file", label: "File result + burn AURA", status: "pending" },
  ];

  await persistSteps(db, task.id, steps, 8, {
    status: "running",
    started_at: nowIso(),
    result: `${agentName} started — building a plan…`,
  });

  if (task.agent_id) {
    await db
      .from("agents")
      .update({
        current_task: task.title.slice(0, 180),
        activity: 0,
        status: "active",
      })
      .eq("id", task.agent_id);
  }

  await db.from("activity_events").insert({
    company_id: task.company_id,
    agent_id: task.agent_id,
    kind: "task",
    message: `${agentName} started: ${task.title}`.slice(0, 280),
  });

  const { data: knowledge } = await db
    .from("knowledge_items")
    .select("title, summary")
    .eq("company_id", task.company_id)
    .order("created_at", { ascending: false })
    .limit(12);

  let recentResults: { title: string; result: string | null }[] = [];
  if (task.agent_id) {
    const { data: recent } = await db
      .from("tasks")
      .select("title, result")
      .eq("company_id", task.company_id)
      .eq("agent_id", task.agent_id)
      .in("status", ["done", "completed"])
      .order("completed_at", { ascending: false })
      .limit(5);
    recentResults = (recent ?? []) as { title: string; result: string | null }[];
  }

  const mem0Query = `${task.title}\n${task.description ?? ""}`.slice(0, 400);
  let mem0Facts: string[] = [];
  try {
    const { searchMem0 } = await import("@/lib/mem0.server");
    const hits = await searchMem0(mem0Query, {
      companyId: task.company_id,
      agentId: task.agent_id,
      runId: task.id,
    });
    mem0Facts = hits.map((h) => h.memory);
  } catch {
    mem0Facts = [];
  }

  const memoryBlock = formatMemoryContext({
    memory: agentMemory,
    knowledge: (knowledge ?? []) as { title: string; summary: string | null }[],
    recentResults,
    mem0Facts,
  });

  const artifact: TaskArtifact = {
    plan: [],
    sources: [],
    searched: false,
  };

  // ——— Step 1: Plan ———
  steps = markStep(steps, "plan", "running", "Drafting approach…");
  await persistSteps(db, task.id, steps, 15, {
    result: `${agentName} · planning how to execute…`,
  });

  let searchQuery = `${task.title}`.slice(0, 120);
  try {
    const planJson = (await agentJson(
      `You are ${agentName}, ${agentRole}. Produce a short execution plan for a company task.
Return ONLY JSON:
{"plan":["step 1","step 2","step 3","step 4"],"needs_web":true|false,"search_query":"short web search query if needs_web"}
Honesty: do not invent facts or revenue. needs_web=true when research, competitors, leads, markets, or public data are required.`,
      [
        `Company: ${company?.name ?? "Unknown"} — ${company?.tagline ?? ""}`,
        `Strategy: ${company?.strategy ?? "Not set"}`,
        `Task: ${task.title}`,
        task.description ?? "",
        memoryBlock,
      ]
        .filter(Boolean)
        .join("\n\n"),
      "plan",
    )) as {
      plan?: string[];
      needs_web?: boolean;
      search_query?: string;
    };

    artifact.plan = Array.isArray(planJson.plan)
      ? planJson.plan.map((p) => String(p).slice(0, 160)).filter(Boolean).slice(0, 8)
      : [`Clarify "${task.title}"`, "Gather evidence", "Deliver concrete next action"];
    if (planJson.search_query) searchQuery = String(planJson.search_query).slice(0, 160);
    if (planJson.needs_web === false && !doSearch) {
      // keep skip
    } else if (planJson.needs_web === true) {
      steps = steps.map((s) =>
        s.id === "search"
          ? { ...s, label: "Web research", status: s.status }
          : s,
      );
    }

    steps = markStep(
      steps,
      "plan",
      "done",
      artifact.plan.map((p, i) => `${i + 1}. ${p}`).join(" · "),
    );
    await persistSteps(db, task.id, steps, 28, {
      artifact,
      result: `${agentName} · plan ready (${artifact.plan.length} steps)`,
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : "Plan failed";
    artifact.plan = [
      `Attempt: ${task.title}`,
      "Gather available context from memory",
      "Produce best-effort deliverable",
    ];
    steps = markStep(steps, "plan", "done", `Fallback plan (${reason.slice(0, 80)})`);
    await persistSteps(db, task.id, steps, 28, { artifact });
  }

  // ——— Step 2: Web research ———
  const shouldSearch =
    doSearch || steps.find((s) => s.id === "search")?.label === "Web research";

  if (shouldSearch) {
    steps = markStep(steps, "search", "running", `Searching: ${searchQuery}`);
    artifact.searchQuery = searchQuery;
    await persistSteps(db, task.id, steps, 40, {
      artifact,
      result: `${agentName} · web research: ${searchQuery}`,
    });

    try {
      const { firecrawlSearch, firecrawlScrape } = await import("@/lib/akquise.server");
      const pages = await firecrawlSearch(searchQuery, 5);
      artifact.searched = true;
      for (const page of pages.slice(0, 5)) {
        artifact.sources.push({
          url: page.url,
          title: page.title.slice(0, 120),
          snippet: page.markdown.replace(/\s+/g, " ").slice(0, 220),
        });
      }
      // Deep-read top result when useful
      if (pages[0]?.url) {
        const deep = await firecrawlScrape(pages[0].url);
        if (deep?.markdown) {
          artifact.sources[0] = {
            url: deep.url,
            title: deep.title.slice(0, 120),
            snippet: deep.markdown.replace(/\s+/g, " ").slice(0, 400),
          };
        }
      }
      steps = markStep(
        steps,
        "search",
        "done",
        artifact.sources.length
          ? `Found ${artifact.sources.length} sources`
          : "Search returned no pages",
      );
      await persistSteps(db, task.id, steps, 58, {
        artifact,
        result: `${agentName} · researched ${artifact.sources.length} sources`,
      });
    } catch (e) {
      const reason = e instanceof Error ? e.message : "Search unavailable";
      artifact.searchSkippedReason = reason;
      steps = markStep(steps, "search", "skipped", reason.slice(0, 160));
      await persistSteps(db, task.id, steps, 58, {
        artifact,
        result: `${agentName} · search skipped: ${reason.slice(0, 100)}`,
      });
    }
  } else {
    steps = markStep(steps, "search", "skipped", "Not a research task — using memory + plan");
    await persistSteps(db, task.id, steps, 50, { artifact });
  }

  // ——— Step 3: Synthesize ———
  steps = markStep(steps, "synthesize", "running", "Writing deliverable…");
  await persistSteps(db, task.id, steps, 72, {
    result: `${agentName} · synthesizing deliverable…`,
  });

  let resultText: string;
  let memoryUpdate: string | null = null;
  let durableFact: { title: string; summary: string } | null = null;

  const sourceBlock =
    artifact.sources.length > 0
      ? artifact.sources
          .map((s, i) => `[${i + 1}] ${s.title}\nURL: ${s.url}\n${s.snippet}`)
          .join("\n\n")
      : "(No live web sources — use only memory/plan. Say so honestly.)";

  try {
    const json = (await agentJson(
      `You are ${agentName}, ${agentRole} inside Aura OS. Complete the company task using the plan and evidence.
Rules:
- Cite source numbers [1], [2] when using web snippets.
- Never invent revenue, customers, or settlements.
- Be concrete and actionable.
Return JSON {"summary":"...","outcome":"...","next":"...","memory_update":"≤500 chars","knowledge_fact":null|{"title":"...","summary":"..."}}.`,
      [
        `Company: ${company?.name ?? "Unknown"} — ${company?.tagline ?? ""}`,
        `Strategy: ${company?.strategy ?? "Not set"}`,
        `Task: ${task.title}`,
        task.description ?? "",
        `Plan:\n${artifact.plan.map((p, i) => `${i + 1}. ${p}`).join("\n")}`,
        `Evidence:\n${sourceBlock}`,
        memoryBlock,
      ]
        .filter(Boolean)
        .join("\n\n"),
      "summary",
    )) as {
      summary?: string;
      outcome?: string;
      next?: string;
      memory_update?: string;
      knowledge_fact?: { title?: string; summary?: string } | null;
    };

    resultText =
      [json.summary, json.outcome, json.next].filter(Boolean).join(" · ") || "Done.";
    if (artifact.sources.length) {
      const cites = artifact.sources
        .slice(0, 3)
        .map((s) => s.url)
        .join(" · ");
      resultText = `${resultText}\n\nSources: ${cites}`;
    }
    memoryUpdate = typeof json.memory_update === "string" ? json.memory_update : null;
    if (
      json.knowledge_fact &&
      typeof json.knowledge_fact.title === "string" &&
      json.knowledge_fact.title.trim()
    ) {
      const summaryRaw = json.knowledge_fact.summary;
      const summaryText =
        typeof summaryRaw === "string"
          ? summaryRaw
          : summaryRaw == null
            ? resultText
            : String(summaryRaw);
      durableFact = {
        title: json.knowledge_fact.title.trim().slice(0, 120),
        summary: summaryText.trim().slice(0, 800),
      };
    }
    steps = markStep(steps, "synthesize", "done", "Deliverable drafted");
  } catch (llmErr) {
    const reason = llmErr instanceof Error ? llmErr.message : "LLM unavailable";
    steps = markStep(steps, "synthesize", "failed", reason.slice(0, 160));
    await persistSteps(db, task.id, steps, 0, {
      status: "failed",
      result: `Could not complete: ${reason}`.slice(0, 500),
      completed_at: nowIso(),
      artifact,
    });
    if (task.agent_id) {
      await db
        .from("agents")
        .update({
          current_task: "Standing by",
          activity: 0,
          status: "active",
        })
        .eq("id", task.agent_id);
    }
    await db.from("activity_events").insert({
      company_id: task.company_id,
      agent_id: task.agent_id,
      kind: "task",
      message: `${agentName} could not finish "${task.title}" — ${reason}`.slice(0, 280),
    });
    return { ok: false, error: reason };
  }

  await persistSteps(db, task.id, steps, 88, { artifact });

  // ——— Step 4: File + burn ———
  steps = markStep(steps, "file", "running", "Recording ledger + memory…");
  await persistSteps(db, task.id, steps, 92);

  try {
    await burnAuraHard(
      db,
      task.company_id,
      TASK_COST,
      `Task · ${task.title.slice(0, 80)}`,
    );
  } catch (e) {
    if (e instanceof InsufficientAuraError) {
      await db
        .from("tasks")
        .update({
          status: "failed",
          result: e.message,
          completed_at: nowIso(),
        })
        .eq("id", task.id);
      return { ok: false, error: e.message };
    }
    throw e;
  }

  await db.from("company_ledger_entries").insert({
    company_id: task.company_id,
    agent_id: task.agent_id,
    kind: "compute",
    amount_aura: TASK_COST,
    amount_usdc: 0,
    currency: "AURA",
    description: `Compute · ${task.title.slice(0, 120)}`,
    source: "task",
    source_id: task.id,
  });

  steps = markStep(steps, "file", "done", `${TASK_COST} AURA burned · result filed`);
  await persistSteps(db, task.id, steps, 100, {
    status: "completed",
    result: resultText.slice(0, 4000),
    completed_at: nowIso(),
    artifact,
  });

  await db.from("activity_events").insert({
    company_id: task.company_id,
    agent_id: task.agent_id,
    kind: "task",
    message: `${agentName} completed: ${task.title}${
      artifact.sources.length ? ` · ${artifact.sources.length} sources` : ""
    }`.slice(0, 280),
  });

  if (task.agent_id) {
    const nextMemory = mergeAgentMemory(agentMemory, memoryUpdate);
    const learned = Boolean(memoryUpdate?.trim());
    await db
      .from("agents")
      .update({
        current_task: "Standing by",
        credits_used: agentCredits + TASK_COST,
        memory: nextMemory,
        tasks_completed: agentTasksCompleted + 1,
        lessons_count: agentLessons + (learned ? 1 : 0),
        activity: 0,
        status: "active",
      })
      .eq("id", task.agent_id);

    if (learned && memoryUpdate) {
      void import("@/lib/mem0.server")
        .then(({ addMem0Lesson }) =>
          addMem0Lesson(memoryUpdate, {
            companyId: task.company_id,
            agentId: task.agent_id,
            runId: task.id,
          }),
        )
        .catch(() => undefined);
    }
  }

  if (durableFact) {
    await db.from("knowledge_items").insert({
      company_id: task.company_id,
      title: durableFact.title,
      summary: durableFact.summary,
      cluster: "Learned",
      source: agentName,
    });
  }

  const day = new Date().toISOString().slice(0, 10);
  const { data: metric } = await db
    .from("metrics")
    .select("id, tasks_completed")
    .eq("company_id", task.company_id)
    .eq("day", day)
    .maybeSingle();
  if (metric?.id) {
    await db
      .from("metrics")
      .update({ tasks_completed: (metric.tasks_completed ?? 0) + 1 })
      .eq("id", metric.id);
  } else {
    await db.from("metrics").insert({
      company_id: task.company_id,
      day,
      revenue: 0,
      visitors: 0,
      tasks_completed: 1,
      conversion: 0,
    });
  }

  // Mission learning + progress when linked
  if (task.mission_id) {
    await db.from("knowledge_items").insert({
      company_id: task.company_id,
      cluster: "Mission learning",
      title: `Task done · ${task.title.slice(0, 80)}`,
      summary: JSON.stringify({
        mission_id: task.mission_id,
        task_id: task.id,
        sources: artifact.sources.length,
        searched: artifact.searched,
        verified: true,
      }).slice(0, 2000),
      source: "task_execution",
    });
    const { onMissionTaskCompleted } = await import("@/lib/mission-progress.server");
    await onMissionTaskCompleted(db, {
      companyId: task.company_id,
      missionId: task.mission_id,
      agentName,
      taskTitle: task.title,
      summary: typeof artifact.plan?.[0] === "string" ? artifact.plan[0] : undefined,
    });
  }

  return { ok: true };
}
