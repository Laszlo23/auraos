import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DEMO_SUBSCRIPTION_SITES,
  defaultContentFor,
  isLandingTemplateId,
  slugifyBrand,
  type LandingTemplateId,
  type SiteContent,
} from "@/lib/sites/templates";

type LooseDb = {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>;
};
function asDb(client: unknown): LooseDb {
  return client as LooseDb;
}

async function ownedCompany(supabase: LooseDb, userId: string) {
  const { data } = await supabase
    .from("companies")
    .select("id, name")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data?.id) throw new Error("Company not found");
  return data as { id: string; name: string };
}

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

export type CompanySiteRow = {
  id: string;
  company_id: string;
  slug: string;
  template_id: LandingTemplateId;
  status: "draft" | "published";
  content: SiteContent;
  published_at: string | null;
  updated_at: string;
  products?: {
    id: string;
    name: string;
    stripe_price_id: string;
    interval: string;
    amount_cents: number | null;
    active: boolean;
  }[];
};

export const listCompanySites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = asDb(context.supabase);
    const company = await ownedCompany(supabase, context.userId);
    const { data, error } = await supabase
      .from("company_sites")
      .select("id, company_id, slug, template_id, status, content, published_at, updated_at")
      .eq("company_id", company.id)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as any[]).map((row) => ({
      ...row,
      content: parseContent(row.content),
    })) as CompanySiteRow[];
  });

export const getCompanySite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteId?: string; slug?: string }) => ({
    siteId: input.siteId ? String(input.siteId) : undefined,
    slug: input.slug ? String(input.slug) : undefined,
  }))
  .handler(async ({ data, context }) => {
    const supabase = asDb(context.supabase);
    const company = await ownedCompany(supabase, context.userId);
    let q = supabase
      .from("company_sites")
      .select("id, company_id, slug, template_id, status, content, published_at, updated_at")
      .eq("company_id", company.id);
    if (data.siteId) q = q.eq("id", data.siteId);
    else if (data.slug) q = q.eq("slug", data.slug);
    else throw new Error("siteId or slug required");
    const { data: row, error } = await q.maybeSingle();
    if (error) throw error;
    if (!row) return null;
    const { data: products } = await supabase
      .from("site_products")
      .select("id, name, stripe_price_id, interval, amount_cents, active")
      .eq("site_id", row.id);
    return {
      ...row,
      content: parseContent(row.content),
      products: products ?? [],
    } as CompanySiteRow;
  });

export const createCompanySite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { templateId: string; slug?: string }) => {
    if (!isLandingTemplateId(input.templateId)) throw new Error("Unknown template");
    return {
      templateId: input.templateId,
      slug: input.slug ? slugifyBrand(input.slug) : undefined,
    };
  })
  .handler(async ({ data, context }) => {
    const supabase = asDb(context.supabase);
    const company = await ownedCompany(supabase, context.userId);
    const content = defaultContentFor(company.name, data.templateId);
    const slug = data.slug || slugifyBrand(company.name) || `site-${Date.now().toString(36)}`;
    const { data: row, error } = await supabase
      .from("company_sites")
      .insert({
        company_id: company.id,
        slug,
        template_id: data.templateId,
        status: "draft",
        content,
      })
      .select("id, company_id, slug, template_id, status, content, published_at, updated_at")
      .single();
    if (error) {
      if (String(error.message).includes("company_sites_slug_unique")) {
        throw new Error("That slug is taken — pick another.");
      }
      throw error;
    }
    return { ...row, content: parseContent(row.content) } as CompanySiteRow;
  });

