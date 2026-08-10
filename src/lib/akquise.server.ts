// Server-only helpers for research + AI drafting.
// Prefer Firecrawl when FIRECRAWL_API_KEY is set; otherwise DuckDuckGo + fetch fallback.

import { aiChat, aiConfigHint } from "@/lib/ai.server";

const FIRECRAWL_DIRECT = "https://api.firecrawl.dev/v1";
const FIRECRAWL_LOVABLE = "https://connector-gateway.lovable.dev/firecrawl/v2";

export type ScrapedPage = { url: string; title: string; markdown: string };

function firecrawlKey(): string | undefined {
  return process.env["FIRECRAWL_API_KEY"]?.trim() || undefined;
}

/** Prefer direct Firecrawl; Lovable gateway only when explicitly opted in. */
function firecrawlMode(): "direct" | "lovable" | null {
  const key = firecrawlKey();
  if (!key) return null;
  if (process.env["FIRECRAWL_USE_LOVABLE"]?.trim() === "1" && process.env["LOVABLE_API_KEY"]) {
    return "lovable";
  }
  return "direct";
}

export function researchProviderLabel(): string {
  const mode = firecrawlMode();
  if (mode === "direct") return "Firecrawl";
  if (mode === "lovable") return "Firecrawl (Lovable)";
  return "web fallback (DuckDuckGo)";
}

function firecrawlRequest(
  path: "search" | "scrape",
  body: Record<string, unknown>,
): Promise<Response> {
  const mode = firecrawlMode();
  const key = firecrawlKey();
  if (!mode || !key) throw new Error("Firecrawl is not configured.");

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

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function htmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<\/(p|div|h[1-6]|li|tr|br|section|article)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim(),
  );
}

function extractTitle(html: string, fallback: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m?.[1]) return fallback;
  return decodeHtmlEntities(m[1].replace(/\s+/g, " ").trim()).slice(0, 200) || fallback;
}

async function fallbackScrape(url: string): Promise<ScrapedPage | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AuraOS-LeadHunter/1.0; +https://aibusiness.fun)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ctype = res.headers.get("content-type") || "";
    if (!/html|text|xml/i.test(ctype) && ctype) return null;
    const html = await res.text();
    const markdown = htmlToText(html).slice(0, 8000);
    if (markdown.length < 40) return null;
    return { url, title: extractTitle(html, url), markdown };
  } catch {
    return null;
  }
}

async function fallbackSearch(query: string, limit: number): Promise<ScrapedPage[]> {
  const q = query.trim();
  if (!q) return [];
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  let html = "";
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AuraOS-LeadHunter/1.0; +https://aibusiness.fun)",
        Accept: "text/html",
      },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`DuckDuckGo search failed (${res.status})`);
    html = await res.text();
  } catch (e) {
    clearTimeout(timer);
    throw e instanceof Error ? e : new Error(String(e));
  }

  const links: { href: string; title: string }[] = [];
  const re =
    /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) && links.length < limit * 2) {
    const rawHref = decodeHtmlEntities(match[1] || "");
    const title = decodeHtmlEntities(match[2].replace(/<[^>]+>/g, "").trim());
    let href = rawHref;
    try {
      const u = new URL(rawHref, "https://duckduckgo.com");
      if (u.pathname === "/l/" && u.searchParams.get("uddg")) {
        href = decodeURIComponent(u.searchParams.get("uddg")!);
      }
    } catch {
      continue;
    }
    if (!/^https?:\/\//i.test(href)) continue;
    if (/duckduckgo\.com|google\.[a-z.]+\/search|bing\.com\/search/i.test(href)) continue;
    links.push({ href, title: title || href });
  }

  const pages: ScrapedPage[] = [];
  for (const link of links.slice(0, limit)) {
    const scraped = await fallbackScrape(link.href);
    if (scraped) {
      pages.push(scraped);
    } else {
      pages.push({
        url: link.href,
        title: link.title,
        markdown: `Search result: ${link.title}\nURL: ${link.href}\nQuery: ${q}`,
      });
    }
  }
  return pages;
}

async function firecrawlSearchRaw(query: string, limit: number): Promise<ScrapedPage[]> {
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

async function firecrawlScrapeRaw(url: string): Promise<ScrapedPage | null> {
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

export async function firecrawlSearch(query: string, limit: number): Promise<ScrapedPage[]> {
  if (firecrawlMode()) {
    try {
      const pages = await firecrawlSearchRaw(query, limit);
      if (pages.length) return pages;
    } catch (e) {
      // Fall through to DuckDuckGo so Lead Hunter still returns results.
      console.warn("[akquise] Firecrawl search failed, using fallback:", e);
    }
  }
  return fallbackSearch(query, limit);
}

export async function firecrawlScrape(url: string): Promise<ScrapedPage | null> {
  if (firecrawlMode()) {
    try {
      const page = await firecrawlScrapeRaw(url);
      if (page) return page;
    } catch (e) {
      console.warn("[akquise] Firecrawl scrape failed, using fallback:", e);
    }
  }
  return fallbackScrape(url);
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
