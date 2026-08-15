/** Canonical public origin. Every absolute URL in metadata and share links uses this. */
export const SITE_URL = "https://aibusiness.fun";
export const SITE_NAME = "Aura OS";
/** Dedicated Aura Lokal review / feedback machine (separate Node app on the VPS). */
export const REVIEW_APP_URL = "https://review.aibusiness.fun";

export function reviewAppUrl(path = "/") {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${REVIEW_APP_URL}${p}`;
}
/** Phone-safe viewport — cover lets iOS/Android honor notch safe-area insets. */
export const VIEWPORT_CONTENT = "width=device-width, initial-scale=1, viewport-fit=cover";
export const OG_IMAGE = `${SITE_URL}/og/home.jpg`;
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
export const MEDIA_CACHE_BUST = "20260815wienwave";

/** Public asset path with cache-bust query (videos, posters). */
export function mediaPath(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  const join = p.includes("?") ? "&" : "?";
  return `${p}${join}v=${MEDIA_CACHE_BUST}`;
}

/** Studio / brand entity behind the fair launch and operator of Aura OS. */
export const NINTY = {
  name: "Ninty LLC",
  short: "Ninty",
  tagline: "Developed with love",
} as const;

/** Operator entity for invoices, terms, and Stripe public details. */
export const LEGAL_ENTITY = NINTY.name;

/** Re-export trust roster + BCC separation for convenience. */
export {
  BCC_TOKEN_DISCLAIMER,
  FOUNDERS,
  LEGAL_ADDRESS,
  TOKEN_PRODUCT_SEPARATION,
  legalAddressDisplay,
} from "@/lib/legal-entity";

/**
 * Fair token launch — Monday 17 Aug 2026, 13:11 Central European Summer Time (UTC+2).
 * No ticker / CA until T-0; keep this ISO string as the single countdown source.
 */
export const TOKEN_LAUNCH_AT = "2026-08-17T13:11:00+02:00";
export const TOKEN_LAUNCH_MS = Date.parse(TOKEN_LAUNCH_AT);
export const TOKEN_LAUNCH_LABEL = "Fair launch";
export const TOKEN_LAUNCH_DISPLAY = "17 Aug 2026 · 13:11 CEST";
export const TOKEN_LAUNCH_DISPLAY_DE = "17. August 2026 · 13:11 MESZ";

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
  "Aura OS fair launch — 17 Aug 2026 at 13:11 CEST. Own a company. Let AI make money. Join the founding cohort before T-0.";

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
    group: "chat_or",
  },
  {
    id: "like_post",
    label: "Like the post",
    hint: "Like the Aura OS announce on X",
    href: AURA_LAUNCH_POST_URL,
    group: "chat_or",
  },
  {
    id: "comment_post",
    label: "Comment on the post",
    hint: "Leave a real comment on the announce",
    href: AURA_LAUNCH_POST_URL,
    group: "chat_or",
  },
  {
    id: "share_post",
    label: "Share or quote",
    hint: "Repost or quote the Aura OS announce",
    href: AURA_LAUNCH_POST_URL,
    group: "chat_or",
  },
  {
    id: "discord",
    label: "Join Discord",
    hint: "Enter the Ninty Discord server",
    href: "https://discord.gg/geUpHt3eSb",
    group: "chat_or",
  },
  {
    id: "telegram",
    label: "Join Telegram",
    hint: "Enter the Ninty Telegram group",
    href: "https://t.me/+4zFH7-2tyW0yOTBk",
    group: "chat_or",
  },
];

export const WHITELIST_REQUIRED_COUNT = 2; // launch week: follow X + one optional chat/share

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
    id: "wien",
    label: "Wien · 1.000 Betriebe",
    href: "/wien",
    group: "product",
    blurb: "Vienna hub — reviews, missions, directory",
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
