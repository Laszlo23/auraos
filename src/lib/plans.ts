export type Plan = {
  id: "starter" | "company" | "enterprise";
  name: string;
  tokens: number;
  fiat: number;
  aura: number;
  blurb: string;
  perks: string[];
};

/** AURA is the network token that meters autonomous work. 1 task ≈ 1.5 tokens. */
export const TOKEN_SYMBOL = "AURA";

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tokens: 12000,
    fiat: 120,
    aura: 400,
    blurb: "One founder, three agents, standing reflexes.",
    perks: ["3 autonomous agents", "Daily planning cycle", "Shared memory"],
  },
  {
    id: "company",
    name: "Company",
    tokens: 40000,
    fiat: 400,
    aura: 1200,
    blurb: "A full executive team with unlimited memory.",
    perks: [
      "8 agents + Atlas",
      "Hourly planning cycles",
      "Automation reflexes",
      "Priority compute",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tokens: 120000,
    fiat: 1100,
    aura: 3000,
    blurb: "Multiple companies, shared knowledge, priority compute.",
    perks: ["Unlimited agents", "Multi-company memory", "Dedicated compute", "On-chain settlement"],
  },
];

export const planById = (id: string): Plan => PLANS.find((p) => p.id === id) ?? (PLANS[0] as Plan);
