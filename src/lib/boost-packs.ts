/** German local super-app: €99 seat + Boost packs (AURA under the hood). */

export const LOCAL_SEAT_EUR = 99;
export const LOCAL_SEAT_BOOST_GRANT = 15_000;
export const LOCAL_SEAT_PLAN_ID = "local_seat" as const;

export type BoostPackId = "sichtbarkeit" | "bewertungen" | "neukunden";

export type BoostPack = {
  id: BoostPackId;
  name: string;
  blurb: string;
  perks: string[];
  eur: number;
  boostGrant: number;
  stripeEnv: string;
  /** Mission / campaign kickoff hint for post-purchase. */
  kickoff: "social_drip" | "review_boost" | "akquise";
};

export const BOOST_PACKS: BoostPack[] = [
  {
    id: "sichtbarkeit",
    name: "Sichtbarkeit",
    blurb: "Social-Burst: Posts vorbereiten und freigeben lassen.",
    perks: ["Boost-Guthaben", "Mission: 3 Posts diese Woche", "Social-Kanäle verbinden"],
    eur: 49,
    boostGrant: 8_000,
    stripeEnv: "STRIPE_PRICE_BOOST_SICHTBARKEIT",
    kickoff: "social_drip",
  },
  {
    id: "bewertungen",
    name: "Bewertungen",
    blurb: "Review Boost: echte Kunden um Google-Bewertungen bitten.",
    perks: [
      "Boost-Guthaben",
      "Review-Kampagne starten",
      "Nur echte Kunden-Einladungen — keine Fake-Reviews",
    ],
    eur: 79,
    boostGrant: 12_000,
    stripeEnv: "STRIPE_PRICE_BOOST_BEWERTUNGEN",
    kickoff: "review_boost",
  },
  {
    id: "neukunden",
    name: "Neukunden",
    blurb: "Akquise-Schub: passende lokale Leads finden und anschreiben.",
    perks: ["Boost-Guthaben", "Akquise-Kampagne", "Deutsche Vorlagen für Service-Betriebe"],
    eur: 99,
    boostGrant: 20_000,
    stripeEnv: "STRIPE_PRICE_BOOST_NEUKUNDEN",
    kickoff: "akquise",
  },
];

export function boostPackById(id: string): BoostPack | undefined {
  return BOOST_PACKS.find((p) => p.id === id);
}

export function isBoostPackId(id: unknown): id is BoostPackId {
  return id === "sichtbarkeit" || id === "bewertungen" || id === "neukunden";
}

export function stripePriceForBoostPack(pack: BoostPack): string | undefined {
  return process.env[pack.stripeEnv]?.trim() || undefined;
}

export const LOCAL_DE_NICHES = [
  { id: "friseur", label: "Friseur" },
  { id: "beauty", label: "Beauty / Salon" },
  { id: "gastro", label: "Gastronomie" },
  { id: "immobilien", label: "Immobilien" },
  { id: "handwerk", label: "Sonstiges Handwerk" },
] as const;

export type LocalDeNicheId = (typeof LOCAL_DE_NICHES)[number]["id"];

export const LOCAL_DE_TABS = [
  { to: "/heute", label: "Heute", plain: "Heute" },
  { to: "/social", label: "Social", plain: "Social" },
  { to: "/kunden", label: "Kunden", plain: "Kunden" },
  { to: "/bewertungen", label: "Bewertungen", plain: "Reviews" },
  { to: "/boost", label: "Boost", plain: "Boost" },
] as const;
