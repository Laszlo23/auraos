/** Revenue Mission planning / learning helpers (server-only). */

import { askAi, parseJsonBlock } from "@/lib/akquise.server";
import { AGENT_ROSTER } from "@/lib/agent-roster";
import { agentsForMission } from "@/lib/company-economy";
import { TASK_COST } from "@/lib/task-cost";

export type MissionStep = {
  order: number;
  title: string;
  agent: string;
  kind: "prospect" | "task" | "analyze" | "outreach" | "build";
  detail: string;
};

export type MissionPlan = {
  offer: string;
  price_usdc: number;
  customers_needed: number;
  steps: MissionStep[];
  summary: string;
};

export type MissionProjected = {
  cost_aura: number;
  cost_usdc: number;
  revenue_usdc: number;
  profit_usdc: number;
  label: "projected";
};

export type NextBestAction = {
  title: string;
  detail: string;
  assignee: string;
  kind: "prospect" | "task" | "analyze" | "outreach" | "build";
  expected_cost_aura: number;
  expected_upside_usdc: number;
  confidence: number;
  status: "ready" | "pending_approval" | "queued" | "done";
  label: "projected";
};

/** Goals that should become Revenue Missions (plan first, founder starts). */
export function isRevenueMissionGoal(goal: string): boolean {
  const g = goal.toLowerCase();
  // Explicit money / outcome language (not bare lead counts like "find 20 companies")
  if (
    /\$|€|£|usdc|\busd\b|\beur\b|revenue|earn|make\s+money|sell(?:ing)?|profit|mrr|arr|income|turnover|umsatz|verdienst|make\s+[\d.,]+\s*(k|m)?|hit\s+[\d.,]+/.test(
      g,
    )
  ) {
    return true;
  }
  return /(?:€|\$|£|usdc|usd|eur)\s*[\d.,]+|[\d.,]+\s*(k|m)?\s*(?:€|\$|£|usdc|usd|eur)/i.test(
    goal,
  );
}

