/** Autonomy modes and reputation — economic OS helpers (no fake revenue). */

export const AUTONOMY_MODES = [
  {
    id: 0,
    key: "manual",
    label: "Manual",
    short: "AI recommends",
    body: "Agents only propose. Nothing queues until you approve.",
  },
  {
    id: 1,
    key: "assisted",
    label: "Assisted",
    short: "AI prepares",
    body: "Agents draft work as pending approval. You stay the gate.",
  },
  {
    id: 2,
    key: "supervised",
    label: "Supervised",
    short: "AI executes approved",
    body: "Your missions run when approved. Auto-work still needs sign-off. Daily AURA budget applies.",
  },
  {
    id: 3,
    key: "autonomous",
    label: "Autonomous",
    short: "Within budgets",
    body: "Agents may queue within your daily AURA budget. Over budget waits for approval.",
  },
] as const;

export type AutonomyId = 0 | 1 | 2 | 3;

export function clampAutonomy(n: unknown): AutonomyId {
  const v = Math.floor(Number(n) || 0);
  if (v <= 0) return 0;
  if (v === 1) return 1;
  if (v === 2) return 2;
  return 3;
}

export function autonomyLabel(n: unknown) {
  return AUTONOMY_MODES[clampAutonomy(n)]!.label;
}

/**
 * Task status for a new dispatch.
 * founderApproved = founder typed the mission / clicked dispatch.
 */
export function taskStatusForAutonomy(opts: {
  autonomy: number | undefined;
  founderApproved?: boolean;
  overDailyBudget?: boolean;
}): "pending_approval" | "queued" {
  const a = clampAutonomy(opts.autonomy);
  if (opts.overDailyBudget) return "pending_approval";
  if (a === 0) return "pending_approval"; // Manual: always gate
  if (a === 1) {
    // Assisted: founder missions still need approval unless already approved flag means "I want it queued"
    return opts.founderApproved ? "pending_approval" : "pending_approval";
  }
  if (a === 2) {
    // Supervised: founder-approved dispatches queue; ambient proposals wait
    return opts.founderApproved ? "queued" : "pending_approval";
  }
  // Autonomous: queue when founder-approved or ambient, if under budget
  return "queued";
}

/** Reputation 0–100 from real activity counts (documented formula). */
export function computeReputation(opts: {
  completedTasks: number;
  failedTasks: number;
  connectedChannels: number;
  agentsActive: number;
}): number {
  const success =
    opts.completedTasks + opts.failedTasks > 0
      ? opts.completedTasks / (opts.completedTasks + opts.failedTasks)
      : 0.5;
  const base = 40;
  const taskScore = Math.min(30, opts.completedTasks * 1.5);
  const quality = success * 20;
  const channels = Math.min(10, opts.connectedChannels * 4);
  const team = Math.min(10, opts.agentsActive * 1.2);
  return Math.round(Math.min(100, Math.max(0, base + taskScore + quality + channels + team)));
}

export function slugifyCompanyName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "company";
}

export const COMPANY_MILESTONES = [
  { level: 1, key: "created", label: "Company created", test: () => true },
  {
    level: 5,
    key: "first_customer",
    label: "First customer",
    test: (s: EconomySnapshot) => s.customers >= 1,
  },
  {
    level: 10,
    key: "earn_100",
    label: "$100 earned",
    test: (s: EconomySnapshot) => s.lifetimeRevenue >= 100,
  },
  {
    level: 20,
    key: "earn_1000",
    label: "$1,000 earned",
    test: (s: EconomySnapshot) => s.lifetimeRevenue >= 1000,
  },
  {
    level: 30,
    key: "customers_10",
    label: "10 customers",
    test: (s: EconomySnapshot) => s.customers >= 10,
  },
  {
    level: 50,
    key: "earn_10000",
    label: "$10,000 lifetime",
    test: (s: EconomySnapshot) => s.lifetimeRevenue >= 10_000,
  },
  {
    level: 100,
    key: "autonomous",
    label: "Autonomous company",
    test: (s: EconomySnapshot) => s.autonomy >= 3 && s.lifetimeRevenue >= 1000,
  },
] as const;

export type EconomySnapshot = {
  lifetimeRevenue: number;
  lifetimeExpenses: number;
  customers: number;
  autonomy: number;
  completedTasks: number;
};

export type LedgerTotals = {
  revenue: number;
  expenses: number;
  fees: number;
  compute: number;
  pending: number;
  available: number;
  lifetime: number;
  profit: number;
};

export function totalsFromLedger(
  rows: { kind: string; amount_usdc: number; status: string }[],
): LedgerTotals {
  let revenue = 0;
  let expenses = 0;
  let fees = 0;
  let compute = 0;
  let pending = 0;
  for (const r of rows) {
    const amt = Number(r.amount_usdc) || 0;
    if (r.status === "pending") {
      if (r.kind === "revenue" || r.kind === "royalty") pending += amt;
      continue;
    }
    if (r.status !== "settled") continue;
    if (r.kind === "revenue" || r.kind === "royalty") revenue += amt;
    else if (r.kind === "expense") expenses += Math.abs(amt);
    else if (r.kind === "fee") fees += Math.abs(amt);
    else if (r.kind === "compute") compute += Math.abs(amt);
  }
  const outflows = expenses + fees + compute;
  const profit = revenue - outflows;
  return {
    revenue,
    expenses: outflows,
    fees,
    compute,
    pending,
    available: Math.max(0, profit),
    lifetime: revenue,
    profit,
  };
}

/** Mission → which agents to activate (character names). */
export function agentsForMission(mission: string): string[] {
  const m = mission.toLowerCase();
  const set = new Set<string>(["Atlas"]);
  if (/lead|sales|customer|crm|outreach|vienna|real.?estate/.test(m)) {
    set.add("Juno");
    set.add("Vela");
  }
  if (/market|seo|content|post|brand|campaign|copy/.test(m)) {
    set.add("Vela");
    set.add("Orin");
    set.add("Iris");
  }
  if (/research|competitor|analy|data/.test(m)) {
    set.add("Cass");
    set.add("Ledger");
  }
  if (/trade|quant|market|portfolio|backtest/.test(m)) {
    set.add("Quant");
    set.add("Ledger");
  }
  if (/website|landing|product|store|shop/.test(m)) {
    set.add("Iris");
    set.add("Cass");
  }
  if (/support|help|ticket/.test(m)) set.add("Juno");
  if (set.size < 3) {
    set.add("Vela");
    set.add("Cass");
  }
  return Array.from(set).slice(0, 6);
}
