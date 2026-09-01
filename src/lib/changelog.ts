/**
 * Public product changelog — append when we ship something the community should see.
 * Linked from the site footer only (not main nav).
 */

export type ChangelogTag = "feature" | "improvement" | "fix" | "infra";

export type ChangelogEntry = {
  id: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  title: string;
  summary: string;
  items: string[];
  tags: ChangelogTag[];
};

export const CHANGELOG_TAGS: ChangelogTag[] = ["feature", "improvement", "fix", "infra"];

export const CHANGELOG_INTRO = {
  eyebrow: "Build log",
  title: "What we shipped.",
  subtitle:
    "A running record of Aura OS — product, chain, and creator tooling. No hype deck: just what landed.",
} as const;

export const CHANGELOG_TAG_LABEL: Record<ChangelogTag, string> = {
  feature: "New",
  improvement: "Improved",
  fix: "Fixed",
  infra: "Infra",
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Newest first. Add entries at the top when you ship. */
export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    id: "2026-09-01-growth-nav",
    date: "2026-09-01",
    title: "Founder starter & mobile nav",
    summary:
      "Three instant-reward quests for sign-ups with zero customers, plus a tighter public hamburger menu.",
    items: [
      "Growth starter on console and auth — follow X, join Discord, first move (+500 XP total)",
      "Celebrate burst and XP toast fire immediately after each task",
      "Mobile nav: Lucide icons, compact rows, gradient hairlines, social icons pinned at bottom",
      "Public build log at /changelog (footer only)",
    ],
    tags: ["feature", "improvement"],
  },
  {
    id: "2026-09-01-creator",
    date: "2026-09-01",
    title: "Creator NFT platform",
    summary: "Robinhood Chain collections, branded mint pages, and the builders funnel.",
    items: [
      "Creator hub — draft collections, deploy flow, collection cards",
      "Public storefronts at /c/your-slug with wallet mint (USDG or ETH)",
      "AuraCreatorCollection, MintDesk, and Factory contracts on Robinhood Chain",
      "Procedural cover art and on-chain metadata API routes",
      "/for/builders funnel with creator visuals; free tier 1 collection / 100 supply",
    ],
    tags: ["feature", "infra"],
  },
  {
    id: "2026-09-01-visual",
    date: "2026-09-01",
    title: "Luxury visual upgrade",
    summary: "Classic luxury × cinematic polish across Hood, marketing, and the app shell.",
    items: [
      "Editorial design tokens, hood panels, Instrument Serif accents",
      "Unified Hood mint stage; MarketingLayout and HoodShell primitives",
      "PublicSiteHeader + SiteFooter refresh; four primary links + More menu on desktop",
      "Removed broken noggles glasses overlay from Hood portrait art",
    ],
    tags: ["improvement"],
  },
  {
    id: "2026-08-multichain",
    date: "2026-08-20",
    title: "Multichain desk defaults",
    summary: "Base, BSC, opBNB, and Robinhood Chain wiring for trading and creator flows.",
    items: [
      "Per-company desk_network on companies",
      "Robinhood Chain as default for builders / creator funnel",
      "USDG stable on Robinhood for desk and creator mints",
    ],
    tags: ["feature", "infra"],
  },
];

export function latestChangelogEntry(entries = CHANGELOG_ENTRIES): ChangelogEntry | undefined {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date))[0];
}

export function isValidChangelogEntry(entry: ChangelogEntry): boolean {
  if (!entry.id.trim() || !entry.title.trim() || !entry.summary.trim()) return false;
  if (!ISO_DATE.test(entry.date)) return false;
  if (entry.items.length === 0 || entry.tags.length === 0) return false;
  if (entry.items.some((item) => !item.trim())) return false;
  return entry.tags.every((tag) => CHANGELOG_TAGS.includes(tag));
}

export function changelogByMonth(entries = CHANGELOG_ENTRIES): Map<string, ChangelogEntry[]> {
  const map = new Map<string, ChangelogEntry[]>();
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  for (const entry of sorted) {
    const month = entry.date.slice(0, 7);
    const list = map.get(month) ?? [];
    list.push(entry);
    map.set(month, list);
  }
  return map;
}

export function formatChangelogMonth(monthKey: string, locale = "en"): string {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m) return monthKey;
  return new Date(y, m - 1, 1).toLocaleDateString(locale === "de" ? "de-AT" : "en-US", {
    month: "long",
    year: "numeric",
  });
}

export function formatChangelogDate(iso: string, locale = "en"): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(locale === "de" ? "de-AT" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
