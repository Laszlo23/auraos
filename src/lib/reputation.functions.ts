import { createServerFn } from "@tanstack/react-start";

import { scoreReputationAudit } from "@/lib/reputation-audit";

export const runReputationAudit = createServerFn({ method: "POST" })
  .inputValidator((input: {
    businessName: string;
    city: string;
    niche?: string;
    googleUrl?: string;
    websiteUrl?: string;
    email?: string;
  }) => ({
    businessName: String(input.businessName || "").trim().slice(0, 120),
    city: String(input.city || "").trim().slice(0, 80),
    niche: String(input.niche || "").trim().slice(0, 60) || undefined,
    googleUrl: String(input.googleUrl || "").trim().slice(0, 500) || undefined,
    websiteUrl: String(input.websiteUrl || "").trim().slice(0, 500) || undefined,
    email: String(input.email || "").trim().slice(0, 255) || undefined,
  }))
  .handler(async ({ data }) => {
    if (data.businessName.length < 2) throw new Error("Betriebsname fehlt.");
    if (data.city.length < 2) throw new Error("Stadt fehlt.");

    const result = scoreReputationAudit({
      businessName: data.businessName,
      city: data.city,
      niche: data.niche,
      googleUrl: data.googleUrl,
      websiteUrl: data.websiteUrl,
      email: data.email,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const emailRaw = data.email?.trim() || "";
    const email =
      emailRaw && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailRaw) ? emailRaw.toLowerCase() : null;

    const { error } = await supabaseAdmin.from("reputation_audits" as never).insert({
      business_name: data.businessName,
      city: data.city,
      niche: data.niche || null,
      google_url: data.googleUrl || null,
      website_url: data.websiteUrl || null,
      email,
      score: result.score,
      grade: result.grade,
      findings: result.findings,
      recommendations: result.recommendations,
      source: "lokal_audit",
    } as never);

    if (error) {
      console.error("[reputation-audit]", error.message);
    }

    if (email) {
      const { error: wlErr } = await supabaseAdmin.from("waitlist_signups").insert({
        email,
        source: "reputation_audit",
      });
      if (wlErr && !/duplicate|unique/i.test(wlErr.message)) {
        console.error("[reputation-audit waitlist]", wlErr.message);
      }
    }

    return result;
  });
