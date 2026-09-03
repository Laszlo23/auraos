/**
 * OpenSea / marketplace compatibility — metadata + official links only.
 * No listings bot, no floor sniper, no secondary-market trading agent.
 * Collection URL stays null until the team publishes a verified OpenSea page.
 */

import { BRAND_ASSETS } from "@/lib/brand";
import { HOOD } from "@/lib/hood";
import { genesisPassportAddress } from "@/lib/aura-launch";
import { SITE_NAME, SITE_URL, url } from "@/lib/site";
import { readConfiguredBaseAddress } from "@/lib/aura-token";

export const OPENSEA_BASE_CHAIN = "base" as const;

/** Official Hood collection page — set after OpenSea verification. Never invent a URL. */
export function hoodOpenSeaCollectionUrl(): string | null {
  const fromProc =
    typeof process !== "undefined"
      ? process.env["OPENSEA_HOOD_COLLECTION_URL"] ||
        process.env["VITE_OPENSEA_HOOD_COLLECTION_URL"] ||
        ""
      : "";
  const fromVite =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    typeof import.meta.env["VITE_OPENSEA_HOOD_COLLECTION_URL"] === "string"
      ? String(import.meta.env["VITE_OPENSEA_HOOD_COLLECTION_URL"])
      : "";
  const raw = (fromProc || fromVite).trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    if (!/(^|\.)opensea\.io$/i.test(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Basescan token inventory when CA is live — always safer than a DM screenshot. */
export function hoodBasescanCollectionUrl(): string | null {
  const ca = genesisPassportAddress();
  if (!ca) return null;
  return `https://basescan.org/token/${ca}`;
}

/** Suggested OpenSea assets URL once contract is known (still not a verified collection). */
export function hoodOpenSeaAssetsHint(): string | null {
  const ca = genesisPassportAddress();
  if (!ca) return null;
  return `https://opensea.io/assets/${OPENSEA_BASE_CHAIN}/${ca}`;
}

export type OpenSeaCompatCheck = {
  id: string;
  label: string;
  labelDe: string;
  ok: boolean;
  detail: string;
  detailDe: string;
};

/** Transparent checklist for marketplace listing readiness. */
export function openSeaCompatChecks(): OpenSeaCompatCheck[] {
  const passport = genesisPassportAddress();
  const listed = Boolean(hoodOpenSeaCollectionUrl());
  return [
    {
      id: "metadata",
      label: "Self-hosted tokenURI",
      labelDe: "Self-hosted tokenURI",
      ok: true,
      detail: `${SITE_URL}/api/genesis/meta/{id} — traits + SVG art (no broken external JPEG).`,
      detailDe: `${SITE_URL}/api/genesis/meta/{id} — Traits + SVG-Art (kein kaputtes externes JPEG).`,
    },
    {
      id: "collection-meta",
      label: "Collection metadata",
      labelDe: "Collection-Metadaten",
      ok: true,
      detail: `${SITE_URL}/api/genesis/collection — name, image, fee recipient policy.`,
      detailDe: `${SITE_URL}/api/genesis/collection — Name, Bild, Fee-Policy.`,
    },
    {
      id: "contract",
      label: "Passport contract published",
      labelDe: "Passport-Contract veröffentlicht",
      ok: Boolean(passport),
      detail: passport
        ? `Base ${passport}`
        : "GENESIS_NFT_CONTRACT not set — OpenSea cannot verify yet.",
      detailDe: passport
        ? `Base ${passport}`
        : "GENESIS_NFT_CONTRACT fehlt — OpenSea kann noch nicht verifizieren.",
    },
    {
      id: "opensea-page",
      label: "Verified OpenSea collection URL",
      labelDe: "Verifizierte OpenSea-Collection-URL",
      ok: listed,
      detail: listed
        ? String(hoodOpenSeaCollectionUrl())
        : "Not published — we never invent a collection link. Set VITE_OPENSEA_HOOD_COLLECTION_URL after verification.",
      detailDe: listed
        ? String(hoodOpenSeaCollectionUrl())
        : "Noch nicht veröffentlicht — wir erfinden keinen Link. Nach Verifikation VITE_OPENSEA_HOOD_COLLECTION_URL setzen.",
    },
  ];
}

/** ERC-721 contract-level / OpenSea collection JSON. */
export function hoodCollectionMetadata() {
  const image = url(BRAND_ASSETS.hoodCollection);
  const external = `${SITE_URL}${HOOD.path}`;
  return {
    name: HOOD.collection,
    description:
      "The Hood — capped founding-circle utility NFT for Aura OS (max 1,000). Desk perks today; hold-to-earn from real desk/catalog/x402 fees after external audit — not equity, not a Tesla/share claim, not a fixed APY. Of each $299 mint: 70% launch liquidity escrow, 30% ops.",
    image,
    external_link: external,
    seller_fee_basis_points: 500,
    fee_recipient: readConfiguredBaseAddress(
      typeof process !== "undefined"
        ? process.env["OPENSEA_FEE_RECIPIENT"] || process.env["VITE_OPENSEA_FEE_RECIPIENT"] || ""
        : "",
      typeof import.meta !== "undefined" &&
        import.meta.env &&
        typeof import.meta.env["VITE_OPENSEA_FEE_RECIPIENT"] === "string"
        ? String(import.meta.env["VITE_OPENSEA_FEE_RECIPIENT"])
        : "",
    ),
    issuer: SITE_NAME,
  };
}
