import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ShopMediaItem = {
  id: string;
  company_id: string;
  url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
};

const MAX_GALLERY = 12;

async function ownedCompanyId(
  supabase: { from: (t: string) => any },
  userId: string,
) {
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

function normalizeHttpUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString().slice(0, 2000);
  } catch {
    return null;
  }
}

export const listOwnerShopMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ShopMediaItem[]> => {
    const companyId = await ownedCompanyId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("shop_media")
      .select("id, company_id, url, caption, sort_order, created_at")
      .eq("company_id", companyId)
      .order("sort_order")
      .order("created_at");
    if (error) throw error;
    return (data ?? []) as ShopMediaItem[];
  });

export const addShopMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { url: string; caption?: string }) => {
    const url = normalizeHttpUrl(String(input.url || ""));
    if (!url) throw new Error("Bild-URL ungültig.");
    return {
      url,
      caption: typeof input.caption === "string" ? input.caption.trim().slice(0, 120) || null : null,
    };
  })
  .handler(async ({ data, context }) => {
    const companyId = await ownedCompanyId(context.supabase, context.userId);
    const { count } = await context.supabase
      .from("shop_media")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);
    if ((count ?? 0) >= MAX_GALLERY) {
      throw new Error(`Maximal ${MAX_GALLERY} Galerie-Bilder.`);
    }
    const { data: last } = await context.supabase
      .from("shop_media")
      .select("sort_order")
      .eq("company_id", companyId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sortOrder = ((last as { sort_order?: number } | null)?.sort_order ?? -1) + 1;
    const { data: created, error } = await context.supabase
      .from("shop_media")
      .insert({
        company_id: companyId,
        url: data.url,
        caption: data.caption,
        sort_order: sortOrder,
      })
      .select("id")
      .single();
    if (error || !created) throw error ?? new Error("Galerie-Bild fehlgeschlagen.");
    return { ok: true as const, id: created.id as string };
  });

export const updateShopMediaCaption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string; caption?: string }) => ({
    id: String(input.id || "").trim(),
    caption:
      typeof input.caption === "string" ? input.caption.trim().slice(0, 120) || null : null,
  }))
  .handler(async ({ data, context }) => {
    if (!data.id) throw new Error("Eintrag fehlt.");
    const companyId = await ownedCompanyId(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("shop_media")
      .update({ caption: data.caption })
      .eq("id", data.id)
      .eq("company_id", companyId);
    if (error) throw error;
    return { ok: true as const };
  });

export const deleteShopMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => ({ id: String(input.id || "").trim() }))
  .handler(async ({ data, context }) => {
    if (!data.id) throw new Error("Eintrag fehlt.");
    const companyId = await ownedCompanyId(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("shop_media")
      .delete()
      .eq("id", data.id)
      .eq("company_id", companyId);
    if (error) throw error;
    return { ok: true as const };
  });

export const reorderShopMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { ids: string[] }) => ({
    ids: (Array.isArray(input.ids) ? input.ids : [])
      .map((id) => String(id).trim())
      .filter(Boolean)
      .slice(0, MAX_GALLERY),
  }))
  .handler(async ({ data, context }) => {
    const companyId = await ownedCompanyId(context.supabase, context.userId);
    for (let i = 0; i < data.ids.length; i++) {
      const { error } = await context.supabase
        .from("shop_media")
        .update({ sort_order: i })
        .eq("id", data.ids[i])
        .eq("company_id", companyId);
      if (error) throw error;
    }
    return { ok: true as const };
  });
