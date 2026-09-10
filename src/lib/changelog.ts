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
    id: "2026-09-10-viral-loops",
    date: "2026-09-10",
    title: "Viral loops — watch join CTA, post-win share, one-tap Scout",
    summary:
      "Watch pages and the share kit convert into attributed joins. Tickpix tape share and Scout invites open a share sheet that awards weekly growth XP. CCFF00 free raid window called out through 12 Sep 19:00 UTC.",
    items: [
      "ViralJoinCta on /v/$postId + share kit — auth/access with UTM + preserved ref; Pit + covenant links",
      "PostWinShareSheet on Community Tickpix share-tape and Quest Scout share",
      "Quest: Join + share invite one-tap; copy/X/share sheet completes growth:scout-share",
      "TICKPIX /pit + share drip: CCFF00 free raid extended to 12 Sep 19:00 UTC (max 3 free, then public 0.0001 ETH)",
      "docs/COMMUNITY_GROWTH.md — paste-ready X pin, Discord/TG sticky, Channels drip checklist",
      "Ops: scripts/provision-friend-full-os.mjs for complimentary full-OS friend seats",
    ],
    tags: ["feature", "improvement"],
  },
  {
    id: "2026-09-08-community-covenant",
    date: "2026-09-08",
    title: "Community covenant — trust rebuild in public",
    summary:
      "After Culture Coin was rugged by a former partner, we ship a public covenant, TICKPIX trust surfaces, and growth rails so the room can verify us — never by DM.",
    items: [
      "Public /trust — six hold-us-to-it promises + verifiable CA / mint links",
      "Blog: make-it-up-by-building; share kit posts tickpix-pit + make-good; roadmap stop tickpix-pit",
      "/pit trust strip → covenant + Blockscout; footer + More nav Covenant",
      "X/FC drip rotation leads with make-good + tickpix-pit (links /trust and /pit)",
      "llms.txt + sitemap + docs/COMMUNITY_GROWTH.md playbook",
    ],
    tags: ["feature", "improvement"],
  },
  {
    id: "2026-09-08-tickpix-pit",
    date: "2026-09-08",
    title: "TICKPIX pit — Robinhood Chain culture seats in Aura OS",
    summary:
      "Tickpix is community membership for the tape, not a second founding collection and not a fundraise. Mint stays at nft.aibusiness.fun; Aura verifies holders and unlocks Pit belonging.",
    items: [
      "Public /pit discovery page — Take a seat deep-links to nft.aibusiness.fun (CCFF00 free / public 0.0001 ETH)",
      "Holder check on Robinhood Chain (balanceOf) → Pit badge + soft +5% Quest XP (no Hood rebates or seat unlock)",
      "Community panel: claim tickpix:mint, daily clock-in, share tape card; Quest registry + tickpix-seat achievement",
      "NFT desk playbook: tickpix-pit strategy; nav/footer Pit links; docs/TICKPIX.md",
      "Lead digests: PLATFORM_SMTP fixed (smtp.hostinger.com, never imap.*); failed slots can retry",
    ],
    tags: ["feature", "improvement", "fix"],
  },
  {
    id: "2026-09-06-landing-narrative-redesign",
    date: "2026-09-06",
    title: "Landing page: cinematic 7-act storytelling + BAYC street premium redesign",
    summary:
      "Complete landing redesign with premium crypto/street NFT aesthetic (BAYC energy), cinematic narrative structure, and deeply integrated app world previews. Includes ape crew mascots, stability fixes, and full EN/DE i18n.",
    items: [
      "Visual redesign: neon lime / magma orange / gold / deep red / teal accents on dark charcoal base",
      "BAYC-style ape crew: 6 mascot PNGs in hero (public/brand/apes/) with premium styling",
      "Cinematic 7-act structure: Hook → Problem → Twist → Machine → Worlds → Fair Launch → Claim",
      "ACT 05 deeply integrates app worlds: Hood, Token, Lokal, Try, Proof, Access with mini feature previews",
      "Each world shows 2–3 concrete product features, not just link cards",
      "Stability fixes: Supabase soft-fail (no-op client when env missing), hydration-safe locale (SSR always EN)",
      "New utility classes: boss-cta, street-panel, icon-well-neon/magma/gold for consistent premium styling",
      "Full EN/DE i18n for narrative copy and app integration features",
      "Mobile-first design with horizontal scroll for crew, responsive world cards",
    ],
    tags: ["feature", "improvement", "fix"],
  },
  {
    id: "2026-09-05-proof-share",
    date: "2026-09-05",
    title: "Readable proof on mobile + share composers that open filled",
    summary:
      "Proof cards are larger and visible on the Console mobile deck. Share opens X, Facebook, and LinkedIn with the caption already in the composer.",
    items: [
      "ProofOfWork: clearer typography; Console mobile Proof card shows real tasks",
      "FocusCard anchors content at the top so proof isn’t centered out of view",
      "ShareMoment: X / Facebook / LinkedIn primary buttons with prefilled text",
    ],
    tags: ["improvement"],
  },
  {
    id: "2026-09-05-console-desk-map",
    date: "2026-09-05",
    title: "Console desk map + Local / Nachbar / OS separation",
    summary:
      "Console opens with a clear map of Marketing, Leads, Trading, Liquidity, Creation, and the operating loop. Aura OS, Aura Lokal, and Aura Nachbar no longer leak into each other’s chrome.",
    items: [
      "Console: collapsible OS desk map filtered by your visible nav / preset",
      "OS sidebar + header: Nachbar removed — city play stays at /nachbar",
      "Lokal logo → /heute; Local post-login → /heute; auth logos stay in-funnel",
      "Nachbar: optional Firma link only when you own a company",
    ],
    tags: ["feature", "improvement"],
  },
  {
    id: "2026-09-04-beta-readiness",
    date: "2026-09-04",
    title: "Beta readiness — loving onboard + $12k pulse",
    summary:
      "Fixed broken Quest/Scout/Community activation, collapsed Console to one next step, instrumented the funnel, aligned seat checkout to $299 / €99, and added Desk beta pulse + prophecy toward $12k gross.",
    items: [
      "Prod RPCs: merge signup growth, scout attribution, Vienna leaderboard, portals",
      "Community ?join= autofill; Quest weekly Go routes to the right surface",
      "app_events: onboarding_complete, first_mission, first_proof, squad_join, scout_join, growth_task_done",
      "Desk Finance: beta pulse + base/stretch/moon prophecy; seat unit prices fixed",
      "docs/BETA_COHORT.md — 20-tester loving script",
    ],
    tags: ["feature", "improvement", "infra"],
  },
  {
    id: "2026-09-04-growth-digital-work",
    date: "2026-09-04",
    title: "Growth digital work — assign social + Spaces tasks",
    summary:
      "Community squads can assign social posts, X Spaces show-up, Scout invites, and Channels publishes to a person — with proof URLs, Quest XP/REP, and templates for maximum growth.",
    items: [
      "Typed squad tasks: social_post · space_showup · scout_invite · channels_publish · custom",
      "Assign to a squad member; optional proof URL on complete",
      "Weekly Quest keys growth:social-post / growth:space-showup / growth:scout-share",
      "Applied missing Quest + Squads schema on production so Community finally works end-to-end",
    ],
    tags: ["feature"],
  },
  {
    id: "2026-09-03-nft-desk",
    date: "2026-09-03",
    title: "Transparent NFT desk — OpenSea compat, not share theater",
    summary:
      "Public playbook on /token for Hood utility, hold-to-earn honesty, creator primary sales, and Quant history training — plus OpenSea metadata hooks without a flip bot or Tesla-share NFT claims.",
    items: [
      "/token#nft-desk: six strategies with OS vs community advantage and hard “not equity / not TSLA shares” line",
      "OpenSea-compat: /api/genesis/collection + checklist; verified collection URL only via env (never invented)",
      "Quant presets Peg momentum + Founding desk; agent draft prompt refuses NFT floor / RWA fills",
      "Walk-forward remains the train/test path on Base spot history — peg is transparency, not custody",
    ],
    tags: ["feature", "improvement"],
  },
  {
    id: "2026-09-03-token-hub",
    date: "2026-09-03",
    title: "Token investor hub — buy without the OS",
    summary:
      "Public /token cockpit for people who only want AURA: live pAURA sale stats, early giveback math, CA trust policy, Robinhood reference peg, and an honest hold-to-earn note.",
    items: [
      "/token hub: Buy pAURA · Get Hood · Read rules — no Missions/Console required",
      "Wallet strip: pAURA balance + 1.11× AURA preview + Hood gift checklist (desk / CA / claim)",
      "Nav + homepage “Token only”; /sale indexed; robots + sitemap + llms.txt updated",
      "Peg remains treasury reference only — not share redemption or equity",
    ],
    tags: ["feature"],
  },
  {
    id: "2026-09-03-success-loops",
    date: "2026-09-03",
    title: "Quest, Scout, and Channels loops that actually close",
    summary:
      "Community social quests award XP, Scouts get a tracked Local invite, Growth XP merges on /quest, and Channels/Console stay honest about live vs queued posts.",
    items: [
      "Community social clicks award community:* XP (idempotent) — trail lights up on /quest",
      "Scout invite: /lokal?ref=CODE after Join Scouts; attribute_referral on Local signup → REP when seat pays",
      "/quest merges signup Growth Starter progress on mount",
      "Channels: Autopublish-off banner for queued posts; Recent posts show Published / Queued with live links",
      "Console FirstWin counts filed results only; seat=success routes to onboarding",
      "Failures panel names xai_soft_fail / freellm_unreachable so soft AI outages are obvious to retry",
    ],
    tags: ["feature", "fix"],
  },
  {
    id: "2026-09-02-agent-social",
    date: "2026-09-02",
    title: "Agents post on X and Farcaster for real",
    summary:
      "Worker drip seeds Farcaster as well as X, social tasks call live publish APIs, and missed drip slots from downtime get catch-up replay.",
    items: [
      "Neynar env on the VPS + Farcaster drip campaign (fc-drip) alongside launch-drip X",
      "Agent social tasks use publishToProvider — live URL, queued + Autopublish gate, or not connected",
      "Worker tick runs channels/drip before trading; curl timeout raised so social is not starved",
      "7-day missed X drip backfill on each tick so quiet days cannot silently drop",
    ],
    tags: ["fix", "infra"],
  },
  {
    id: "2026-09-02-aura-world",
    date: "2026-09-02",
    title: "AURA WORLD — Quest, Squads, Portals, Scouts",
    summary:
      "One progression layer for the whole stack: XP + contribution REP + badges, crew play on Community, Vienna portals and scout attribution.",
    items: [
      "AURA Quest hub at /quest — daily/weekly missions, streak, next badge (server award_progress)",
      "Community Squads at /community — create/join 2–8 crews, shared tasks, world pulse, squad XP board",
      "Portals at /portal/$slug + optional GPS on check-ins; Scouts + Vienna REP standings on /leaderboard",
      "Genesis 777 = profile tier (Hood supply stays 1,000); hold-to-earn copy honest until T-0 audit",
      "23 achievement seeds; social + community quests wired for quest/squad momentum",
    ],
    tags: ["feature", "infra"],
  },
  {
    id: "2026-09-01-robinhood-peg",
    date: "2026-09-01",
    title: "Robinhood Chain + TSLA reference peg",
    summary:
      "Public messaging for multichain momentum: Robinhood creator mints live, treasury reference basket anchored on TSLA.",
    items: [
      "Tokenomics — Robinhood Chain section + TSLA / Musk-orbit reference peg table with disclaimers",
      "Homepage momentum strip → /tokenomics#robinhood",
      "Roadmap stop for Robinhood; Hood page surfaces chain commitment",
      "Week in review fix for Local accounts + mobile GPU trim",
    ],
    tags: ["feature", "improvement"],
  },
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
