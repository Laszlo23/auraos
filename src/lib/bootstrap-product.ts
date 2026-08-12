import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_AGENT_MAP } from "@/lib/agent-roster";
import { hireAgentIfNeeded } from "@/lib/actions";
import { AKQUISE_TEMPLATES } from "@/lib/akquise-templates";
import { funnelById, isFunnelId, type FunnelId } from "@/lib/funnels";
import { createRevenueMission } from "@/lib/revenue-mission.functions";
import { defaultContentFor, slugifyBrand } from "@/lib/sites/templates";

export type OnboardingProductId = "trading" | "commerce" | "studio";

const PRODUCT_META: Record<
  OnboardingProductId,
  { name: string; description: string; strategy: string; emoji: string; price: number }
> = {
  trading: {
    name: "Quant + Yield Desk",
    description:
      "Dual desk: Quant for spot/day-trade velocity, Yield for Aerodrome/BNB LP + autopilot ROI — hard USDC caps.",
    strategy: "Primary product: Quant velocity + Yield parking on Base/BNB.",
    emoji: "▲",
    price: 0,
  },
  commerce: {
    name: "Commerce Engine",
    description: "Storefront, pricing, and lifecycle — agents draft; founder approves go-live.",
    strategy: "Primary product: Commerce Engine with agent-run merchandising.",
    emoji: "◍",
    price: 49,
  },
  studio: {
    name: "Content Studio",
    description:
      "Brand voice that drafts daily posts for connected channels — publish on approval.",
    strategy: "Primary product: Content Studio across connected social channels.",
    emoji: "❖",
    price: 29,
  },
};

/**
 * Persist onboarding product choice: hire agents, create product row, seed landing page brief,
 * and queue a real first task for the lead agent.
 */
export async function bootstrapOnboardingProduct(
  companyId: string,
  productId: string,
  companyName: string,
) {
  const id = (
    ["trading", "commerce", "studio"].includes(productId) ? productId : "trading"
  ) as OnboardingProductId;
  const meta = PRODUCT_META[id];

  // Hire product agents via client inserts (same as hireAgentIfNeeded)
  const names = PRODUCT_AGENT_MAP[id] ?? ["Iris"];
  for (const n of names) {
    await hireAgentIfNeeded(companyId, n);
  }

  await supabase.from("companies").update({ strategy: meta.strategy }).eq("id", companyId);

  const { data: existingProduct } = await supabase
    .from("products")
    .select("id")
    .eq("company_id", companyId)
    .eq("name", meta.name)
    .maybeSingle();

  if (!existingProduct) {
    await supabase.from("products").insert({
      company_id: companyId,
      name: meta.name,
      description: meta.description,
      price: meta.price,
      emoji: meta.emoji,
      revenue: 0,
      conversion: 0,
      subscriptions: 0,
      inventory: id === "commerce" ? 100 : 0,
    });
  }

  const brand = companyName?.trim() || "Untitled company";
  const landingSummary = [
    `Brand: ${brand}`,
    `Product: ${meta.name}`,
    `Hero: ${brand} — ${meta.description}`,
    "CTA: Get started",
    "Status: Draft — Iris will refine after first approved Website task.",
  ].join("\n");

  const { data: landing } = await supabase
    .from("knowledge_items")
    .select("id")
    .eq("company_id", companyId)
    .eq("title", "Landing page")
    .maybeSingle();

  if (landing?.id) {
    await supabase
      .from("knowledge_items")
      .update({
        summary: landingSummary,
        cluster: "Website",
        source: "Onboarding",
      })
      .eq("id", landing.id);
  } else {
    await supabase.from("knowledge_items").insert({
      company_id: companyId,
      title: "Landing page",
      summary: landingSummary,
      cluster: "Website",
      source: "Onboarding",
    });
  }

  const lead = id === "trading" ? "Quant" : id === "studio" ? "Vela" : "Iris";
  const leadId = await hireAgentIfNeeded(companyId, lead);

  await supabase.from("tasks").insert({
    company_id: companyId,
    agent_id: leadId,
    title:
      id === "trading"
        ? "Set up Trading Desk first strategy"
        : id === "studio"
          ? "Draft brand voice and first post"
          : "Draft landing page and product merchandising",
    description:
      id === "trading"
        ? "Open /trading, apply Steady ETH preset, review backtest, and prepare the desk for founder arm. Do not invent fills."
        : `Refine the Landing page knowledge item for ${brand}. Propose concrete copy — do not invent traffic or revenue metrics.`,
    status: "pending_approval",
    priority: "high",
    roi: 0,
    progress: 0,
  });

  await supabase.from("activity_events").insert({
    company_id: companyId,
    agent_id: leadId,
    kind: "product",
    message: `First product locked: ${meta.name}. ${lead} filed a starter brief for approval.`,
  });

  return { productId: id, lead, meta };
}

