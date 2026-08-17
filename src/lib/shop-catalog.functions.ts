import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CatalogKind = "service" | "product" | "ticket";
export type BookingMode = "none" | "link" | "request";

export type ShopCatalogItem = {
  id: string;
  company_id: string;
  kind: CatalogKind;
  name: string;
  description: string | null;
  price_cents: number | null;
  currency: string;
  duration_min: number | null;
  image_url: string | null;
  sort_order: number;
  is_public: boolean;
  booking_mode: BookingMode;
  booking_url: string | null;
};

export type ShopBookingRequest = {
  id: string;
  company_id: string;
  catalog_item_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  preferred_at: string | null;
  party_size: number | null;
  message: string | null;
  status: "pending" | "confirmed" | "declined" | "cancelled";
  created_at: string;
  item_name?: string | null;
};

function asKind(raw: string): CatalogKind {
  if (raw === "product" || raw === "ticket" || raw === "service") return raw;
  return "service";
}

function asMode(raw: string): BookingMode {
  if (raw === "none" || raw === "link" || raw === "request") return raw;
  return "request";
}

async function ownedCompanyId(supabase: {
  from: (t: string) => any;
}, userId: string) {
  const { data, error } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error || !data) throw new Error("Kein Betrieb gefunden.");
  return data.id as string;
}

export const listPublicShopCatalog = createServerFn({ method: "GET" })
  .validator((input: { companyId: string }) => ({
    companyId: String(input.companyId || "").trim(),
  }))
  .handler(async ({ data }): Promise<ShopCatalogItem[]> => {
    if (!data.companyId) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("shop_catalog_items")
      .select(
        "id, company_id, kind, name, description, price_cents, currency, duration_min, image_url, sort_order, is_public, booking_mode, booking_url",
      )
      .eq("company_id", data.companyId)
      .eq("is_public", true)
      .order("sort_order")
      .order("created_at");
    if (error) throw error;
    return (rows ?? []) as ShopCatalogItem[];
  });

export const listOwnerShopCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ShopCatalogItem[]> => {
    const companyId = await ownedCompanyId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("shop_catalog_items")
      .select(
        "id, company_id, kind, name, description, price_cents, currency, duration_min, image_url, sort_order, is_public, booking_mode, booking_url",
      )
      .eq("company_id", companyId)
      .order("sort_order")
      .order("created_at");
    if (error) throw error;
    return (data ?? []) as ShopCatalogItem[];
  });

export const upsertShopCatalogItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: Partial<ShopCatalogItem> & { name: string }) => ({
    id: input.id?.trim() || undefined,
    name: String(input.name || "").trim().slice(0, 80),
    kind: asKind(String(input.kind || "service")),
    description: input.description?.trim().slice(0, 400) || null,
    price_cents:
      typeof input.price_cents === "number" && Number.isFinite(input.price_cents)
        ? Math.max(0, Math.round(input.price_cents))
        : null,
    duration_min:
      typeof input.duration_min === "number" && Number.isFinite(input.duration_min)
        ? Math.max(0, Math.round(input.duration_min))
        : null,
    booking_mode: asMode(String(input.booking_mode || "request")),
    booking_url: input.booking_url?.trim().slice(0, 300) || null,
    image_url:
      input.image_url === null
        ? null
        : typeof input.image_url === "string"
          ? input.image_url.trim().slice(0, 2000) || null
          : undefined,
    is_public: input.is_public !== false,
  }))
  .handler(async ({ data, context }) => {
    if (data.name.length < 2) throw new Error("Name fehlt.");
    const companyId = await ownedCompanyId(context.supabase, context.userId);
    const row: Record<string, unknown> = {
      company_id: companyId,
      name: data.name,
      kind: data.kind,
      description: data.description,
      price_cents: data.price_cents,
      duration_min: data.duration_min,
      booking_mode: data.booking_mode,
      booking_url: data.booking_url,
      is_public: data.is_public,
      updated_at: new Date().toISOString(),
    };
    if (data.image_url !== undefined) row.image_url = data.image_url;
    if (data.id) {
      const { error } = await context.supabase
        .from("shop_catalog_items")
        .update(row)
        .eq("id", data.id)
        .eq("company_id", companyId);
      if (error) throw error;
      return { ok: true as const, id: data.id };
    }
    const { data: created, error } = await context.supabase
      .from("shop_catalog_items")
      .insert(row)
      .select("id")
      .single();
    if (error || !created) throw error ?? new Error("Konnte Angebot nicht speichern.");
    return { ok: true as const, id: created.id as string };
  });

