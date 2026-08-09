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
    core: true,
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
    core: true,
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
    label: "Trading Desk",
    plain: "Trading",
    hint: "The agent that trades markets for you",
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
    to: "/channels",
    label: "Channels",
    plain: "Social posts",
    hint: "Schedule posts, Autopublish, and fair-launch drip",
    icon: Hash,
    group: "Surface",
    live: true,
    core: true,
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
    hint: "Documents your agents can read",
    icon: FolderClosed,
    group: "Memory",
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
    hint: "Founders building in public",
    icon: MessagesSquare,
    group: "System",
  },
  {
    to: "/earn",
    label: "Earn",
    plain: "Invite & earn",
    hint: "Invite friends, earn rewards",
    icon: Gift,
    group: "System",
    live: true,
    core: true,
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