/**
 * Wake a non-os funnel company: hire the sales/BiB spine, seed offer + site draft,
 * preferred Akquise template, and (best-effort) a revenue mission from the canned goal.
 */
export async function bootstrapFunnelCompany(
  companyId: string,
  funnelId: FunnelId,
  companyName: string,
  opts?: { city?: string | null; niche?: string | null },
) {
  if (!isFunnelId(funnelId) || funnelId === "os") {
    throw new Error("bootstrapFunnelCompany is for non-os funnels only");
  }

  const funnel = funnelById(funnelId);
  const boot = funnel.bootstrap;
  const brand = companyName?.trim() || "Untitled company";

  await Promise.all(boot.agents.map((name) => hireAgentIfNeeded(companyId, name)));

  await supabase
    .from("companies")
    .update({
      strategy: boot.strategy,
      ...(boot.markLocalBusiness ? { is_local_business: true, network_backlink: true } : {}),
      ...(opts?.city ? { city: opts.city } : {}),
      ...(opts?.niche ? { niche: opts.niche } : {}),
    })
    .eq("id", companyId);

  if (funnelId === "local") {
    const { error: cohortErr } = await supabase.rpc("assign_local_cohort", {
      _company_id: companyId,
    });
    if (cohortErr) {
      console.warn("[bootstrapFunnelCompany] local cohort", cohortErr.message);
    }
    await supabase.from("knowledge_items").insert({
      company_id: companyId,
      title: "Review Boost playbook",
      summary: [
        "Ask real customers for Google reviews — never invent reviews.",
        "Paste your Google Business review link on /business.",
        "Paste your existing homepage URL on /business.",
        "Connect social channels, then let Orin/Vela draft posts for approval.",
        "First 1000 local businesses get up to 999 review invites in the cohort.",
      ].join("\n"),
      cluster: "Local",
      source: "Funnel",
    });

    const { data: companyRow } = await supabase
      .from("companies")
      .select("ui_locale")
      .eq("id", companyId)
      .maybeSingle();
    if (companyRow) {
      await supabase.from("knowledge_items").insert({
        company_id: companyId,
        title: companyRow.ui_locale === "de" ? "Aura Lokal · Spielregeln" : "Aura Lokal · playbook",
        summary:
          companyRow.ui_locale === "de"
            ? [
                "Nur echte Kunden um Google-Bewertungen bitten — keine Fake-Reviews.",
                "Social: Entwürfe freigeben, nichts ungeprüft posten.",
                "Boost-Pakete: Sichtbarkeit, Bewertungen, Neukunden.",
                "Local Seat 99 € — Code (Bar) oder Karte auf /boost.",
                "App-Tabs: Heute, Social, Kunden, Bewertungen, Boost.",
              ].join("\n")
            : [
                "Ask real customers for Google reviews only — no fake reviews.",
                "Social: approve drafts; nothing posts unchecked.",
                "Boost packs: Visibility, Reviews, New customers.",
                "Local Seat €99 — cash code or card on /boost.",
                "Tabs: Today, Social, Customers, Reviews, Boost.",
              ].join("\n"),
        cluster: "Lokal",
        source: "Funnel",
      });
    }
  }

  if (boot.productName) {
    const { data: existingProduct } = await supabase
      .from("products")
      .select("id")
      .eq("company_id", companyId)
      .eq("name", boot.productName)
      .maybeSingle();
    if (!existingProduct) {
      await supabase.from("products").insert({
        company_id: companyId,
        name: boot.productName,
        description: boot.productDescription ?? boot.strategy,
        price: boot.productPrice,
        emoji: "◎",
        revenue: 0,
        conversion: 0,
        subscriptions: 0,
        inventory: 0,
      });
    }
  }

  if (boot.siteTemplate) {
    const content = defaultContentFor(brand, boot.siteTemplate);
    const landingSummary = [
      `Brand: ${brand}`,
      `Template: ${boot.siteTemplate}`,
      `Hero: ${content.hero}`,
      `Subhead: ${content.subhead}`,
      `CTA: ${content.cta}`,
      "Status: Draft — refine on /website before publish.",
    ].join("\n");

    const { data: landing } = await supabase
      .from("knowledge_items")
      .select("id")
      .eq("company_id", companyId)
      .eq("title", "Landing page")
      .maybeSingle();
    if (landing?.id) {
      await supabase
        .from("knowledge_items")
        .update({ summary: landingSummary, cluster: "Website", source: "Funnel" })
        .eq("id", landing.id);
    } else {
      await supabase.from("knowledge_items").insert({
        company_id: companyId,
        title: "Landing page",
        summary: landingSummary,
        cluster: "Website",
        source: "Funnel",
      });
    }

    const baseSlug = slugifyBrand(brand) || `company-${companyId.slice(0, 8)}`;
    const { data: existingSite } = await supabase
      .from("company_sites")
      .select("id")
      .eq("company_id", companyId)
      .limit(1)
      .maybeSingle();
    if (!existingSite) {
      await supabase.from("company_sites").insert({
        company_id: companyId,
        slug: `${baseSlug}-${funnelId}`,
        template_id: boot.siteTemplate,
        status: "draft",
        content: content as never,
      });
    }
  }

  if (boot.akquiseTemplate) {
    const tmpl = AKQUISE_TEMPLATES.find((t) => t.id === boot.akquiseTemplate);
    const brief =
      boot.missionGoal ?? tmpl?.goalExample ?? "Research prospects that match the company offer.";
    await supabase.from("knowledge_items").insert({
      company_id: companyId,
      title: "Akquise playbook",
      summary: [
        `Template: ${boot.akquiseTemplate}`,
        `Goal: ${brief}`,
        "Open /akquise, pick this template, and run with founder-approved send.",
      ].join("\n"),
      cluster: "Sales",
      source: "Funnel",
    });

    const { data: existingCamp } = await supabase
      .from("akquise_campaigns")
      .select("id")
      .eq("company_id", companyId)
      .limit(1)
      .maybeSingle();
    if (!existingCamp && tmpl) {
      await supabase.from("akquise_campaigns").insert({
        company_id: companyId,
        name: `${tmpl.label} · day 1`,
        brief,
        goal: brief,
        template: tmpl.id,
        target_count: tmpl.defaultTarget,
        objective: tmpl.objectiveDefault,
        status: "draft",
        agents_labeled: tmpl.agents,
        region: opts?.city ?? null,
      });
    }
  }

  if (boot.missionGoal) {
    await supabase.from("knowledge_items").insert({
      company_id: companyId,
      title: "First mission",
      summary: boot.missionGoal,
      cluster: "Missions",
      source: "Funnel",
    });

    try {
      await createRevenueMission({
        data: {
          goal: boot.missionGoal,
          ...(opts?.niche ? { industry: opts.niche } : {}),
          ...(opts?.city ? { location: opts.city } : {}),
          risk: "medium",
        },
      });
    } catch (err) {
      console.warn("[bootstrapFunnelCompany] mission plan deferred", err);
      const atlasId = await hireAgentIfNeeded(companyId, "Atlas");
      await supabase.from("tasks").insert({
        company_id: companyId,
        agent_id: atlasId,
        title: "Plan first revenue mission",
        description: `Open /missions and create: ${boot.missionGoal}`,
        status: "pending_approval",
        priority: "high",
        roi: 0,
        progress: 0,
      });
    }
  }

  const lead = boot.agents.includes("Vela")
    ? "Vela"
    : boot.agents.includes("Iris")
      ? "Iris"
      : "Atlas";
  const leadId = await hireAgentIfNeeded(companyId, lead);

  await supabase.from("activity_events").insert({
    company_id: companyId,
    agent_id: leadId,
    kind: "product",
    message: `Funnel ${funnelId}: ${lead} and team are ready. Review Missions, Website, and Lead hunter.`,
  });

  return { funnelId, lead, name: funnel.headline };
}
