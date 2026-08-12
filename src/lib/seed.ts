import { supabase } from "@/integrations/supabase/client";
import { seedRandom } from "./format";
import { seedExtras } from "./seed-extras";

const AGENTS = [
  {
    name: "Atlas",
    role: "Chief Executive",
    avatar: "◎",
    accent: "cyan",
    current_task: "Rebalancing Q3 growth plan across paid and organic",
    health: 99,
    performance: 96,
    activity: 88,
    revenue_generated: 184200,
    credits_used: 4120,
    memory:
      "Owns long-term strategy. Knows margin floor is 62%, prefers compounding channels over paid spikes.",
  },
  {
    name: "Vela",
    role: "Growth & Marketing",
    avatar: "✦",
    accent: "gold",
    current_task: "Launching the 'Quiet Mornings' lifecycle campaign",
    health: 97,
    performance: 91,
    activity: 94,
    revenue_generated: 96400,
    credits_used: 3180,
    memory: "Best performing hook is sensory-led copy. Email beats paid social 3.4x on LTV.",
  },
  {
    name: "Orin",
    role: "Sales & Pipeline",
    avatar: "◈",
    accent: "cyan",
    current_task: "Qualifying 42 inbound wholesale leads",
    health: 94,
    performance: 88,
    activity: 76,
    revenue_generated: 132800,
    credits_used: 2740,
    memory: "Wholesale deals close 2.1x faster when a sample kit ships within 24h.",
  },
  {
    name: "Iris",
    role: "Design & Brand",
    avatar: "❖",
    accent: "gold",
    current_task: "Generating hero creatives for the autumn drop",
    health: 98,
    performance: 93,
    activity: 62,
    revenue_generated: 41200,
    credits_used: 5210,
    memory: "Brand palette is warm neutral. Never use hard drop shadows in product imagery.",
  },
  {
    name: "Cass",
    role: "Engineering",
    avatar: "⌘",
    accent: "cyan",
    current_task: "Shipping checkout latency fix to production",
    health: 91,
    performance: 89,
    activity: 81,
    revenue_generated: 28600,
    credits_used: 6480,
    memory: "Storefront runs on the edge. p95 must stay under 380ms or conversion drops.",
  },
  {
    name: "Juno",
    role: "Customer Success",
    avatar: "◍",
    accent: "cyan",
    current_task: "Answering 118 conversations in the shared inbox",
    health: 96,
    performance: 94,
    activity: 90,
    revenue_generated: 52300,
    credits_used: 2210,
    memory: "Refund requests drop 38% when a replacement is offered before a refund.",
  },
  {
    name: "Ledger",
    role: "Finance",
    avatar: "▤",
    accent: "gold",
    current_task: "Reconciling August payouts and COGS",
    health: 99,
    performance: 97,
    activity: 44,
    revenue_generated: 0,
    credits_used: 1180,
    memory: "Runway model assumes 9% monthly burn growth. Alerts under 180 days.",
  },
  {
    name: "Sable",
    role: "Legal & Compliance",
    avatar: "§",
    accent: "cyan",
    current_task: "Reviewing EU data-processing addendum",
    health: 100,
    performance: 90,
    activity: 22,
    revenue_generated: 0,
    credits_used: 640,
    memory: "All customer data stays in EU/US. No sub-processor without a signed DPA.",
  },
  {
    name: "Quant",
    role: "Trading Desk",
    avatar: "⟁",
    accent: "gold",
    current_task: "Managing three open positions with 0.4% risk per trade",
    health: 97,
    performance: 92,
    activity: 98,
    revenue_generated: 26764,
    credits_used: 7420,
    memory:
      "Never risks more than 0.4% of book per position. Cuts losers at -1R without asking. Trades only liquidity it can exit in under 90 seconds.",
  },
];

