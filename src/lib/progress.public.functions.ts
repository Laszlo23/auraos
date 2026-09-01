import { createServerFn } from "@tanstack/react-start";

export type PublicPortal = {
  id: string;
  slug: string;
  label: string;
  lat: number | null;
  lng: number | null;
  company_id: string;
  company_name: string;
  company_slug: string | null;
  tagline: string | null;
  emoji: string | null;
  city: string | null;
  street: string | null;
};

export const getPublicPortal = createServerFn({ method: "GET" })
  .validator((d: { slug: string }) => d)
  .handler(async ({ data }): Promise<PublicPortal | null> => {
    const slug = data.slug.toLowerCase().trim();
    if (!slug) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("aura_portals")
      .select(
        "id, slug, label, lat, lng, company_id, companies(name, slug, tagline, emoji, city, street)",
      )
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();
    if (error || !row) return null;
    const co = row.companies as {
      name: string;
      slug: string | null;
      tagline: string | null;
      emoji: string | null;
      city: string | null;
      street: string | null;
    } | null;
    return {
      id: row.id,
      slug: row.slug,
      label: row.label,
      lat: row.lat,
      lng: row.lng,
      company_id: row.company_id,
      company_name: co?.name ?? row.label,
      company_slug: co?.slug ?? null,
      tagline: co?.tagline ?? null,
      emoji: co?.emoji ?? null,
      city: co?.city ?? null,
      street: co?.street ?? null,
    };
  });
