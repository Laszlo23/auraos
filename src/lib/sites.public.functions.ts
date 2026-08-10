import { createServerFn } from "@tanstack/react-start";

import {
  isLandingTemplateId,
  type LandingTemplateId,
  type SiteContent,
} from "@/lib/sites/templates";
import { SITE_URL } from "@/lib/site";

function parseContent(raw: unknown): SiteContent {
  const c = (raw && typeof raw === "object" ? raw : {}) as Partial<SiteContent>;
  const out: SiteContent = {
    brand: String(c.brand ?? "Your company"),
    hero: String(c.hero ?? ""),
    subhead: String(c.subhead ?? ""),
    cta: String(c.cta ?? "Get started"),
  };
  if (c.offer) out.offer = String(c.offer);
  if (c.pricing) out.pricing = String(c.pricing);
  if (Array.isArray(c.faq)) out.faq = c.faq;
  if (c.accent) out.accent = String(c.accent);
  if (c.productName) out.productName = String(c.productName);
  return out;
}

export type PublicSitePayload = {
  id: string;
  slug: string;
  template_id: LandingTemplateId;
  status: string;
  content: SiteContent;
  product: {
    id: string;
    name: string;
    stripe_price_id: string;
    interval: string;
    amount_cents: number | null;
  } | null;
  preview: boolean;
  networkPeers?: { slug: string; company_name: string; city: string | null; niche: string | null }[];
  showNetworkStrip?: boolean;
};

export const getPublicSite = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string; preview?: boolean }) => ({
    slug: String(input.slug).toLowerCase(),
    preview: Boolean(input.preview),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("company_sites")
      .select("id, slug, template_id, status, content, company_id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw error;
    if (!row) return null;
    if (row.status !== "published" && !data.preview) return null;
    if (!isLandingTemplateId(row.template_id)) return null;

    const { data: product } = await supabaseAdmin
      .from("site_products")
      .select("id, name, stripe_price_id, interval, amount_cents")
      .eq("site_id", row.id)
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("network_backlink, is_local_business")
      .eq("id", row.company_id)
      .maybeSingle();

    let networkPeers: PublicSitePayload["networkPeers"] = [];
    const showNetworkStrip = Boolean(
      company?.network_backlink && company?.is_local_business && row.status === "published",
    );
    if (showNetworkStrip) {
      const { data: peers } = await supabaseAdmin.rpc("founding_network_peers", { _limit: 6 });
      const list = (peers as PublicSitePayload["networkPeers"]) ?? [];
      networkPeers = list.filter((p) => p.slug !== row.slug).slice(0, 5);
    }

    return {
      id: row.id,
      slug: row.slug,
      template_id: row.template_id,
      status: row.status,
      content: parseContent(row.content),
      product: product ?? null,
      preview: row.status !== "published",
      networkPeers,
      showNetworkStrip,
    } satisfies PublicSitePayload;
  });

export const captureSiteLead = createServerFn({ method: "POST" })
  .inputValidator((input: { slug: string; email: string; name?: string }) => {
    const email = String(input.email ?? "")
      .trim()
      .toLowerCase();
    if (!email.includes("@")) throw new Error("Valid email required");
    return {
      slug: String(input.slug).toLowerCase(),
      email,
      name: input.name ? String(input.name).trim() : undefined,
    };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: site } = await supabaseAdmin
      .from("company_sites")
      .select("id, company_id, status")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (!site) throw new Error("Site not found");

    const { error } = await supabaseAdmin.from("site_leads").insert({
      site_id: site.id,
      company_id: site.company_id,
      email: data.email,
      name: data.name ?? null,
      source: "landing_cta",
      status: "new",
    });
    if (error) throw error;
    return { ok: true as const };
  });

export const createSiteCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: { slug: string; email: string }) => {
    const email = String(input.email ?? "")
      .trim()
      .toLowerCase();
    if (!email.includes("@")) throw new Error("Valid email required");
    return { slug: String(input.slug).toLowerCase(), email };
  })
  .handler(async ({ data }) => {
    const secret = process.env["STRIPE_SECRET_KEY"];
    if (!secret) throw new Error("Stripe is not configured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: site } = await supabaseAdmin
      .from("company_sites")
      .select("id, company_id, slug, status, template_id")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (!site) throw new Error("Site not found");

    const { data: product } = await supabaseAdmin
      .from("site_products")
      .select("id, stripe_price_id, name")
      .eq("site_id", site.id)
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    if (!product?.stripe_price_id) {
      throw new Error("This site has no active Stripe price yet.");
    }

    const siteOrigin = process.env["SITE_URL"] || SITE_URL;
    const mode =
      site.template_id === "subscription_daily" ? "subscription" : "payment";

    const params = new URLSearchParams();
    params.set("mode", mode);
    params.set("success_url", `${siteOrigin}/s/${site.slug}?checkout=success`);
    params.set("cancel_url", `${siteOrigin}/s/${site.slug}?checkout=cancel`);
    params.set("customer_email", data.email);
    params.set("line_items[0][price]", product.stripe_price_id);
    params.set("line_items[0][quantity]", "1");
    params.set("metadata[kind]", "site_product");
    params.set("metadata[site_id]", site.id);
    params.set("metadata[company_id]", site.company_id);
    params.set("metadata[product_id]", product.id);
    params.set("metadata[customer_email]", data.email);
    params.set("client_reference_id", site.id);

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const json = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
    if (!res.ok || !json.url) {
      throw new Error(json.error?.message ?? "Could not start checkout");
    }
    return { url: json.url, sessionId: json.id ?? null };
  });
