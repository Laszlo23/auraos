import { createServerFn } from "@tanstack/react-start";

import { shopMediaUrl } from "@/lib/lokal-shops";

async function deskAuth() {
  return import("@/lib/desk-auth.server");
}

export const MAX_SHOP_PROOFS = 20;
const MAX_PROOF_BYTES = 8 * 1024 * 1024;
const ALLOWED_PROOF_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
]);

export type DeskLocalShop = {
  id: string;
  name: string;
  slug: string | null;
  niche: string | null;
  district: string | null;
  city: string | null;
  proofCount: number;
};

export type DeskReviewProof = {
  id: string;
  company_id: string;
  url: string;
  caption: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
};

function deskToken(input?: { token?: string | null }) {
  return (
    String(input?.token || "")
      .trim()
      .slice(0, 500) || null
  );
}

function relationMissing(error: { message?: string } | null | undefined) {
  const msg = error?.message || "";
  return (
    msg.includes("does not exist") || msg.includes("relation") || msg.includes("shop_review_proofs")
  );
}

function extFromType(contentType: string, filename: string) {
  const fromName = filename
    .split(".")
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (fromName && fromName.length <= 5) return fromName;
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("heic") || contentType.includes("heif")) return "heic";
  return "jpg";
}

export const listDeskLocalBusinesses = createServerFn({ method: "GET" })
  .validator((input: { token?: string }) => ({ token: deskToken(input) }))
  .handler(async ({ data }): Promise<DeskLocalShop[]> => {
    const { requireDeskAuth } = await deskAuth();
    requireDeskAuth(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: companies, error } = await supabaseAdmin
      .from("companies")
      .select("id, name, slug, niche, district, city, created_at")
      .eq("is_local_business", true)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    const shops = (companies ?? []) as Array<{
      id: string;
      name: string;
      slug: string | null;
      niche: string | null;
      district: string | null;
      city: string | null;
    }>;

    const { data: proofRows, error: proofError } = await supabaseAdmin
      .from("shop_review_proofs")
      .select("company_id");

    const counts = new Map<string, number>();
    if (!proofError && proofRows) {
      for (const row of proofRows as { company_id: string }[]) {
        counts.set(row.company_id, (counts.get(row.company_id) ?? 0) + 1);
      }
    }

    return shops.map((shop) => ({
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      niche: shop.niche,
      district: shop.district,
      city: shop.city,
      proofCount: counts.get(shop.id) ?? 0,
    }));
  });

export const listDeskReviewProofs = createServerFn({ method: "GET" })
  .validator((input: { token?: string; companyId: string }) => ({
    token: deskToken(input),
    companyId: String(input.companyId || "").trim(),
  }))
  .handler(async ({ data }): Promise<DeskReviewProof[]> => {
    const { requireDeskAuth } = await deskAuth();
    requireDeskAuth(data.token);
    if (!data.companyId) throw new Error("Betrieb fehlt");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("shop_review_proofs")
      .select("id, company_id, image_url, caption, sort_order, created_by, created_at")
      .eq("company_id", data.companyId)
      .order("sort_order")
      .order("created_at");

    if (error) {
      if (relationMissing(error)) return [];
      throw error;
    }

    return (
      (rows ?? []) as Array<{
        id: string;
        company_id: string;
        image_url: string;
        caption: string | null;
        sort_order: number;
        created_by: string | null;
        created_at: string;
      }>
    ).map((row) => ({
      id: row.id,
      company_id: row.company_id,
      url: shopMediaUrl(row.image_url) || row.image_url,
      caption: row.caption,
      sort_order: row.sort_order,
      created_by: row.created_by,
      created_at: row.created_at,
    }));
  });

