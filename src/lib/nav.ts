import {
  Activity,
  AtSign,
  Boxes,
  Brain,
  Briefcase,
  CandlestickChart,
  CircleDollarSign,
  Compass,
  CreditCard,
  FolderClosed,
  Gauge,
  Gift,
  Globe,
  Hash,
  Layers,
  Megaphone,
  Plug,
  MessagesSquare,
  Radar,
  Receipt,
  Settings2,
  ShoppingBag,
  Store,
  Target,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: typeof Gauge;
  group: string;
  live?: boolean;
  /** Jargon-free label shown in Simple mode. */
  plain?: string;
  /** One-line, human explanation of what this surface does. */
  hint?: string;
  /** Part of the small core set shown in Simple mode. */
  core?: boolean;
};

export const NAV: NavItem[] = [
  {
    to: "/console",
    label: "Company",
    plain: "Company",
    hint: "How your company is doing today",
    icon: Gauge,
    group: "Company",
    core: true,
  },
  {
    to: "/approvals",
    label: "Approvals",
    plain: "Approvals",
    hint: "Everything that needs you before it spends or goes public",
    icon: Layers,
    group: "Approvals",
    live: true,
    core: true,
  },
  {
    to: "/proofs",
    label: "Proof",
    plain: "Proof",
    hint: "Completed work you can see and share",
    icon: Receipt,
    group: "Proof",
    live: true,
    core: true,
  },
  {
    to: "/report",
    label: "Week in review",
    plain: "Report",
    hint: "Boss-ready summary of posts and agent work this week",
    icon: Receipt,
    group: "Company",
    live: true,
    core: true,
  },
  {
    to: "/missions",
    label: "Missions",
    plain: "Missions",
    hint: "Revenue goals — plan, start, and track real settlements",
    icon: Target,
    group: "Missions",
    live: true,
    core: true,
  },
  {
    to: "/ceo",
    label: "CEO",
    plain: "Ask the CEO",
    hint: "Tell your company what to do, in plain words",
    icon: Compass,
    group: "Company",
    live: true,
    core: true,
  },
  {
    to: "/agents",
    label: "Employees",
    plain: "Employees",
    hint: "The AI employees working for you",
    icon: Users,
    group: "Employees",
    live: true,
    core: true,
  },
  {
    to: "/tasks",
    label: "Tasks",
    plain: "Work",
    hint: "What the team is working on right now",
    icon: Layers,
    group: "Company",
    live: true,
  },
  {
    to: "/automation",
    label: "Automation",
    plain: "Worker",
    hint: "Real standing jobs the worker runs for your company",
    icon: Activity,
    group: "Company",
    live: true,
  },
  {
    to: "/connect",
    label: "Connect",
    plain: "Connections",
    hint: "Link your email, socials and wallets",
    icon: Plug,
    group: "Company",
    core: true,
  },
  {
    to: "/quest",
    label: "Quest",
    plain: "Quests",
    hint: "Daily missions, streaks, REP, and badges — one world progression",
    icon: Target,
    group: "Company",
    live: true,
    core: true,
  },
  {
    to: "/arena",
    label: "Arena",
    plain: "Contest",
    hint: "The gamified startup season leaderboard",
    icon: Trophy,
    group: "Company",
    live: true,
  },

  {
    to: "/products",
    label: "Products",
    hint: "Things your company sells",
    icon: ShoppingBag,
    group: "Revenue",
  },
  {
    to: "/trading",
    label: "Put money to work",
    plain: "Money",
    hint: "Trade, earn, or play — three simple paths",
    icon: CandlestickChart,
    group: "Revenue",
    live: true,
  },
  {
    to: "/wallet",
    label: "Wallet",
    plain: "Funds",
    hint: "Deposit address, balances and activity",
    icon: Wallet,
    group: "Revenue",
    live: true,
  },
  {
    to: "/x402",
    label: "Machine API",
    plain: "Paid API",
    hint: "x402 on Base — shown after the first real USDC settlement",
    icon: Receipt,
    group: "Revenue",
    live: false,
  },
  {
    to: "/akquise",
    label: "Lead hunter",
    plain: "Cold outreach",
    hint: "Give a goal — research, score, draft outreach",
    icon: Radar,
    group: "Revenue",
    live: true,
  },
  {
    to: "/customers",
    label: "Customers",
    hint: "Everyone who bought from you",
    icon: Boxes,
    group: "Revenue",
  },
  {
    to: "/marketing",
    label: "Marketing",
    hint: "Campaigns that bring people in",
    icon: Megaphone,
    group: "Revenue",
  },
  {
    to: "/sales",
    label: "Sales",
    hint: "Deals in progress",
    icon: CircleDollarSign,
    group: "Revenue",
  },

  {
    to: "/website",
    label: "Website",
    hint: "Your public site, written by agents",
    icon: Globe,
    group: "Surface",
  },
  {
    to: "/business",
    label: "Business site",
    plain: "My business",
    hint: "Homepage, Google reviews, and social automation for local businesses",
    icon: Store,
    group: "Surface",
    live: true,
  },
  {
    to: "/channels",
    label: "Channels",
    plain: "Social posts",
    hint: "Schedule posts, Autopublish, and fair-launch drip",
    icon: Hash,
    group: "Surface",
    live: true,
  },
  {
    to: "/analytics",
    label: "Analytics",
    hint: "Traffic and conversion numbers",
    icon: Activity,
    group: "Surface",
  },

  {
    to: "/knowledge",
    label: "Knowledge",
    hint: "What your company knows",
    icon: Brain,
    group: "Memory",
  },
  {
    to: "/files",
    label: "Files",
    hint: "Docs + bills · Ledger tax-prep assist",
    icon: FolderClosed,
    group: "Memory",
  },

  {
    to: "/creator",
    label: "Creator",
    hint: "Launch NFT collections on Robinhood Chain",
    icon: Layers,
    group: "System",
    live: true,
  },
  {
    to: "/marketplace",
    label: "Agent Store",
    plain: "Agent Store",
    hint: "Hire agents, publish & earn royalties",
    icon: Store,
    group: "System",
    live: true,
  },
  {
    to: "/jobs",
    label: "Jobs",
    plain: "Client jobs",
    hint: "Accept work, deliver, settle to ledger",
    icon: Briefcase,
    group: "System",
    live: true,
  },
  {
    to: "/community",
    label: "Community",
    plain: "Squads",
    hint: "Form a crew, run shared tasks, climb the squad board — the room everyone checks",
    icon: MessagesSquare,
    group: "Company",
    live: true,
    core: true,
  },
  {
    to: "/earn",
    label: "Earn",
    plain: "Invite & earn",
    hint: "In-app AURA from paid referrals — not cash",
    icon: Gift,
    group: "System",
    live: true,
  },
  {
    to: "/identity",
    label: "Identity",
    plain: "Handle & wallets",
    hint: "Your @handle and linked wallets",
    icon: AtSign,
    group: "System",
  },
  {
    to: "/billing",
    label: "Economy",
    plain: "Economy",
    hint: "Revenue, costs, budgets — product money, not the token",
    icon: CreditCard,
    group: "Economy",
    core: true,
  },
  {
    to: "/settings",
    label: "Settings",
    hint: "Preferences and account",
    icon: Settings2,
    group: "System",
  },
];

