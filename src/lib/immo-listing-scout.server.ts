/**
 * Daily AT listing scout: public search (Firecrawl / DDG fallback) over the
 * shared portal catalog. Never invents emails or phones.
 */

import { insertAkquiseLeadsSafe } from "@/lib/akquise-schema";
import { firecrawlSearch } from "@/lib/akquise.server";
import {
  DEFAULT_IMMO_WATCH,
  listingFromSearchHit,
  queriesForScout,
  type ImmoWatchCriteria,
  type ListingDraft,
} from "@/lib/immo-listing-scout";
import { portalSeedUrls } from "@/lib/immo-portals";

type LooseDb = { from: (t: string) => any };

function normalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = "";
    return url.href.replace(/\/$/, "");
  } catch {
    return u;
  }
}

function criteriaFromWatch(row: Record<string, unknown> | null): ImmoWatchCriteria {
  if (!row) return DEFAULT_IMMO_WATCH;
  const deals = Array.isArray(row.deal_types)
    ? (row.deal_types as string[]).filter((d): d is ImmoWatchCriteria["dealTypes"][number] =>
        d === "mieten" || d === "kaufen",
      )
    : DEFAULT_IMMO_WATCH.dealTypes;
  const types = Array.isArray(row.property_types)
    ? (row.property_types as string[]).map((s) => String(s).toLowerCase())
    : DEFAULT_IMMO_WATCH.propertyTypes;
  return {
    region: String(row.region || DEFAULT_IMMO_WATCH.region),
    dealTypes: deals.length ? deals : DEFAULT_IMMO_WATCH.dealTypes,
    propertyTypes: types.length ? types : DEFAULT_IMMO_WATCH.propertyTypes,
    preferPrivate: row.prefer_private !== false,
    minScore: Number(row.min_score) > 0 ? Number(row.min_score) : DEFAULT_IMMO_WATCH.minScore,
  };
}

async function existingSourceUrls(supabase: LooseDb, companyId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("akquise_leads")
    .select("source_url")
    .eq("company_id", companyId)
    .not("source_url", "is", null)
    .limit(400);
  const set = new Set<string>();
  for (const row of data ?? []) {
    if (row.source_url) set.add(normalizeUrl(String(row.source_url)));
  }
  return set;
}

