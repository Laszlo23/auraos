import { slugifyBrand } from "@/lib/sites/templates";

type LooseDb = {
  from: (table: string) => any;
};

/** First free public slug for a brand name. */
export async function uniqueSiteSlug(db: LooseDb, desired: string): Promise<string> {
  const base = slugifyBrand(desired) || `site-${Date.now().toString(36)}`;
  for (let i = 0; i < 8; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const { data } = await db.from("company_sites").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}
