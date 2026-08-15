import { createServerFn } from "@tanstack/react-start";

import {
  defaultShopStory,
  editorialForSlug,
  type LokalServiceSpotlight,
} from "@/lib/lokal-shops";

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
  street: string | null;
  postal_code: string | null;
  district: string | null;
  cover_url: string | null;
  featured: boolean;
};

export type PublicShopCheckin = {
  id: string;
  at: string;
};

export type PublicLocalBusiness = {
  name: string;
  slug: string;
  tagline: string | null;
  city: string | null;
  niche: string | null;
  homepage_url: string | null;
  google_review_url: string | null;
  local_cohort_number: number | null;
  emoji: string;
  street: string | null;
  postal_code: string | null;
  district: string | null;
  phone: string | null;
  public_email: string | null;
  hours_note: string | null;
  cover_url: string | null;
  owner_display_name: string | null;
  owner_avatar: string | null;
  featured: boolean;
  services: string[];
  service_details: LokalServiceSpotlight[];
  story: string;
  nachbar_checkin_code: string | null;
  checkin_count: number;
  invite_count: number;
  second_studio_note: string | null;
  google_find_copy: string | null;
  posts: { id: string; provider: string; body: string; published_at: string | null }[];
  recent_checkins: PublicShopCheckin[];
  neighbors: PublicLokalListing[];
};

const LISTING_COLS =
  "name, slug, tagline, city, niche, homepage_url, google_review_url, local_cohort_number, emoji, street, postal_code, district, cover_url, featured";

const PROFILE_COLS =
  "id, name, slug, tagline, city, niche, homepage_url, google_review_url, local_cohort_number, emoji, is_local_business, street, postal_code, district, phone, public_email, hours_note, cover_url, owner_display_name, featured, services, nachbar_checkin_code";

function mapListing(c: Record<string, unknown>): PublicLokalListing {
  return {
    name: String(c.name),
    slug: String(c.slug),
    tagline: (c.tagline as string | null) ?? null,
    city: (c.city as string | null) ?? null,
    niche: (c.niche as string | null) ?? null,
    homepage_url: (c.homepage_url as string | null) ?? null,
    google_review_url: (c.google_review_url as string | null) ?? null,
    local_cohort_number: (c.local_cohort_number as number | null) ?? null,
    emoji: (c.emoji as string) || "◎",
    street: (c.street as string | null) ?? null,
    postal_code: (c.postal_code as string | null) ?? null,
    district: (c.district as string | null) ?? null,
    cover_url: (c.cover_url as string | null) ?? null,
    featured: Boolean(c.featured),
  };
}

function asListings(value: unknown): PublicLokalListing[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is PublicLokalListing =>
      Boolean(row) &&
      typeof row === "object" &&
      typeof (row as PublicLokalListing).slug === "string" &&
      typeof (row as PublicLokalListing).name === "string",
  );
}

/** Public Vienna / Lokal directory (no auth). Featured shops first. */
export const getPublicLokalDirectory = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: companies } = await supabaseAdmin
      .from("companies")
      .select(LISTING_COLS)
      .eq("is_local_business", true)
      .order("featured", { ascending: false })
      .order("local_cohort_number", { ascending: true })
      .limit(48);

    return asListings(
      (companies ?? [])
        .filter((c) => Boolean(c.slug) && Boolean(c.name))
        .map((c) => mapListing(c as Record<string, unknown>)),
    );
  } catch {
    return [] satisfies PublicLokalListing[];
  }
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
  .handler(async ({ data }): Promise<PublicLocalBusiness | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select(PROFILE_COLS)
      .eq("slug", data.slug)
      .maybeSingle();
    if (!company) return null;

    const [{ data: posts }, checkins, invites, { data: recent }, { data: neighborRows }] =
      await Promise.all([
      supabaseAdmin
        .from("channel_posts")
        .select("id, provider, body, published_at, status")
        .eq("company_id", company.id)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(6),
      supabaseAdmin
        .from("nachbar_checkins")
        .select("id", { count: "exact", head: true })
        .eq("company_id", company.id)
        .not("confirmed_at", "is", null),
      supabaseAdmin
        .from("review_invites")
        .select("id", { count: "exact", head: true })
        .eq("company_id", company.id),
      supabaseAdmin
        .from("nachbar_checkins")
        .select("id, confirmed_at, created_at")
        .eq("company_id", company.id)
        .not("confirmed_at", "is", null)
        .order("confirmed_at", { ascending: false })
        .limit(12),
      supabaseAdmin
        .from("companies")
        .select(LISTING_COLS)
        .eq("is_local_business", true)
        .neq("slug", data.slug)
        .order("featured", { ascending: false })
        .order("local_cohort_number", { ascending: true })
        .limit(4),
    ]);

    const editorial = editorialForSlug(company.slug as string);
    const dbServices = Array.isArray(company.services)
      ? (company.services as string[]).filter(Boolean)
      : [];
    const services = dbServices.length > 0 ? dbServices : (editorial?.services ?? []);
    const serviceDetails =
      editorial?.serviceDetails ?? services.map((title) => ({ title, blurb: "" }));

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
      street: (company.street as string | null) ?? null,
      postal_code: (company.postal_code as string | null) ?? null,
      district: (company.district as string | null) ?? null,
      phone: (company.phone as string | null) ?? null,
      public_email: (company.public_email as string | null) ?? null,
      hours_note: (company.hours_note as string | null) ?? null,
      cover_url: (company.cover_url as string | null) ?? null,
      owner_display_name: (company.owner_display_name as string | null) ?? null,
      owner_avatar: editorial?.ownerAvatar ?? null,
      featured: Boolean(company.featured),
      services,
      service_details: serviceDetails,
      story:
        editorial?.story ??
        defaultShopStory({
          name: company.name as string,
          city: company.city as string | null,
          niche: company.niche as string | null,
        }),
      nachbar_checkin_code: (company.nachbar_checkin_code as string | null) ?? null,
      checkin_count: checkins.count ?? 0,
      invite_count: invites.count ?? 0,
      second_studio_note: editorial?.secondStudioNote ?? null,
      google_find_copy: editorial?.googleFindCopy ?? null,
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
      recent_checkins: (
        (recent ?? []) as { id: string; confirmed_at: string | null; created_at: string }[]
      ).map((row) => ({
        id: row.id,
        at: row.confirmed_at || row.created_at,
      })),
      neighbors: asListings(
        (Array.isArray(neighborRows) ? neighborRows : [])
          .filter((c) => Boolean(c.slug) && Boolean(c.name))
          .map((c) => mapListing(c as Record<string, unknown>)),
      ),
    };
  });
