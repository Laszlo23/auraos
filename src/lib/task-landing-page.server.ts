import { agentJson } from "@/lib/x402-ai";
import { SITE_URL } from "@/lib/site";
import { defaultContentFor, type LandingTemplateId, type SiteContent } from "@/lib/sites/templates";
import { uniqueSiteSlug } from "@/lib/sites/unique-slug";
import { pickLandingTemplate } from "@/lib/task-landing-page";

type LooseDb = {
  from: (table: string) => any;
};

export type LandingPageShip = {
  created: boolean;
  slug: string;
  path: string;
  url: string;
};

export async function shipLandingPageFromTask(
  db: LooseDb,
  opts: {
    companyId: string;
    companyName: string;
    title: string;
    description: string | null;
    agentName: string;
  },
): Promise<LandingPageShip> {
  const templateId: LandingTemplateId = pickLandingTemplate(opts.title, opts.description);
  const brand = opts.companyName.trim() || "Untitled";
  const fallback = defaultContentFor(brand, templateId);

  let content = fallback;
  try {
    const json = (await agentJson(
      `You write landing-page copy for a real published page.
Return JSON keys only: hero, subhead, cta, offer, pricing.
Rules: no exclamation marks; no emoji; no invented revenue or social proof; hero max 12 words; subhead max 28 words; CTA 2–5 words; pricing may be empty.`,
      [
        `Brand: ${brand}`,
        `Template: ${templateId}`,
        `Task: ${opts.title}`,
        opts.description ?? "",
        `Writer: ${opts.agentName}`,
      ]
        .filter(Boolean)
        .join("\n"),
      "hero",
      { lane: "smart", timeoutMs: 25_000 },
    )) as Partial<SiteContent>;
    content = {
      ...fallback,
      hero: String(json.hero ?? fallback.hero).slice(0, 120),
      subhead: String(json.subhead ?? fallback.subhead).slice(0, 240),
      cta: String(json.cta ?? fallback.cta).slice(0, 48),
      offer: String(json.offer ?? fallback.offer ?? "").slice(0, 160) || fallback.offer,
      pricing: String(json.pricing ?? fallback.pricing ?? "").slice(0, 80) || fallback.pricing,
    };
  } catch {
    content = fallback;
  }

  const { data: existing } = await db
    .from("company_sites")
    .select("id, slug, status")
    .eq("company_id", opts.companyId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await db
      .from("company_sites")
      .update({
        content,
        template_id: templateId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("company_id", opts.companyId);
    if (error) throw error;
    const path = `/s/${existing.slug}`;
    return {
      created: false,
      slug: existing.slug,
      path,
      url: `${SITE_URL}${path}`,
    };
  }

  const slug = await uniqueSiteSlug(db, brand);
  const { error } = await db.from("company_sites").insert({
    company_id: opts.companyId,
    slug,
    template_id: templateId,
    status: "draft",
    content,
  });
  if (error) throw error;

  const path = `/s/${slug}`;
  return { created: true, slug, path, url: `${SITE_URL}${path}` };
}
