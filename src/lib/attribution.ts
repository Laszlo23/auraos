import { funnelFromPathOrQuery, isFunnelId, type FunnelId } from "@/lib/funnels";

const KEY = "aura.attribution";
const FUNNEL_KEY = "aura.entry_funnel";
const LANG_KEY = "aura.ui_locale";
const PEER_KEY = "aura.peer_invite";

export type UiLocale = "en" | "de";

export type Attribution = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  ref_code: string | null;
  landing_path: string | null;
  /** First-touch entry funnel (os | agencies | sales | start | realty | local). */
  funnel: string | null;
  /** Preferred UI locale from /lokal or ?lang=de. */
  lang: string | null;
};

const EMPTY: Attribution = {
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_content: null,
  utm_term: null,
  ref_code: null,
  landing_path: null,
  funnel: null,
  lang: null,
};

const trim = (v: string | null) => {
  const s = (v ?? "").trim();
  return s ? s.slice(0, 120) : null;
};

/** Classify a referrer host when no UTM tags are present, so organic traffic still attributes. */
function referrerSource(): string | null {
  if (!document.referrer) return null;
  try {
    const host = new URL(document.referrer).hostname.replace(/^www\./, "");
    if (host === window.location.hostname) return null;
    const known: Record<string, string> = {
      "t.co": "x",
      "x.com": "x",
      "twitter.com": "x",
      "tiktok.com": "tiktok",
      "lnkd.in": "linkedin",
      "linkedin.com": "linkedin",
      "facebook.com": "facebook",
      "instagram.com": "instagram",
      "news.ycombinator.com": "hackernews",
      "reddit.com": "reddit",
      "google.com": "google",
      "youtube.com": "youtube",
    };
    return known[host] ?? host.slice(0, 120);
  } catch {
    return null;
  }
}

/**
 * First-touch attribution: the very first landing wins, so a visitor who
 * arrives from TikTok and converts three sessions later still credits TikTok.
 * Later visits only fill gaps they left empty.
 */
export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return EMPTY;

  const p = new URLSearchParams(window.location.search);
  const path = window.location.pathname;
  const pathFunnel =
    path === "/lokal" || path.startsWith("/lokal/")
      ? ("local" as const)
      : funnelFromPathOrQuery(path, p.get("funnel"));
  const langParam = (p.get("lang") || "").toLowerCase();
  const pathLang: UiLocale | null =
    path === "/lokal" || path.startsWith("/lokal/") || langParam === "de"
      ? "de"
      : langParam === "en"
        ? "en"
        : null;

  const fresh: Attribution = {
    utm_source: trim(p.get("utm_source")) ?? (p.get("ref") ? "referral" : referrerSource()),
    utm_medium:
      trim(p.get("utm_medium")) ??
      (p.get("ref") ? "invite" : document.referrer ? "referral" : "direct"),
    utm_campaign: trim(p.get("utm_campaign")),
    utm_content: trim(p.get("utm_content")),
    utm_term: trim(p.get("utm_term")),
    ref_code:
      trim(p.get("ref") ?? p.get("code") ?? p.get("invite") ?? p.get("peer"))?.toUpperCase() ??
      null,
    landing_path: `${window.location.pathname}${window.location.search}`.slice(0, 200),
    funnel: pathFunnel === "os" && !p.get("funnel") && path !== "/lokal" ? null : pathFunnel,
    lang: pathLang,
  };

  // Explicit ?funnel= wins; /for/* and /lokal only fill the key if empty (first-touch).
  if ((p.get("funnel") || path === "/lokal") && pathFunnel !== "os") {
    rememberFunnel(pathFunnel);
  } else if (pathFunnel !== "os") {
    try {
      const existing = window.localStorage.getItem(FUNNEL_KEY);
      if (!existing) rememberFunnel(pathFunnel);
    } catch {
      rememberFunnel(pathFunnel);
    }
  }

  if (pathLang) {
    rememberLocale(pathLang);
  } else {
    // First visit: prefer browser language when nothing explicit is set.
    try {
      const existing = window.localStorage.getItem(LANG_KEY);
      if (existing !== "de" && existing !== "en") {
        const nav = (navigator.language || "").toLowerCase();
        rememberLocale(nav.startsWith("de") ? "de" : "en");
      }
    } catch {
      /* private mode */
    }
  }

  const peer =
    trim(p.get("peer"))
      ?.toUpperCase()
      .replace(/[^A-Z0-9]/g, "") ?? null;
  if (peer && peer.length >= 6) {
    rememberPeerInvite(peer);
  }

  const stored = read();
  const merged: Attribution = { ...EMPTY };
  (Object.keys(EMPTY) as (keyof Attribution)[]).forEach((k) => {
    merged[k] = stored[k] ?? fresh[k];
  });

  try {
    window.localStorage.setItem(KEY, JSON.stringify(merged));
  } catch {
    /* private mode — attribution stays per-page-load */
  }
  return merged;
}

