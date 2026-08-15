import { AGENT_ROSTER } from "@/lib/agent-roster";

export type OnboardProduct = "commerce" | "studio" | "trading";

export type WorkforceRole = {
  key: string;
  title: string;
  name: string;
  blurb: string;
};

export type OnboardBrief = {
  name: string;
  industry: string;
  goal: string;
  city: string | null;
  product: OnboardProduct;
  local: boolean;
  agents: string[];
  roles: WorkforceRole[];
  missions: string[];
  planSteps: string[];
  kpi: string;
};

const ROLE_BLURB: Record<string, { title: string; blurb: string }> = {
  Atlas: { title: "CEO", blurb: "Plans missions and coordinates the company." },
  Vela: { title: "Growth", blurb: "Finds opportunities and creates campaigns." },
  Juno: { title: "Customer Success", blurb: "Handles customers and follow-up." },
  Orin: { title: "Social", blurb: "Creates and prepares content." },
  Iris: { title: "Product", blurb: "Builds products and experiences." },
  Ledger: { title: "Finance", blurb: "Tracks costs and economics." },
  Quant: { title: "Funds", blurb: "Trades only after you set caps." },
  Yield: { title: "Yield", blurb: "Parks idle cash under your rules." },
};

const EXAMPLES = [
  "I sell apartments in Vienna.",
  "I own a hair salon.",
  "I want to build an AI SaaS company.",
  "I run an online store.",
  "I want more customers.",
];

export const ONBOARD_EXAMPLES = EXAMPLES;

const OS_MISSIONS = [
  "Get my first 10 customers",
  "Find 50 qualified leads",
  "Launch my website",
  "Create my first marketing campaign",
  "Generate my first €1,000",
  "Research my market",
];

const LOKAL_MISSIONS = [
  "Improve my Google reputation",
  "Get more returning customers",
  "Post this week’s social content",
  "Get more walk-in customers",
];

function titleCase(s: string) {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function inferName(raw: string): string {
  const quoted = raw.match(/[„"]([^"”]+)["”]/);
  if (quoted?.[1]) return quoted[1].trim().slice(0, 48);
  const called = raw.match(/(?:called|named|heißt|namens)\s+([A-ZÄÖÜ][\wÄÖÜäöüß&'-]+(?:\s+[A-ZÄÖÜ][\wÄÖÜäöüß&'-]+){0,3})/i);
  if (called?.[1]) return called[1].trim().slice(0, 48);
  const salon = raw.match(/\b((?:salon|studio|café|cafe|beisl|shop|store)\s+[A-ZÄÖÜ][\wÄÖÜäöüß&'-]+)/i);
  if (salon?.[1]) return titleCase(salon[1]).slice(0, 48);
  return "";
}

export function interpretBusiness(raw: string): OnboardBrief {
  const text = raw.trim();
  const lower = text.toLowerCase();

  const local =
    /\b(salon|friseur|hair|barber|café|cafe|beisl|restaurant|bakery|bäckerei|hotel|praxis|studio|shop|laden|betrieb|local|lokal|wien|vienna)\b/i.test(
      lower,
    ) && !/\b(saas|software|app|marketplace|crypto|token)\b/i.test(lower);

  const trading = /\b(trad(e|ing)|yield|liquidity|usdc|crypto desk)\b/i.test(lower);
  const studio = /\b(content|social|post|brand voice|instagram|tiktok)\b/i.test(lower) && !local;
  const product: OnboardProduct = trading ? "trading" : studio ? "studio" : "commerce";

  let industry = "Independent business";
  if (/\b(real estate|apartment|immobil|wohnung|makler)\b/i.test(lower)) industry = "Real estate";
  else if (/\b(salon|friseur|hair|beauty|kosmetik)\b/i.test(lower)) industry = "Beauty / salon";
  else if (/\b(saas|software|ai company|app)\b/i.test(lower)) industry = "Software";
  else if (/\b(store|shop|e-?comm|online)\b/i.test(lower)) industry = "Commerce";
  else if (/\b(café|cafe|restaurant|beisl|hotel)\b/i.test(lower)) industry = "Hospitality";
  else if (local) industry = "Local service";

  let city: string | null = null;
  if (/\bwien|vienna\b/i.test(lower)) city = "Wien";
  else if (/\bberlin\b/i.test(lower)) city = "Berlin";
  else if (/\bmünchen|munich\b/i.test(lower)) city = "München";

  const name = inferName(text) || (industry === "Software" ? "Untitled company" : industry);

  const goal = local
    ? "More real customers and a stronger local reputation."
    : /\blead/i.test(lower)
      ? "Generate qualified leads and customers."
      : /\beuro|€|revenue|money|kunden\b/i.test(lower)
        ? "Generate customers and revenue."
        : "Build the company and get the first real result.";

  const agents = local
    ? ["Atlas", "Vela", "Orin", "Juno", "Ledger"]
    : product === "trading"
      ? ["Atlas", "Quant", "Yield", "Ledger"]
      : product === "studio"
        ? ["Atlas", "Vela", "Orin", "Iris"]
        : ["Atlas", "Vela", "Juno", "Iris", "Ledger"];

  const roles: WorkforceRole[] = agents
    .filter((n) => AGENT_ROSTER[n] && ROLE_BLURB[n])
    .map((n) => ({
      key: n,
      name: n,
      title: ROLE_BLURB[n].title,
      blurb: ROLE_BLURB[n].blurb,
    }));

  const missions = local ? LOKAL_MISSIONS : OS_MISSIONS;

  const planSteps = local
    ? [
        "Confirm the shop identity",
        "Prepare the guest check-in",
        "Ask permission after a real visit",
        "Send a genuine review invitation",
        "Follow up once",
        "Measure what came back",
      ]
    : [
        "Research target customers",
        "Find qualified prospects",
        "Prepare outreach",
        "Create a landing page",
        "Start the campaign",
        "Follow up",
        "Measure conversions",
      ];

  return {
    name: name.slice(0, 48),
    industry,
    goal,
    city,
    product,
    local,
    agents,
    roles,
    missions,
    planSteps,
    kpi: local ? "First genuine review request sent" : "First 10 qualified leads",
  };
}

export type LokalImproveGoal = "reviews" | "return" | "social" | "customers";

export const LOKAL_GOALS: { id: LokalImproveGoal; title: string; body: string }[] = [
  { id: "reviews", title: "More real Google reviews", body: "Ask after a real visit. The guest writes their own words." },
  { id: "return", title: "More returning customers", body: "Follow up with people who already came in." },
  { id: "social", title: "More social content", body: "Drafts for you to approve — nothing posts alone." },
  { id: "customers", title: "More customers", body: "Find neighbours and invite them in." },
];
