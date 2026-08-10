import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type LooseDb = {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>;
};

function asDb(client: unknown): LooseDb {
  return client as LooseDb;
}

function publicClient() {
  const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

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
  ledger: { id: string; kind: string; amount: number; reason: string; created_at: string }[];
  shops: { id: string; name: string; slug: string | null; city: string | null; niche: string | null }[];
  friends: {
    invitee_id: string;
    status: string;
    created_at: string;
    activated_at: string | null;
  }[];
  checkins: {
    id: string;
    company_name: string;
    status: string;
    created_at: string;
    google_review_url: string | null;
  }[];
};

export const getNachbarHub = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await asDb(context.supabase).rpc("get_nachbar_hub");
    if (error) throw error;
    return data as NachbarHub;
  });

export const ensureNachbarProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      city?: string;
      displayName?: string;
      homeCompanyId?: string;
      friendCode?: string;
    }) => ({
      city: String(input.city || "").trim().slice(0, 80) || undefined,
      displayName: String(input.displayName || "").trim().slice(0, 80) || undefined,
      homeCompanyId: String(input.homeCompanyId || "").trim() || undefined,
      friendCode: String(input.friendCode || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 12) || undefined,
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await asDb(context.supabase).rpc("ensure_nachbar_profile", {
      _city: data.city ?? null,
      _display_name: data.displayName ?? null,
      _home_company_id: data.homeCompanyId ?? null,
      _friend_code: data.friendCode ?? null,
    });
    if (error) throw error;
    return row;
  });

export const requestNachbarCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string; source?: string }) => ({
    code: String(input.code || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 16),
    source: String(input.source || "qr").slice(0, 32),
  }))
  .handler(async ({ data, context }) => {
    if (data.code.length < 6) throw new Error("Code ungültig.");
    const { data: result, error } = await asDb(context.supabase).rpc("nachbar_request_checkin", {
      _code: data.code,
      _source: data.source,
    });
    if (error) {
      const msg = error.message || "";
      if (/shop_not_found/i.test(msg)) throw new Error("Laden nicht gefunden.");
      if (/invalid_code/i.test(msg)) throw new Error("Code ungültig.");
      throw error;
    }
    return result as {
      ok: boolean;
      checkin_id: string;
      company_id: string;
      company_name: string;
      google_review_url: string | null;
      slug: string | null;
    };
  });

export const listNachbarPublicShops = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase.rpc("nachbar_public_shops", { _limit: 24 });
  if (error) throw error;
  return (data ?? []) as {
    id: string;
    name: string;
    slug: string | null;
    city: string | null;
    niche: string | null;
    tagline: string | null;
    homepage_url: string | null;
  }[];
});

export const getOwnerNachbarCheckinCode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await asDb(context.supabase).rpc("owner_nachbar_checkin_code");
    if (error) throw error;
    return { code: String(data || "") };
  });

export const resolveNachbarShopBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => ({
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
      .select("id, name, slug, city, niche, google_review_url, nachbar_checkin_code")
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
      nachbar_checkin_code: string | null;
    } | null;
  });