async function ensureListingCampaign(
  supabase: LooseDb,
  companyId: string,
  criteria: ImmoWatchCriteria,
  campaignId: string | null,
): Promise<string> {
  if (campaignId) {
    const { data } = await supabase
      .from("akquise_campaigns")
      .select("id")
      .eq("id", campaignId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (data?.id) return String(data.id);
  }
  const { data: existing } = await supabase
    .from("akquise_campaigns")
    .select("id")
    .eq("company_id", companyId)
    .eq("template", "real_estate")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return String(existing.id);

  const { data: created, error } = await supabase
    .from("akquise_campaigns")
    .insert({
      company_id: companyId,
      name: `Immobilien Leads ${criteria.region}`,
      brief: `Neue Inserate in ${criteria.region} — Wohnungen und Häuser zum Vermitteln. Prefer provisionsfrei / von Privat.`,
      goal: `Finde vernünftige Mietwohnungen und Häuser in ${criteria.region} zum Vermitteln.`,
      region: criteria.region,
      template: "real_estate",
      language: "de",
      status: "running",
      target_count: 15,
      objective: "research",
      seed_urls: portalSeedUrls(),
    })
    .select("id")
    .single();
  if (error || !created?.id) throw new Error(error?.message || "campaign_create_failed");
  return String(created.id);
}

function listingRows(companyId: string, campaignId: string, listings: ListingDraft[]) {
  return listings.map((l) => ({
    company_id: companyId,
    campaign_id: campaignId,
    name: null,
    org: l.title,
    email: null,
    phone: null,
    address: l.address,
    snippet: l.snippet,
    score: l.score,
    source_url: l.source_url,
    status: "found",
    metadata: {
      kind: "listing",
      portal: l.portal,
      price: l.price,
      rooms: l.rooms,
      area_m2: l.area_m2,
      deal: l.deal,
      private_seller: l.private_seller,
    },
  }));
}

export async function scoutListingsForCompany(
  companyId: string,
  opts?: { force?: boolean; portalLimit?: number },
): Promise<{ inserted: number; scanned: number; skipped?: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const supabase = supabaseAdmin as unknown as LooseDb;

  const { data: watch } = await supabase
    .from("immo_listing_watches")
    .select(
      "company_id, region, deal_types, property_types, prefer_private, min_score, enabled, last_scout_at, campaign_id",
    )
    .eq("company_id", companyId)
    .maybeSingle();

  if (watch && watch.enabled === false) {
    return { inserted: 0, scanned: 0, skipped: "watch_disabled" };
  }

  const lastScout = watch?.last_scout_at ? new Date(String(watch.last_scout_at)).getTime() : 0;
  const staleMs = 8 * 60 * 60 * 1000;
  if (!opts?.force && lastScout && Date.now() - lastScout < staleMs) {
    return { inserted: 0, scanned: 0, skipped: "fresh" };
  }

  const criteria = criteriaFromWatch(watch as Record<string, unknown> | null);
  const portalLimit = opts?.force ? Math.min(10, opts.portalLimit ?? 10) : Math.min(6, opts.portalLimit ?? 6);
  const plan = queriesForScout(criteria, portalLimit);
  const seen = new Map<string, ListingDraft>();
  let scanned = 0;

  for (const { queries } of plan) {
    for (const q of queries) {
      try {
        const pages = await firecrawlSearch(q, 4);
        scanned += pages.length;
        for (const page of pages) {
          const draft = listingFromSearchHit({
            url: page.url,
            title: page.title,
            snippet: page.markdown.slice(0, 400),
            criteria,
          });
          if (!draft) continue;
          const key = normalizeUrl(draft.source_url);
          const prev = seen.get(key);
          if (!prev || draft.score > prev.score) seen.set(key, draft);
        }
      } catch (e) {
        console.warn("[immo-scout] search failed", q, e instanceof Error ? e.message : e);
      }
    }
  }

  const existing = await existingSourceUrls(supabase, companyId);
  const fresh = [...seen.values()]
    .filter((l) => !existing.has(normalizeUrl(l.source_url)))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  const campaignId = await ensureListingCampaign(
    supabase,
    companyId,
    criteria,
    watch?.campaign_id ? String(watch.campaign_id) : null,
  );

  let inserted = 0;
  if (fresh.length) {
    inserted = await insertAkquiseLeadsSafe(supabase, listingRows(companyId, campaignId, fresh));
  }

  await supabase.from("immo_listing_watches").upsert(
    {
      company_id: companyId,
      region: criteria.region,
      deal_types: criteria.dealTypes,
      property_types: criteria.propertyTypes,
      prefer_private: criteria.preferPrivate,
      min_score: criteria.minScore,
      enabled: true,
      campaign_id: campaignId,
      last_scout_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" },
  );

  if (inserted > 0) {
    await supabase.from("activity_events").insert({
      company_id: companyId,
      kind: "product",
      message: `AT listing scout: ${inserted} new ads from ${plan.length} portals · ${criteria.region}`,
    });
  }

  return { inserted, scanned };
}

/** Worker: refresh watches that are stale (realty desks with digest or an explicit watch). */
export async function runImmoListingScoutTick(limit = 6): Promise<{
  checked: number;
  inserted: number;
  errors: string[];
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const errors: string[] = [];
  let inserted = 0;

  const staleBefore = Date.now() - 8 * 60 * 60 * 1000;
  const { data: watches } = await supabaseAdmin
    .from("immo_listing_watches")
    .select("company_id, last_scout_at")
    .eq("enabled", true)
    .limit(40);

  const ids = new Set<string>();
  for (const w of watches ?? []) {
    const last = w.last_scout_at ? new Date(String(w.last_scout_at)).getTime() : 0;
    if (!last || last < staleBefore) ids.add(String(w.company_id));
  }

  if (ids.size < limit) {
    const { data: prefs } = await supabaseAdmin
      .from("lead_digest_prefs")
      .select("company_id")
      .eq("enabled", true)
      .limit(40);
    const prefIds = (prefs ?? []).map((p) => String(p.company_id));
    if (prefIds.length) {
      const { data: realty } = await supabaseAdmin
        .from("companies")
        .select("id")
        .eq("os_preset", "realty")
        .in("id", prefIds)
        .limit(limit);
      for (const row of realty ?? []) ids.add(String(row.id));
    }
  }

  const companyIds = [...ids].slice(0, limit);
  for (const companyId of companyIds) {
    try {
      const result = await scoutListingsForCompany(companyId);
      inserted += result.inserted;
    } catch (e) {
      errors.push(`${companyId}: ${e instanceof Error ? e.message : "scout_failed"}`);
    }
  }

  return { checked: companyIds.length, inserted, errors };
}
