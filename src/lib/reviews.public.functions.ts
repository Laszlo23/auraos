import { createServerFn } from "@tanstack/react-start";

export type PublicLokalListing = {
  name: string;
  slug: string;
  tagline: string | null;
  city: string | null;
  niche: string | null;
  homepage_url: string | null;
  google_review_url: string | null;
  local_cohort_number: number | null;
  emoji: string;
};

/** Public Vienna / Lokal directory (no auth). */
export const getPublicLokalDirectory = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: companies } = await supabaseAdmin
    .from("companies")
    .select(
      "name, slug, tagline, city, niche, homepage_url, google_review_url, local_cohort_number, emoji",
    )
    .eq("is_local_business", true)
    .order("local_cohort_number", { ascending: true })
    .limit(48);

  return (companies ?? [])
    .filter((c) => Boolean(c.slug) && Boolean(c.name))
    .map((c) => ({
      name: String(c.name),
      slug: String(c.slug),
      tagline: c.tagline ?? null,
      city: c.city ?? null,
      niche: c.niche ?? null,
      homepage_url: c.homepage_url ?? null,
      google_review_url: c.google_review_url ?? null,
      local_cohort_number: c.local_cohort_number ?? null,
      emoji: c.emoji || "◎",
    })) satisfies PublicLokalListing[];
});

/** Public local business card data (no auth). */
export const getPublicLocalBusiness = createServerFn({ method: "GET" })
  .validator((input: { slug: string }) => {
    const slug = input.slug
      ?.toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 64);
    if (!slug) throw new Error("slug required");
    return { slug };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select(
        "id, name, slug, tagline, city, niche, homepage_url, google_review_url, local_cohort_number, emoji, is_local_business",
      )
      .eq("slug", data.slug)
      .maybeSingle();
    if (!company) return null;

    const { data: posts } = await supabaseAdmin
      .from("channel_posts")
      .select("id, provider, body, published_at, status")
      .eq("company_id", company.id)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(6);

    return {
      name: company.name as string,
      slug: company.slug as string,
      tagline: (company.tagline as string | null) ?? null,
      city: (company.city as string | null) ?? null,
      niche: (company.niche as string | null) ?? null,
      homepage_url: (company.homepage_url as string | null) ?? null,
      google_review_url: (company.google_review_url as string | null) ?? null,
      local_cohort_number: (company.local_cohort_number as number | null) ?? null,
      emoji: (company.emoji as string) ?? "◎",
      posts: (
        (posts ?? []) as {
          id: string;
          provider: string;
          body: string;
          published_at: string | null;
        }[]
      ).map((p) => ({
        id: p.id,
        provider: p.provider,
        body: String(p.body || "").slice(0, 280),
        published_at: p.published_at,
      })),
    };
  });