const TASKS = [
  ["Rewrite the homepage hero for the autumn drop", "running", "high", 12400, 68, "Vela"],
  ["Fix checkout latency spike on mobile Safari", "running", "critical", 31000, 82, "Cass"],
  ["Draft wholesale pricing tiers for EU accounts", "queue", "high", 48000, 0, "Orin"],
  ["Generate 12 lifecycle emails for new subscribers", "running", "medium", 8600, 41, "Vela"],
  ["Photograph and retouch the Ember Candle set", "queue", "medium", 5400, 0, "Iris"],
  ["Renegotiate freight contract for Q4", "queue", "high", 22000, 0, "Ledger"],
  ["Publish the 'slow living' SEO cluster", "completed", "medium", 16800, 100, "Vela"],
  ["Migrate support macros into the AI inbox", "completed", "low", 3200, 100, "Juno"],
  ["Ship subscription pause feature", "completed", "high", 27400, 100, "Cass"],
  ["Sync Shopify inventory webhook", "failed", "medium", 4100, 34, "Cass"],
  ["Localize storefront copy into German", "queue", "low", 9200, 0, "Iris"],
  ["Audit ad spend against blended CAC", "running", "high", 18700, 55, "Ledger"],
] as const;

const PRODUCTS = [
  [
    "Aurora Quant Desk",
    "An autonomous trading agent that manages a risk-capped book around the clock.",
    240,
    268400,
    8.9,
    3120,
    0,
    "⟁",
  ],
  [
    "Ember Candle No. 4",
    "Hand-poured smoked cedar and amber, 60 hour burn.",
    48,
    184200,
    4.8,
    1420,
    320,
    "🕯️",
  ],
  [
    "Quiet Mornings Tea",
    "Single-origin oolong with bergamot and honey notes.",
    26,
    96400,
    6.1,
    2310,
    1180,
    "🍃",
  ],
  [
    "Linen Throw — Dune",
    "Stonewashed European flax, oversized weave.",
    168,
    132800,
    2.4,
    340,
    96,
    "🧺",
  ],
  [
    "Terra Ceramic Set",
    "Six pieces, reactive glaze, dishwasher safe.",
    92,
    74600,
    3.2,
    610,
    210,
    "🍶",
  ],
  [
    "Field Notes Journal",
    "Recycled cotton paper with a lay-flat binding.",
    24,
    38200,
    7.4,
    1890,
    2400,
    "📓",
  ],
  [
    "Atlas Membership",
    "Early drops, free freight, and a quarterly gift.",
    12,
    118900,
    9.6,
    4120,
    0,
    "✦",
  ],
] as const;

const CUSTOMERS = [
  ["Marlow & Co.", "buying@marlow.co", "United States", "Wholesale", 48200, "active"],
  ["Ines Hartmann", "ines@hartmann.de", "Germany", "Membership", 1840, "active"],
  ["Sora Nakamura", "sora@nakamura.jp", "Japan", "Membership", 2260, "active"],
  ["Northline Hotels", "supply@northline.com", "Canada", "Wholesale", 96400, "active"],
  ["Elena Rossi", "elena.rossi@mail.it", "Italy", "Retail", 420, "at risk"],
  ["Kestrel Studio", "hello@kestrel.studio", "United Kingdom", "Wholesale", 31200, "active"],
  ["Amara Diallo", "amara@diallo.sn", "Senegal", "Retail", 780, "active"],
  ["Fjord Living", "orders@fjordliving.no", "Norway", "Wholesale", 22800, "churned"],
  ["Theo Bernard", "theo@bernard.fr", "France", "Membership", 1520, "active"],
  ["Harper Quinn", "harper@quinn.au", "Australia", "Retail", 640, "active"],
] as const;

const EVENTS = [
  ["revenue", "Ember Candle No. 4 sold 3 units to a returning customer", 144, "Orin"],
  ["action", "Rewrote 4 product descriptions to lift semantic search coverage", null, "Vela"],
  ["thought", "Freight costs are trending 6% above plan — worth renegotiating now", null, "Ledger"],
  ["action", "Deployed checkout latency patch — p95 down from 610ms to 340ms", null, "Cass"],
  ["revenue", "Northline Hotels renewed their wholesale contract", 24000, "Orin"],
  ["action", "Resolved 41 support conversations with a 4.9 satisfaction score", null, "Juno"],
  ["action", "Generated 9 hero creatives for the autumn drop", null, "Iris"],
  [
    "thought",
    "Membership retention is the strongest compounding lever this quarter",
    null,
    "Atlas",
  ],
  ["action", "Flagged an EU data-processing clause for review", null, "Sable"],
  ["revenue", "Quiet Mornings Tea crossed 2,300 active subscriptions", 5980, "Vela"],
] as const;

