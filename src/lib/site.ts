/** Canonical public origin. Every absolute URL in metadata and share links uses this. */
export const SITE_URL = "https://aibusiness.fun";
export const SITE_NAME = "Aura OS";
/** Dedicated Aura Local review / feedback machine (separate Node app on the VPS). */
export const REVIEW_APP_URL = "https://review.aibusiness.fun";
/** Public product name for the local-business surface (URL path remains /lokal). */
export const LOCAL_PRODUCT_NAME = "Aura Local";

export function reviewAppUrl(path = "/") {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${REVIEW_APP_URL}${p}`;
}
/** Phone-safe viewport — cover lets iOS/Android honor notch safe-area insets. */
export const VIEWPORT_CONTENT = "width=device-width, initial-scale=1, viewport-fit=cover";
export const OG_IMAGE = `${SITE_URL}/og/nexus.jpg`;
export const LEGAL_EMAIL = "founders@aibusiness.fun";
export const LEGAL_UPDATED = "August 11, 2026";
/** Public support contact shown on Stripe Checkout / legal pages. */
export const SUPPORT_EMAIL = LEGAL_EMAIL;

/** NOWPayments donation button artwork (footer + /donate). Checkout is server-side via /api/billing/donate. */
export const NOWPAYMENTS_DONATE_BUTTON =
  "https://nowpayments.io/images/embeds/donation-button-black.svg";

/** Absolute URL for a path on the canonical domain. */
export const url = (path = "/") => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * Bump when public media must bypass stale CDN/browser caches
 * (e.g. after a mistaken immutable Cache-Control on 403 responses).
 */
export const MEDIA_CACHE_BUST = "20260830nexus";

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

/** Copyright holder — SSOT for footer, Impressum, LICENSE. */
export const COPYRIGHT_HOLDER = LEGAL_ENTITY;
export const COPYRIGHT_YEAR_START = 2025;

/** e.g. "© 2025–2026 Ninty LLC. All rights reserved." */
export function siteCopyrightLine(atYear = new Date().getFullYear()): string {
  const end = Number.isFinite(atYear) ? Math.max(COPYRIGHT_YEAR_START, Math.trunc(atYear)) : COPYRIGHT_YEAR_START;
  const years =
    end > COPYRIGHT_YEAR_START ? `${COPYRIGHT_YEAR_START}–${end}` : String(COPYRIGHT_YEAR_START);
  return `© ${years} ${COPYRIGHT_HOLDER}. All rights reserved.`;
}

/** Re-export trust roster + BCC separation for convenience. */
export {
  BCC_TOKEN_DISCLAIMER,
  FOUNDERS,
  LEGAL_ADDRESS,
  TOKEN_PRODUCT_SEPARATION,
  legalAddressDisplay,
} from "@/lib/legal-entity";

/**
 * Fair token launch clock — SSOT in aura-t0-clock.ts.
 * T-0 is Sunday 13 Sep 2026, 11:11 Europe/Vienna. CA still unpublished until then.
 */
export {
  TOKEN_LAUNCH_ANNOUNCE_BY_ISO,
  TOKEN_LAUNCH_AT_ISO,
  TOKEN_LAUNCH_DISPLAY,
  TOKEN_LAUNCH_DISPLAY_DE,
  TOKEN_LAUNCH_LABEL,
  TOKEN_LAUNCH_NOTICE_HOURS,
  tokenLaunchAtMs,
  tokenLaunchDisplay,
  tokenLaunchIsLive,
  tokenLaunchRemain,
} from "@/lib/aura-t0-clock";
/** Trust line for UI / share — growth in public, never a surprise CA. */
export const TOKEN_LAUNCH_TRUST =
  "We grow in public. Exact fair-launch time is announced on our official channels 48 hours before — never by DM, never with a surprise CA.";
export const TOKEN_LAUNCH_TRUST_DE =
  "Wir wachsen offen. Den genauen Fair-Launch-Zeitpunkt kündigen wir 48 Stunden vorher auf unseren offiziellen Kanälen an — nie per DM, nie mit einer Überraschungs-CA.";

/** Founder X — Laszlo presents the app here (verified, Spaces). Not @buildingcultu3. */
export const OFFICIAL_X_HANDLE = "bihary41418" as const;
export const OFFICIAL_X_MENTION = `@${OFFICIAL_X_HANDLE}` as const;
export const OFFICIAL_X_URL = `https://x.com/${OFFICIAL_X_HANDLE}` as const;

/** Official Farcaster channel — public home for Aura OS casts. */
export const OFFICIAL_FARCASTER_CHANNEL = "auraos" as const;
export const OFFICIAL_FARCASTER_URL =
  `https://farcaster.xyz/~/channel/${OFFICIAL_FARCASTER_CHANNEL}` as const;

export type SocialLinkId = "x" | "discord" | "telegram" | "farcaster" | "github";

export type SocialLink = {
  id: SocialLinkId;
  label: string;
  href: string;
  hint: string;
  /** Maps to community quest key when authenticated. */
  questKey: string;
  xp: number;
};

/** Public GitHub — source of truth for contracts, docs, and product. */
export const GITHUB_REPO_URL = "https://github.com/Laszlo23/auraos";

export const SOCIAL_LINKS: SocialLink[] = [
  {
    id: "x",
    label: "X",
    href: OFFICIAL_X_URL,
    hint: "Follow Laszlo — Spaces, Quest, Squads",
    questKey: "community:follow-x",
    xp: 80,
  },
  {
    id: "discord",
    label: "Discord",
    href: "https://discord.gg/geUpHt3eSb",
    hint: "Join — drop your squad invite code",
    questKey: "community:join-discord",
    xp: 120,
  },
  {
    id: "telegram",
    label: "Telegram",
    href: "https://t.me/+4zFH7-2tyW0yOTBk",
    hint: "Join — share a world-pulse win",
    questKey: "community:join-telegram",
    xp: 120,
  },
  {
    id: "farcaster",
    label: "Farcaster",
    href: OFFICIAL_FARCASTER_URL,
    hint: "Join /auraos — cast your first badge",
    questKey: "community:follow-farcaster",
    xp: 80,
  },
  {
    id: "github",
    label: "GitHub",
    href: GITHUB_REPO_URL,
    hint: "Open source — contracts, docs, product",
    questKey: "community:star-github",
    xp: 80,
  },
];

export const LAUNCH_SHARE_TEXT =
  `Aura OS — AI company operating system. Fair launch T-0: Sunday 13 Sep 2026, 11:11 Europe/Vienna. AURA on Base, locked Uni v4 AURA/USDC. CA only at T-0 on aibusiness.fun + ${OFFICIAL_X_MENTION} — never by DM.`;

/** Engage on the founder account until a dedicated announce post is pinned. */
export const AURA_LAUNCH_POST_URL = OFFICIAL_X_URL;

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
    hint: `Follow ${OFFICIAL_X_MENTION}`,
    href: OFFICIAL_X_URL,
    group: "required",
  },
  {
    id: "follow_farcaster",
    label: "Join on Farcaster",
    hint: "Join the /auraos channel",
    href: OFFICIAL_FARCASTER_URL,
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
    hint: "Repost or quote — Quest + Squads momentum",
    href: AURA_LAUNCH_POST_URL,
    group: "chat_or",
  },
  {
    id: "discord",
    label: "Join Discord",
    hint: "Enter Ninty Discord — drop a squad invite",
    href: "https://discord.gg/geUpHt3eSb",
    group: "chat_or",
  },
  {
    id: "telegram",
    label: "Join Telegram",
    hint: "Enter Ninty Telegram — share a pulse win",
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
    label: "Aura Local",
    href: "/lokal",
    group: "product",
    blurb: "Local business growth",
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
    id: "token",
    label: "AURA Token",
    href: "/token",
    group: "product",
    blurb: "Investor hub — buy pAURA without the OS",
  },
  {
    id: "buy",
    label: "Get AURA",
    href: "/get",
    group: "product",
    blurb: "Smart wallet or your wallet — official pair only",
  },
  {
    id: "quest",
    label: "AURA Quest",
    href: "/quest",
    group: "app",
    blurb: "Daily missions, REP, badges",
  },
  {
    id: "community",
    label: "Community Squads",
    href: "/community",
    group: "app",
    blurb: "Crews, shared tasks, world pulse",
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
