/**
 * Client-safe mission brief parsing (no LLM / server imports).
 * Shared by UI briefing step and server planner.
 */

export type MissionBrief = {
  targetUsdc: number;
  budgetUsdc: number;
  timelineDays: number;
  risk: "low" | "medium" | "high";
  channelHint: string | null;
};

export type MissionFeasibility = "realistic" | "stretch" | "unlikely";

function parseMoneyToken(raw: string, mult?: string): number {
  let n = parseFloat(raw.replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return 0;
  const m = (mult || "").toLowerCase();
  if (m === "k") n *= 1000;
  if (m === "m") n *= 1_000_000;
  return Math.round(n);
}

/** Parse a numeric target from natural language; store as target_usdc (no FX). */
export function parseTargetAmount(goal: string): number {
  const m =
    goal.match(
      /(?:make|earn|raise|hit|reach|grow(?:\s+to)?)\s+(?:€|\$|£|usdc|usd|eur)?\s*([\d.,]+)\s*(k|m)?/i,
    ) ||
    goal.match(/(?:€|\$|£|usdc|usd|eur)\s*([\d.,]+)\s*(k|m)?/i) ||
    goal.match(/([\d.,]+)\s*(k|m)?\s*(?:€|\$|£|usdc|usd|eur)/i);
  if (!m) return 1000;
  const n = parseMoneyToken(m[1]!, m[2]);
  return n > 0 ? n : 1000;
}

/** Starting capital / deposit mentioned by the founder. */
export function parseBudgetAmount(goal: string): number | null {
  const m =
    goal.match(
      /(?:deposit|budget|capital|stake|starting with|start with|put in|fund with)\s*(?:of\s*)?(?:€|\$|£|usdc|usd|eur)?\s*([\d.,]+)\s*(k|m)?/i,
    ) ||
    goal.match(/(?:€|\$|£|usdc|usd|eur)\s*([\d.,]+)\s*(k|m)?\s*(?:deposit|budget|capital|stake)/i);
  if (!m) return null;
  const n = parseMoneyToken(m[1]!, m[2]);
  return n > 0 ? n : null;
}

/** Rough timeline in days from phrases like "next week", "in 30 days". */
export function parseTimelineDays(goal: string): number | null {
  const g = goal.toLowerCase();
  if (/\b(today|tonight|24\s*h)\b/.test(g)) return 1;
  if (/\b(this week|next week|in a week|1 week|one week)\b/.test(g)) return 7;
  if (/\b(two weeks|2 weeks|fortnight)\b/.test(g)) return 14;
  if (/\b(this month|next month|in a month|30 days|1 month|one month)\b/.test(g)) return 30;
  if (/\b(quarter|90 days|3 months)\b/.test(g)) return 90;
  const days = g.match(/\bin\s+(\d+)\s*days?\b/);
  if (days) return Math.max(1, Math.min(365, parseInt(days[1]!, 10)));
  const weeks = g.match(/\bin\s+(\d+)\s*weeks?\b/);
  if (weeks) return Math.max(7, Math.min(365, parseInt(weeks[1]!, 10) * 7));
  return null;
}

export function inferChannelHint(goal: string): string | null {
  const g = goal.toLowerCase();
  if (/trad(?:e|ing)|quant|crypto|on-?chain|swap|weth|usdc desk/.test(g)) return "trading";
  if (/website|audit|agency|b2b|lead|outbound|cold/.test(g)) return "sales";
  if (/content|social|newsletter|youtube|tiktok|x\.com/.test(g)) return "content";
  if (/product|saas|app|marketplace/.test(g)) return "product";
  return null;
}

/** Build editable briefing defaults from the goal before calling the planner. */
export function parseMissionBrief(goal: string): MissionBrief {
  const targetUsdc = parseTargetAmount(goal);
  const budgetUsdc =
    parseBudgetAmount(goal) ?? Math.min(100, Math.max(10, Math.round(targetUsdc * 0.05)));
  const timelineDays = parseTimelineDays(goal) ?? 30;
  const channelHint = inferChannelHint(goal);
  let risk: MissionBrief["risk"] = "medium";
  if (channelHint === "trading" && budgetUsdc > 0 && targetUsdc / budgetUsdc >= 10) risk = "high";
  if (timelineDays <= 7 && targetUsdc >= 500) risk = "high";
  return { targetUsdc, budgetUsdc, timelineDays, risk, channelHint };
}

export function assessFeasibility(opts: {
  targetUsdc: number;
  budgetUsdc: number;
  timelineDays: number;
  channelHint?: string | null;
}): { feasibility: MissionFeasibility; note: string } {
  const { targetUsdc, budgetUsdc, timelineDays, channelHint } = opts;
  const multiple = budgetUsdc > 0 ? targetUsdc / budgetUsdc : targetUsdc;
  const trading = channelHint === "trading";

  if (trading && multiple >= 20 && timelineDays <= 14) {
    return {
      feasibility: "unlikely",
      note: `Turning ${budgetUsdc} into ${targetUsdc} in ${timelineDays} days via spot trading (~${multiple.toFixed(0)}×) is not a reliable plan. We will draft a capped, risk-first desk and a parallel revenue path — not a promise.`,
    };
  }
  if (multiple >= 10 && timelineDays <= 30) {
    return {
      feasibility: "unlikely",
      note: `A ${multiple.toFixed(0)}× outcome in ${timelineDays} days is extreme. The plan should prioritize survivable risk and an honest secondary path to the target.`,
    };
  }
  if (multiple >= 5 || (trading && timelineDays <= 14)) {
    return {
      feasibility: "stretch",
      note: `This is a stretch: high upside requires either more capital/time or a real offer outside pure trading luck.`,
    };
  }
  return {
    feasibility: "realistic",
    note: "Target, capital, and timeline look workable if the offer and steps stay concrete.",
  };
}