const INSIGHTS = [
  [
    "suggestion",
    "Move 18% of paid spend into lifecycle email",
    "Email is returning 3.4x the LTV of paid social at current CAC. Reallocating protects margin without slowing growth.",
    "+$14.2k / mo",
  ],
  [
    "suggestion",
    "Bundle the Ember Candle with Quiet Mornings Tea",
    "Both products share 41% of the same buyers. A bundle lifts AOV without new acquisition cost.",
    "+9% AOV",
  ],
  [
    "suggestion",
    "Add a pause option to the membership",
    "Churn interviews show 3 of 5 cancellations wanted a break, not an exit.",
    "-22% churn",
  ],
  [
    "thought",
    "We are compounding faster than we are spending",
    "Runway extended by 41 days this month while revenue grew 12%. The system is buying us optionality — I want to spend it on the wholesale channel, not on ads.",
    "Strategy",
  ],
  [
    "thought",
    "The storefront is our slowest employee",
    "Every 100ms of checkout latency costs roughly 1.1% of conversion. Cass is on it, but this deserves standing attention.",
    "Watch",
  ],
  [
    "opportunity",
    "EU wholesale demand is outrunning supply",
    "42 qualified inbound leads in 14 days with no outbound effort. A pricing tier would convert them today.",
    "$180k pipeline",
  ],
  [
    "opportunity",
    "Autumn drop timing",
    "Search interest for 'smoked cedar candle' rises 240% in week 38. Shipping the drop one week earlier captures the ramp.",
    "+$26k",
  ],
  [
    "opportunity",
    "Japan is quietly our best repeat market",
    "Repeat rate is 2.3x global average on a fraction of the traffic. Localizing checkout is a small change with an outsized return.",
    "+18% repeat",
  ],
] as const;

const FILES = [
  [
    "Brand Guidelines v4.pdf",
    "Brand",
    "pdf",
    4820,
    "Palette, type scale, and photography rules for the warm-neutral system.",
  ],
  [
    "Autumn Drop Shotlist.docx",
    "Creative",
    "doc",
    210,
    "18 frames across three sets, natural light only, no hard shadows.",
  ],
  [
    "Q3 Financial Model.xlsx",
    "Finance",
    "sheet",
    1240,
    "Runway, burn, and margin model. Burn growth assumption is 9% monthly.",
  ],
  [
    "Wholesale Agreement Template.pdf",
    "Legal",
    "pdf",
    680,
    "Standard EU/US wholesale terms with a 45 day payment window.",
  ],
  [
    "Customer Interviews — Churn.md",
    "Research",
    "doc",
    96,
    "Nine interviews. The dominant theme is pause, not cancel.",
  ],
  [
    "Ember_Hero_01.png",
    "Creative",
    "image",
    7420,
    "Hero frame for the Ember Candle, warm rim light on stone.",
  ],
  [
    "Freight Rates 2026.csv",
    "Ops",
    "sheet",
    88,
    "Carrier rates by lane. Trans-Atlantic is up 6% year over year.",
  ],
  [
    "Supplier Directory.md",
    "Ops",
    "doc",
    42,
    "Primary and backup suppliers with lead times per SKU.",
  ],
  [
    "Tone of Voice.md",
    "Brand",
    "doc",
    28,
    "Sensory, unhurried, specific. Never exclamation marks.",
  ],
  [
    "Storefront Architecture.md",
    "Engineering",
    "doc",
    64,
    "Edge-rendered storefront, cache strategy, and latency budget.",
  ],
] as const;

