/** Five working Akquise templates — goal prompts, search skeletons, output schemas. */

export type AkquiseTemplateId =
  | "website_leads"
  | "real_estate"
  | "competitor_spy"
  | "grant_hunter"
  | "sales_writer";

export type AkquiseTemplate = {
  id: AkquiseTemplateId;
  label: string;
  short: string;
  goalExample: string;
  defaultTarget: number;
  agents: string[];
  /** Extra search query fragments (region + brief appended at runtime). */
  searchHints: string[];
  scoringRubric: string;
  extractSystem: string;
  outputKind: "leads" | "report" | "outreach";
  objectiveDefault: "buy" | "sell" | "research";
};

export const AKQUISE_TEMPLATES: AkquiseTemplate[] = [
  {
    id: "website_leads",
    label: "Lead Hunter",
    short: "SMEs that need a better website",
    goalExample: "Find 20 Austrian companies that need a new website.",
    defaultTarget: 20,
    agents: ["Juno", "Vela", "Iris"],
    searchHints: [
      "local business website kontakt",
      "Handwerk Betrieb Website",
      "Gastronomie Wien Website",
      "SME company contact email",
    ],
    scoringRubric:
      "Score 0-100 opportunity that the business needs a new/updated website. Higher if site looks outdated, missing HTTPS, thin content, old copyright year, or no mobile cues. Never invent emails/phones.",
    extractSystem: `You are a B2B lead research agent finding companies that likely need a new website.
Return ONLY a JSON array. Each item: {"name":string|null,"org":string|null,"email":string|null,"phone":string|null,"address":string|null,"snippet":string,"score":number,"source_url":string,"website_signals":string[]}.
snippet: why this company may need a new site (cite visible signals only).
website_signals: short facts from the page (e.g. "copyright 2016", "http only", "table layout").
score: fit vs brief using the scoring rubric. Never invent emails or phones — null if not on page. Skip directories and social profiles. Max 15 items per batch.`,
    outputKind: "leads",
    objectiveDefault: "research",
  },
  {
    id: "real_estate",
    label: "Real Estate Kaltakquise",
    short: "Owners, agents, investors",
    goalExample: "Find owners of unrenovated multi-family buildings in Köln willing to sell.",
    defaultTarget: 12,
    agents: ["Juno", "Vela"],
    searchHints: ["immobilien kontakt email", "Makler Eigentümer", "Mehrfamilienhaus Verkauf"],
    scoringRubric:
      "Score 0-100 fit against the real-estate brief (buy/sell objective). Prefer concrete property or owner signals.",
    extractSystem: `You are a real-estate cold-acquisition research agent. Extract real contactable prospects from scraped web pages.
Return ONLY a JSON array. Each item: {"name":string|null,"org":string|null,"email":string|null,"phone":string|null,"address":string|null,"snippet":string,"score":number,"source_url":string}.
snippet: one concrete detail about this prospect or property. Never invent emails or phones. Max 15 items.`,
    outputKind: "leads",
    objectiveDefault: "buy",
  },
  {
    id: "competitor_spy",
    label: "Competitor Spy",
    short: "Scrape and compare rivals",
    goalExample: "Analyze the top 10 competitors for boutique web agencies in Vienna.",
    defaultTarget: 10,
    agents: ["Cass", "Vela", "Iris"],
    searchHints: ["competitors pricing", "agency vs", "Marktführer Wettbewerber"],
    scoringRubric:
      "Score 0-100 relevance as a direct competitor. Snippet must note positioning, offer, or pricing cue from the page.",
    extractSystem: `You are a competitive research agent. Extract competitor companies from pages.
Return ONLY a JSON array. Each item: {"name":string|null,"org":string|null,"email":string|null,"phone":string|null,"address":string|null,"snippet":string,"score":number,"source_url":string,"website_signals":string[]}.
snippet: positioning / offer / pricing cue visible on the page. Never invent contacts. Max 15 items.`,
    outputKind: "report",
    objectiveDefault: "research",
  },
  {
    id: "grant_hunter",
    label: "Grant Hunter",
    short: "Find relevant grants",
    goalExample: "Find grants relevant to an Austrian AI startup in 2026.",
    defaultTarget: 10,
    agents: ["Cass", "Ledger", "Atlas"],
    searchHints: ["Förderung Startup", "grant program application", "aws austria funding", "EU SME grant"],
    scoringRubric:
      "Score 0-100 relevance of the grant/program to the brief. Prefer official sources with deadlines or eligibility.",
    extractSystem: `You are a grant research agent. Extract real grant programs or funding calls from pages.
Return ONLY a JSON array. Each item: {"name":string|null,"org":string|null,"email":string|null,"phone":string|null,"address":string|null,"snippet":string,"score":number,"source_url":string}.
name/org: program name and issuer. snippet: eligibility + deadline if visible. Never invent. Max 15 items.`,
    outputKind: "report",
    objectiveDefault: "research",
  },
  {
    id: "sales_writer",
    label: "Sales Writer",
    short: "Personalize outreach from research",
    goalExample: "Write personalized outreach for leads who need website redesigns in Vienna.",
    defaultTarget: 10,
    agents: ["Orin", "Juno", "Vela"],
    searchHints: ["company kontakt email", "business contact", "Impressum"],
    scoringRubric:
      "Score 0-100 fitness for personalized outreach. Prefer pages with a clear contact and concrete hook.",
    extractSystem: `You are a sales research agent preparing personalization hooks for cold outreach.
Return ONLY a JSON array. Each item: {"name":string|null,"org":string|null,"email":string|null,"phone":string|null,"address":string|null,"snippet":string,"score":number,"source_url":string}.
snippet: the personalization hook (visible fact only). Never invent emails/phones. Max 15 items.`,
    outputKind: "outreach",
    objectiveDefault: "research",
  },
];

export function getTemplate(id: string | null | undefined): AkquiseTemplate {
  return (
    AKQUISE_TEMPLATES.find((t) => t.id === id) ??
    AKQUISE_TEMPLATES.find((t) => t.id === "website_leads")!
  );
}

export function inferTemplateFromGoal(goal: string): AkquiseTemplateId {
  const g = goal.toLowerCase();
  if (/grant|förder|funding|aws |horizon/.test(g)) return "grant_hunter";
  if (/competitor|wettbewerb|rival|spy/.test(g)) return "competitor_spy";
  if (/outreach|cold email|sales message|personalize/.test(g)) return "sales_writer";
  if (/immobil|real.?estate|makler|eigentümer|property|mehrfamilien/.test(g)) return "real_estate";
  if (/website|webdesign|landing|outdated site|neue website/.test(g)) return "website_leads";
  if (/lead|customer|prospect|akquise|company|unternehmen/.test(g)) return "website_leads";
  return "website_leads";
}

export function isAkquiseMission(mission: string): boolean {
  const m = mission.toLowerCase();
  return /lead|akquise|outreach|prospect|customer|website|grant|förder|competitor|wettbewerb|immobil|real.?estate|vienna|wien|sales message|find \d+/.test(
    m,
  );
}
