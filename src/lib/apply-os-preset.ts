import { hireAgentIfNeeded } from "@/lib/actions";
import { bootstrapOnboardingProduct } from "@/lib/bootstrap-product";
import { isOsPresetId, OS_PRESETS, presetDefaultNav, type OsPresetId } from "@/lib/os-presets";
import { supabase } from "@/integrations/supabase/client";

/**
 * Persist preset + nav checkboxes and seed agents / knowledge / optional akquise.
 * Safe to call repeatedly (idempotent hires + knowledge upsert by title).
 */
export async function applyOsPresetToCompany(opts: {
  companyId: string;
  companyName: string;
  presetId: OsPresetId;
  /** If omitted, resets nav_prefs to the preset defaults. */
  navPrefs?: string[] | null;
  /** When true, hire agents and seed knowledge / akquise. */
  bootstrap?: boolean;
}): Promise<{ ok: true; navPrefs: string[] }> {
  const preset = OS_PRESETS[opts.presetId];
  const navPrefs = opts.navPrefs?.length ? opts.navPrefs : presetDefaultNav(opts.presetId);

  const { error } = await supabase
    .from("companies")
    .update({
      os_preset: opts.presetId,
      nav_prefs: navPrefs,
    })
    .eq("id", opts.companyId);
  if (error) throw error;

  if (opts.bootstrap !== false) {
    for (const name of preset.agents) {
      await hireAgentIfNeeded(opts.companyId, name);
    }

    if (preset.product) {
      const { data: existingProduct } = await supabase
        .from("products")
        .select("id")
        .eq("company_id", opts.companyId)
        .limit(1)
        .maybeSingle();
      if (!existingProduct?.id) {
        try {
          await bootstrapOnboardingProduct(opts.companyId, preset.product, opts.companyName);
        } catch {
          /* agents still hired above */
        }
      }
    }

    const { data: existingKnowledge } = await supabase
      .from("knowledge_items")
      .select("id")
      .eq("company_id", opts.companyId)
      .eq("title", preset.knowledgeTitle)
      .maybeSingle();

    if (existingKnowledge?.id) {
      await supabase
        .from("knowledge_items")
        .update({
          summary: preset.knowledgeSummary,
          cluster: "Company",
          source: "Preset",
        })
        .eq("id", existingKnowledge.id);
    } else {
      await supabase.from("knowledge_items").insert({
        company_id: opts.companyId,
        title: preset.knowledgeTitle,
        summary: preset.knowledgeSummary,
        cluster: "Company",
        source: "Preset",
      });
    }

    if (preset.akquiseTemplate) {
      const { data: akq } = await supabase
        .from("akquise_campaigns")
        .select("id")
        .eq("company_id", opts.companyId)
        .limit(1)
        .maybeSingle();
      if (!akq?.id) {
        await supabase.from("akquise_campaigns").insert({
          company_id: opts.companyId,
          name: preset.akquiseTemplate === "real_estate" ? "Immobilien Leads" : "Lead hunter",
          brief: preset.knowledgeSummary,
          goal: preset.knowledgeSummary.slice(0, 200),
          template: preset.akquiseTemplate,
          language: "de",
          status: "draft",
          target_count: 15,
          objective: "research",
        });
      }
    }

    await supabase.from("activity_events").insert({
      company_id: opts.companyId,
      kind: "system",
      message: `OS preset applied: ${opts.presetId}. Menu trimmed — edit anytime in Settings.`,
    });
  }

  return { ok: true, navPrefs };
}

export function coerceOsPresetId(v: string | null | undefined): OsPresetId | null {
  return isOsPresetId(v) ? v : null;
}