export const updateCompanySite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      siteId: string;
      slug?: string;
      content?: SiteContent;
      stripePriceId?: string;
      productName?: string;
    }) => ({
      siteId: String(input.siteId),
      slug: input.slug ? slugifyBrand(input.slug) : undefined,
      content: input.content,
      stripePriceId: input.stripePriceId?.trim() || undefined,
      productName: input.productName?.trim() || undefined,
    }),
  )
  .handler(async ({ data, context }) => {
    const supabase = asDb(context.supabase);
    const company = await ownedCompany(supabase, context.userId);
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.slug) patch["slug"] = data.slug;
    if (data.content) patch["content"] = data.content;
    const { data: row, error } = await supabase
      .from("company_sites")
      .update(patch)
      .eq("id", data.siteId)
      .eq("company_id", company.id)
      .select("id, company_id, slug, template_id, status, content, published_at, updated_at")
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error("Site not found");

    if (data.stripePriceId) {
      const name =
        data.productName ||
        parseContent(row.content).productName ||
        parseContent(row.content).brand;
      const { data: existing } = await supabase
        .from("site_products")
        .select("id")
        .eq("site_id", row.id)
        .limit(1)
        .maybeSingle();
      if (existing?.id) {
        await supabase
          .from("site_products")
          .update({
            name,
            stripe_price_id: data.stripePriceId,
            active: true,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("site_products").insert({
          site_id: row.id,
          name,
          stripe_price_id: data.stripePriceId,
          interval: "month",
          active: true,
        });
      }
    }

    return { ...row, content: parseContent(row.content) } as CompanySiteRow;
  });

export const publishCompanySite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteId: string; publish?: boolean }) => ({
    siteId: String(input.siteId),
    publish: input.publish !== false,
  }))
  .handler(async ({ data, context }) => {
    const supabase = asDb(context.supabase);
    const company = await ownedCompany(supabase, context.userId);
    const { data: row, error } = await supabase
      .from("company_sites")
      .update({
        status: data.publish ? "published" : "draft",
        published_at: data.publish ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.siteId)
      .eq("company_id", company.id)
      .select("id, company_id, slug, template_id, status, content, published_at, updated_at")
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error("Site not found");

    if (data.publish) {
      await supabase.rpc("enqueue_founder_review", {
        _company_id: company.id,
        _site_id: row.id,
      });
      // Paid-conversion middle tier: company live + site published
      await supabase.rpc("advance_referral", { _stage: "activated" });
    }

    return { ...row, content: parseContent(row.content) } as CompanySiteRow;
  });

/** Ensure Horoscope Daily + Tarot Daily exist for the founder's company (demo products). */
export const ensureDemoSubscriptionSites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = asDb(context.supabase);
    const company = await ownedCompany(supabase, context.userId);
    const created: string[] = [];

    for (const demo of DEMO_SUBSCRIPTION_SITES) {
      const priceId = process.env[demo.envPriceKey]?.trim();
      const { data: existing } = await supabase
        .from("company_sites")
        .select("id")
        .eq("slug", demo.slug)
        .maybeSingle();

      let siteId = existing?.id as string | undefined;
      if (!siteId) {
        const { data: row, error } = await supabase
          .from("company_sites")
          .insert({
            company_id: company.id,
            slug: demo.slug,
            template_id: demo.template_id,
            status: "published",
            content: demo.content,
            published_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (error) {
          if (String(error.message).includes("company_sites_slug_unique")) continue;
          throw error;
        }
        siteId = row.id;
        created.push(demo.slug);
      } else {
        await supabase
          .from("company_sites")
          .update({
            company_id: company.id,
            content: demo.content,
            status: "published",
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", siteId);
      }

      if (priceId && siteId) {
        const { data: prod } = await supabase
          .from("site_products")
          .select("id")
          .eq("site_id", siteId)
          .limit(1)
          .maybeSingle();
        if (prod?.id) {
          await supabase
            .from("site_products")
            .update({
              name: demo.productName,
              stripe_price_id: priceId,
              active: true,
            })
            .eq("id", prod.id);
        } else {
          await supabase.from("site_products").insert({
            site_id: siteId,
            name: demo.productName,
            description: demo.content.subhead,
            stripe_price_id: priceId,
            interval: "month",
            amount_cents: 499,
            active: true,
          });
        }
      }
    }

    return { ok: true as const, created };
  });

export const getSiteGrowthStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = asDb(context.supabase);
    const company = await ownedCompany(supabase, context.userId);
    const { data: sites } = await supabase
      .from("company_sites")
      .select("id, status")
      .eq("company_id", company.id);
    const siteIds = ((sites ?? []) as { id: string; status: string }[]).map((s) => s.id);
    const live = ((sites ?? []) as { status: string }[]).filter((s) => s.status === "published")
      .length;

    let subscribers = 0;
    let leadsWaiting = 0;
    if (siteIds.length) {
      const { count: subCount } = await supabase
        .from("site_subscribers")
        .select("id", { count: "exact", head: true })
        .in("site_id", siteIds)
        .eq("status", "active");
      subscribers = subCount ?? 0;
      const { count: leadCount } = await supabase
        .from("site_leads")
        .select("id", { count: "exact", head: true })
        .eq("company_id", company.id)
        .in("status", ["new", "drafted"]);
      leadsWaiting = leadCount ?? 0;
    }

    return { liveSites: live, subscribers, leadsWaiting };
  });

export const listSiteLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = asDb(context.supabase);
    const company = await ownedCompany(supabase, context.userId);
    const { data, error } = await supabase
      .from("site_leads")
      .select("id, email, name, status, draft_subject, draft_body, source, created_at, site_id")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  });
