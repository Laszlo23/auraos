import { NAV, navForFunnel, type NavItem } from "@/lib/nav";

/** Mutable business templates — not separate shells. */
export type OsPresetId =
  "realty" | "service" | "commerce" | "creator" | "community" | "reseller" | "full";

export type OsPresetDef = {
  id: OsPresetId;
  /** i18n key under settings.preset.* / navOs.presets.* */
  labelKey: string;
  blurbKey: string;
  /** Default checked menu paths (Settings always appended). */
  navPaths: string[];
  /** Preferred mobile tab order (first 4 that exist in visible nav). */
  mobileTabs: string[];
  /** Agents to ensure on apply. */
  agents: string[];
  /** Optional onboarding product bootstrap. */
  product?: "trading" | "commerce" | "studio" | "creator";
  /** Akquise template when seeding leads. */
  akquiseTemplate?: "website_leads" | "real_estate" | "competitor_spy" | null;
  knowledgeTitle: string;
  knowledgeSummary: string;
};

const ALWAYS = ["/console", "/settings"] as const;

function withAlways(paths: string[]): string[] {
  const set = new Set<string>([...ALWAYS, ...paths]);
  // Preserve NAV order for stable checkbox grids / menus.
  return NAV.map((n) => n.to).filter((to) => set.has(to));
}

export const OS_PRESETS: Record<OsPresetId, OsPresetDef> = {
  realty: {
    id: "realty",
    labelKey: "settings.presetRealty",
    blurbKey: "settings.presetRealtyBlurb",
    navPaths: withAlways([
      "/ceo",
      "/missions",
      "/approvals",
      "/proofs",
      "/agents",
      "/quest",
      "/akquise",
      "/channels",
      "/wallet",
      "/billing",
      "/community",
      "/connect",
      "/identity",
      "/knowledge",
    ]),
    mobileTabs: ["/console", "/akquise", "/channels", "/approvals"],
    agents: ["Atlas", "Vela", "Orin", "Iris", "Juno", "Ledger", "Cass"],
    product: "studio",
    akquiseTemplate: "real_estate",
    knowledgeTitle: "Preset · Realty",
    knowledgeSummary:
      "Focus: qualified Vienna property leads from Austrian portals (willhaben, ImmoScout24, flatbee, …) + social drafts (X/Facebook). Open /akquise and /channels. Prefer provisionsfrei / von Privat. No Google-review campaigns.",
  },
  service: {
    id: "service",
    labelKey: "settings.presetService",
    blurbKey: "settings.presetServiceBlurb",
    navPaths: withAlways([
      "/ceo",
      "/missions",
      "/approvals",
      "/proofs",
      "/agents",
      "/akquise",
      "/sales",
      "/customers",
      "/channels",
      "/wallet",
      "/billing",
      "/quest",
      "/connect",
    ]),
    mobileTabs: ["/console", "/akquise", "/sales", "/approvals"],
    agents: ["Atlas", "Vela", "Iris", "Juno", "Ledger", "Cass"],
    product: "commerce",
    akquiseTemplate: "website_leads",
    knowledgeTitle: "Preset · Service",
    knowledgeSummary:
      "Focus: appointments and local service clients. Prospect on /akquise, close on /sales, follow up via Juno.",
  },
  commerce: {
    id: "commerce",
    labelKey: "settings.presetCommerce",
    blurbKey: "settings.presetCommerceBlurb",
    navPaths: withAlways([
      "/ceo",
      "/missions",
      "/approvals",
      "/agents",
      "/products",
      "/website",
      "/channels",
      "/sales",
      "/customers",
      "/wallet",
      "/billing",
      "/marketing",
      "/quest",
    ]),
    mobileTabs: ["/console", "/products", "/channels", "/wallet"],
    agents: ["Atlas", "Iris", "Vela", "Orin", "Juno", "Ledger"],
    product: "commerce",
    akquiseTemplate: "website_leads",
    knowledgeTitle: "Preset · Commerce",
    knowledgeSummary:
      "Focus: storefront + products + social. Refine /website and /products; sell via /sales.",
  },
  creator: {
    id: "creator",
    labelKey: "settings.presetCreator",
    blurbKey: "settings.presetCreatorBlurb",
    navPaths: withAlways([
      "/ceo",
      "/missions",
      "/approvals",
      "/agents",
      "/creator",
      "/marketplace",
      "/channels",
      "/wallet",
      "/quest",
      "/community",
      "/earn",
      "/billing",
      "/identity",
    ]),
    mobileTabs: ["/console", "/creator", "/channels", "/wallet"],
    agents: ["Atlas", "Vela", "Orin", "Iris", "Ledger"],
    product: "creator",
    akquiseTemplate: null,
    knowledgeTitle: "Preset · Creator",
    knowledgeSummary:
      "Focus: collections, drops, and social. Open /creator and connect channels before Autopublish.",
  },
  community: {
    id: "community",
    labelKey: "settings.presetCommunity",
    blurbKey: "settings.presetCommunityBlurb",
    navPaths: withAlways([
      "/ceo",
      "/community",
      "/quest",
      "/channels",
      "/approvals",
      "/agents",
      "/wallet",
      "/earn",
      "/billing",
      "/arena",
    ]),
    mobileTabs: ["/console", "/community", "/quest", "/channels"],
    agents: ["Atlas", "Orin", "Vela", "Juno"],
    product: "studio",
    akquiseTemplate: null,
    knowledgeTitle: "Preset · Community",
    knowledgeSummary:
      "Focus: squads and quests inside Aura OS. City play (Aura Nachbar) is a separate app at /nachbar.",
  },
  reseller: {
    id: "reseller",
    labelKey: "settings.presetReseller",
    blurbKey: "settings.presetResellerBlurb",
    navPaths: withAlways([
      "/ceo",
      "/missions",
      "/approvals",
      "/agents",
      "/products",
      "/sales",
      "/akquise",
      "/channels",
      "/customers",
      "/wallet",
      "/billing",
      "/quest",
    ]),
    mobileTabs: ["/console", "/products", "/akquise", "/sales"],
    agents: ["Atlas", "Vela", "Iris", "Juno", "Ledger"],
    product: "commerce",
    akquiseTemplate: "website_leads",
    knowledgeTitle: "Preset · Reseller",
    knowledgeSummary: "Focus: source → list → sell. Products, lead hunter, and sales pipeline.",
  },
  full: {
    id: "full",
    labelKey: "settings.presetFull",
    blurbKey: "settings.presetFullBlurb",
    navPaths: NAV.map((n) => n.to),
    mobileTabs: ["/console", "/missions", "/approvals", "/proofs"],
    agents: ["Atlas", "Vela", "Orin", "Iris", "Juno", "Cass", "Ledger", "Quant", "Yield"],
    product: "trading",
    akquiseTemplate: "website_leads",
    knowledgeTitle: "Preset · Full OS",
    knowledgeSummary: "Full Aura OS desk — every menu visible. Trim in Settings anytime.",
  },
};

