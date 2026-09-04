/**
 * Console OS desk map — plain-language pillars over NAV paths.
 * Filter with the founder's resolved visible nav so presets stay honest.
 */

export type OsMapPillarId =
  | "run"
  | "marketing"
  | "leads"
  | "trading"
  | "liquidity"
  | "creation"
  | "growth"
  | "setup";

export type OsMapPillarDef = {
  id: OsMapPillarId;
  /** i18n: console.map.{id}.title */
  titleKey: string;
  /** i18n: console.map.{id}.blurb */
  blurbKey: string;
  paths: string[];
};

export const OS_MAP_PILLARS: OsMapPillarDef[] = [
  {
    id: "run",
    titleKey: "console.map.run.title",
    blurbKey: "console.map.run.blurb",
    paths: ["/ceo", "/missions", "/approvals", "/proofs", "/agents", "/tasks"],
  },
  {
    id: "marketing",
    titleKey: "console.map.marketing.title",
    blurbKey: "console.map.marketing.blurb",
    paths: ["/channels", "/marketing", "/website", "/business"],
  },
  {
    id: "leads",
    titleKey: "console.map.leads.title",
    blurbKey: "console.map.leads.blurb",
    paths: ["/akquise", "/sales", "/customers"],
  },
  {
    id: "trading",
    titleKey: "console.map.trading.title",
    blurbKey: "console.map.trading.blurb",
    paths: ["/trading"],
  },
  {
    id: "liquidity",
    titleKey: "console.map.liquidity.title",
    blurbKey: "console.map.liquidity.blurb",
    paths: ["/wallet", "/billing"],
  },
  {
    id: "creation",
    titleKey: "console.map.creation.title",
    blurbKey: "console.map.creation.blurb",
    paths: ["/creator", "/marketplace", "/products"],
  },
  {
    id: "growth",
    titleKey: "console.map.growth.title",
    blurbKey: "console.map.growth.blurb",
    paths: ["/quest", "/community", "/earn", "/arena"],
  },
  {
    id: "setup",
    titleKey: "console.map.setup.title",
    blurbKey: "console.map.setup.blurb",
    paths: ["/connect", "/identity", "/knowledge", "/settings"],
  },
];

export type OsMapPillarView = {
  id: OsMapPillarId;
  titleKey: string;
  blurbKey: string;
  paths: string[];
};

/** Keep only paths the founder can see; drop empty pillars. */
export function filterOsMapPillars(visiblePaths: Iterable<string>): OsMapPillarView[] {
  const allowed = visiblePaths instanceof Set ? visiblePaths : new Set(visiblePaths);
  const out: OsMapPillarView[] = [];
  for (const pillar of OS_MAP_PILLARS) {
    const paths = pillar.paths.filter((p) => allowed.has(p));
    if (paths.length === 0) continue;
    out.push({
      id: pillar.id,
      titleKey: pillar.titleKey,
      blurbKey: pillar.blurbKey,
      paths,
    });
  }
  return out;
}

export const OS_MAP_COLLAPSE_KEY = "aura.console.mapCollapsed";

export function readOsMapCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(OS_MAP_COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeOsMapCollapsed(collapsed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OS_MAP_COLLAPSE_KEY, collapsed ? "1" : "0");
  } catch {
    /* ignore */
  }
}
