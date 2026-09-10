import { activeImmoPortals, portalByHost, type ImmoPortal } from "@/lib/immo-portals";

export type ImmoDeal = "mieten" | "kaufen" | "unknown";

export type ImmoWatchCriteria = {
  region: string;
  dealTypes: ImmoDeal[];
  propertyTypes: string[];
  preferPrivate: boolean;
  minScore: number;
};

export const DEFAULT_IMMO_WATCH: ImmoWatchCriteria = {
  region: "Wien",
  dealTypes: ["mieten"],
  propertyTypes: ["wohnung", "haus"],
  preferPrivate: true,
  minScore: 55,
};

export type ListingDraft = {
  title: string;
  address: string | null;
  snippet: string;
  source_url: string;
  score: number;
  portal: string;
  price: string | null;
  rooms: number | null;
  area_m2: number | null;
  deal: ImmoDeal;
  private_seller: boolean;
};

const LISTING_PATH =
  /\/iad\/immobilien\/d\/|\/expose\/|\/properties\/property_detail\/|\/d\/0\d-wo-|findmyhome\.at\/\d{5,}/i;

export function looksLikeListingUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    const hostPath = `${u.hostname}${path}`;
    if (LISTING_PATH.test(hostPath) || LISTING_PATH.test(path)) return true;
    if (/\/regional\//.test(path)) return false;
    if (/\/immo\/wohnung-(mieten|kaufen)\/?$/.test(path)) return false;
    if (path === "/" || path === "/iad/immobilien" || path === "/iad/immobilien/") return false;
    if (/\/immobilien\/wien\/mietwohnung\/?$/.test(path)) return false;
    const segs = path.split("/").filter(Boolean);
    return segs.length >= 3 && /\d{6,}/.test(path);
  } catch {
    return false;
  }
}

export function portalSearchQueries(portal: ImmoPortal, criteria: ImmoWatchCriteria): string[] {
  const region = criteria.region.trim() || "Wien";
  const deals = criteria.dealTypes.filter((d) => d !== "unknown");
  const dealWord = deals.includes("kaufen") && !deals.includes("mieten") ? "kaufen" : "mieten";
  const types = criteria.propertyTypes.length ? criteria.propertyTypes : ["wohnung", "haus"];
  const queries = [
    `site:${portal.host} ${region} ${types[0]} ${dealWord} ${portal.searchHint}`
      .replace(/\s+/g, " ")
      .trim(),
    `site:${portal.host} ${region} ${types.slice(0, 2).join(" OR ")} ${dealWord} neu`,
  ];
  if (criteria.preferPrivate) {
    queries.push(`site:${portal.host} ${region} provisionsfrei OR "von Privat" ${dealWord}`);
  }
  return [...new Set(queries)].slice(0, portal.kind === "aggregator" ? 2 : 3);
}

export function extractPrice(text: string): string | null {
  const m =
    text.match(/€\s*([\d.]{3,7}(?:,\d{2})?)/i) ||
    text.match(/EUR\s*([\d.]{3,7}(?:,\d{2})?)/i) ||
    text.match(/([\d.]{3,7}(?:,\d{2})?)\s*€/);
  if (!m?.[1]) return null;
  return `€ ${m[1]}`;
}

export function extractRooms(text: string): number | null {
  const m = text.match(/(\d(?:[.,]\d)?)\s*[-–]?\s*(?:zimmer|zi\.?|room)/i);
  if (!m?.[1]) return null;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) && n > 0 && n < 20 ? n : null;
}

export function extractAreaM2(text: string): number | null {
  const m = text.match(/(\d{2,4}(?:[.,]\d{1,2})?)\s*(?:m²|m2|qm)/i);
  if (!m?.[1]) return null;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) && n >= 15 && n < 2000 ? Math.round(n) : null;
}

export function detectDeal(text: string): ImmoDeal {
  const t = text.toLowerCase();
  const rent = /mieten|mietwohnung|gesamtmiete|kaltmiete|warmmiete/.test(t);
  const buy = /kaufen|kaufpreis|eigentum|verkauf/.test(t);
  if (rent && !buy) return "mieten";
  if (buy && !rent) return "kaufen";
  return "unknown";
}

function regionHit(text: string, region: string): boolean {
  const t = text.toLowerCase();
  const r = region.toLowerCase();
  if (r.includes("wien") || r.includes("vienna")) {
    return /wien|vienna|1\d{3}\b/.test(t);
  }
  return t.includes(r);
}

export function scoreListing(opts: {
  title: string;
  snippet: string;
  url: string;
  criteria: ImmoWatchCriteria;
}): { score: number; deal: ImmoDeal; privateSeller: boolean } {
  const blob = `${opts.title} ${opts.snippet} ${opts.url}`;
  const t = blob.toLowerCase();
  let score = 40;
  if (regionHit(blob, opts.criteria.region)) score += 22;
  else score -= 25;

  const deal = detectDeal(blob);
  if (opts.criteria.dealTypes.includes(deal)) score += 12;
  if (/wohnung|apartment/.test(t) && opts.criteria.propertyTypes.includes("wohnung")) score += 8;
  if (
    /\bhaus\b|villa|reihenhaus|doppelhaus/.test(t) &&
    opts.criteria.propertyTypes.includes("haus")
  ) {
    score += 8;
  }

  const privateSeller = /provisionsfrei|von privat|privatinser|ohne makler|keine provision/.test(t);
  if (privateSeller) score += opts.criteria.preferPrivate ? 18 : 8;

  if (/neu|heute|aktuell|sofort|ab sofort|erstbezug/.test(t)) score += 8;
  if (/köln|berlin|münchen|hamburg|frankfurt/.test(t) && !regionHit(blob, opts.criteria.region)) {
    score -= 35;
  }
  if (!looksLikeListingUrl(opts.url)) score -= 20;

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    deal,
    privateSeller,
  };
}

export function listingFromSearchHit(opts: {
  url: string;
  title: string;
  snippet: string;
  criteria: ImmoWatchCriteria;
}): ListingDraft | null {
  if (!/^https?:\/\//i.test(opts.url)) return null;
  if (!looksLikeListingUrl(opts.url)) return null;
  const portal = portalByHost(opts.url);
  const scored = scoreListing(opts);
  if (scored.score < opts.criteria.minScore) return null;
  const blob = `${opts.title} ${opts.snippet}`;
  const title =
    opts.title
      .replace(/\s*[|\-–—].*$/, "")
      .trim()
      .slice(0, 160) || "Inserat";
  return {
    title,
    address: regionHit(blob, opts.criteria.region) ? opts.criteria.region : null,
    snippet: opts.snippet.replace(/\s+/g, " ").trim().slice(0, 280),
    source_url: opts.url,
    score: scored.score,
    portal: portal?.slug ?? "other",
    price: extractPrice(blob),
    rooms: extractRooms(blob),
    area_m2: extractAreaM2(blob),
    deal: scored.deal,
    private_seller: scored.privateSeller,
  };
}

export function queriesForScout(
  criteria: ImmoWatchCriteria,
  portalLimit: number,
): { portal: ImmoPortal; queries: string[] }[] {
  return activeImmoPortals()
    .slice(0, portalLimit)
    .map((portal) => ({ portal, queries: portalSearchQueries(portal, criteria) }));
}
