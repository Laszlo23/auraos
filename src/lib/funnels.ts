import type { AkquiseTemplateId } from "@/lib/akquise-templates";
import type { LandingTemplateId } from "@/lib/sites/templates";
import type { FunnelPlanId } from "@/lib/funnel-plans";
import { BIB_PLANS, OUTCOME_PLANS } from "@/lib/funnel-plans";

export type FunnelId = "os" | "agencies" | "sales" | "start" | "realty" | "local";

export type FunnelBillingKind = "aura_tokens" | "outcome_sub" | "bib";

export type FunnelBootstrap = {
  agents: string[];
  /** Skip trading/commerce/studio picker when set. */
  skipProductPicker: boolean;
  /** Maps to bootstrapOnboardingProduct when product picker is used; funnel bootstrap overrides. */
  defaultProduct?: "trading" | "commerce" | "studio";
  missionGoal: string | null;
  akquiseTemplate: AkquiseTemplateId | null;
  siteTemplate: LandingTemplateId | null;
  strategy: string;
  productName: string | null;
  productDescription: string | null;
  productPrice: number;
  /** Force local-business flags on bootstrap. */
  markLocalBusiness?: boolean;
};

export type FunnelDef = {
  id: FunnelId;
  /** URL segment under /for/$funnel — null for os (lives at /). */
  slug: string | null;
  audience: string;
  headline: string;
  subhead: string;
  cta: string;
  billingKind: FunnelBillingKind;
  /** Plan ids shown on the landing /billing for this funnel. */
  planIds: FunnelPlanId[];
  /** Paths treated as core in simple mode (tailored menu). Empty = use default CORE_NAV. */
  navCore: string[];
  /** Preferred mobile tab order (first 4 that exist in visible nav). */
  mobileTabs: string[];
  bootstrap: FunnelBootstrap;
};

const SALES_NAV = [
  "/console",
  "/missions",
  "/agents",
  "/approvals",
  "/proofs",
  "/akquise",
  "/sales",
  "/ceo",
  "/connect",
  "/billing",
  "/settings",
];

const START_NAV = [
  "/console",
  "/website",
  "/products",
  "/missions",
  "/agents",
  "/approvals",
  "/proofs",
  "/sales",
  "/ceo",
  "/connect",
  "/billing",
  "/settings",
];

const LOCAL_NAV = [
  "/console",
  "/nachbar/heute",
  "/missions",
  "/agents",
  "/approvals",
  "/proofs",
  "/billing",
  "/business",
  "/connect",
  "/channels",
  "/akquise",
  "/sales",
  "/website",
  "/ceo",
  "/tasks",
  "/report",
  "/settings",
];

export const LOCAL_COHORT_CAP = 1000;
export const REVIEW_BOOST_INVITE_GOAL = 999;

