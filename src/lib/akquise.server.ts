// Server-only helpers for research + AI drafting.
// Prefer direct Firecrawl when FIRECRAWL_API_KEY is set; optional Lovable connector gateway.

import { aiChat, aiConfigHint } from "@/lib/ai.server";

const FIRECRAWL_DIRECT = "https://api.firecrawl.dev/v1";
const FIRECRAWL_LOVABLE = "https://connector-gateway.lovable.dev/firecrawl/v2";

export type ScrapedPage = { url: string; title: string; markdown: string };

function researchConfigured(): boolean {
  return Boolean(process.env["FIRECRAWL_API_KEY"]);
}

function firecrawlMode(): "direct" | "lovable" | null {
  const key = process.env["FIRECRAWL_API_KEY"];
  if (!key) return null;
  if (process.env["LOVABLE_API_KEY"]) return "lovable";
  return "direct";
}

function firecrawlRequest(
  path: "search" | "scrape",
  body: Record<string, unknown>,
): Promise<Response> {
  const mode = firecrawlMode();
  const key = process.env["FIRECRAWL_API_KEY"];
  if (!mode || !key) throw new Error("The research agent is not configured (set FIRECRAWL_API_KEY).");

  if (mode === "direct") {
    return fetch(`${FIRECRAWL_DIRECT}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });
  }

  const lovable = process.env["LOVABLE_API_KEY"]!;
  return fetch(`${FIRECRAWL_LOVABLE}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovable}`,
      "X-Connection-Api-Key": key,
    },
    body: JSON.stringify(body),
  });
}

export async function firecrawlSearch(query: string, limit: number): Promise<ScrapedPage[]> {
  if (!researchConfigured()) throw new Error("The research agent is not configured (set FIRECRAWL_API_KEY).");

  const res = await firecrawlRequest("search", {
    query,
    limit,
    scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
  });
  const body = (await res.json()) as {
    success?: boolean;
    data?: { url?: string; title?: string; markdown?: string; description?: string }[];
    web?: { url?: string; title?: string; markdown?: string }[];
    error?: string;
  };
  if (!res.ok) throw new Error(body.error || `Search failed (${res.status})`);
  const rows = body.data ?? body.web ?? [];
  return rows
    .filter((r) => r.url)
    .map((r) => ({
      url: r.url!,
      title: r.title ?? r.url!,
      markdown: (
        r.markdown ??
        ("description" in r ? String((r as { description?: string }).description ?? "") : "")
      ).slice(0, 6000),
    }));
}

export async function firecrawlScrape(url: string): Promise<ScrapedPage | null> {
  if (!researchConfigured()) return null;
  const res = await firecrawlRequest("scrape", {
    url,
    formats: ["markdown"],
    onlyMainContent: true,
  });
  if (!res.ok) return null;
  const body = (await res.json()) as {
    markdown?: string;
    metadata?: { title?: string };
    data?: { markdown?: string; metadata?: { title?: string } };
  };
  const markdown = body.markdown ?? body.data?.markdown;
  if (!markdown) return null;
  const title = body.metadata?.title ?? body.data?.metadata?.title ?? url;
  return { url, title, markdown: markdown.slice(0, 8000) };
}

export async function askAi(system: string, user: string): Promise<string> {
  try {
    return await aiChat({
      system,
      messages: [{ role: "user", content: user }],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "The AI agent is not configured.";
    if (msg.includes("not configured") || msg.includes("missing_ai")) {
      throw new Error(`The AI agent is not configured. ${aiConfigHint()}`);
    }
    throw e instanceof Error ? e : new Error(String(e));
  }
}

export function parseJsonBlock<T>(raw: string, fallback: T): T {
  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = cleaned.search(/[[{]/);
  if (start === -1) return fallback;
  const end = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return fallback;
  }
}