/** Parse a numeric target from natural language; store as target_usdc (no FX). */
export function parseTargetAmount(goal: string): number {
  const m =
    goal.match(/(?:€|\$|£|usdc|usd|eur)\s*([\d.,]+)\s*(k|m)?/i) ||
    goal.match(/([\d.,]+)\s*(k|m)?\s*(?:€|\$|£|usdc|usd|eur)/i) ||
    goal.match(/(?:make|earn|raise|hit|reach)\s+([\d.,]+)\s*(k|m)?/i);
  if (!m) return 1000;
  let n = parseFloat(m[1]!.replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return 1000;
  const mult = (m[2] || "").toLowerCase();
  if (mult === "k") n *= 1000;
  if (mult === "m") n *= 1_000_000;
  return Math.round(n);
}

export function makeShareSlug(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export async function planRevenueMissionWithLlm(opts: {
  goal: string;
  targetUsdc: number;
  industry?: string | null;
  location?: string | null;
  risk?: string;
}): Promise<{ plan: MissionPlan; projected: MissionProjected; agents: string[] }> {
  const roster = Object.keys(AGENT_ROSTER).join(", ");
  const system = `You are Atlas, CEO of an AI company on Aura OS.
Return ONLY JSON for a revenue mission plan. Honesty rules:
- Never invent settled revenue.
- projected numbers are estimates only.
- Use named employees from: ${roster}.
- Prefer prospect steps when leads/outreach are needed.
- 6–10 concrete steps with agent roles.
Schema:
{
  "offer": string,
  "price_usdc": number,
  "customers_needed": number,
  "summary": string,
  "steps": [{"order":1,"title":"","agent":"Atlas","kind":"prospect|task|analyze|outreach|build","detail":""}],
  "projected": {"cost_aura":number,"cost_usdc":number,"revenue_usdc":number,"profit_usdc":number}
}`;

  const user = `Goal: ${opts.goal}
Target amount (USDC units, display-only if € was typed): ${opts.targetUsdc}
Industry: ${opts.industry || "unspecified"}
Location: ${opts.location || "unspecified"}
Risk: ${opts.risk || "medium"}`;

  const fallbackAgents = agentsForMission(opts.goal);
  const fallbackSteps: MissionStep[] = fallbackAgents.map((agent, i) => ({
    order: i + 1,
    title: i === 0 ? "Build the go-to-market plan" : `Execute: ${agent}`,
    agent,
    kind: i === 1 && /lead|sales|outreach|website/.test(opts.goal.toLowerCase())
      ? "prospect"
      : "task",
    detail: `Contribute to: ${opts.goal.slice(0, 160)}`,
  }));

  const fallbackPlan: MissionPlan = {
    offer: opts.goal.slice(0, 120),
    price_usdc: Math.max(50, Math.round(opts.targetUsdc / 10)),
    customers_needed: 10,
    summary: "Plan drafted from your goal. Review steps, then start when ready.",
    steps: fallbackSteps.length
      ? fallbackSteps
      : [
          {
            order: 1,
            title: "Coordinate strategy",
            agent: "Atlas",
            kind: "task",
            detail: opts.goal,
          },
        ],
  };

  const fallbackProjected: MissionProjected = {
    cost_aura: fallbackPlan.steps.length * TASK_COST,
    cost_usdc: 0,
    revenue_usdc: opts.targetUsdc,
    profit_usdc: opts.targetUsdc,
    label: "projected",
  };

  try {
    const raw = await askAi(system, user);
    const parsed = parseJsonBlock<{
      offer?: string;
      price_usdc?: number;
      customers_needed?: number;
      summary?: string;
      steps?: MissionStep[];
      projected?: Partial<MissionProjected>;
    }>(raw, {});

    const steps = (parsed.steps ?? fallbackPlan.steps)
      .filter((s) => s && s.title && s.agent)
      .slice(0, 10)
      .map((s, i) => ({
        order: Number(s.order) || i + 1,
        title: String(s.title).slice(0, 120),
        agent: AGENT_ROSTER[s.agent] ? s.agent : "Atlas",
        kind: (["prospect", "task", "analyze", "outreach", "build"].includes(s.kind)
          ? s.kind
          : "task") as MissionStep["kind"],
        detail: String(s.detail || s.title).slice(0, 400),
      }));

    const plan: MissionPlan = {
      offer: String(parsed.offer || fallbackPlan.offer).slice(0, 200),
      price_usdc: Math.max(1, Number(parsed.price_usdc) || fallbackPlan.price_usdc),
      customers_needed: Math.max(1, Number(parsed.customers_needed) || 10),
      summary: String(parsed.summary || fallbackPlan.summary).slice(0, 400),
      steps: steps.length ? steps : fallbackPlan.steps,
    };

    const rev = Math.max(0, Number(parsed.projected?.revenue_usdc) || opts.targetUsdc);
    const costAura = Math.max(
      plan.steps.length * TASK_COST,
      Number(parsed.projected?.cost_aura) || plan.steps.length * TASK_COST,
    );
    const costUsdc = Math.max(0, Number(parsed.projected?.cost_usdc) || 0);
    const projected: MissionProjected = {
      cost_aura: costAura,
      cost_usdc: costUsdc,
      revenue_usdc: rev,
      profit_usdc: Math.max(0, Number(parsed.projected?.profit_usdc) || rev - costUsdc),
      label: "projected",
    };

    const agents = Array.from(new Set(plan.steps.map((s) => s.agent)));
    if (!agents.includes("Atlas")) agents.unshift("Atlas");
    return { plan, projected, agents };
  } catch {
    return { plan: fallbackPlan, projected: fallbackProjected, agents: fallbackAgents };
  }
}

export async function proposeNextBestActionWithLlm(opts: {
  goal: string;
  plan: MissionPlan;
  status: string;
  actualRevenue: number;
  targetUsdc: number;
  recentEvents: string[];
}): Promise<NextBestAction> {
  const progress =
    opts.targetUsdc > 0 ? Math.min(1, opts.actualRevenue / opts.targetUsdc) : 0;
  const nextStep =
    opts.plan.steps.find((s) => s.order >= Math.floor(progress * opts.plan.steps.length) + 1) ||
    opts.plan.steps[0];

  const fallback: NextBestAction = {
    title: nextStep?.title || "Continue mission work",
    detail: nextStep?.detail || opts.goal,
    assignee: nextStep?.agent || "Atlas",
    kind: nextStep?.kind || "task",
    expected_cost_aura: TASK_COST,
    expected_upside_usdc: Math.max(0, opts.targetUsdc - opts.actualRevenue) * 0.1,
    confidence: 0.55,
    status: "ready",
    label: "projected",
  };

  try {
    const raw = await askAi(
      `You propose the single next best action for a revenue mission.
Return ONLY JSON:
{"title":"","detail":"","assignee":"Atlas","kind":"prospect|task|analyze|outreach|build","expected_cost_aura":20,"expected_upside_usdc":100,"confidence":0.6}
Honesty: upside is projected. Never claim settled revenue.`,
      `Goal: ${opts.goal}
Status: ${opts.status}
Actual settled revenue USDC: ${opts.actualRevenue}
Target USDC: ${opts.targetUsdc}
Plan steps: ${JSON.stringify(opts.plan.steps).slice(0, 2000)}
Recent: ${opts.recentEvents.slice(0, 8).join(" | ")}`,
    );
    const p = parseJsonBlock<Partial<NextBestAction>>(raw, {});
    return {
      title: String(p.title || fallback.title).slice(0, 140),
      detail: String(p.detail || fallback.detail).slice(0, 400),
      assignee: AGENT_ROSTER[p.assignee || ""] ? String(p.assignee) : fallback.assignee,
      kind: (["prospect", "task", "analyze", "outreach", "build"].includes(String(p.kind))
        ? p.kind
        : fallback.kind) as NextBestAction["kind"],
      expected_cost_aura: Math.max(5, Number(p.expected_cost_aura) || TASK_COST),
      expected_upside_usdc: Math.max(0, Number(p.expected_upside_usdc) || fallback.expected_upside_usdc),
      confidence: Math.min(0.95, Math.max(0.2, Number(p.confidence) || 0.55)),
      status: "ready",
      label: "projected",
    };
  } catch {
    return fallback;
  }
}

export function emptyAgentsStatus(agents: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of agents) out[a] = "waiting";
  if (agents[0]) out[agents[0]!] = "coordinating";
  return out;
}
