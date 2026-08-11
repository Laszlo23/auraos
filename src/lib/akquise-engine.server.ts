/**
 * Akquise run engine: plan → execute (search/scrape/extract) → verify → artifact.
 * Never invents emails/phones. Honest counts only.
 */

import {
  askAi,
  firecrawlScrape,
  firecrawlSearch,
  parseJsonBlock,
  researchProviderLabel,
  type ScrapedPage,
} from "@/lib/akquise.server";
import { getTemplate, type AkquiseTemplate, type AkquiseTemplateId } from "@/lib/akquise-templates";
import { TASK_COST } from "@/lib/task-cost";

export type RunStep = {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "failed" | "skipped";
  detail?: string | undefined;
  at?: string | undefined;
};

export type ProspectDraft = {
  name: string | null;
  org: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  snippet: string | null;
  score: number;
  source_url: string;
  website_signals?: string[];
};

export type RunPlan = {
  goal: string;
  template: AkquiseTemplateId;
  targetCount: number;
  region: string | null;
  queries: string[];
  scoringRubric: string;
  agents: string[];
};

export type VerifyResult = {
  ok: boolean;
  leadCount: number;
  withContact: number;
  targetCount: number;
  notes: string[];
  retried: boolean;
};

type LooseDb = { from: (t: string) => any };

function step(
  steps: RunStep[],
  id: string,
  label: string,
  status: RunStep["status"],
  detail?: string,
) {
  const existing = steps.find((s) => s.id === id);
  const row: RunStep = {
    id,
    label,
    status,
    detail,
    at: new Date().toISOString(),
  };
  if (existing) Object.assign(existing, row);
  else steps.push(row);
}

function normalizeUrl(u: string) {
  try {
    const url = new URL(u);
    url.hash = "";
    return url.href.replace(/\/$/, "");
  } catch {
    return u;
  }
}

function heuristicWebsiteSignals(page: ScrapedPage): string[] {
  const signals: string[] = [];
  const md = page.markdown.toLowerCase();
  if (page.url.startsWith("http://")) signals.push("http_only");
  const year = md.match(/©\s*(20\d{2})/) || md.match(/copyright\s*(20\d{2})/);
  if (year) {
    const y = Number(year[1]);
    if (y && y <= 2020) signals.push(`old_copyright_${y}`);
  }
  if (/<table[\s>]/.test(page.markdown) || /\|\s*-{3,}/.test(page.markdown)) {
    signals.push("table_heavy_layout");
  }
  if (page.markdown.length < 400) signals.push("thin_content");
  if (!/viewport|media\s*\(|@media/.test(md) && page.markdown.length > 200) {
    signals.push("no_responsive_cues");
  }
  return signals;
}

async function planRun(opts: {
  goal: string;
  template: AkquiseTemplate;
  targetCount: number;
  region: string | null;
  brief: string;
}): Promise<RunPlan> {
  const baseQueries = opts.template.searchHints.map((h) =>
    [opts.brief || opts.goal, opts.region, h].filter(Boolean).join(" "),
  );

  let queries = baseQueries;
  try {
    const raw = await askAi(
      `You plan cold-outreach / research runs for Aura OS. Return ONLY JSON:
{"queries":string[]}.
queries: 3-6 concrete web search queries to find prospects matching the goal. No invented facts. Language mix DE/EN ok for EU.
Never translate product names in queries (Discord, Telegram, LinkedIn stay English).`,
      `Template: ${opts.template.id}
Goal: ${opts.goal}
Brief: ${opts.brief}
Region: ${opts.region ?? "any"}
Hints: ${opts.template.searchHints.join(" | ")}`,
      { maxTokens: 800, timeoutMs: 25_000 },
    );
    const planned = parseJsonBlock<{ queries?: string[] }>(raw, {});
    if (planned.queries?.length) {
      queries = planned.queries;
    }
  } catch (e) {
    // Planning AI is optional — search hints alone still run Lead Hunter.
    console.warn("[akquise] plan AI failed, using template search hints:", e);
  }

  const normalized = queries
    .map((q) => q.trim())
    .filter(Boolean)
    .slice(0, 8);

  return {
    goal: opts.goal,
    template: opts.template.id,
    targetCount: opts.targetCount,
    region: opts.region,
    queries: normalized.length ? normalized : baseQueries.slice(0, 4),
    scoringRubric: opts.template.scoringRubric,
    agents: opts.template.agents,
  };
}

async function extractBatch(
  template: AkquiseTemplate,
  pages: ScrapedPage[],
  goal: string,
  brief: string,
  region: string | null,
  objective: string,
): Promise<ProspectDraft[]> {
  if (!pages.length) return [];
  const withSignals = pages.map((p) => ({
    ...p,
    signals: heuristicWebsiteSignals(p),
  }));
  const corpus = withSignals
    .map(
      (p, i) =>
        `--- SOURCE ${i + 1}: ${p.url}\nTITLE: ${p.title}\nSIGNALS: ${p.signals.join(", ") || "none"}\n${p.markdown.slice(0, 2800)}`,
    )
    .join("\n\n");

  const user = `Goal: ${goal}
Brief: ${brief}
Region: ${region ?? "any"}
Objective: ${objective}
Scoring: ${template.scoringRubric}

${corpus}`;

  const runOnce = async (systemExtra: string) => {
    const raw = await askAi(`${template.extractSystem}\n${systemExtra}`, user, {
      maxTokens: 4096,
      timeoutMs: 35_000,
    });
    return parseJsonBlock<ProspectDraft[]>(raw, []);
  };

  let list = await runOnce("Return a JSON array only. No markdown fences.");
  if (!list.length) {
    list = await runOnce(
      "STRICT: Output starts with [ and ends with ]. Empty array only if ZERO businesses appear in the sources. Prefer org+source_url even when email/phone are null.",
    );
  }
  return list.slice(0, 15);
}

function dedupeProspects(list: ProspectDraft[]): ProspectDraft[] {
  const seen = new Set<string>();
  const out: ProspectDraft[] = [];
  for (const p of list) {
    const key = normalizeUrl(p.source_url || "") + "|" + (p.email || p.org || p.name || "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      ...p,
      score: Math.max(0, Math.min(100, Math.round(Number(p.score) || 0))),
      email: p.email?.includes("@") ? p.email : null,
      phone: p.phone?.replace(/[^\d+\s()-]/g, "").trim() || null,
    });
  }
  return out;
}

