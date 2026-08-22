import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  explainNachbarError,
  normalizeNachbarCheckinSource,
  safeHttpUrl,
} from "@/lib/nachbar-play";

type LooseDb = {
  from: (t: string) => any;
  rpc: (
    fn: string,
    args?: Record<string, unknown> | undefined,
  ) => Promise<{ data: unknown; error: Error | null }>;
};

function asDb(client: unknown): LooseDb {
  return client as LooseDb;
}

function rpcError(error: { message?: string }, fallback: string): Error {
  return new Error(explainNachbarError(error.message || "", fallback));
}

export type NachbarMission = {
  id: string;
  slug: string;
  kind: string;
  title: string;
  body: string;
  grant_amount: number;
  done: boolean;
};

export type NachbarStamp = {
  company_id: string;
  company_name: string;
  slug: string | null;
  stamp_count: number;
  filled: boolean;
};

export type NachbarHub = {
  profile: {
    user_id: string;
    display_name: string | null;
    city: string | null;
    referral_code: string;
    balance: number;
    home_company_id: string | null;
    welcome_granted_at: string | null;
  };
  progress: {
    streak_days: number;
    last_confirmed_day: string | null;
    city_score: number;
    aura_weight: number;
  };
  ledger: { id: string; kind: string; amount: number; reason: string; created_at: string }[];
  shops: {
    id: string;
    name: string;
    slug: string | null;
    city: string | null;
    niche: string | null;
  }[];
  friends: {
    invitee_id: string;
    display_name: string | null;
    status: string;
    created_at: string;
    activated_at: string | null;
  }[];
  checkins: {
    id: string;
    company_id?: string;
    company_name: string;
    slug?: string | null;
    status: string;
    source?: string | null;
    created_at: string;
    google_review_url: string | null;
    rated?: boolean;
    owned?: boolean;
  }[];
  stamps: NachbarStamp[];
  missions: NachbarMission[];
  has_company?: boolean;
  owned_company_name?: string | null;
  next_shop: {
    id: string;
    name: string;
    slug: string | null;
    city: string | null;
    niche: string | null;
    featured: boolean;
  } | null;
  week_key: string;
};

function emptyHub(): NachbarHub {
  return {
    profile: {
      user_id: "",
      display_name: null,
      city: null,
      referral_code: "",
      balance: 0,
      home_company_id: null,
      welcome_granted_at: null,
    },
    progress: { streak_days: 0, last_confirmed_day: null, city_score: 0, aura_weight: 0 },
    ledger: [],
    shops: [],
    friends: [],
    checkins: [],
    stamps: [],
    missions: [],
    next_shop: null,
    week_key: "",
    has_company: false,
    owned_company_name: null,
  };
}

function asHub(raw: unknown): NachbarHub {
  if (!raw || typeof raw !== "object") return emptyHub();
  const row = raw as Partial<NachbarHub>;
  return {
    ...emptyHub(),
    ...row,
    progress: { ...emptyHub().progress, ...(row.progress ?? {}) },
    profile: { ...emptyHub().profile, ...(row.profile ?? {}) },
    ledger: row.ledger ?? [],
    shops: row.shops ?? [],
    friends: row.friends ?? [],
    checkins: row.checkins ?? [],
    stamps: row.stamps ?? [],
    missions: row.missions ?? [],
    next_shop: row.next_shop ?? null,
    has_company: Boolean(row.has_company),
    owned_company_name: row.owned_company_name ?? null,
  };
}

export const getNachbarHub = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await asDb(context.supabase).rpc("get_nachbar_hub");
    if (error) throw error;
    return asHub(data);
  });