export const OS_PRESET_IDS = Object.keys(OS_PRESETS) as OsPresetId[];

export function isOsPresetId(v: unknown): v is OsPresetId {
  return typeof v === "string" && v in OS_PRESETS;
}

export function osPresetById(id: string | null | undefined): OsPresetDef | null {
  if (!id || !isOsPresetId(id)) return null;
  return OS_PRESETS[id];
}

export function presetDefaultNav(id: OsPresetId): string[] {
  return [...OS_PRESETS[id].navPaths];
}

/** Paths that Settings lets founders toggle (exclude Settings itself — always on). */
export function navPathsForCheckboxGrid(): NavItem[] {
  return NAV.filter((n) => n.to !== "/settings");
}

export function parseNavPrefs(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const paths = raw
    .filter((p): p is string => typeof p === "string" && p.startsWith("/"))
    .map((p) => p.trim())
    .filter(Boolean);
  return paths.length ? withAlways(paths) : null;
}

/**
 * Resolve visible nav for the OS shell.
 * - Explicit nav_prefs → strict allow-list (+ Settings)
 * - Else os_preset defaults → funnel-style (simple = core only; full = all when preset is full / empty funnel)
 * - Else funnel.navCore
 */
export function resolveVisibleNav(opts: {
  osPreset?: string | null;
  navPrefs?: unknown;
  funnelNavCore: string[];
  simple: boolean;
}): NavItem[] {
  const prefs = parseNavPrefs(opts.navPrefs);
  if (prefs) {
    const allowed = new Set(prefs);
    const filtered = NAV.filter((n) => allowed.has(n.to));
    return withSettingsItem(filtered);
  }

  const preset = osPresetById(opts.osPreset);
  if (preset) {
    if (preset.id === "full") {
      return navForFunnel([], opts.simple);
    }
    return navForFunnel(preset.navPaths, opts.simple);
  }

  return navForFunnel(opts.funnelNavCore, opts.simple);
}

export function resolveMobileTabs(opts: {
  osPreset?: string | null;
  navPrefs?: unknown;
  funnelMobileTabs: readonly string[];
  visibleNav: NavItem[];
}): NavItem[] {
  const preset = osPresetById(opts.osPreset);
  const preferred =
    preset && !parseNavPrefs(opts.navPrefs)
      ? preset.mobileTabs
      : opts.funnelMobileTabs.length > 0
        ? [...opts.funnelMobileTabs]
        : ["/console", "/missions", "/approvals", "/proofs"];

  const byTo = new Map(opts.visibleNav.map((n) => [n.to, n]));
  const tabs: NavItem[] = [];
  for (const to of preferred) {
    const item = byTo.get(to);
    if (item) tabs.push(item);
  }
  for (const n of opts.visibleNav) {
    if (tabs.length >= 4) break;
    if (!tabs.some((t) => t.to === n.to)) tabs.push(n);
  }
  return tabs.slice(0, 4);
}

function withSettingsItem(items: NavItem[]): NavItem[] {
  if (items.some((n) => n.to === "/settings")) return items;
  const settings = NAV.find((n) => n.to === "/settings");
  return settings ? [...items, settings] : items;
}

/** Infer preset from free-text onboarding / niche. */
export function inferOsPreset(raw: string): OsPresetId {
  const lower = raw.toLowerCase();
  if (/\b(real.?estate|apartment|immobil|wohnung|makler|property)/i.test(lower)) return "realty";
  if (/\b(nft|creator|mint|collection|web3 art)\b/i.test(lower)) return "creator";
  if (/\b(community|squad|dao|discord|nachbar)\b/i.test(lower)) return "community";
  if (/\b(reseller|drop.?ship|wholesale|handel|retail)\b/i.test(lower)) return "reseller";
  if (/\b(shop|store|ecommerce|e-?commerce|webshop|product)\b/i.test(lower)) return "commerce";
  if (/\b(salon|friseur|beauty|gastro|cafe|handwerk|service|agency|berat)/i.test(lower))
    return "service";
  return "full";
}
