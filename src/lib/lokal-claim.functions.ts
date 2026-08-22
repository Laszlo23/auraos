import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLACEHOLDER_NAMES, PLACEHOLDER_SLUGS } from "@/lib/company-slug";

function normalizeToken(raw: string) {
  return raw
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 80);
}

function isPlaceholderShop(row: { name?: string | null; slug?: string | null }) {
  const name = (row.name ?? "").trim();
  const slug = (row.slug ?? "").trim();
  return PLACEHOLDER_NAMES.has(name) || PLACEHOLDER_SLUGS.has(slug);
}

export const previewLokalShopClaim = createServerFn({ method: "GET" })
  .validator((input: { token: string }) => {
    const token = normalizeToken(input.token ?? "");
    if (token.length < 12) throw new Error("Ungültiger Claim-Link.");
    return { token };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: claim } = await supabaseAdmin
      .from("local_shop_claims")
      .select("id, claimed_at, claimed_by, company_id")
      .eq("token", data.token)
      .maybeSingle();
    if (!claim) return null;

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("name, slug, owner_display_name, city, street, postal_code, district, tagline")
      .eq("id", claim.company_id)
      .maybeSingle();
    if (!company) return null;

    return {
      name: company.name as string,
      slug: (company.slug as string | null) ?? null,
      owner_display_name: (company.owner_display_name as string | null) ?? null,
      city: (company.city as string | null) ?? null,
      street: (company.street as string | null) ?? null,
      postal_code: (company.postal_code as string | null) ?? null,
      district: (company.district as string | null) ?? null,
      tagline: (company.tagline as string | null) ?? null,
      claimed: Boolean(claim.claimed_at),
    };
  });

export const claimLokalShop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { token: string }) => {
    const token = normalizeToken(input.token ?? "");
    if (token.length < 12) throw new Error("Ungültiger Claim-Link.");
    return { token };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: claim } = await supabaseAdmin
      .from("local_shop_claims")
      .select("id, claimed_at, claimed_by, company_id")
      .eq("token", data.token)
      .maybeSingle();
    if (!claim) throw new Error("Dieser Claim-Link gilt nicht.");

    if (claim.claimed_by && claim.claimed_by !== context.userId) {
      throw new Error("Dieser Betrieb wurde schon übernommen.");
    }
    if (claim.claimed_by === context.userId) {
      return { alreadyClaimed: true as const };
    }

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id, owner_id, name")
      .eq("id", claim.company_id)
      .maybeSingle();
    if (!company) throw new Error("Betrieb nicht gefunden.");

    const previousOwner = company.owner_id as string;

    const { error: ownErr } = await supabaseAdmin
      .from("companies")
      .update({ owner_id: context.userId })
      .eq("id", company.id);
    if (ownErr) throw new Error(ownErr.message);

    const { error: claimErr } = await supabaseAdmin
      .from("local_shop_claims")
      .update({
        claimed_at: new Date().toISOString(),
        claimed_by: context.userId,
      })
      .eq("id", claim.id)
      .is("claimed_at", null);
    if (claimErr) throw new Error(claimErr.message);

    const { data: extras } = await supabaseAdmin
      .from("companies")
      .select("id, name, slug")
      .eq("owner_id", context.userId)
      .neq("id", company.id);

    for (const stub of extras ?? []) {
      if (!isPlaceholderShop(stub)) continue;
      const { error: delErr } = await supabaseAdmin.from("companies").delete().eq("id", stub.id);
      if (delErr) {
        await supabaseAdmin.from("companies").update({ owner_id: previousOwner }).eq("id", stub.id);
      }
    }

    return { alreadyClaimed: false as const, name: company.name as string };
  });
