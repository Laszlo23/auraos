/**
 * Browser security headers. CSP is Report-Only until we have a quiet week
 * of DevTools reports — then flip the Caddy/server name to enforce.
 *
 * Do not put secrets on VITE_*. Vite inlines those into the public JS bundle.
 */

export const CSP_REPORT_ONLY_HEADER = "Content-Security-Policy-Report-Only";

/**
 * Client-visible env keys. Publishable Stripe / WalletConnect / Supabase anon
 * keys belong here. Minter keys, IPN secrets, worker secrets, relic answers
 * must stay on process.env only.
 */
export const PUBLIC_VITE_KEYS = [
  "VITE_APP_ENV",
  "VITE_BASE_APP_ID",
  "VITE_CHAIN_NETWORK",
  "VITE_DEMO_SEED",
  "VITE_FIO_DOMAIN",
  "VITE_FIO_REGISTER_URL",
  "VITE_FIO_TPID",
  "VITE_GENESIS_NFT_CONTRACT",
  "VITE_LAUNCH_ESCROW_CONTRACT",
  "VITE_LAUNCH_GIFT_LOCK_CONTRACT",
  "VITE_AURA_TOKEN_CA",
  "VITE_AURA_CA_PUBLISH",
  "VITE_AURA_PAIR_CA",
  "VITE_AURA_POOL_USDC",
  "VITE_AURA_POOL_WETH",
  "VITE_AURA_GAUGE",
  "VITE_AURA_BURN_SINK",
  "VITE_AURA_PROTOCOL_SINK",
  "VITE_AURA_QUEST_BONUS",
  "VITE_AURA_RH_WRAPPER",
  "VITE_AURA_FEE_APR_7D",
  "VITE_AURA_LP_SINK",
  "VITE_AURA_PAURA_REDEEM",
  "VITE_AURA_TOKEN_IMAGE_URL",
  "VITE_AURA_TOKEN_HEADER_URL",
  "VITE_AURA_SQUARE_CA",
  "VITE_AURA_LAUNCH_TREASURY",
  "VITE_PRIVATE_SALE_CONTRACT",
  "VITE_OPENSEA_HOOD_COLLECTION_URL",
  "VITE_OPENSEA_FEE_RECIPIENT",
  "VITE_RELIC_NFT_CONTRACT",
  "VITE_STRIPE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_SUPABASE_PROJECT_ID",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_URL",
  "VITE_WALLETCONNECT_PROJECT_ID",
] as const;

/** Names that must never be prefixed with VITE_. */
export const FORBIDDEN_VITE_NAME =
  /^VITE_(?:.*_)?(?:SECRET|MINTER|ANSWER|SERVICE_ROLE|PASSWORD|PASS|IPN|DEPLOYER|PRIVATE_KEY)(?:_|$)/i;

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self' https://twitter.com https://x.com https://platform.twitter.com https://*.twitter.com https://www.linkedin.com https://*.linkedin.com",
  [
    "script-src 'self' 'unsafe-inline'",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://accounts.google.com",
    "https://*.walletconnect.com",
    "https://*.walletconnect.org",
    "https://*.reown.com",
    "https://js.stripe.com",
  ].join(" "),
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  [
    "connect-src 'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    "https://analytics.google.com",
    "https://*.analytics.google.com",
    "https://*.g.doubleclick.net",
    "https://fonts.googleapis.com",
    "https://accounts.google.com",
    "https://*.googleapis.com",
    "https://*.gstatic.com",
    "https://*.walletconnect.com",
    "wss://*.walletconnect.com",
    "https://*.walletconnect.org",
    "wss://*.walletconnect.org",
    "https://*.reown.com",
    "wss://*.reown.com",
    "https://*.g.alchemy.com",
    "https://*.alchemy.com",
    "https://mainnet.base.org",
    "https://*.base.org",
    "https://api.qrserver.com",
    "https://nowpayments.io",
    "https://*.nowpayments.io",
    "https://*.stripe.com",
    "https://app.fio.net",
    "https://*.fio.net",
  ].join(" "),
  [
    "frame-src 'self'",
    "https://www.google.com",
    "https://maps.google.com",
    "https://accounts.google.com",
    "https://js.stripe.com",
    "https://hooks.stripe.com",
    "https://checkout.stripe.com",
    "https://*.walletconnect.com",
    "https://*.walletconnect.org",
    "https://*.reown.com",
    "https://nowpayments.io",
    "https://*.nowpayments.io",
  ].join(" "),
  [
    "form-action 'self'",
    "https://accounts.google.com",
    "https://checkout.stripe.com",
    "https://nowpayments.io",
    "https://*.nowpayments.io",
    "https://app.fio.net",
  ].join(" "),
] as const;

export const CONTENT_SECURITY_POLICY_REPORT_ONLY = CSP_DIRECTIVES.join("; ");

export function isForbiddenViteKey(name: string): boolean {
  return FORBIDDEN_VITE_NAME.test(name);
}

export function applySecurityHeaders(headers: Headers): Headers {
  if (!headers.has(CSP_REPORT_ONLY_HEADER)) {
    headers.set(CSP_REPORT_ONLY_HEADER, CONTENT_SECURITY_POLICY_REPORT_ONLY);
  }
  return headers;
}

export function withSecurityHeaders(response: Response): Response {
  const headers = applySecurityHeaders(new Headers(response.headers));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