export const NAV_GROUPS = [
  "Company",
  "Missions",
  "Employees",
  "Approvals",
  "Proof",
  "Economy",
  "Revenue",
  "Surface",
  "Memory",
  "System",
];

const MORE_GROUPS = new Set(["Revenue", "Surface", "Memory", "System"]);

/** Groups shown first. The rest sit under More in simple mode. */
export function isMoreGroup(group: string) {
  return MORE_GROUPS.has(group);
}

import type { UiLocale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

/** Stable i18n segment for a nav path: /nachbar/heute → nachbar_heute */
export function navI18nSegment(to: string): string {
  return to.replace(/^\//, "").replace(/\//g, "_").replace(/-/g, "_");
}

/** Label to show given the current mode. */
export const navLabel = (item: NavItem, simple: boolean) =>
  simple && item.plain ? item.plain : item.label;

/** Localized label with EN catalog fallback via t(). */
export function localizedNavLabel(item: NavItem, simple: boolean, locale: UiLocale): string {
  const seg = navI18nSegment(item.to);
  const key = simple && item.plain ? `navOs.${seg}.plain` : `navOs.${seg}.label`;
  const translated = t(key, locale);
  if (translated !== key) return translated;
  return navLabel(item, simple);
}

export function localizedNavHint(item: NavItem, locale: UiLocale): string | undefined {
  if (!item.hint) return undefined;
  const key = `navOs.${navI18nSegment(item.to)}.hint`;
  const translated = t(key, locale);
  return translated !== key ? translated : item.hint;
}

/** The short list a first-time user should see. */
export const CORE_NAV = NAV.filter((n) => n.core);

/** Always keep Settings reachable in simple lists. */
function withSettings(items: NavItem[]): NavItem[] {
  if (items.some((n) => n.to === "/settings")) return items;
  const settings = NAV.find((n) => n.to === "/settings");
  return settings ? [...items, settings] : items;
}

/** Filter nav by funnel preset paths. Empty preset = default CORE_NAV when simple. */
export function navForFunnel(corePaths: string[], simple: boolean): NavItem[] {
  if (!corePaths.length) {
    return simple ? withSettings(CORE_NAV) : NAV;
  }
  const allowed = new Set(corePaths);
  const filtered = NAV.filter((n) => allowed.has(n.to));
  if (!simple) {
    // Full mode: show funnel core first, then remaining items.
    const rest = NAV.filter((n) => !allowed.has(n.to));
    return [...filtered, ...rest];
  }
  return withSettings(filtered);
}
