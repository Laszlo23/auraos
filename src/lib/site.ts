/** Canonical public origin. Every absolute URL in metadata and share links uses this. */
export const SITE_URL = "https://aibusiness.fun";
export const SITE_NAME = "Aura OS";
export const OG_IMAGE = `${SITE_URL}/og-image.jpg`;
export const LEGAL_EMAIL = "founders@aibusiness.fun";
export const LEGAL_UPDATED = "August 8, 2026";

/** Absolute URL for a path on the canonical domain. */
export const url = (path = "/") => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
