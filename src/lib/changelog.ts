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

/** Newest first. Add entries at the top when you ship. */
export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    id: "2026-09-01-changelog",
    date: "2026-09-01",
    title: "Public build log",
    summary: "Changelog page for the community — footer only, updated as we ship.",
    items: [
      "New /changelog page with a timeline of releases",
      "Linked from the footer Community section — not in the main nav",
    ],
    tags: ["feature"],
  },
  {
    id: "2026-09-01-nav",
    date: "2026-09-01",
    title: "Cleaner public navigation",
    summary: "Less noise in the header; secondary pages moved under More.",
    items: [
      "Desktop nav trimmed to four primary links plus a More menu",
      "Mobile menu grouped into Main and Explore sections",
      "Shared PublicSiteHeader across landing and marketing pages",
    ],
    tags: ["improvement"],
  },
  {
    id: "2026-09-01-creator-design",
    date: "2026-09-01",
    title: "Creator studio design pass",
    summary: "Web3-native creator hub, mint pages, and builders funnel landing.",
    items: [
      "Creator studio hero, stack showcase, and holographic drop preview",
      "Public mint pages with ticker, stats, and mint terminal UI",
      "Procedural cover art API at /api/creator/art/$slug",
      "Dedicated /for/builders funnel page with creator visuals",
    ],
    tags: ["improvement", "feature"],
  },
  {
    id: "2026-09-01-creator-platform",
    date: "2026-09-01",
    title: "Creator NFT platform (phase 1)",
    summary: "Robinhood Chain collections, branded mint pages, and primary sales desk.",
    items: [
      "Creator hub at /creator — draft collections, deploy flow, collection cards",
      "Public storefronts at /c/your-slug with USDG or ETH wallet mint",
      "AuraCreatorCollection + MintDesk + Factory contracts (Robinhood Chain)",
      "Supabase nft_collections schema and on-chain metadata API",
      "Builders funnel defaults desk to Robinhood; free tier: 1 collection, 100 supply",
    ],
    tags: ["feature", "infra"],
  },
  {
    id: "2026-08-look-feel",
    date: "2026-08-28",
    title: "Look-and-feel step-up",
    summary: "Site-wide visual polish — glass, motion, and marketing surfaces.",
    items: [
      "Refined hero, funnel visuals, and authenticated shell chrome",
      "Stronger typography and CTA treatments across public pages",
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
