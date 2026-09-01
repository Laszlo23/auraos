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
  /** Additional search keywords for command palette. */
  keywords?: string;
};

export const NAV: NavItem[] = [
  // Core essentials - always visible
  {
    to: "/console",
    label: "Dashboard",
    plain: "Home",
    hint: "Your company overview and daily snapshot",
    keywords: "home overview status main start",
    icon: Gauge,
    group: "Getting Started",
    core: true,
  },
  {
    to: "/ceo",
    label: "Ask AI",
    plain: "Ask",
    hint: "Tell your AI team what to do in plain words",
    keywords: "chat command instruct tell ai ceo atlas",
    icon: Compass,
    group: "Getting Started",
    live: true,
    core: true,
  },
  {
    to: "/approvals",
    label: "Approve",
    plain: "Approve",
    hint: "Review and approve AI work before it goes live",
    keywords: "review approve pending waiting tasks",
    icon: Layers,
    group: "Getting Started",
    live: true,
    core: true,
  },
  {
    to: "/proofs",
    label: "Completed Work",
    plain: "Done",
    hint: "See everything your AI team has finished",
    keywords: "done finished completed proof results",
    icon: Receipt,
    group: "Getting Started",
    live: true,
    core: true,
  },
  {
    to: "/connect",
    label: "Connect Accounts",
    plain: "Connect",
    hint: "Link email, social media, and wallets",
    keywords: "link connect oauth social email twitter x linkedin wallet",
    icon: Plug,
    group: "Getting Started",
    core: true,
  },
  {
    to: "/billing",
    label: "Credits & Billing",
    plain: "Credits",
    hint: "Top up credits and see spending",
    keywords: "credits billing payment pay topup balance",
    icon: CreditCard,
    group: "Getting Started",
    core: true,
  },

  // Work & Tasks
  {
    to: "/missions",
    label: "Revenue Goals",
    plain: "Goals",
    hint: "Set revenue targets and track progress",
    keywords: "missions goals targets revenue objectives",
    icon: Target,
    group: "Work",
    live: true,
    core: true,
  },
  {
    to: "/agents",
    label: "AI Team",
    plain: "Team",
    hint: "See your AI employees and what they're doing",
    keywords: "agents employees workers team ai workforce",
    icon: Users,
    group: "Work",
    live: true,
    core: true,
  },
  {
    to: "/tasks",
    label: "Current Tasks",
    plain: "Tasks",
    hint: "What your AI team is working on right now",
    keywords: "tasks work jobs current active progress",
    icon: Layers,
    group: "Work",
    live: true,
  },
  {
    to: "/automation",
    label: "Automations",
    plain: "Autopilot",
    hint: "Recurring jobs that run automatically",
    keywords: "automation autopilot recurring scheduled cron",
    icon: Activity,
    group: "Work",
    live: true,
  },
  {
    to: "/report",
    label: "Weekly Report",
    plain: "Report",
    hint: "Summary of this week's completed work",
    keywords: "report summary weekly recap review",
    icon: Receipt,
    group: "Work",
  },

  // Money & Sales
  {
    to: "/wallet",
    label: "Wallet",
    plain: "Money",
    hint: "Company balance, deposits and payments",
    keywords: "wallet money balance funds crypto usdc eth payments",
    icon: Wallet,
    group: "Money",
    live: true,
  },
  {
    to: "/trading",
    label: "Grow Funds",
    plain: "Invest",
    hint: "AI-powered trading to grow your balance",
    keywords: "trading invest grow defi swap yield liquidity",
    icon: CandlestickChart,
    group: "Money",
    live: true,
  },
  {
    to: "/customers",
    label: "Customers",
    plain: "Customers",
    hint: "People who have paid you",
    keywords: "customers clients buyers users crm",
    icon: Boxes,
    group: "Money",
  },
  {
    to: "/akquise",
    label: "Find Leads",
    plain: "Find Leads",
    hint: "AI finds and reaches out to potential customers",
    keywords: "leads prospecting outreach cold email sales hunter",
    icon: Radar,
    group: "Money",
    live: true,
  },
  {
    to: "/sales",
    label: "Active Deals",
    plain: "Deals",
    hint: "Sales opportunities in progress",
    keywords: "sales deals pipeline opportunities crm",
    icon: CircleDollarSign,
    group: "Money",
  },
  {
    to: "/products",
    label: "Products",
    plain: "Products",
    hint: "What your company sells",
    keywords: "products catalog items services offerings",
    icon: ShoppingBag,
    group: "Money",
  },
  {
    to: "/x402",
    label: "Paid API",
    plain: "API",
    hint: "Machine-to-machine payments (for advanced users)",
    keywords: "api x402 paid machine payments rpc",
    icon: Receipt,
    group: "Money",
    live: false,
  },

  // Marketing & Content
  {
    to: "/channels",
    label: "Post to Social",
    plain: "Post",
    hint: "Schedule and publish to X, LinkedIn, etc.",
    keywords: "social media posts twitter x linkedin schedule publish",
    icon: Hash,
    group: "Marketing",
    live: true,
  },
  {
    to: "/marketing",
    label: "Campaigns",
    plain: "Campaigns",
    hint: "Marketing campaigns to attract customers",
    keywords: "marketing campaigns ads growth advertising",
    icon: Megaphone,
    group: "Marketing",
  },
  {
    to: "/website",
    label: "Website",
    plain: "Website",
    hint: "Your public site, built by AI",
    keywords: "website site homepage pages content",
    icon: Globe,
    group: "Marketing",
  },
  {
    to: "/business",
    label: "Local Business",
    plain: "My Shop",
    hint: "For physical shops: reviews, check-ins, local SEO",
    keywords: "business local shop reviews google reputation",
    icon: Store,
    group: "Marketing",
    live: true,
  },
  {
    to: "/analytics",
    label: "Analytics",
    plain: "Stats",
    hint: "Website traffic and visitor behavior",
    keywords: "analytics stats traffic visitors metrics data",
    icon: Activity,
    group: "Marketing",
  },

  // Files & Info
  {
    to: "/knowledge",
    label: "Knowledge Base",
    plain: "Knowledge",
    hint: "Information your AI team has learned",
    keywords: "knowledge memory learning context brain",
    icon: Brain,
    group: "Files",
  },
  {
    to: "/files",
    label: "Documents",
    plain: "Files",
    hint: "Invoices, receipts, and other documents",
    keywords: "files documents uploads invoices receipts",
    icon: FolderClosed,
    group: "Files",
  },

  // Community & Extras
  {
    to: "/nachbar/heute",
    label: "City Check-ins",
    plain: "City",
    hint: "Explore local shops (side quest, no company needed)",
    keywords: "city nachbar checkin explore local vienna",
    icon: Compass,
    group: "Extras",
    core: true,
  },
  {
    to: "/community",
    label: "Community",
    plain: "Chat",
    hint: "Connect with other founders",
    keywords: "community chat forum founders network",
    icon: MessagesSquare,
    group: "Extras",
  },
  {
    to: "/arena",
    label: "Leaderboard",
    plain: "Contest",
    hint: "Compete with other companies this season",
    keywords: "arena leaderboard rankings competition contest",
    icon: Trophy,
    group: "Extras",
    live: true,
  },
  {
    to: "/earn",
    label: "Invite Friends",
    plain: "Invite",
    hint: "Get rewards when friends join (in-app credits, not cash)",
    keywords: "invite referral rewards earn credits friends",
    icon: Gift,
    group: "Extras",
    live: true,
  },
  {
    to: "/marketplace",
    label: "Marketplace",
    plain: "Marketplace",
    hint: "Hire specialized AI agents or publish your own",
    keywords: "marketplace agents hire browse publish",
    icon: Store,
    group: "Extras",
    live: true,
  },
  {
    to: "/jobs",
    label: "Accept Jobs",
    plain: "Jobs",
    hint: "Get paid for work other companies need done",
    keywords: "jobs work gigs freelance marketplace",
    icon: Briefcase,
    group: "Extras",
    live: true,
  },

  // Settings
  {
    to: "/identity",
    label: "Your Handle",
    plain: "Handle",
    hint: "Your @username and linked wallets",
    keywords: "identity handle username profile wallets",
    icon: AtSign,
    group: "Settings",
  },
  {
    to: "/settings",
    label: "Settings",
    plain: "Settings",
    hint: "Account preferences and configuration",
    keywords: "settings preferences config account",
    icon: Settings2,
    group: "Settings",
  },
];

export const NAV_GROUPS = [
  "Getting Started",
  "Work",
  "Money",
  "Marketing",
  "Files",
  "Extras",
  "Settings",
];

const MORE_GROUPS = new Set(["Marketing", "Files", "Extras", "Settings"]);

/** Groups shown first. The rest sit under More in simple mode. */
export function isMoreGroup(group: string) {
  return MORE_GROUPS.has(group);
}

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