/** Persist the entry funnel until company creation stamps it. */
export function rememberFunnel(id: FunnelId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FUNNEL_KEY, id);
  } catch {
    /* private mode */
  }
}

export function peekFunnel(): FunnelId {
  if (typeof window === "undefined") return "os";
  try {
    const fromKey = window.localStorage.getItem(FUNNEL_KEY);
    if (fromKey && isFunnelId(fromKey)) return fromKey;
  } catch {
    /* ignore */
  }
  const attr = read();
  if (attr.funnel && isFunnelId(attr.funnel)) return attr.funnel;
  return "os";
}

export function takeFunnel(): FunnelId {
  const id = peekFunnel();
  try {
    window.localStorage.removeItem(FUNNEL_KEY);
  } catch {
    /* ignore */
  }
  return id;
}

export function rememberLocale(locale: UiLocale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LANG_KEY, locale);
  } catch {
    /* private mode */
  }
}

export function peekLocale(): UiLocale {
  if (typeof window === "undefined") return "en";
  try {
    const fromKey = window.localStorage.getItem(LANG_KEY);
    if (fromKey === "de" || fromKey === "en") return fromKey;
  } catch {
    /* ignore */
  }
  const attr = read();
  if (attr.lang === "de" || attr.lang === "en") return attr.lang;
  try {
    const nav = (navigator.language || "").toLowerCase();
    if (nav.startsWith("de")) return "de";
  } catch {
    /* ignore */
  }
  return "en";
}

export function takeLocale(): UiLocale {
  const locale = peekLocale();
  try {
    window.localStorage.removeItem(LANG_KEY);
  } catch {
    /* ignore */
  }
  return locale;
}

export function authHrefForLokal(mode: "signin" | "signup" = "signup", locale?: UiLocale): string {
  const lang = locale ?? peekLocale();
  return `/auth?funnel=local&lang=${lang}&mode=${mode}`;
}

export function rememberPeerInvite(code: string): void {
  if (typeof window === "undefined") return;
  const norm = code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 16);
  if (norm.length < 6) return;
  try {
    window.localStorage.setItem(PEER_KEY, norm);
  } catch {
    /* private mode */
  }
}

export function peekPeerInvite(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(PEER_KEY);
    return v && v.length >= 6 ? v : null;
  } catch {
    return null;
  }
}

export function takePeerInvite(): string | null {
  const code = peekPeerInvite();
  try {
    window.localStorage.removeItem(PEER_KEY);
  } catch {
    /* ignore */
  }
  return code;
}

function read(): Attribution {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<Attribution>) };
  } catch {
    return { ...EMPTY };
  }
}

/** Current stored attribution, capturing from the URL if nothing is stored yet. */
export function getAttribution(): Attribution {
  if (typeof window === "undefined") return EMPTY;
  const stored = read();
  const hasAny = (Object.keys(EMPTY) as (keyof Attribution)[]).some((k) => stored[k]);
  return hasAny ? stored : captureAttribution();
}
