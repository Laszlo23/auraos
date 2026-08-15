import { slugifyCompanyName } from "@/lib/company-economy";

type LooseDb = {
  from: (table: string) => any;
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data?: unknown; error: { message: string } | null }>;
};

export const PLACEHOLDER_SLUGS = new Set(["mein-betrieb", "my-shop", "untitled-company", "company"]);
export const PLACEHOLDER_NAMES = new Set(["Mein Betrieb", "My shop", "Untitled company"]);

export async function ensureCompanySlug(
  supabase: LooseDb,
  company: { id: string; name: string; slug?: string | null },
  opts?: { remintPlaceholder?: boolean },
): Promise<string> {
  const current = company.slug?.trim() || "";
  if (current && !(opts?.remintPlaceholder && PLACEHOLDER_SLUGS.has(current))) {
    return current;
  }
  const base = slugifyCompanyName(company.name);
  let candidate = base;
  for (let i = 0; i < 8; i++) {
    const { data } = await supabase.from("companies").select("id").eq("slug", candidate).maybeSingle();
    if (!data || data.id === company.id) {
      await supabase.from("companies").update({ slug: candidate }).eq("id", company.id);
      return candidate;
    }
    candidate = `${base}-${i + 2}`;
  }
  return base;
}

/** Mint a public /b/$slug and a Nachbar check-in code for a Lokal shop. */
export async function publishLocalListing(
  supabase: LooseDb,
  company: { id: string; name: string; slug?: string | null },
): Promise<string> {
  const slug = await ensureCompanySlug(supabase, company, { remintPlaceholder: true });
  const { error } = await supabase.rpc("ensure_nachbar_checkin_code", {
    _company_id: company.id,
  });
  if (error) {
    console.warn("[publishLocalListing] check-in code", error.message);
  }
  return slug;
}
