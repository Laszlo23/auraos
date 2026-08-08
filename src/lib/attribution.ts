const KEY = "aura.attribution";

export type Attribution = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  ref_code: string | null;
  landing_path: string | null;
};

const EMPTY: Attribution = {
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_content: null,
  utm_term: null,
  ref_code: null,
  landing_path: null,
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
  const fresh: Attribution = {
    utm_source: trim(p.get("utm_source")) ?? (p.get("ref") ? "referral" : referrerSource()),
    utm_medium:
      trim(p.get("utm_medium")) ??
      (p.get("ref") ? "invite" : document.referrer ? "referral" : "direct"),
    utm_campaign: trim(p.get("utm_campaign")),
    utm_content: trim(p.get("utm_content")),
    utm_term: trim(p.get("utm_term")),
    ref_code: trim(p.get("ref") ?? p.get("code") ?? p.get("invite"))?.toUpperCase() ?? null,
    landing_path: `${window.location.pathname}${window.location.search}`.slice(0, 200),
  };

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
