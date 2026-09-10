import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ownedCompanyId(
  supabase: { from: (t: string) => any },
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error("No company");
  return data.id as string;
}

export const getLeadDigestPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const companyId = await ownedCompanyId(context.supabase, context.userId);
    const { data: pref } = await context.supabase
      .from("lead_digest_prefs")
      .select(
        "company_id, enabled, email, timezone, hours, language, last_sent_slot, last_sent_at, updated_at",
      )
      .eq("company_id", companyId)
      .maybeSingle();

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();

    const { data: company } = await context.supabase
      .from("companies")
      .select("public_email, name")
      .eq("id", companyId)
      .maybeSingle();

    return {
      companyId,
      companyName: company?.name ?? null,
      pref: pref ?? null,
      defaultEmail:
        (pref?.email as string | undefined) ||
        (company?.public_email as string | undefined) ||
        (profile?.email as string | undefined) ||
        context.user.email ||
        "",
    };
  });

const saveSchema = z.object({
  enabled: z.boolean(),
  email: z.string().trim().email().max(200),
  timezone: z.string().trim().min(3).max(80).default("Europe/Vienna"),
  hours: z.array(z.number().int().min(0).max(23)).min(1).max(4).default([8, 16]),
  language: z.enum(["de", "en"]).default("de"),
});

export const saveLeadDigestPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => saveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const companyId = await ownedCompanyId(context.supabase, context.userId);
    const hours = [...new Set(data.hours)].sort((a, b) => a - b);
    const { error } = await context.supabase.from("lead_digest_prefs").upsert(
      {
        company_id: companyId,
        enabled: data.enabled,
        email: data.email.toLowerCase(),
        timezone: data.timezone,
        hours,
        language: data.language,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const, companyId, enabled: data.enabled, email: data.email.toLowerCase() };
  });

export const sendLeadDigestNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const companyId = await ownedCompanyId(context.supabase, context.userId);
    const { forceLeadDigestForCompany } = await import("@/lib/lead-digest.server");
    const result = await forceLeadDigestForCompany(companyId);
    if (!result.sent) {
      throw new Error(result.error || "Could not send digest");
    }
    return result;
  });
