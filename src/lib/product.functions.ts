import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type LooseDb = { from: (table: string) => any; storage: { from: (b: string) => any } };

async function ownedCompany(supabase: LooseDb, userId: string) {
  const { data } = await supabase
    .from("companies")
    .select("id, name, niche, tagline")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("Company not found");
  return data as { id: string; name: string; niche: string | null; tagline: string | null };
}

export const getProductImageStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { geminiImagesConfigured, productImagesConfigured } =
      await import("@/lib/marketing.server");
    return {
      configured: productImagesConfigured(),
      gemini: geminiImagesConfigured(),
    };
  });

/**
 * Generate a product hero image with Gemini (or OpenAI fallback) and attach it to the product.
 */
export const generateProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { productId: string; prompt?: string }) => {
    const productId = String(input.productId ?? "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(productId)) throw new Error("Invalid product.");
    return {
      productId,
      prompt: input.prompt ? String(input.prompt).trim().slice(0, 1000) : "",
    };
  })
  .handler(async ({ data, context }) => {
    const { generateCreativeImageBytes, productImagesConfigured } =
      await import("@/lib/marketing.server");
    if (!productImagesConfigured()) {
      throw new Error(
        "Add GEMINI_API_KEY to .env (preferred) or OPENAI_API_KEY, then restart the server.",
      );
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const company = await ownedCompany(supabaseAdmin as unknown as LooseDb, context.userId);

    const { data: product } = await supabaseAdmin
      .from("products")
      .select("id, name, description, company_id")
      .eq("id", data.productId)
      .eq("company_id", company.id)
      .maybeSingle();
    if (!product) throw new Error("Product not found.");

    const { burnAuraHard } = await import("@/lib/aura-spend.server");
    const { TASK_COST } = await import("@/lib/task-cost");
    await burnAuraHard(
      supabaseAdmin as unknown as LooseDb,
      company.id,
      TASK_COST,
      "Product · image",
    );

    const prompt =
      data.prompt ||
      `Professional product photography for "${product.name}". ${product.description || ""}. Clean studio lighting, ecommerce hero shot, no text overlays, no logos, soft neutral background.`;

    const { bytes, mime, provider } = await generateCreativeImageBytes(prompt);
    const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";
    const path = `${company.id}/products/${product.id}-${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from("product-assets")
      .upload(path, bytes, { contentType: mime, upsert: false });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    const { data: pub } = supabaseAdmin.storage.from("product-assets").getPublicUrl(path);
    const url = pub.publicUrl;

    const { error: updErr } = await supabaseAdmin
      .from("products")
      .update({ image_url: url })
      .eq("id", product.id)
      .eq("company_id", company.id);
    if (updErr) throw new Error(updErr.message);

    await supabaseAdmin.from("files").insert({
      company_id: company.id,
      name: `product-${product.name.slice(0, 40)}.${ext}`,
      folder: "Products",
      kind: "image",
      size_kb: Math.max(1, Math.round(bytes.length / 1024)),
      summary: `AI product image (${provider}): ${prompt.slice(0, 160)}`,
      storage_path: path,
      mime_type: mime,
      size_bytes: bytes.length,
    });

    await supabaseAdmin.from("activity_events").insert({
      company_id: company.id,
      kind: "product",
      message: `Generated image for ${product.name} via ${provider}`,
    });

    return { url, path, provider };
  });

/**
 * Attach a previously uploaded storage object (or external URL) to a product.
 * Prefer client upload into product-assets/{companyId}/… then call this with the public URL.
 */
export const setProductMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { productId: string; imageUrl?: string | null; videoUrl?: string | null }) => {
    const productId = String(input.productId ?? "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(productId)) throw new Error("Invalid product.");
    const imageUrl =
      input.imageUrl === null
        ? null
        : input.imageUrl !== undefined
          ? String(input.imageUrl).trim().slice(0, 2000) || null
          : undefined;
    const videoUrl =
      input.videoUrl === null
        ? null
        : input.videoUrl !== undefined
          ? String(input.videoUrl).trim().slice(0, 2000) || null
          : undefined;
    if (imageUrl === undefined && videoUrl === undefined) {
      throw new Error("Provide imageUrl and/or videoUrl.");
    }
    return { productId, imageUrl, videoUrl };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const company = await ownedCompany(supabaseAdmin as unknown as LooseDb, context.userId);

    const patch: {
      image_url?: string | null;
      video_url?: string | null;
    } = {};
    if (data.imageUrl !== undefined) patch.image_url = data.imageUrl;
    if (data.videoUrl !== undefined) patch.video_url = data.videoUrl;

    const { data: row, error } = await supabaseAdmin
      .from("products")
      .update(patch)
      .eq("id", data.productId)
      .eq("company_id", company.id)
      .select("id, image_url, video_url")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Product not found.");
    return {
      id: row.id as string,
      image_url: (row.image_url as string | null) ?? null,
      video_url: (row.video_url as string | null) ?? null,
    };
  });
