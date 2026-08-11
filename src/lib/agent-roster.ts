/** Canonical agents that can be hired into a company. No silent Atlas fallback. */

export type AgentDef = {
  name: string;
  role: string;
  avatar: string;
  accent: string;
  memory: string;
};

export const AGENT_ROSTER: Record<string, AgentDef> = {
  Atlas: {
    name: "Atlas",
    role: "Chief Executive",
    avatar: "◎",
    accent: "cyan",
    memory:
      "Chief executive. Learns from every approved task. Prefer clear founder direction and honest metrics.",
  },
  Quant: {
    name: "Quant",
    role: "Trading Desk",
    avatar: "▲",
    accent: "gold",
    memory:
      "Trading desk Quant. Risk-first. Never invent fills. Respect founder caps. Prefer WETH/USDC on Base. Hand residual cash to Yield when flat.",
  },
  Yield: {
    name: "Yield",
    role: "Yield & Liquidity",
    avatar: "◈",
    accent: "emerald",
    memory:
      "Yield desk. Money works for money. Aerodrome epochs, Pancake/Venus/Lista on BNB, prediction extreme only. Autopilots: idle router, IL thermostat, compound cascade. Never invent live fills.",
  },
  Iris: {
    name: "Iris",
    role: "Product & Storefront",
    avatar: "◆",
    accent: "violet",
    memory:
      "Product and storefront. Writes landing copy and merchandising briefs. Never invent live revenue metrics.",
  },
  Vela: {
    name: "Vela",
    role: "Growth & Marketing",
    avatar: "✧",
    accent: "rose",
    memory:
      "Growth marketer. Drafts campaigns and posts. Never publish without channel connection and founder rules.",
  },
  Orin: {
    name: "Orin",
    role: "Social Voice",
    avatar: "◈",
    accent: "teal",
    memory:
      "Social voice. Drafts replies and posts for connected channels. Prefer draft mode until founder trusts auto.",
  },
  Juno: {
    name: "Juno",
    role: "Customer Success",
    avatar: "◉",
    accent: "amber",
    memory: "Customer success. Outreach and support briefs. Never invent customer conversations.",
  },
  Cass: {
    name: "Cass",
    role: "Engineering",
    avatar: "⬡",
    accent: "slate",
    memory: "Engineering. Performance and shipping notes. Never invent Lighthouse scores.",
  },
  Ledger: {
    name: "Ledger",
    role: "Finance",
    avatar: "▣",
    accent: "emerald",
    memory: "Finance. Tracks real ledger and subscription tokens only — no vanity MRR.",
  },
};

export const PRODUCT_AGENT_MAP: Record<string, string[]> = {
  trading: ["Quant", "Yield", "Ledger"],
  commerce: ["Iris", "Vela", "Juno", "Ledger"],
  studio: ["Vela", "Orin", "Iris"],
};

type Db = { from: (t: string) => any };

/** Hire an agent by name if missing. Returns agent id. */
export async function ensureCompanyAgent(
  db: Db,
  companyId: string,
  name: string,
): Promise<string> {
  const def = AGENT_ROSTER[name];
  if (!def) throw new Error(`Unknown agent: ${name}`);

  const { data: existing } = await db
    .from("agents")
    .select("id")
    .eq("company_id", companyId)
    .eq("name", def.name)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data: created, error } = await db
    .from("agents")
    .insert({
      company_id: companyId,
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
    })
    .select("id")
    .single();
  if (error || !created) throw error ?? new Error(`Could not hire ${name}`);

  await db.from("activity_events").insert({
    company_id: companyId,
    agent_id: created.id,
    kind: "hire",
    message: `${def.name} joined as ${def.role}`,
  });

  return created.id as string;
}

export async function ensureProductAgents(
  db: Db,
  companyId: string,
  productId: string,
): Promise<string[]> {
  const names = PRODUCT_AGENT_MAP[productId] ?? ["Iris"];
  const ids: string[] = [];
  for (const n of names) {
    ids.push(await ensureCompanyAgent(db, companyId, n));
  }
  return ids;
}