const KNOWLEDGE = [
  [
    "Margin floor is 62%",
    "No discount, bundle, or channel may take blended gross margin below 62%.",
    "Finance",
    "Q3 Financial Model.xlsx",
  ],
  [
    "Email outperforms paid social",
    "Lifecycle email returns 3.4x the LTV of paid social at the current blended CAC.",
    "Growth",
    "Vela — channel analysis",
  ],
  [
    "Pause beats cancel",
    "Three of five cancellations wanted a temporary break rather than an exit.",
    "Customers",
    "Customer Interviews — Churn.md",
  ],
  [
    "Latency budget: 380ms p95",
    "Storefront p95 must stay under 380ms or conversion measurably degrades.",
    "Engineering",
    "Storefront Architecture.md",
  ],
  [
    "Warm neutral palette",
    "Photography is natural light with warm rim lighting. No hard drop shadows.",
    "Brand",
    "Brand Guidelines v4.pdf",
  ],
  [
    "EU data stays in EU",
    "Customer data is processed in EU/US only, and no sub-processor is added without a DPA.",
    "Legal",
    "Wholesale Agreement Template.pdf",
  ],
  [
    "Week 38 demand ramp",
    "Search interest for smoked cedar rises 240% entering week 38 each year.",
    "Growth",
    "Vela — seasonality study",
  ],
  [
    "Sample kits close deals",
    "Wholesale deals close 2.1x faster when a sample kit ships within 24 hours.",
    "Sales",
    "Orin — pipeline notes",
  ],
] as const;

const AUTOMATIONS = [
  [
    "Agent task queue",
    "Approved tasks run through plan → research → deliverable on the worker tick.",
    "active",
    0,
    ["Approve", "Queue", "Execute", "File result"],
  ],
  [
    "Channel publish",
    "Autopublish and drip posts go out when due — no fake send counts.",
    "active",
    0,
    ["Due posts", "Provider send", "Mark published"],
  ],
  [
    "Trading desk",
    "Approved strategies evaluate on tick; fills are paper or live Base when armed.",
    "active",
    0,
    ["Signals", "Risk gates", "OKX / paper fill"],
  ],
  [
    "Site lead drafts",
    "Inbound /s/$slug leads get draft follow-ups waiting for founder send.",
    "paused",
    0,
    ["New lead", "Draft", "Await send"],
  ],
] as const;

/**
 * Full Aurora Goods demo company — ONLY for explicit demo mode.
 * Default signup uses createEmptyCompany (zeros, Atlas only).
 * Enable with VITE_DEMO_SEED=1 (never on by default).
 */
export function isDemoSeedEnabled() {
  return import.meta.env["VITE_DEMO_SEED"] === "1" || import.meta.env["VITE_DEMO_SEED"] === "true";
}

