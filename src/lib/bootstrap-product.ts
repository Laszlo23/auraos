import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_AGENT_MAP } from "@/lib/agent-roster";
import { hireAgentIfNeeded } from "@/lib/actions";

export type OnboardingProductId = "trading" | "commerce" | "studio";

const PRODUCT_META: Record<
  OnboardingProductId,
  { name: string; description: string; strategy: string; emoji: string; price: number }
> = {
  trading: {
    name: "Quant Trading Desk",
    description:
      "Risk-capped autonomous spot desk on Base (WETH/USDC). Strategies require backtest + founder arm.",
    strategy: "Primary product: Quant Trading Desk on Base with hard USDC caps.",
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
    description: "Brand voice that drafts daily posts for connected channels — publish on approval.",
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
  const id = (["trading", "commerce", "studio"].includes(productId)
    ? productId
    : "trading") as OnboardingProductId;
  const meta = PRODUCT_META[id];

  // Hire product agents via client inserts (same as hireAgentIfNeeded)
  const names = PRODUCT_AGENT_MAP[id] ?? ["Iris"];
  for (const n of names) {
    await hireAgentIfNeeded(companyId, n);
  }

  await supabase
    .from("companies")
    .update({ strategy: meta.strategy })
    .eq("id", companyId);

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

  const lead =
    id === "trading" ? "Quant" : id === "studio" ? "Vela" : "Iris";
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
