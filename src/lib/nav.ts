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
    label: "Dashboard",
    plain: "Home",
    hint: "How your company is doing today",
    icon: Gauge,
    group: "Company",
    core: true,
  },
  {
    to: "/report",
    label: "Week in review",
    plain: "Report",
    hint: "Boss-ready summary of posts and agent work this week",
    icon: Receipt,
    group: "Company",
  },
  {
    to: "/missions",
    label: "Missions",
    plain: "Missions",
    hint: "Revenue goals — plan, start, and track real settlements",
    icon: Target,
    group: "Company",
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
    label: "Agents",
    plain: "Your team",
    hint: "The AI employees working for you",
    icon: Users,
    group: "Company",
    live: true,
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
    label: "Grow funds",
    plain: "Grow",
    hint: "Trade with AI or provide liquidity",
    icon: CandlestickChart,
    group: "Revenue",
    live: true,
    core: true,
  },
  {
    to: "/wallet",
    label: "Wallet",
    plain: "Funds",
    hint: "Deposit address, balances and activity",
    icon: Wallet,
    group: "Revenue",
    live: true,
    core: true,
  },
  {
    to: "/x402",
    label: "Machine API",
    plain: "Paid API",
    hint: "Let other AI agents pay to use your agents",
    icon: Receipt,
    group: "Revenue",
    live: true,
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
    core: true,
  },

  {
    to: "/marketplace",
    label: "Marketplace",
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
    hint: "Company journal plus public founder rooms",
    icon: MessagesSquare,
    group: "System",
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
    label: "Billing",
    plain: "Plan & credits",
    hint: "Your subscription and token balance",
    icon: CreditCard,
    group: "System",
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

export const NAV_GROUPS = ["Company", "Revenue", "Surface", "Memory", "System"];

/** Label to show given the current mode. */
export const navLabel = (item: NavItem, simple: boolean) =>
  simple && item.plain ? item.plain : item.label;

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