export const addDeskReviewProof = createServerFn({ method: "POST" })
  .validator(
    (input: {
      token?: string;
      companyId: string;
      filename?: string;
      contentType?: string;
      dataBase64: string;
      caption?: string;
    }) => ({
      token: deskToken(input),
      companyId: String(input.companyId || "").trim(),
      filename: String(input.filename || "review.jpg")
        .trim()
        .slice(0, 180),
      contentType: String(input.contentType || "image/jpeg")
        .trim()
        .toLowerCase()
        .slice(0, 80),
      dataBase64: String(input.dataBase64 || ""),
      caption:
        typeof input.caption === "string" ? input.caption.trim().slice(0, 120) || null : null,
    }),
  )
  .handler(async ({ data }) => {
    const { requireDeskAuth } = await deskAuth();
    const auth = requireDeskAuth(data.token);
    if (!data.companyId) throw new Error("Betrieb fehlt");
    if (!ALLOWED_PROOF_TYPES.has(data.contentType)) {
      throw new Error("Nur Bilder (JPG/PNG/WebP).");
    }

    const raw = data.dataBase64.includes(",")
      ? data.dataBase64.slice(data.dataBase64.indexOf(",") + 1)
      : data.dataBase64;
    const bytes = Buffer.from(raw, "base64");
    if (!bytes.length) throw new Error("Bild leer.");
    if (bytes.length > MAX_PROOF_BYTES) throw new Error("Bild zu groß — max. 8 MB.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("id", data.companyId)
      .eq("is_local_business", true)
      .maybeSingle();
    if (companyError) throw companyError;
    if (!company) throw new Error("Betrieb nicht gefunden.");

    const { count, error: countError } = await supabaseAdmin
      .from("shop_review_proofs")
      .select("id", { count: "exact", head: true })
      .eq("company_id", data.companyId);
    if (countError && !relationMissing(countError)) throw countError;
    if ((count ?? 0) >= MAX_SHOP_PROOFS) {
      throw new Error(`Maximal ${MAX_SHOP_PROOFS} Screenshots pro Betrieb.`);
    }

    const { data: last } = await supabaseAdmin
      .from("shop_review_proofs")
      .select("sort_order")
      .eq("company_id", data.companyId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const ext = extFromType(data.contentType, data.filename);
    const path = `${data.companyId}/proofs/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("product-assets")
      .upload(path, bytes, {
        contentType: data.contentType,
        upsert: false,
      });
    if (upErr) throw new Error(`Upload fehlgeschlagen: ${upErr.message}`);

    const { data: pub } = supabaseAdmin.storage.from("product-assets").getPublicUrl(path);
    const imageUrl = pub.publicUrl;
    const nextOrder = (typeof last?.sort_order === "number" ? last.sort_order : -1) + 1;

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("shop_review_proofs")
      .insert({
        company_id: data.companyId,
        image_url: imageUrl,
        caption: data.caption,
        source: "google_screenshot",
        sort_order: nextOrder,
        created_by: auth.displayName,
      })
      .select("id, company_id, image_url, caption, sort_order, created_by, created_at")
      .single();

    if (insertError) {
      if (relationMissing(insertError)) {
        throw new Error("Beweis-Tabelle fehlt — `supabase db push` ausführen.");
      }
      throw insertError;
    }

    const row = inserted as {
      id: string;
      company_id: string;
      image_url: string;
      caption: string | null;
      sort_order: number;
      created_by: string | null;
      created_at: string;
    };

    return {
      ok: true as const,
      proof: {
        id: row.id,
        company_id: row.company_id,
        url: shopMediaUrl(row.image_url) || row.image_url,
        caption: row.caption,
        sort_order: row.sort_order,
        created_by: row.created_by,
        created_at: row.created_at,
      } satisfies DeskReviewProof,
    };
  });

export const deleteDeskReviewProof = createServerFn({ method: "POST" })
  .validator((input: { token?: string; proofId: string }) => ({
    token: deskToken(input),
    proofId: String(input.proofId || "").trim(),
  }))
  .handler(async ({ data }) => {
    const { requireDeskAuth } = await deskAuth();
    requireDeskAuth(data.token);
    if (!data.proofId) throw new Error("Screenshot fehlt");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("shop_review_proofs")
      .delete()
      .eq("id", data.proofId);
    if (error) {
      if (relationMissing(error)) {
        throw new Error("Beweis-Tabelle fehlt — `supabase db push` ausführen.");
      }
      throw error;
    }
    return { ok: true as const };
  });