function verifyProspects(
  prospects: ProspectDraft[],
  targetCount: number,
): VerifyResult {
  const notes: string[] = [];
  const withContact = prospects.filter((p) => p.email || p.phone).length;
  if (prospects.length === 0) notes.push("No prospects extracted from sources.");
  if (prospects.length < targetCount) {
    notes.push(`Found ${prospects.length} of ${targetCount} target — reporting honest count.`);
  }
  if (withContact === 0 && prospects.length > 0) {
    notes.push("No emails/phones on source pages — contacts left null (not invented).");
  }
  const ok = prospects.length > 0;
  return {
    ok,
    leadCount: prospects.length,
    withContact,
    targetCount,
    notes,
    retried: false,
  };
}

export type EngineResult = {
  plan: RunPlan;
  steps: RunStep[];
  prospects: ProspectDraft[];
  verify: VerifyResult;
  artifact: Record<string, unknown>;
  pagesScanned: number;
  auraCost: number;
};

/** Full plan → execute → verify for a campaign. */
export async function executeAkquiseRun(opts: {
  goal: string;
  templateId: string;
  targetCount: number;
  region: string | null;
  brief: string;
  objective: string;
  seedUrls: string[];
}): Promise<EngineResult> {
  const template = getTemplate(opts.templateId);
  const steps: RunStep[] = [];
  const target = Math.min(40, Math.max(3, opts.targetCount || template.defaultTarget));

  step(steps, "plan", "Planning search strategy", "running");
  const plan = await planRun({
    goal: opts.goal,
    template,
    targetCount: target,
    region: opts.region,
    brief: opts.brief || opts.goal,
  });
  step(steps, "plan", "Planning search strategy", "done", `${plan.queries.length} queries`);

  const pageMap = new Map<string, ScrapedPage>();
  step(steps, "search", `Searching the web (${researchProviderLabel()})`, "running");

  const maxQueryRounds = Math.min(8, plan.queries.length);
  const searchErrors: string[] = [];
  for (let i = 0; i < maxQueryRounds; i++) {
    const q = plan.queries[i]!;
    try {
      const found = await firecrawlSearch(q, 5);
      for (const p of found) pageMap.set(normalizeUrl(p.url), p);
      step(
        steps,
        `search_${i}`,
        `Search: ${q.slice(0, 48)}`,
        found.length ? "done" : "failed",
        `${found.length} hits`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "search failed";
      searchErrors.push(msg);
      step(steps, `search_${i}`, `Search: ${q.slice(0, 48)}`, "failed", msg);
    }
    if (pageMap.size >= target * 2) break;
  }

  for (const url of opts.seedUrls.slice(0, 6)) {
    const page = await firecrawlScrape(url);
    if (page) pageMap.set(normalizeUrl(page.url), page);
  }

  step(
    steps,
    "search",
    `Searching the web (${researchProviderLabel()})`,
    pageMap.size ? "done" : "failed",
    `${pageMap.size} unique pages`,
  );

  if (pageMap.size === 0) {
    const hint = searchErrors[0] || "No pages returned.";
    throw new Error(
      `Lead hunt found zero web sources. ${hint} Tip: set FIRECRAWL_API_KEY for stronger search, or refine the goal/region.`,
    );
  }

  // For website_leads: deepen scrape on company-looking URLs
  if (template.id === "website_leads" || template.id === "competitor_spy") {
    step(steps, "scrape", "Inspecting websites", "running");
    const toScrape = Array.from(pageMap.values())
      .filter((p) => !p.markdown || p.markdown.length < 200)
      .slice(0, 10);
    for (const p of toScrape) {
      const deep = await firecrawlScrape(p.url);
      if (deep) pageMap.set(normalizeUrl(deep.url), deep);
    }
    step(steps, "scrape", "Inspecting websites", "done", `${pageMap.size} pages ready`);
  } else {
    step(steps, "scrape", "Inspecting websites", "skipped", "Using search snippets");
  }

  const pages = Array.from(pageMap.values());
  step(steps, "extract", "Extracting prospects", "running");
  let prospects = dedupeProspects(
    await extractBatch(template, pages.slice(0, 12), opts.goal, opts.brief, opts.region, opts.objective),
  );

  // One safe retry with alternate queries if short
  let retried = false;
  if (prospects.length < Math.min(5, target) && plan.queries.length > 2) {
    retried = true;
    step(steps, "retry", "Retry with alternate queries", "running");
    const alt = plan.queries.slice(-2);
    for (const q of alt) {
      try {
        const found = await firecrawlSearch(`${q} impressum kontakt`, 4);
        for (const p of found) pageMap.set(normalizeUrl(p.url), p);
      } catch {
        /* continue */
      }
    }
    const more = await extractBatch(
      template,
      Array.from(pageMap.values()).slice(0, 14),
      opts.goal,
      opts.brief,
      opts.region,
      opts.objective,
    );
    prospects = dedupeProspects([...prospects, ...more]);
    step(steps, "retry", "Retry with alternate queries", "done", `now ${prospects.length} leads`);
  }

  if (prospects.length === 0 && pages.length > 0) {
    throw new Error(
      `Searched ${pages.length} pages but could not extract prospects. Sharpen the goal/region, or retry when AI providers have capacity.`,
    );
  }

  prospects = prospects.sort((a, b) => b.score - a.score).slice(0, target);
  step(steps, "extract", "Extracting prospects", "done", `${prospects.length} leads`);

  step(steps, "verify", "Verifying results", "running");
  const verify = verifyProspects(prospects, target);
  verify.retried = retried;
  step(
    steps,
    "verify",
    "Verifying results",
    verify.ok ? "done" : "failed",
    verify.notes.join(" · ") || "ok",
  );

  const auraCost = TASK_COST + Math.ceil(pages.length / 4) * 2;

  const artifact = {
    kind: template.outputKind,
    template: template.id,
    goal: opts.goal,
    leadCount: prospects.length,
    withContact: verify.withContact,
    sources: pages.slice(0, 30).map((p) => ({ url: p.url, title: p.title })),
    leadsPreview: prospects.map((p) => ({
      org: p.org,
      name: p.name,
      score: p.score,
      snippet: p.snippet,
      source_url: p.source_url,
      has_email: Boolean(p.email),
      has_phone: Boolean(p.phone),
      website_signals: p.website_signals ?? [],
    })),
    completedAt: new Date().toISOString(),
  };

  return {
    plan,
    steps,
    prospects,
    verify,
    artifact,
    pagesScanned: pages.length,
    auraCost,
  };
}

export async function burnAkquiseAura(
  supabase: LooseDb,
  companyId: string,
  amount: number,
  reason: string,
  sourceId: string,
) {
  const { burnAuraHard } = await import("@/lib/aura-spend.server");
  const cost = await burnAuraHard(supabase, companyId, amount, reason.slice(0, 120));
  await supabase.from("company_ledger_entries").insert({
    company_id: companyId,
    kind: "compute",
    amount_aura: cost,
    amount_usdc: 0,
    currency: "AURA",
    description: reason.slice(0, 160),
    source: "akquise",
    source_id: sourceId,
    status: "settled",
  });
  return cost;
}

export function makeShareSlug() {
  const alphabet = "abcdefghijkmnopqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}
