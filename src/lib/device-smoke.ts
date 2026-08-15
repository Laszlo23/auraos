import { SITE_URL, VIEWPORT_CONTENT } from "@/lib/site";

/** Public surfaces that must render for a visitor on any phone, in any country. */
export const PUBLIC_SMOKE_PATHS = [
  "/",
  "/live",
  "/proof",
  "/auth",
  "/roadmap",
  "/lightpaper",
  "/whitepaper",
  "/lokal",
  "/wien",
  "/story",
  "/sticker",
  "/team",
] as const;

/**
 * Real-world phone / in-app browsers. We cannot rent every handset;
 * these UAs cover the engines people actually open Aura OS with.
 */
export const PHONE_USER_AGENTS: { id: string; ua: string }[] = [
  {
    id: "android-chrome-pixel",
    ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  },
  {
    id: "android-samsung",
    ua: "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/122.0.0.0 Mobile Safari/537.36",
  },
  {
    id: "iphone-safari",
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  },
  {
    id: "ipad-safari",
    ua: "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  },
  {
    id: "android-firefox",
    ua: "Mozilla/5.0 (Android 14; Mobile; rv:127.0) Gecko/127.0 Firefox/127.0",
  },
  {
    id: "desktop-chrome",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  },
];

/** Accept-Language from the regions we care about. App must not geo-block. */
export const COUNTRY_ACCEPT_LANGUAGE: { country: string; header: string }[] = [
  { country: "US", header: "en-US,en;q=0.9" },
  { country: "GB", header: "en-GB,en;q=0.9" },
  { country: "DE", header: "de-DE,de;q=0.9,en;q=0.8" },
  { country: "AT", header: "de-AT,de;q=0.9,en;q=0.8" },
  { country: "BR", header: "pt-BR,pt;q=0.9,en;q=0.8" },
  { country: "JP", header: "ja-JP,ja;q=0.9,en;q=0.8" },
  { country: "EG", header: "ar-EG,ar;q=0.9,en;q=0.8" },
  { country: "IN", header: "hi-IN,hi;q=0.8,en-IN,en;q=0.9" },
  { country: "KE", header: "sw-KE,sw;q=0.8,en;q=0.9" },
  { country: "FR", header: "fr-FR,fr;q=0.9,en;q=0.8" },
  { country: "CN", header: "zh-CN,zh;q=0.9,en;q=0.8" },
  { country: "KR", header: "ko-KR,ko;q=0.9,en;q=0.8" },
  { country: "MX", header: "es-MX,es;q=0.9,en;q=0.8" },
  { country: "PL", header: "pl-PL,pl;q=0.9,en;q=0.8" },
];

export type HtmlSmokeIssue = string;

export function htmlWorksOnPhone(html: string): HtmlSmokeIssue[] {
  const issues: HtmlSmokeIssue[] = [];
  const lower = html.toLowerCase();
  if (!html.includes(VIEWPORT_CONTENT) && !/name=["']viewport["']/i.test(html)) {
    issues.push("missing viewport meta");
  } else if (!html.includes("width=device-width")) {
    issues.push("viewport is not device-width");
  }
  if (!/charset\s*=\s*["']?utf-8/i.test(html)) {
    issues.push("missing utf-8 charset");
  }
  if (lower.includes("this page didn't load") || lower.includes("this page didn&#39;t load")) {
    issues.push("root error boundary rendered");
  }
  if (!/aura os/i.test(html)) {
    issues.push("Aura OS title/copy missing");
  }
  return issues;
}

export function publicUrl(path: string, origin = SITE_URL) {
  if (path === "/") return origin;
  return `${origin}${path}`;
}

export type FetchSmokeResult = {
  url: string;
  status: number;
  contentType: string;
  issues: HtmlSmokeIssue[];
};

export async function fetchPublicSmoke(
  path: string,
  opts: { userAgent: string; acceptLanguage: string; origin?: string },
): Promise<FetchSmokeResult> {
  const url = publicUrl(path, opts.origin);
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent": opts.userAgent,
      "accept-language": opts.acceptLanguage,
      accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(20_000),
  });
  const contentType = res.headers.get("content-type") ?? "";
  const html = contentType.includes("text/html") ? await res.text() : "";
  const issues: HtmlSmokeIssue[] = [];
  if (res.status >= 400) issues.push(`HTTP ${res.status}`);
  if (res.status < 400 && !contentType.includes("text/html")) {
    issues.push(`unexpected content-type ${contentType || "(empty)"}`);
  }
  if (html) issues.push(...htmlWorksOnPhone(html));
  return { url, status: res.status, contentType, issues };
}
