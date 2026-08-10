/** Outcome / BiB pricing for non-web3 entry funnels. OS funnel keeps src/lib/plans.ts. */

export type FunnelPlanId =
  | "outcome_starter"
  | "outcome_growth"
  | "outcome_performance"
  | "bib_setup"
  | "bib_operate_starter"
  | "bib_operate_growth"
  | "bib_operate_scale";

export type FunnelPlan = {
  id: FunnelPlanId;
  name: string;
  /** Display price in EUR (whole euros). */
  eur: number;
  blurb: string;
  perks: string[];
  /** Stripe Checkout mode. */
  mode: "subscription" | "payment";
  /** Env key for Stripe Price id (without process.env lookup). */
  stripeEnv: string;
  /** Tokens granted into the existing metering ledger when paid. */
  tokenGrant: number;
  /** Performance success fee is ops/manual in v1 — shown in copy only. */
  successFeeNote?: string;
};

export const OUTCOME_PLANS: FunnelPlan[] = [
  {
    id: "outcome_starter",
    name: "Starter",
    eur: 299,
    blurb: "One AI sales department, one campaign, reporting.",
    perks: ["1 AI sales department", "1 campaign", "100 prospects / month", "Weekly reporting"],
    mode: "subscription",
    stripeEnv: "STRIPE_PRICE_OUTCOME_STARTER",
    tokenGrant: 20000,
  },
  {
    id: "outcome_growth",
    name: "Growth",
    eur: 699,
    blurb: "Multiple campaigns, follow-ups, landing pages, CRM automation.",
    perks: [
      "Multiple campaigns",
      "500 prospects / month",
      "AI follow-ups",
      "Landing pages",
      "CRM automation",
    ],
    mode: "subscription",
    stripeEnv: "STRIPE_PRICE_OUTCOME_GROWTH",
    tokenGrant: 50000,
  },
  {
    id: "outcome_performance",
    name: "Performance",
    eur: 1499,
    blurb: "Aggressive acquisition with a success fee on closed outcomes.",
    perks: [
      "Aggressive acquisition",
      "Multiple agents",
      "Advanced automation",
      "Performance tracking",
    ],
    mode: "subscription",
    stripeEnv: "STRIPE_PRICE_OUTCOME_PERFORMANCE",
    tokenGrant: 120000,
    successFeeNote: "Success fee billed manually after verified closed wins (v1).",
  },
];

export const BIB_PLANS: FunnelPlan[] = [
  {
    id: "bib_setup",
    name: "Company setup",
    eur: 499,
    blurb: "One-time: company, brand, website, offer, lead list, pipeline.",
    perks: ["Company + brand", "Website", "Offer", "Lead list", "Sales pipeline"],
    mode: "payment",
    stripeEnv: "STRIPE_PRICE_BIB_SETUP",
    tokenGrant: 15000,
  },
  {
    id: "bib_operate_starter",
    name: "Operate · Starter",
    eur: 49,
    blurb: "Keep the AI workforce running after setup.",
    perks: ["Core agents", "1 active mission", "Weekly report"],
    mode: "subscription",
    stripeEnv: "STRIPE_PRICE_BIB_OPERATE_STARTER",
    tokenGrant: 8000,
  },
  {
    id: "bib_operate_growth",
    name: "Operate · Growth",
    eur: 99,
    blurb: "More campaigns and prospecting capacity.",
    perks: ["Full sales spine", "Multiple campaigns", "Mailbox outreach drafts"],
    mode: "subscription",
    stripeEnv: "STRIPE_PRICE_BIB_OPERATE_GROWTH",
    tokenGrant: 20000,
  },
  {
    id: "bib_operate_scale",
    name: "Operate · Scale",
    eur: 199,
    blurb: "Highest operating allowance for serious volume.",
    perks: ["Priority compute", "Advanced automation seeds", "Performance tracking"],
    mode: "subscription",
    stripeEnv: "STRIPE_PRICE_BIB_OPERATE_SCALE",
    tokenGrant: 45000,
  },
];

export const FUNNEL_PLANS: FunnelPlan[] = [...OUTCOME_PLANS, ...BIB_PLANS];

export const funnelPlanById = (id: string): FunnelPlan | undefined =>
  FUNNEL_PLANS.find((p) => p.id === id);

export function isFunnelPlanId(id: string): id is FunnelPlanId {
  return FUNNEL_PLANS.some((p) => p.id === id);
}

export function stripePriceForFunnelPlan(plan: FunnelPlan): string | undefined {
  return process.env[plan.stripeEnv];
}