export const FUNNELS: Record<FunnelId, FunnelDef> = {
  os: {
    id: "os",
    slug: null,
    audience: "Crypto / founders",
    headline: "Own a company. Let AI make money.",
    subhead: "AI executes the work. You control the company.",
    cta: "Join founding cohort",
    billingKind: "aura_tokens",
    planIds: [],
    navCore: [],
    mobileTabs: ["/console", "/missions", "/approvals", "/proofs"],
    bootstrap: {
      agents: [],
      skipProductPicker: false,
      defaultProduct: "trading",
      missionGoal: null,
      akquiseTemplate: null,
      siteTemplate: null,
      strategy: "",
      productName: null,
      productDescription: null,
      productPrice: 0,
    },
  },
  agencies: {
    id: "agencies",
    slug: "agencies",
    audience: "Web agencies",
    headline: "You build websites. Aura finds the clients.",
    subhead:
      "An AI sales department for agencies that need new website clients — without hiring an SDR team.",
    cta: "Start your sales department",
    billingKind: "outcome_sub",
    planIds: OUTCOME_PLANS.map((p) => p.id),
    navCore: SALES_NAV,
    mobileTabs: ["/console", "/missions", "/akquise", "/sales"],
    bootstrap: {
      agents: ["Atlas", "Vela", "Iris", "Cass", "Ledger"],
      skipProductPicker: true,
      missionGoal: "Get 5 website clients this month at €1,500 each.",
      akquiseTemplate: "website_leads",
      siteTemplate: "service_offer",
      strategy:
        "Primary offer: website packages for SMEs. Aura runs prospecting, outreach drafts, and landing pages. Founder approves sends.",
      productName: "Website package",
      productDescription:
        "Fixed-scope website for local businesses — Aura finds and qualifies leads.",
      productPrice: 1500,
    },
  },
  sales: {
    id: "sales",
    slug: "sales",
    audience: "Small businesses",
    headline: "AI sales department. Pay for outcomes, not credits.",
    subhead:
      "Tell Aura how many customers you need. Agents prospect, draft outreach, and keep the pipeline moving — you approve the send.",
    cta: "Hire your sales department",
    billingKind: "outcome_sub",
    planIds: OUTCOME_PLANS.map((p) => p.id),
    navCore: SALES_NAV,
    mobileTabs: ["/console", "/missions", "/akquise", "/sales"],
    bootstrap: {
      agents: ["Atlas", "Vela", "Iris", "Cass", "Ledger", "Orin"],
      skipProductPicker: true,
      missionGoal: "Book 10 qualified sales meetings this month.",
      akquiseTemplate: "website_leads",
      siteTemplate: "service_offer",
      strategy:
        "Outcome-based AI sales department. Prospect, draft outreach, qualify, and track ROI from real settlements.",
      productName: "Core offer",
      productDescription: "Your primary paid offer — refine after first mission.",
      productPrice: 0,
    },
  },
  start: {
    id: "start",
    slug: "start",
    audience: "Aspiring founders",
    headline: "Tell Aura what you want to sell. We'll build the company around it.",
    subhead:
      "Company, brand, website, offer, lead list, marketing, and a sales pipeline — then a monthly workforce to keep it running.",
    cta: "Build my company",
    billingKind: "bib",
    planIds: BIB_PLANS.map((p) => p.id),
    navCore: START_NAV,
    mobileTabs: ["/console", "/website", "/missions", "/sales"],
    bootstrap: {
      agents: ["Atlas", "Iris", "Vela", "Orin", "Ledger"],
      skipProductPicker: true,
      missionGoal: "Build the company around my offer and find the first 20 prospects.",
      akquiseTemplate: "website_leads",
      siteTemplate: "service_offer",
      strategy:
        "Business-in-a-Box: stand up brand, storefront, offer, and first lead list. Founder approves publish and outreach.",
      productName: "Starter offer",
      productDescription: "The first product this company sells — Iris will refine the landing.",
      productPrice: 499,
    },
  },
  realty: {
    id: "realty",
    slug: "realty",
    audience: "Real estate agents",
    headline: "Aura finds sellers and buyers while you close.",
    subhead:
      "AI prospecting for listings and investors — research, score, draft outreach. You send from your mailbox.",
    cta: "Start prospecting",
    billingKind: "outcome_sub",
    planIds: OUTCOME_PLANS.map((p) => p.id),
    navCore: SALES_NAV,
    mobileTabs: ["/console", "/missions", "/akquise", "/sales"],
    bootstrap: {
      agents: ["Atlas", "Vela", "Juno", "Iris", "Ledger"],
      skipProductPicker: true,
      missionGoal: "Find 12 owners or investors that match my buy/sell brief this month.",
      akquiseTemplate: "real_estate",
      siteTemplate: "lead_magnet",
      strategy:
        "Real-estate cold acquisition. Research owners, agents, and investors; never invent contacts.",
      productName: "Acquisition mandate",
      productDescription: "Buyer or seller mandate supported by Aura lead research.",
      productPrice: 0,
    },
  },
  local: {
    id: "local",
    slug: "local",
    audience: "Local businesses",
    headline: "Your local business, online and getting reviews.",
    subhead:
      "Bring the site you already have, hook up social automation, and join Review Boost — first 1000 local businesses get systematic Google review invites (up to 999).",
    cta: "Open my local business hub",
    billingKind: "outcome_sub",
    planIds: OUTCOME_PLANS.map((p) => p.id),
    navCore: LOCAL_NAV,
    mobileTabs: ["/console", "/missions", "/approvals", "/proofs"],
    bootstrap: {
      agents: ["Atlas", "Vela", "Orin", "Iris", "Juno", "Ledger"],
      skipProductPicker: true,
      missionGoal:
        "Fill my Google review pipeline with real customer asks this month — founder approves every send.",
      akquiseTemplate: "website_leads",
      siteTemplate: "service_offer",
      strategy:
        "Local business hub: existing homepage, social automation, and Review Boost invites to real customers. Never invent Google reviews.",
      productName: "Local service",
      productDescription: "Core local offer — refine after first week of review invites.",
      productPrice: 0,
      markLocalBusiness: true,
    },
  },
};

export const PUBLIC_FUNNEL_SLUGS = ["agencies", "sales", "start", "realty", "local"] as const;

export type PublicFunnelSlug = (typeof PUBLIC_FUNNEL_SLUGS)[number];

export function isFunnelId(v: unknown): v is FunnelId {
  return (
    v === "os" ||
    v === "agencies" ||
    v === "sales" ||
    v === "start" ||
    v === "realty" ||
    v === "local"
  );
}

export function isPublicFunnelSlug(v: unknown): v is PublicFunnelSlug {
  return v === "agencies" || v === "sales" || v === "start" || v === "realty" || v === "local";
}

export function funnelById(id: FunnelId): FunnelDef {
  return FUNNELS[id];
}

export function funnelFromSlug(slug: string): FunnelDef | null {
  if (!isPublicFunnelSlug(slug)) return null;
  return FUNNELS[slug];
}

/** Resolve funnel from path `/for/agencies` or query `?funnel=agencies`. */
export function funnelFromPathOrQuery(pathname: string, searchFunnel?: string | null): FunnelId {
  const m = pathname.match(/^\/for\/([a-z]+)/i);
  if (m?.[1] && isPublicFunnelSlug(m[1].toLowerCase())) {
    return m[1].toLowerCase() as FunnelId;
  }
  if (searchFunnel && isFunnelId(searchFunnel)) return searchFunnel;
  return "os";
}

export function authHrefForFunnel(id: FunnelId): string {
  if (id === "os") return "/access";
  return `/auth?funnel=${id}&mode=signup`;
}