export const ensureNachbarProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      city?: string | undefined;
      displayName?: string | undefined;
      homeCompanyId?: string | undefined;
      friendCode?: string | undefined;
    }) => ({
      city:
        String(input.city || "")
          .trim()
          .slice(0, 80) || undefined,
      displayName:
        String(input.displayName || "")
          .trim()
          .slice(0, 80) || undefined,
      homeCompanyId: String(input.homeCompanyId || "").trim() || undefined,
      friendCode:
        String(input.friendCode || "")
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 12) || undefined,
    }),
  )
  .handler((async ({ data, context }: any) => {
    const { data: row, error } = await asDb(context.supabase).rpc("ensure_nachbar_profile", {
      _city: data.city ?? null,
      _display_name: data.displayName ?? null,
      _home_company_id: data.homeCompanyId ?? null,
      _friend_code: data.friendCode ?? null,
    });
    if (error) throw rpcError(error, "Profil nicht gespeichert.");
    return row ?? null;
  }) as any);

export const requestNachbarCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { code: string; source?: string }) => ({
    code: String(input.code || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 16),
    source: normalizeNachbarCheckinSource(input.source),
  }))
  .handler(async ({ data, context }) => {
    if (data.code.length < 6) throw new Error("Code ungültig.");
    const { data: result, error } = await asDb(context.supabase).rpc("nachbar_request_checkin", {
      _code: data.code,
      _source: data.source,
    });
    if (error) throw rpcError(error, "Check-in fehlgeschlagen.");
    return result as {
      ok: boolean;
      pending?: boolean;
      checkin_id: string;
      company_id: string;
      company_name: string;
      google_review_url: string | null;
      slug: string | null;
      message?: string;
    };
  });

export const requestNachbarCheckinBySlug = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { slug: string; source?: string }) => ({
    slug: String(input.slug || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 64),
    source: normalizeNachbarCheckinSource(input.source || "shop"),
  }))
  .handler(async ({ data, context }) => {
    if (data.slug.length < 2) throw new Error("Laden nicht gefunden.");
    const { data: result, error } = await asDb(context.supabase).rpc(
      "nachbar_request_checkin_for_slug",
      {
        _slug: data.slug,
        _source: data.source,
      },
    );
    if (error) throw rpcError(error, "Check-in fehlgeschlagen.");
    return result as {
      ok: boolean;
      pending?: boolean;
      checkin_id: string;
      company_id: string;
      company_name: string;
      google_review_url: string | null;
      slug: string | null;
      message?: string;
    };
  });

export const shareNachbarWin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await asDb(context.supabase).rpc("nachbar_share_win");
    if (error) throw rpcError(error, "Teilen zählt erst nach einem Besuch.");
    return data as { ok: boolean; granted: boolean; checkin_id: string };
  });

export const leaveNachbarFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { checkinId: string; note: string }) => ({
    checkinId: String(input.checkinId || "").trim(),
    note: String(input.note || "")
      .trim()
      .slice(0, 400),
  }))
  .handler(async ({ data, context }) => {
    if (!data.checkinId) throw new Error("Check-in fehlt.");
    const { data: result, error } = await asDb(context.supabase).rpc("nachbar_leave_feedback", {
      _checkin_id: data.checkinId,
      _note: data.note,
    });
    if (error) throw rpcError(error, "Feedback nicht gespeichert.");
    return result as { ok: boolean; granted: boolean };
  });

export const markNachbarAr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { code: string }) => ({
    code: String(input.code || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 16),
  }))
  .handler(async ({ data, context }) => {
    if (data.code.length < 6) throw new Error("Code ungültig.");
    const { data: result, error } = await asDb(context.supabase).rpc("nachbar_mark_ar", {
      _code: data.code,
    });
    if (error) throw rpcError(error, "AR-Blick nicht möglich.");
    return result as {
      ok: boolean;
      pending: boolean;
      granted: boolean;
      company_name: string;
    };
  });

export type NachbarCityShop = {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  niche: string | null;
  tagline: string | null;
  homepage_url: string | null;
  emoji: string;
  district: string | null;
  cover_url: string | null;
  featured: boolean;
  visit_count: number;
  rating_avg: number | null;
  rating_count: number;
};