export const deleteShopCatalogItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => ({ id: String(input.id || "").trim() }))
  .handler(async ({ data, context }) => {
    if (!data.id) throw new Error("Eintrag fehlt.");
    const companyId = await ownedCompanyId(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("shop_catalog_items")
      .delete()
      .eq("id", data.id)
      .eq("company_id", companyId);
    if (error) throw error;
    return { ok: true as const };
  });

export const setShopCatalogImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string; imageUrl: string | null }) => ({
    id: String(input.id || "").trim(),
    imageUrl:
      input.imageUrl === null
        ? null
        : String(input.imageUrl || "")
            .trim()
            .slice(0, 2000) || null,
  }))
  .handler(async ({ data, context }) => {
    if (!data.id) throw new Error("Eintrag fehlt.");
    if (data.imageUrl) {
      try {
        const u = new URL(data.imageUrl);
        if (u.protocol !== "http:" && u.protocol !== "https:") {
          throw new Error("invalid");
        }
      } catch {
        throw new Error("Bild-URL ungültig.");
      }
    }
    const companyId = await ownedCompanyId(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("shop_catalog_items")
      .update({ image_url: data.imageUrl, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("company_id", companyId);
    if (error) throw error;
    return { ok: true as const };
  });

export const requestShopBooking = createServerFn({ method: "POST" })
  .validator((input: {
    slug: string;
    catalogItemId?: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    preferredAt?: string;
    partySize?: number;
    message?: string;
  }) => ({
    slug: String(input.slug || "")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 64),
    catalogItemId: input.catalogItemId?.trim() || undefined,
    customerName: String(input.customerName || "").trim().slice(0, 80),
    customerEmail: String(input.customerEmail || "").trim().slice(0, 120) || undefined,
    customerPhone: String(input.customerPhone || "").trim().slice(0, 40) || undefined,
    preferredAt: input.preferredAt?.trim() || undefined,
    partySize:
      typeof input.partySize === "number" && Number.isFinite(input.partySize)
        ? Math.min(40, Math.max(1, Math.round(input.partySize)))
        : undefined,
    message: String(input.message || "").trim().slice(0, 500) || undefined,
  }))
  .handler(async ({ data }) => {
    if (data.customerName.length < 2) throw new Error("Name fehlt.");
    if (!data.customerEmail && !data.customerPhone) {
      throw new Error("Mail oder Telefon — mindestens eins.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id, name")
      .eq("slug", data.slug)
      .eq("is_local_business", true)
      .maybeSingle();
    if (!company) throw new Error("Betrieb nicht gefunden.");

    const { count } = await supabaseAdmin
      .from("shop_booking_requests")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
    if ((count ?? 0) > 40) throw new Error("Gerade zu viele Anfragen — später nochmal.");

    const { error } = await supabaseAdmin.from("shop_booking_requests").insert({
      company_id: company.id,
      catalog_item_id: data.catalogItemId ?? null,
      customer_name: data.customerName,
      customer_email: data.customerEmail ?? null,
      customer_phone: data.customerPhone ?? null,
      preferred_at: data.preferredAt ?? null,
      party_size: data.partySize ?? null,
      message: data.message ?? null,
      status: "pending",
    });
    if (error) throw error;
    return { ok: true as const, company: company.name as string };
  });

export const listOwnerBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ShopBookingRequest[]> => {
    const companyId = await ownedCompanyId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("shop_booking_requests")
      .select(
        "id, company_id, catalog_item_id, customer_name, customer_email, customer_phone, preferred_at, party_size, message, status, created_at",
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw error;
    return (data ?? []) as ShopBookingRequest[];
  });

export const updateShopBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string; status: ShopBookingRequest["status"] }) => ({
    id: String(input.id || "").trim(),
    status: input.status,
  }))
  .handler(async ({ data, context }) => {
    switch (data.status) {
      case "pending":
      case "confirmed":
      case "declined":
      case "cancelled":
        break;
      default: {
        const _never: never = data.status;
        throw new Error(String(_never));
      }
    }
    const companyId = await ownedCompanyId(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("shop_booking_requests")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("company_id", companyId);
    if (error) throw error;
    return { ok: true as const };
  });
