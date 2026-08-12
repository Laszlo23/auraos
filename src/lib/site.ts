/** Canonical public origin. Every absolute URL in metadata and share links uses this. */
export const SITE_URL = "https://aibusiness.fun";
export const SITE_NAME = "Aura OS";
export const OG_IMAGE = `${SITE_URL}/og-image.jpg`;
export const LEGAL_EMAIL = "founders@aibusiness.fun";
export const LEGAL_UPDATED = "August 11, 2026";
/** Public support contact shown on Stripe Checkout / legal pages. */
export const SUPPORT_EMAIL = LEGAL_EMAIL;

/** Absolute URL for a path on the canonical domain. */
export const url = (path = "/") => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * Bump when public media must bypass stale CDN/browser caches
 * (e.g. after a mistaken immutable Cache-Control on 403 responses).
 */
export const MEDIA_CACHE_BUST = "20260812funnels";

/** Public asset path with cache-bust query (videos, posters). */
export function mediaPath(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  const join = p.includes("?") ? "&" : "?";
  return `${p}${join}v=${MEDIA_CACHE_BUST}`;
}

/** Studio / brand entity behind the fair launch and operator of Aura OS. */
export const BUILDING_CULTURE = {
  name: "Building Culture LLC",
  short: "Building Culture",
} as const;

/** Operator entity for invoices, terms, and Stripe public details. */
export const LEGAL_ENTITY = BUILDING_CULTURE.name;

/** Re-export trust roster + BCC separation for convenience. */
export {
  BCC_TOKEN_DISCLAIMER,
  FOUNDERS,
  LEGAL_ADDRESS,
  TOKEN_PRODUCT_SEPARATION,
  legalAddressDisplay,
} from "@/lib/legal-entity";

/**
 * Fair token launch — 14 Aug 2026, 14:14 Central European Summer Time (UTC+2).
 * No ticker / CA until T-0; keep this ISO string as the single countdown source.
 */
export const TOKEN_LAUNCH_AT = "2026-08-14T14:14:00+02:00";
export const TOKEN_LAUNCH_MS = Date.parse(TOKEN_LAUNCH_AT);
export const TOKEN_LAUNCH_LABEL = "Fair launch";
export const TOKEN_LAUNCH_DISPLAY = "14 Aug 2026 · 14:14 CEST";

export type SocialLinkId = "x" | "discord" | "telegram" | "farcaster";

export type SocialLink = {
  id: SocialLinkId;
  label: string;
  href: string;
  hint: string;
  /** Maps to community quest key when authenticated. */
  questKey: string;
  xp: number;
};

export const SOCIAL_LINKS: SocialLink[] = [
  {
    id: "x",
    label: "X",
    href: "https://x.com/buildingcultu3",
    hint: "Follow @buildingcultu3",
    questKey: "community:follow-x",
    xp: 80,
  },
  {
    id: "discord",
    label: "Discord",
    href: "https://discord.gg/geUpHt3eSb",
    hint: "Join the community",
    questKey: "community:join-discord",
    xp: 120,
  },
  {
    id: "telegram",
    label: "Telegram",
    href: "https://t.me/+4zFH7-2tyW0yOTBk",
    hint: "Join the channel",
    questKey: "community:join-telegram",
    xp: 120,
  },
  {
    id: "farcaster",
    label: "Farcaster",
    href: "https://farcaster.xyz/0xleonardo",
    hint: "Follow 0xleonardo",
    questKey: "community:follow-farcaster",
    xp: 80,
  },
];

export const LAUNCH_SHARE_TEXT =
  "Aura OS fair launch — 14 Aug 2026 at 14:14 CEST. Own a company. Let AI make money. Join the founding cohort before T-0.";

/** Aura OS announce post — like, comment, and quote/share to earn whitelist access. */
export const AURA_LAUNCH_POST_URL = "https://x.com/buildingcultu3/status/2086020001341870326";

export type WhitelistTaskId =
  | "follow_x"
  | "follow_farcaster"
  | "like_post"
  | "comment_post"
  | "share_post"
  | "discord"
  | "telegram";

export type WhitelistTask = {
  id: WhitelistTaskId;
  label: string;
  hint: string;
  href: string;
  /** Required checkboxes vs Discord/Telegram OR group. */
  group: "required" | "chat_or";
};

export const WHITELIST_TASKS: WhitelistTask[] = [
  {
    id: "follow_x",
    label: "Follow on X",
    hint: "Follow @buildingcultu3",
    href: "https://x.com/buildingcultu3",
    group: "required",
  },
  {
    id: "follow_farcaster",
    label: "Follow on Farcaster",
    hint: "Follow 0xleonardo",
    href: "https://farcaster.xyz/0xleonardo/",
    group: "required",
  },
  {
    id: "like_post",
    label: "Like the post",
    hint: "Like the Aura OS announce on X",
    href: AURA_LAUNCH_POST_URL,
    group: "required",
  },
  {
    id: "comment_post",
    label: "Comment on the post",
    hint: "Leave a real comment on the announce",
    href: AURA_LAUNCH_POST_URL,
    group: "required",
  },
  {
    id: "share_post",
    label: "Share or quote",
    hint: "Repost or quote the Aura OS announce",
    href: AURA_LAUNCH_POST_URL,
    group: "required",
  },
  {
    id: "discord",
    label: "Join Discord",
    hint: "Enter the Building Culture server",
    href: "https://discord.gg/geUpHt3eSb",
    group: "chat_or",
  },
  {
    id: "telegram",
    label: "Join Telegram",
    hint: "Enter the Building Culture group",
    href: "https://t.me/+4zFH7-2tyW0yOTBk",
    group: "chat_or",
  },
];

export const WHITELIST_REQUIRED_COUNT = 6; // 5 required + 1 of chat_or

/**
 * Public product / funnel surfaces for footer switcher + sitemap.
 * Paths are relative to SITE_URL.
 */
export type ProductSurface = {
  id: string;
  label: string;
  href: string;
  group: "product" | "funnel" | "app";
  blurb: string;
};

export const PRODUCT_SURFACES: ProductSurface[] = [
  {
    id: "os",
    label: "Aura OS",
    href: "/",
    group: "product",
    blurb: "AI company operating system",
  },
  {
    id: "lokal",
    label: "Aura Lokal",
    href: "/lokal",
    group: "product",
    blurb: "Local business growth (DE)",
  },
  {
    id: "nachbar",
    label: "Aura Nachbar",
    href: "/nachbar",
    group: "product",
    blurb: "Neighborhood check-in & rewards",
  },
  {
    id: "for-local",
    label: "For local shops",
    href: "/for/local",
    group: "funnel",
    blurb: "Review Boost funnel (EN)",
  },
  {
    id: "for-agencies",
    label: "For agencies",
    href: "/for/agencies",
    group: "funnel",
    blurb: "Agency partner funnel",
  },
  {
    id: "for-sales",
    label: "For sales teams",
    href: "/for/sales",
    group: "funnel",
    blurb: "SMB sales funnel",
  },
  {
    id: "for-start",
    label: "Business in a box",
    href: "/for/start",
    group: "funnel",
    blurb: "Start a company funnel",
  },
  {
    id: "for-realty",
    label: "For realty",
    href: "/for/realty",
    group: "funnel",
    blurb: "Real-estate funnel",
  },
  {
    id: "app",
    label: "OS app (console)",
    href: "/console",
    group: "app",
    blurb: "Sign in to the founder desk",
  },
];