export type NachbarCityMission = {
  id: string;
  slug: string;
  kind: string;
  title: string;
  body: string;
  grant_amount: number;
};

function asCityShop(row: Record<string, unknown>): NachbarCityShop {
  const avgRaw = row.rating_avg;
  const avg = typeof avgRaw === "number" ? avgRaw : avgRaw != null ? Number(avgRaw) : null;
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    slug: (row.slug as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    niche: (row.niche as string | null) ?? null,
    tagline: (row.tagline as string | null) ?? null,
    homepage_url: safeHttpUrl((row.homepage_url as string | null) ?? null),
    emoji: String(row.emoji || "◎").slice(0, 8),
    district: (row.district as string | null) ?? null,
    cover_url: safeHttpUrl((row.cover_url as string | null) ?? null),
    featured: Boolean(row.featured),
    visit_count: Number(row.visit_count ?? 0),
    rating_avg: avg != null && Number.isFinite(avg) ? avg : null,
    rating_count: Number(row.rating_count ?? 0),
  };
}

/** Public city map — never throws, never needs a login. */
async function loadNachbarCityBoard() {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = asDb(supabaseAdmin);
    const { data } = await db.rpc("nachbar_city_board");
    if (data && typeof data === "object") {
      const raw = data as { shops?: unknown; missions?: unknown };
      const shops = Array.isArray(raw.shops)
        ? raw.shops.map((s) => asCityShop(s as Record<string, unknown>))
        : [];
      const missions = Array.isArray(raw.missions) ? (raw.missions as NachbarCityMission[]) : [];
      if (shops.length > 0) return { shops, missions };
    }
  } catch {
    /* fall through to directory query */
  }

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: companies } = await supabaseAdmin
      .from("companies")
      .select(
        "id, name, slug, city, niche, tagline, homepage_url, emoji, district, cover_url, featured, local_cohort_number, local_seat_paid_at, is_local_business",
      )
      .eq("is_local_business", true)
      .not("slug", "is", null)
      .order("featured", { ascending: false })
      .order("local_cohort_number", { ascending: true })
      .limit(48);

    const rows = (companies ?? []).filter(
      (c) =>
        Boolean(c.slug) &&
        (Boolean(c.featured) || Boolean(c.local_seat_paid_at) || c.local_cohort_number != null),
    );
    const ids = rows.map((c) => c.id);
    const db = asDb(supabaseAdmin);
    const [{ data: checkinRows }, { data: ratingRows }, { data: missionRows }] = await Promise.all([
      ids.length
        ? db
            .from("nachbar_checkins")
            .select("company_id")
            .in("company_id", ids)
            .eq("status", "confirmed")
        : Promise.resolve({ data: [] }),
      ids.length
        ? db.from("nachbar_ratings").select("company_id, score").in("company_id", ids)
        : Promise.resolve({ data: [] }),
      db
        .from("nachbar_missions")
        .select("id, slug, kind, title, body, grant_amount, sort_order")
        .eq("is_active", true)
        .order("sort_order"),
    ]);

    const visits = new Map<string, number>();
    for (const row of (checkinRows ?? []) as { company_id: string }[]) {
      visits.set(row.company_id, (visits.get(row.company_id) ?? 0) + 1);
    }
    const scores = new Map<string, number[]>();
    for (const row of (ratingRows ?? []) as { company_id: string; score: number }[]) {
      const list = scores.get(row.company_id) ?? [];
      list.push(Number(row.score));
      scores.set(row.company_id, list);
    }

    return {
      shops: rows.map((c) => {
        const list = scores.get(c.id) ?? [];
        const avg =
          list.length > 0
            ? Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 10) / 10
            : null;
        return asCityShop({
          ...c,
          visit_count: visits.get(c.id) ?? 0,
          rating_avg: avg,
          rating_count: list.length,
        });
      }),
      missions: ((missionRows ?? []) as NachbarCityMission[]).map((m) => ({
        id: m.id,
        slug: m.slug,
        kind: m.kind,
        title: m.title,
        body: m.body,
        grant_amount: m.grant_amount,
      })),
    };
  } catch {
    return { shops: [] as NachbarCityShop[], missions: [] as NachbarCityMission[] };
  }
}

