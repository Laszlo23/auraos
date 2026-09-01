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
  // Core essentials - always visible
  {
    to: "/console",
    label: "Dashboard",
    plain: "Home",
    hint: "Your company overview and daily snapshot",
    icon: Gauge,
    group: "Getting Started",
    core: true,
  },
  {
    to: "/ceo",
    label: "Ask AI",
    plain: "Ask",
    hint: "Tell your AI team what to do in plain words",
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
    icon: Plug,
    group: "Getting Started",
    core: true,
  },
  {
    to: "/billing",
    label: "Credits & Billing",
    plain: "Credits",
    hint: "Top up credits and see spending",
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
    icon: Layers,
    group: "Work",
    live: true,
  },
  {
    to: "/automation",
    label: "Automations",
    plain: "Autopilot",
    hint: "Recurring jobs that run automatically",
    icon: Activity,
    group: "Work",
    live: true,
  },
  {
    to: "/report",
    label: "Weekly Report",
    plain: "Report",
    hint: "Summary of this week's completed work",
    icon: Receipt,
    group: "Work",
  },

  // Money & Sales
  {
    to: "/wallet",
    label: "Wallet",
    plain: "Money",
    hint: "Company balance, deposits and payments",
    icon: Wallet,
    group: "Money",
    live: true,
  },
  {
    to: "/trading",
    label: "Grow Funds",
    plain: "Invest",
    hint: "AI-powered trading to grow your balance",
    icon: CandlestickChart,
    group: "Money",
    live: true,
  },
  {
    to: "/customers",
    label: "Customers",
    plain: "Customers",
    hint: "People who have paid you",
    icon: Boxes,
    group: "Money",
  },
  {
    to: "/akquise",
    label: "Find Leads",
    plain: "Find Leads",
    hint: "AI finds and reaches out to potential customers",
    icon: Radar,
    group: "Money",
    live: true,
  },
  {
    to: "/sales",
    label: "Active Deals",
    plain: "Deals",
    hint: "Sales opportunities in progress",
    icon: CircleDollarSign,
    group: "Money",
  },
  {
    to: "/products",
    label: "Products",
    plain: "Products",
    hint: "What your company sells",
    icon: ShoppingBag,
    group: "Money",
  },
  {
    to: "/x402",
    label: "Paid API",
    plain: "API",
    hint: "Machine-to-machine payments (for advanced users)",
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
    icon: Hash,
    group: "Marketing",
    live: true,
  },
  {
    to: "/marketing",
    label: "Campaigns",
    plain: "Campaigns",
    hint: "Marketing campaigns to attract customers",
    icon: Megaphone,
    group: "Marketing",
  },
  {
    to: "/website",
    label: "Website",
    plain: "Website",
    hint: "Your public site, built by AI",
    icon: Globe,
    group: "Marketing",
  },
  {
    to: "/business",
    label: "Local Business",
    plain: "My Shop",
    hint: "For physical shops: reviews, check-ins, local SEO",
    icon: Store,
    group: "Marketing",
    live: true,
  },
  {
    to: "/analytics",
    label: "Analytics",
    plain: "Stats",
    hint: "Website traffic and visitor behavior",
    icon: Activity,
    group: "Marketing",
  },

  // Files & Info
  {
    to: "/knowledge",
    label: "Knowledge Base",
    plain: "Knowledge",
    hint: "Information your AI team has learned",
    icon: Brain,
    group: "Files",
  },
  {
    to: "/files",
    label: "Documents",
    plain: "Files",
    hint: "Invoices, receipts, and other documents",
    icon: FolderClosed,
    group: "Files",
  },

  // Community & Extras
  {
    to: "/nachbar/heute",
    label: "City Check-ins",
    plain: "City",
    hint: "Explore local shops (side quest, no company needed)",
    icon: Compass,
    group: "Extras",
    core: true,
  },
  {
    to: "/community",
    label: "Community",
    plain: "Chat",
    hint: "Connect with other founders",
    icon: MessagesSquare,
    group: "Extras",
  },
  {
    to: "/arena",
    label: "Leaderboard",
    plain: "Contest",
    hint: "Compete with other companies this season",
    icon: Trophy,
    group: "Extras",
    live: true,
  },
  {
    to: "/earn",
    label: "Invite Friends",
    plain: "Invite",
    hint: "Get rewards when friends join (in-app credits, not cash)",
    icon: Gift,
    group: "Extras",
    live: true,
  },
  {
    to: "/marketplace",
    label: "Marketplace",
    plain: "Marketplace",
    hint: "Hire specialized AI agents or publish your own",
    icon: Store,
    group: "Extras",
    live: true,
  },
  {
    to: "/jobs",
    label: "Accept Jobs",
    plain: "Jobs",
    hint: "Get paid for work other companies need done",
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
    icon: AtSign,
    group: "Settings",
  },
  {
    to: "/settings",
    label: "Settings",
    plain: "Settings",
    hint: "Account preferences and configuration",
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