export async function seedCompany(ownerId: string) {
  if (!isDemoSeedEnabled()) {
    throw new Error("Demo seed is disabled. Use createEmptyCompany for real founders.");
  }

  const { data: company, error } = await supabase
    .from("companies")
    .insert({
      owner_id: ownerId,
      name: "Aurora Goods",
      tagline: "A calm home goods company run by eight autonomous agents.",
      emoji: "◎",
      credits: 24800,
      runway_days: 412,
      mrr: 128400,
      autonomy: 2,
      strategy:
        "Compound the membership and wholesale channels while holding a 62% margin floor. Grow revenue faster than burn, and spend the resulting optionality on distribution rather than advertising.",
    })
    .select()
    .single();
  if (error || !company) throw error ?? new Error("Could not create company");

  const cid = company.id;

  const { data: agents } = await supabase
    .from("agents")
    .insert(AGENTS.map((a) => ({ ...a, company_id: cid })))
    .select();
  const byName = new Map((agents ?? []).map((a) => [a.name, a.id]));

  await Promise.all([
    supabase.from("tasks").insert(
      TASKS.map(([title, status, priority, roi, progress, agent], i) => ({
        company_id: cid,
        agent_id: byName.get(agent as string) ?? null,
        title: title as string,
        status: status as string,
        priority: priority as string,
        roi: roi as number,
        progress: progress as number,
        due_at: new Date(Date.now() + (i - 3) * 86400000).toISOString(),
        description: "Autonomously scoped, executed, and reported by the assigned agent.",
      })),
    ),
    supabase.from("products").insert(
      PRODUCTS.map(
        ([name, description, price, revenue, conversion, subscriptions, inventory, emoji]) => ({
          company_id: cid,
          name,
          description,
          price,
          revenue,
          conversion,
          subscriptions,
          inventory,
          emoji,
        }),
      ),
    ),
    supabase.from("customers").insert(
      CUSTOMERS.map(([name, email, country, plan, ltv, status]) => ({
        company_id: cid,
        name,
        email,
        country,
        plan,
        ltv,
        status,
      })),
    ),
    supabase.from("activity_events").insert(
      EVENTS.map(([kind, message, value, agent], i) => ({
        company_id: cid,
        agent_id: byName.get(agent as string) ?? null,
        kind: kind as string,
        message: message as string,
        value: value as number | null,
        created_at: new Date(Date.now() - i * 1000 * 60 * 17).toISOString(),
      })),
    ),
    supabase.from("insights").insert(
      INSIGHTS.map(([kind, title, body, impact]) => ({
        company_id: cid,
        kind,
        title,
        body,
        impact,
      })),
    ),
    supabase.from("files").insert(
      FILES.map(([name, folder, kind, size_kb, summary]) => ({
        company_id: cid,
        name,
        folder,
        kind,
        size_kb,
        summary,
      })),
    ),
    supabase.from("knowledge_items").insert(
      KNOWLEDGE.map(([title, summary, cluster, source]) => ({
        company_id: cid,
        title,
        summary,
        cluster,
        source,
      })),
    ),
    supabase.from("automations").insert(
      AUTOMATIONS.map(([name, description, status, runs, nodes]) => ({
        company_id: cid,
        name,
        description,
        status,
        runs,
        nodes: nodes as unknown as string[],
      })),
    ),
    supabase.from("marketplace_installs").insert(
      ["growth", "sales", "designer", "developer", "support", "finance", "lawyer"].map((slug) => ({
        company_id: cid,
        slug,
      })),
    ),
    supabase.from("metrics").insert(buildMetrics(cid)),
    supabase.from("deals").insert([
      {
        company_id: cid,
        name: "Vermeer Hotels",
        stage: "Inbound",
        value: 18000,
        note: "Requested a sample kit",
        sort_order: 0,
      },
      {
        company_id: cid,
        name: "Studio Nord",
        stage: "Inbound",
        value: 7400,
        note: "Asked about EU freight",
        sort_order: 1,
      },
      {
        company_id: cid,
        name: "Marlow & Co.",
        stage: "Qualified",
        value: 48200,
        note: "Sample kit delivered, pricing sent",
        sort_order: 0,
      },
      {
        company_id: cid,
        name: "Northline Hotels",
        stage: "Negotiating",
        value: 96400,
        note: "Contract at legal with Sable",
        sort_order: 0,
      },
      {
        company_id: cid,
        name: "Fjord Living",
        stage: "Won",
        value: 22800,
        note: "Signed a 12-month supply term",
        status: "won",
        sort_order: 0,
      },
    ]),
    supabase.from("campaigns").insert([
      {
        company_id: cid,
        name: "Quiet Mornings lifecycle",
        channel: "Email",
        progress: 41,
        value: 68400,
        roas: 3.4,
        status: "running",
      },
      {
        company_id: cid,
        name: "Autumn drop teaser",
        channel: "Organic social",
        progress: 78,
        value: 22100,
        roas: 2.1,
        status: "running",
      },
      {
        company_id: cid,
        name: "Smoked cedar SEO cluster",
        channel: "Search",
        progress: 100,
        value: 31800,
        roas: 4.8,
        status: "completed",
      },
      {
        company_id: cid,
        name: "Membership win-back",
        channel: "Email",
        progress: 22,
        value: 9400,
        roas: 5.2,
        status: "running",
      },
      {
        company_id: cid,
        name: "Wholesale outbound",
        channel: "Direct",
        progress: 12,
        value: 48000,
        roas: 6.6,
        status: "queued",
      },
    ]),
  ]);

  await seedExtras(cid);

  return company;
}

function buildMetrics(companyId: string) {
  const rand = seedRandom(42);
  const rows = [];
  let revenue = 2600;
  for (let i = 89; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400000);
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    revenue = revenue * (1 + (rand() - 0.42) * 0.09) + 34;
    const dayRevenue = Math.max(900, revenue * (weekend ? 0.82 : 1));
    rows.push({
      company_id: companyId,
      day: day.toISOString().slice(0, 10),
      revenue: Math.round(dayRevenue),
      visitors: Math.round(dayRevenue * (2.4 + rand())),
      tasks_completed: Math.round(18 + rand() * 26),
      conversion: Number((2.4 + rand() * 2.6).toFixed(2)),
    });
  }
  return rows;
}