export const getNachbarCityBoard = createServerFn({ method: "GET" }).handler(async () => {
  return loadNachbarCityBoard();
});

export const listNachbarPublicShops = createServerFn({ method: "GET" }).handler(async () => {
  const board = await loadNachbarCityBoard();
  return board.shops;
});

export const rateNachbarShop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { checkinId: string; score: number }) => ({
    checkinId: String(input.checkinId || "").trim(),
    score: Math.round(Number(input.score)),
  }))
  .handler(async ({ data, context }) => {
    if (!data.checkinId) throw new Error("Check-in fehlt.");
    if (data.score < 1 || data.score > 5) throw new Error("Note muss 1 bis 5 sein.");
    const { data: result, error } = await asDb(context.supabase).rpc("nachbar_rate_shop", {
      _checkin_id: data.checkinId,
      _score: data.score,
    });
    if (error) throw rpcError(error, "Note nicht gespeichert.");
    return result as { ok: boolean; granted: boolean; score: number };
  });

export const getOwnerNachbarCheckinCode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input?: { companyId?: string }) => ({
    companyId: String(input?.companyId || "").trim() || undefined,
  }))
  .handler(async ({ data, context }) => {
    const { data: code, error } = await asDb(context.supabase).rpc("owner_nachbar_checkin_code", {
      _company_id: data.companyId ?? null,
    });
    if (error) throw error;
    return { code: String(code || "") };
  });

export const listOwnerNachbarPendingCheckins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await asDb(context.supabase).rpc("owner_nachbar_pending_checkins");
    if (error) throw error;
    return (data ?? []) as {
      id: string;
      user_id: string;
      status: string;
      source: string;
      created_at: string;
      display_name: string | null;
      stamp_count?: number;
      company_id?: string;
      company_name?: string;
    }[];
  });

export const confirmNachbarCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { checkinId: string }) => ({
    checkinId: String(input.checkinId || "").trim(),
  }))
  .handler(async ({ data, context }) => {
    if (!data.checkinId) throw new Error("Check-in fehlt.");
    const { data: result, error } = await asDb(context.supabase).rpc("nachbar_confirm_checkin", {
      _checkin_id: data.checkinId,
    });
    if (error) throw rpcError(error, "Bestätigen fehlgeschlagen.");
    return result as { ok: boolean; checkin_id: string; company_name?: string; self?: boolean };
  });

export const rejectNachbarCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { checkinId: string }) => ({
    checkinId: String(input.checkinId || "").trim(),
  }))
  .handler(async ({ data, context }) => {
    if (!data.checkinId) throw new Error("Check-in fehlt.");
    const { data: result, error } = await asDb(context.supabase).rpc("nachbar_reject_checkin", {
      _checkin_id: data.checkinId,
    });
    if (error) throw rpcError(error, "Absagen fehlgeschlagen.");
    return result as { ok: boolean; checkin_id: string };
  });

export const resolveNachbarShopBySlug = createServerFn({ method: "GET" })
  .validator((input: { slug: string }) => ({
    slug: String(input.slug || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 64),
  }))
  .handler(async ({ data }) => {
    if (!data.slug) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("companies")
      .select("id, name, slug, city, niche, google_review_url")
      .eq("slug", data.slug)
      .eq("is_local_business", true)
      .maybeSingle();
    if (error) throw error;
    return row as {
      id: string;
      name: string;
      slug: string;
      city: string | null;
      niche: string | null;
      google_review_url: string | null;
    } | null;
  });
