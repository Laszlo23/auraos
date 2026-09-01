import { keccak256, parseAbi, toBytes, type Address, type Hex } from "viem";

import {
  creatorChainId,
  creatorNetwork,
  creatorStableAddress,
  creatorStableDecimals,
} from "@/lib/chain-config";
import { SITE_URL } from "@/lib/site";

export type CreatorMintAsset = "usdg" | "eth";

export const CREATOR_COLLECTION_ABI = parseAbi([
  "function totalMinted() view returns (uint256)",
  "function maxSupply() view returns (uint256)",
  "function mintDesk() view returns (address)",
  "function ownerOf(uint256 tokenId) view returns (address)",
]);

export const CREATOR_MINT_DESK_ABI = parseAbi([
  "function mintPaid(address to) payable returns (uint256 tokenId)",
  "function nextTokenId() view returns (uint256)",
  "function PRICE() view returns (uint256)",
  "function ASSET() view returns (uint8)",
]);

export const CREATOR_FACTORY_ABI = parseAbi([
  "event CollectionCreated(address indexed creator, address indexed collection, address indexed desk, bytes32 slugHash, string name, string symbol)",
  "function createCollection((string name, string symbol, string baseURI, uint256 maxSupply, uint256 price, uint8 asset, address creator, address royaltyRecipient, uint96 royaltyBps, bytes32 slugHash)) returns (address collection, address desk)",
]);

export function creatorFactoryAddress(): Address | null {
  const network = creatorNetwork();
  const raw =
    network === "robinhood-testnet"
      ? process.env["CREATOR_FACTORY_RH_TESTNET"]?.trim()
      : process.env["CREATOR_FACTORY_RH"]?.trim();
  if (!raw || !/^0x[a-fA-F0-9]{40}$/.test(raw)) return null;
  return raw as Address;
}

export function creatorPlatformFeeBps(): number {
  const n = Number(process.env["CREATOR_PLATFORM_FEE_BPS"] ?? 1000);
  return Number.isFinite(n) && n >= 0 && n <= 5000 ? Math.floor(n) : 1000;
}

export function creatorOpsWallet(): Address | null {
  const raw = process.env["CREATOR_OPS_WALLET_RH"]?.trim() ?? "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) return null;
  return raw as Address;
}

export function creatorMetadataBaseUri(slug: string): string {
  return `${SITE_URL}/api/creator/meta/${encodeURIComponent(slug)}/`;
}

export function mintAssetToSolidity(asset: CreatorMintAsset): 0 | 1 {
  return asset === "eth" ? 1 : 0;
}

export function parseMintPriceToWei(price: number, asset: CreatorMintAsset): bigint {
  if (!Number.isFinite(price) || price < 0) return 0n;
  if (asset === "eth") {
    return BigInt(Math.round(price * 1e18));
  }
  const decimals = creatorStableDecimals();
  return BigInt(Math.round(price * 10 ** decimals));
}

export function formatMintPriceFromWei(wei: string | bigint, asset: CreatorMintAsset): string {
  const v = typeof wei === "string" ? BigInt(wei || "0") : wei;
  if (asset === "eth") {
    return `${Number(v) / 1e18} ETH`;
  }
  const decimals = creatorStableDecimals();
  return `${Number(v) / 10 ** decimals} USDG`;
}

export function slugToHash(slug: string): Hex {
  return keccak256(toBytes(slug.trim().toLowerCase()));
}

export { creatorChainId, creatorNetwork, creatorStableAddress, creatorStableDecimals };

export type NftCollectionRow = {
  id: string;
  company_id: string;
  slug: string;
  name: string;
  symbol: string;
  description: string | null;
  chain_id: number;
  contract_address: string | null;
  mint_desk_address: string | null;
  max_supply: number;
  mint_price_wei: string;
  mint_asset: CreatorMintAsset;
  royalty_bps: number;
  payout_wallet: string | null;
  metadata_base_uri: string | null;
  cover_image_url: string | null;
  status: "draft" | "deploying" | "live" | "paused" | "sold_out" | "failed";
  deploy_tx_hash: string | null;
  error: string | null;
  published_at: string | null;
};

export function collectionMintUrl(slug: string): string {
  return `${SITE_URL}/c/${encodeURIComponent(slug)}`;
}

export function collectionCoverUrl(slug: string): string {
  return `${SITE_URL}/api/creator/art/${encodeURIComponent(slug)}`;
}

export function normalizeCollectionSlug(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  if (s.length < 2) throw new Error("Slug must be at least 2 characters");
  return s;
}

export function normalizeCollectionSymbol(raw: string): string {
  const s = raw
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 10);
  if (s.length < 2) throw new Error("Symbol must be at least 2 characters");
  return s;
}
