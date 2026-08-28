/**
 * Aura Relic — server mint + hash gate.
 * Minter key and answer hash never leave the server (RELIC_MINTER_KEY, RELIC_ANSWER_HASH).
 * Never log the passphrase.
 */
import { timingSafeEqual } from "node:crypto";
import {
  type Address,
  type Hex,
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  parseAbi,
  toBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia, bsc, opBNB } from "viem/chains";

import {
  activeNetwork,
  alchemyRpcUrl,
  explorerBaseUrl,
  type AuraNetwork,
} from "@/lib/chain-config";
import { explorerTxUrl as explorerTxUrlFor } from "@/lib/trading/tokens";

export const RELIC_MAX_SUPPLY = 7;

export const RELIC_ABI = parseAbi([
  "function mint(address to, uint256 tokenId)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function totalMinted() view returns (uint256)",
  "function maxSupply() view returns (uint256)",
  "function pause()",
  "function unpause()",
]);

function relicViemChain(network: AuraNetwork = activeNetwork()) {
  switch (network) {
    case "base":
      return base;
    case "base-sepolia":
      return baseSepolia;
    case "bsc":
      return bsc;
    case "opbnb":
      return opBNB;
    case "robinhood":
    case "robinhood-testnet":
      return base;
    default: {
      const _exhaustive: never = network;
      return _exhaustive;
    }
  }
}

export function relicContractAddress(): Address | null {
  const raw =
    process.env["RELIC_NFT_CONTRACT"]?.trim() ||
    process.env["VITE_RELIC_NFT_CONTRACT"]?.trim() ||
    "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) return null;
  return raw as Address;
}

export function relicMintConfigured(): boolean {
  const key = process.env["RELIC_MINTER_KEY"]?.trim() ?? "";
  return Boolean(relicContractAddress() && /^0x[0-9a-fA-F]{64}$/.test(key));
}

export function relicAnswerConfigured(): boolean {
  return Boolean(parseAnswerHash());
}

function parseAnswerHash(): Hex | null {
  const raw = process.env["RELIC_ANSWER_HASH"]?.trim() ?? "";
  if (!/^0x[0-9a-fA-F]{64}$/.test(raw)) return null;
  return raw.toLowerCase() as Hex;
}

export function normalizeRelicPhrase(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export function hashRelicPhrase(input: string): Hex {
  return keccak256(toBytes(normalizeRelicPhrase(input)));
}

/** Timing-safe compare. Never logs `input`. Returns false if the env hash is missing. */
export function relicPhraseMatches(input: string): boolean {
  const expected = parseAnswerHash();
  if (!expected) return false;
  const got = hashRelicPhrase(input);
  const a = Buffer.from(expected.slice(2), "hex");
  const b = Buffer.from(got.slice(2), "hex");
  if (a.length !== 32 || b.length !== 32) return false;
  return timingSafeEqual(a, b);
}

function rpcUrl(): string {
  const url = alchemyRpcUrl();
  if (!url) throw new Error("Alchemy RPC not configured (ALCHEMY_API_KEY / ALCHEMY_BASE_URL).");
  return url;
}

export function publicRelicClient() {
  const network = activeNetwork();
  return createPublicClient({
    chain: relicViemChain(network),
    transport: http(rpcUrl()),
  });
}

export async function onchainRelicMinted(): Promise<number | null> {
  const contract = relicContractAddress();
  if (!contract) return null;
  try {
    const client = publicRelicClient();
    const minted = await client.readContract({
      address: contract,
      abi: RELIC_ABI,
      functionName: "totalMinted",
    });
    return Number(minted);
  } catch (err) {
    console.warn("[relic] totalMinted failed");
    void err;
    return null;
  }
}

export async function mintRelicToWallet(opts: {
  to: Address;
  tokenId: number;
}): Promise<{ txHash: Hex; tokenId: number }> {
  const contract = relicContractAddress();
  if (!contract) throw new Error("RELIC_NFT_CONTRACT is not set.");

  const key = process.env["RELIC_MINTER_KEY"]?.trim();
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error("RELIC_MINTER_KEY is not configured (server-only hex private key).");
  }

  if (opts.tokenId < 1 || opts.tokenId > RELIC_MAX_SUPPLY) {
    throw new Error("tokenId out of range");
  }

  const network = activeNetwork();
  const account = privateKeyToAccount(key as Hex);
  const client = createWalletClient({
    account,
    chain: relicViemChain(network),
    transport: http(rpcUrl()),
  });
  const publicClient = publicRelicClient();

  const hash = await client.writeContract({
    address: contract,
    abi: RELIC_ABI,
    functionName: "mint",
    args: [opts.to, BigInt(opts.tokenId)],
    chain: relicViemChain(network),
    account,
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return { txHash: hash, tokenId: opts.tokenId };
}

export function explorerTxUrl(txHash: string): string {
  return explorerTxUrlFor(activeNetwork(), txHash);
}

export function explorerTokenUrl(tokenId: number): string {
  const contract = relicContractAddress();
  const baseUrl = explorerBaseUrl(activeNetwork());
  if (!contract) return baseUrl;
  return `${baseUrl}/token/${contract}?a=${tokenId}`;
}
