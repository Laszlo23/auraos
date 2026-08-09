/** Revenue Mission planning / learning helpers (server-only). */

import { askAi, parseJsonBlock } from "@/lib/akquise.server";
import { AGENT_ROSTER } from "@/lib/agent-roster";
import { agentsForMission } from "@/lib/company-economy";
import {
  assessFeasibility,
  parseMissionBrief,
  type MissionFeasibility,
} from "@/lib/revenue-mission-brief";
import { TASK_COST } from "@/lib/task-cost";

export {
  assessFeasibility,
  inferChannelHint,
  parseBudgetAmount,
  parseMissionBrief,
  parseTargetAmount,
  parseTimelineDays,
  type MissionBrief,
  type MissionFeasibility,
} from "@/lib/revenue-mission-brief";

export type MissionStep = {
  order: number;
  title: string;
  agent: string;
  kind: "prospect" | "task" | "analyze" | "outreach" | "build";
  detail: string;
  /** When this step should finish relative to mission start (day 1 = first day). */
  day?: number;
};

export type FounderDecision = {
  id: string;
  question: string;
  suggestion: string;
  why: string;
};

export type MissionMilestone = {
  day: number;
  label: string;
  checkpoint: string;
};

export type MissionPlan = {
  offer: string;
  price_usdc: number;
  customers_needed: number;
  steps: MissionStep[];
  summary: string;
  /** Plain-English how the math works (price × customers = target). */
  path_to_target?: string;
  timeline_days?: number;
  capital_usdc?: number;
  assumptions?: string[];
  risks?: string[];
  feasibility?: MissionFeasibility;
  feasibility_note?: string;
  founder_decisions?: FounderDecision[];
  milestones?: MissionMilestone[];
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

export function makeShareSlug(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

function normalizeFeasibility(v: unknown): MissionFeasibility {
  if (v === "realistic" || v === "stretch" || v === "unlikely") return v;
  return "stretch";
}

export async function planRevenueMissionWithLlm(opts: {
  goal: string;
  targetUsdc: number;
  budgetUsdc?: number;
  timelineDays?: number;
  industry?: string | null;
  location?: string | null;
  risk?: string;
  channelHint?: string | null;
}): Promise<{ plan: MissionPlan; projected: MissionProjected; agents: string[] }> {
  const brief = parseMissionBrief(opts.goal);
  const budgetUsdc = opts.budgetUsdc ?? brief.budgetUsdc;
  const timelineDays = opts.timelineDays ?? brief.timelineDays;
  const channelHint = opts.channelHint ?? brief.channelHint;
  const feasibilitySeed = assessFeasibility({
    targetUsdc: opts.targetUsdc,
    budgetUsdc,
    timelineDays,
    channelHint,
  });

  const roster = Object.keys(AGENT_ROSTER).join(", ");
  const system = `You are Atlas, CEO of an AI company on Aura OS.
Return ONLY JSON for a revenue mission plan the founder will review before starting.

Honesty rules (non-negotiable):
- Never invent settled revenue. Projected numbers are estimates only.
- If capital × time cannot honestly reach the target (especially trading 10→1000 in a week), set feasibility to "unlikely", say so plainly in feasibility_note, and still propose a useful capped plan plus a parallel non-fantasy revenue path.
- Trading desk work must respect hard USDC caps, no leverage fantasy, no guaranteed returns.
- Use named employees from: ${roster}.
- 6–10 concrete steps with agent roles and a day offset (day 1..timeline).
- Include 2–4 founder_decisions the human must confirm (deposit amount, max daily loss, offer price, channel focus).
- Include weekly (or day) milestones the founder can check.

Schema:
{
  "offer": string,
  "price_usdc": number,
  "customers_needed": number,
  "summary": string (2–4 sentences, clear),
  "path_to_target": string (how price × customers or trading path relates to target — honest),
  "timeline_days": number,
  "capital_usdc": number,
  "assumptions": string[],
  "risks": string[],
  "feasibility": "realistic"|"stretch"|"unlikely",
  "feasibility_note": string,
  "founder_decisions": [{"id":"deposit","question":"","suggestion":"","why":""}],
  "milestones": [{"day":7,"label":"","checkpoint":""}],
  "steps": [{"order":1,"title":"","agent":"Atlas","kind":"prospect|task|analyze|outreach|build","detail":"","day":1}],
  "projected": {"cost_aura":number,"cost_usdc":number,"revenue_usdc":number,"profit_usdc":number}
}`;

  const user = `Goal: ${opts.goal}
Target amount (display units / USDC-equivalent): ${opts.targetUsdc}
Founder capital / deposit: ${budgetUsdc}
Timeline days: ${timelineDays}
Channel hint: ${channelHint || "unspecified"}
Industry: ${opts.industry || "unspecified"}
Location: ${opts.location || "unspecified"}
Risk preference: ${opts.risk || "medium"}
Pre-assessed feasibility: ${feasibilitySeed.feasibility} — ${feasibilitySeed.note}`;

  const fallbackAgents = agentsForMission(opts.goal);
  const isTrading = channelHint === "trading";
  const fallbackSteps: MissionStep[] = isTrading
    ? [
        {
          order: 1,
          title: "Confirm capital, caps, and honest expectation",
          agent: "Atlas",
          kind: "task",
          detail: `Founder confirms ${budgetUsdc} deposit, daily loss cap, and that ${opts.targetUsdc} in ${timelineDays}d is ${feasibilitySeed.feasibility}.`,
          day: 1,
        },
        {
          order: 2,
          title: "Draft a capped Base spot strategy",
          agent: "Quant",
          kind: "analyze",
          detail: "WETH/USDC only, hard notional and stop limits. No leverage. Backtest before arming.",
          day: 1,
        },
        {
          order: 3,
          title: "Backtest and present risk envelope",
          agent: "Quant",
          kind: "analyze",
          detail: "Show expected return range, max drawdown, and why the headline target may miss.",
          day: 2,
        },
        {
          order: 4,
          title: "Arm desk only inside founder caps",
          agent: "Ledger",
          kind: "task",
          detail: "Wire session limits; refuse sizing that can wipe the deposit in one day.",
          day: 2,
        },
        {
          order: 5,
          title: "Parallel offer if trading cannot hit target",
          agent: "Vela",
          kind: "outreach",
          detail: "Define a simple paid offer that can close the gap with real customers.",
          day: 3,
        },
        {
          order: 6,
          title: "Weekly checkpoint with founder",
          agent: "Atlas",
          kind: "task",
          detail: "Review PnL vs plan; adjust caps or pause — founder decides.",
          day: Math.min(timelineDays, 7),
        },
      ]
    : fallbackAgents.map((agent, i) => ({
        order: i + 1,
        title: i === 0 ? "Align on offer, price, and who buys" : `Execute: ${agent}`,
        agent,
        kind: (i === 1 && /lead|sales|outreach|website/.test(opts.goal.toLowerCase())
          ? "prospect"
          : "task") as MissionStep["kind"],
        detail: `Contribute to: ${opts.goal.slice(0, 160)}`,
        day: Math.min(timelineDays, 1 + i * 2),
      }));

  const price = Math.max(25, Math.round(opts.targetUsdc / 10));
  const customers = Math.max(1, Math.ceil(opts.targetUsdc / price));

  const fallbackPlan: MissionPlan = {
    offer: isTrading
      ? "Capped Base spot desk + parallel service offer if trading undershoots"
      : opts.goal.slice(0, 120),
    price_usdc: price,
    customers_needed: customers,
    summary: feasibilitySeed.note,
    path_to_target: isTrading
      ? `Trading ${budgetUsdc} alone cannot honestly guarantee ${opts.targetUsdc}. Path = capped desk learning + sell something real for the remainder.`
      : `Sell ~${customers}× at ~${price} to approach ${opts.targetUsdc}.`,
    timeline_days: timelineDays,
    capital_usdc: budgetUsdc,
    assumptions: [
      `Founder can deposit about ${budgetUsdc}.`,
      `Work happens over ~${timelineDays} days.`,
      "Projected revenue is not settled until ledger rows exist.",
    ],
    risks: [
      isTrading ? "Spot trading can lose most of the deposit." : "Offer may not convert without outreach.",
      "Timeline may slip if approvals or mailbox connects are missing.",
    ],
    feasibility: feasibilitySeed.feasibility,
    feasibility_note: feasibilitySeed.note,
    founder_decisions: [
      {
        id: "deposit",
        question: "How much capital should the company risk first?",
        suggestion: String(budgetUsdc),
        why: "Sets the hard ceiling for Quant / spend.",
      },
      {
        id: "daily_loss",
        question: "Max loss per day before we pause?",
        suggestion: String(Math.max(1, Math.round(budgetUsdc * 0.2))),
        why: "Stops a bad day from ending the mission.",
      },
      {
        id: "parallel_offer",
        question: "If trading cannot hit the target, may we sell a simple paid offer?",
        suggestion: "yes",
        why: "Keeps the mission honest when markets do not cooperate.",
      },
    ],
    milestones: [
      {
        day: Math.min(2, timelineDays),
        label: "Caps locked",
        checkpoint: "Deposit, daily loss, and strategy draft confirmed with you.",
      },
      {
        day: Math.min(7, timelineDays),
        label: "Week-1 review",
        checkpoint: "Actual PnL / pipeline vs projected; decide continue, cut, or pivot.",
      },
    ],
    steps: fallbackSteps.length
      ? fallbackSteps
      : [
          {
            order: 1,
            title: "Coordinate strategy with founder",
            agent: "Atlas",
            kind: "task",
            detail: opts.goal,
            day: 1,
          },
        ],
  };

  const fallbackProjected: MissionProjected = {
    cost_aura: fallbackPlan.steps.length * TASK_COST,
    cost_usdc: budgetUsdc,
    revenue_usdc: feasibilitySeed.feasibility === "unlikely" ? Math.round(opts.targetUsdc * 0.15) : opts.targetUsdc,
    profit_usdc:
      feasibilitySeed.feasibility === "unlikely"
        ? Math.round(opts.targetUsdc * 0.15) - budgetUsdc
        : opts.targetUsdc - budgetUsdc,
    label: "projected",
  };

  try {
    const raw = await askAi(system, user);
    const parsed = parseJsonBlock<{
      offer?: string;
      price_usdc?: number;
      customers_needed?: number;
      summary?: string;
      path_to_target?: string;
      timeline_days?: number;
      capital_usdc?: number;
      assumptions?: string[];
      risks?: string[];
      feasibility?: string;
      feasibility_note?: string;
      founder_decisions?: FounderDecision[];
      milestones?: MissionMilestone[];
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
        day: Math.max(1, Math.min(timelineDays, Number(s.day) || i + 1)),
      }));

    const decisions = (parsed.founder_decisions ?? fallbackPlan.founder_decisions ?? [])
      .filter((d) => d && d.question)
      .slice(0, 6)
      .map((d, i) => ({
        id: String(d.id || `d${i}`).slice(0, 40),
        question: String(d.question).slice(0, 180),
        suggestion: String(d.suggestion || "").slice(0, 80),
        why: String(d.why || "").slice(0, 200),
      }));

    const milestones = (parsed.milestones ?? fallbackPlan.milestones ?? [])
      .filter((m) => m && m.label)
      .slice(0, 6)
      .map((m) => ({
        day: Math.max(1, Math.min(timelineDays, Number(m.day) || 7)),
        label: String(m.label).slice(0, 80),
        checkpoint: String(m.checkpoint || m.label).slice(0, 200),
      }));

    const assumptions = (parsed.assumptions ?? fallbackPlan.assumptions ?? [])
      .map((a) => String(a).slice(0, 180))
      .filter(Boolean)
      .slice(0, 6);
    const risks = (parsed.risks ?? fallbackPlan.risks ?? [])
      .map((a) => String(a).slice(0, 180))
      .filter(Boolean)
      .slice(0, 6);

    let feasibility = normalizeFeasibility(parsed.feasibility);
    // Never let the model paint over a clearly impossible brief.
    if (feasibilitySeed.feasibility === "unlikely") feasibility = "unlikely";
    else if (feasibilitySeed.feasibility === "stretch" && feasibility === "realistic") {
      feasibility = "stretch";
    }

    const plan: MissionPlan = {
      offer: String(parsed.offer || fallbackPlan.offer).slice(0, 200),
      price_usdc: Math.max(1, Number(parsed.price_usdc) || fallbackPlan.price_usdc),
      customers_needed: Math.max(1, Number(parsed.customers_needed) || customers),
      summary: String(parsed.summary || fallbackPlan.summary).slice(0, 600),
      path_to_target: String(parsed.path_to_target || fallbackPlan.path_to_target).slice(0, 400),
      timeline_days: Math.max(1, Number(parsed.timeline_days) || timelineDays),
      capital_usdc: Math.max(0, Number(parsed.capital_usdc) || budgetUsdc),
      assumptions: assumptions.length ? assumptions : (fallbackPlan.assumptions ?? []),
      risks: risks.length ? risks : (fallbackPlan.risks ?? []),
      feasibility,
      feasibility_note: String(
        parsed.feasibility_note || feasibilitySeed.note,
      ).slice(0, 400),
      founder_decisions: decisions.length
        ? decisions
        : (fallbackPlan.founder_decisions ?? []),
      milestones: milestones.length ? milestones : (fallbackPlan.milestones ?? []),
      steps: steps.length ? steps : fallbackPlan.steps,
    };

    const revRaw = Number(parsed.projected?.revenue_usdc);
    const rev =
      Number.isFinite(revRaw) && revRaw >= 0
        ? revRaw
        : feasibility === "unlikely"
          ? Math.round(opts.targetUsdc * 0.2)
          : opts.targetUsdc;
    const costAura = Math.max(
      plan.steps.length * TASK_COST,
      Number(parsed.projected?.cost_aura) || plan.steps.length * TASK_COST,
    );
    const costUsdc = Math.max(
      0,
      Number(parsed.projected?.cost_usdc) || budgetUsdc,
    );
    const projected: MissionProjected = {
      cost_aura: costAura,
      cost_usdc: costUsdc,
      revenue_usdc: rev,
      profit_usdc: Math.max(
        Number(parsed.projected?.profit_usdc) || rev - costUsdc,
        rev - costUsdc,
      ),
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
Honesty: upside is projected. Never claim settled revenue. Prefer the next unfinished plan step and involve the founder when a decision is pending.`,
      `Goal: ${opts.goal}
Status: ${opts.status}
Actual settled revenue USDC: ${opts.actualRevenue}
Target USDC: ${opts.targetUsdc}
Feasibility: ${opts.plan.feasibility}
Plan steps: ${JSON.stringify(opts.plan.steps).slice(0, 2000)}
Founder decisions: ${JSON.stringify(opts.plan.founder_decisions || []).slice(0, 800)}
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
  return out;
}
