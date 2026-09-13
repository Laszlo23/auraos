/**
 * AURA token identity for explorers, Clanker, WalletConnect, and the sales pages.
 * CAs stay null until env is set. Never invent one.
 */

import { AURA_CURVE_COPY, auraPoolUsdcId } from "@/lib/aura-curve";
import { AURA_POOL_FEE_BPS, AURA_SCANNER_COPY, AURA_TOKEN_TAX_BPS } from "@/lib/aura-scanner";
import { auraTokenAddress } from "@/lib/aura-self-launch";
import { BRAND_ASSETS } from "@/lib/brand";
import { AURA_TOKEN_NAME, AURA_TOKEN_SYMBOL } from "@/lib/aura-token";
import { SITE_URL, SOCIAL_LINKS } from "@/lib/site";

/** Official AURA ERC-20 icon (IPFS). HTTPS copy lives at /brand/aura-token.png. */
export const AURA_TOKEN_IMAGE_CID = "bafkreiawamrou72lmqboesv3ispg4ol3pkrlme4i4gspjrtph66agq6hhy";
export const AURA_TOKEN_IMAGE_IPFS = `ipfs://${AURA_TOKEN_IMAGE_CID}`;

export const AURA_TOKEN_WEBSITE = `${SITE_URL}/token`;
export const AURA_TOKEN_DOCS = [
  `${SITE_URL}/tokenomics`,
  `${SITE_URL}/trust`,
  `${SITE_URL}/docs/AURA_CURVE.md`,
] as const;

export const AURA_TOKEN_DESCRIPTION =
  "AURA is software utility plus a public Uniswap v4 AURA/USDC pool on Base. Fixed supply 777,777,777. Locked LP, published hooks. You can lose the tokens. Not equity.";

export const AURA_TOKEN_DESCRIPTION_DE =
  "AURA ist Software-Nutzen plus ein öffentlicher Uniswap-v4-AURA/USDC-Pool auf Base. Fixer Supply 777.777.777. Gesperrte LP, veröffentlichte Hooks. Du kannst die Token verlieren. Kein Equity.";

function envImageOverride(): string | null {
  const fromProc =
    typeof process !== "undefined" ? process.env["AURA_TOKEN_IMAGE_URL"]?.trim() ?? "" : "";
  const fromVite =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    typeof import.meta.env["VITE_AURA_TOKEN_IMAGE_URL"] === "string"
      ? String(import.meta.env["VITE_AURA_TOKEN_IMAGE_URL"]).trim()
      : "";
  const raw = fromProc || fromVite;
  if (/^https?:\/\//i.test(raw) || raw.startsWith("ipfs://")) return raw;
  return null;
}

export function auraTokenImageUrl(): string {
  return envImageOverride() ?? `${SITE_URL}${BRAND_ASSETS.tokenMark}`;
}

export function auraTokenOgUrl(): string {
  return envHeaderOverride() ?? `${SITE_URL}${BRAND_ASSETS.tokenOg}`;
}

function envHeaderOverride(): string | null {
  const fromProc =
    typeof process !== "undefined" ? process.env["AURA_TOKEN_HEADER_URL"]?.trim() ?? "" : "";
  const fromVite =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    typeof import.meta.env["VITE_AURA_TOKEN_HEADER_URL"] === "string"
      ? String(import.meta.env["VITE_AURA_TOKEN_HEADER_URL"]).trim()
      : "";
  const raw = fromProc || fromVite;
  if (/^https?:\/\//i.test(raw) || raw.startsWith("ipfs://")) return raw;
  return null;
}

export type AuraTokenSocial = {
  platform: string;
  url: string;
  label: string;
};

export function auraTokenSocials(): AuraTokenSocial[] {
  return SOCIAL_LINKS.map((s) => ({
    platform: s.id,
    url: s.href,
    label: s.label,
  }));
}

export type AuraDexscreenerLink = {
  type: string;
  url: string;
  label?: string;
};

const DEXSCREENER_LINK_TYPE: Record<string, string> = {
  x: "twitter",
  discord: "discord",
  telegram: "telegram",
  farcaster: "farcaster",
};

export function auraDexscreenerLinks(): AuraDexscreenerLink[] {
  return [
    { type: "website", url: AURA_TOKEN_WEBSITE, label: "Website" },
    ...auraTokenSocials().map((s) => ({
      type: DEXSCREENER_LINK_TYPE[s.platform] ?? s.platform,
      url: s.url,
      label: s.label,
    })),
  ];
}

export type AuraTokenMetaJson = {
  name: string;
  symbol: string;
  description: string;
  image: string;
  image_ipfs: string;
  icon: string;
  header: string;
  external_url: string;
  website: string;
  socials: AuraTokenSocial[];
  links: AuraDexscreenerLink[];
  docs: readonly string[];
  address: string | null;
  pool_usdc: string | null;
  chainId: 8453;
  disclaimer: string;
  buy_tax: "0";
  sell_tax: "0";
  token_tax_bps: 0;
  pool_fee_bps: { min: number; max: number };
  you_can_sell: string;
};

export function auraTokenMetaJson(): AuraTokenMetaJson {
  const icon = auraTokenImageUrl();
  return {
    name: AURA_TOKEN_NAME,
    symbol: AURA_TOKEN_SYMBOL,
    description: AURA_TOKEN_DESCRIPTION,
    image: icon,
    image_ipfs: AURA_TOKEN_IMAGE_IPFS,
    icon,
    header: auraTokenOgUrl(),
    external_url: AURA_TOKEN_WEBSITE,
    website: AURA_TOKEN_WEBSITE,
    socials: auraTokenSocials(),
    links: auraDexscreenerLinks(),
    docs: AURA_TOKEN_DOCS,
    address: auraTokenAddress(),
    pool_usdc: auraPoolUsdcId(),
    chainId: 8453,
    disclaimer: AURA_CURVE_COPY.softwareNotEquity,
    buy_tax: "0",
    sell_tax: "0",
    token_tax_bps: AURA_TOKEN_TAX_BPS,
    pool_fee_bps: { min: AURA_POOL_FEE_BPS.min, max: AURA_POOL_FEE_BPS.max },
    you_can_sell: AURA_SCANNER_COPY.youCanSell,
  };
}

export function auraClankerMetadata() {
  return {
    description: AURA_TOKEN_DESCRIPTION,
    socialMediaUrls: auraTokenSocials().map((s) => ({
      platform: s.platform,
      url: s.url,
    })),
  };
}
