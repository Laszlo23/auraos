/**
 * Genesis Passport — server mint + ownership checks.
 * Minter key never leaves the server (GENESIS_MINTER_KEY).
 */
import {
  type Address,
  type Hex,
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia, bsc, opBNB } from "viem/chains";

import { activeNetwork, alchemyRpcUrl, chainId, explorerBaseUrl, type AuraNetwork } from "@/lib/chain-config";
import { explorerTxUrl as explorerTxUrlFor } from "@/lib/trading/tokens";

export const GENESIS_ABI = parseAbi([
  "function mint(address to, uint256 tokenId)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function totalMinted() view returns (uint256)",
  "function maxSupply() view returns (uint256)",
  "function pause()",
  "function unpause()",
]);

function genesisViemChain(network: AuraNetwork = activeNetwork()) {
  switch (network) {
    case "base":
      return base;
    case "base-sepolia":
      return baseSepolia;
    case "bsc":
      return bsc;
    case "opbnb":
      return opBNB;
    default: {
      const _exhaustive: never = network;
      return _exhaustive;
    }
  }
}

export function genesisContractAddress(): Address | null {
  const raw =
    process.env["GENESIS_NFT_CONTRACT"]?.trim() ||
    process.env["VITE_GENESIS_NFT_CONTRACT"]?.trim() ||
    "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) return null;
  return raw as Address;
}

export function genesisPriceUsdc(): number {
  const n = Number(process.env["GENESIS_NFT_PRICE_USDC"] ?? 99);
  return Number.isFinite(n) && n > 0 ? n : 99;
}

export function genesisMaxSupply(): number {
  const n = Number(process.env["GENESIS_NFT_MAX_SUPPLY"] ?? 1000);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1000;
}

function rpcUrl(): string {
  const url = alchemyRpcUrl();
  if (!url) throw new Error("Alchemy RPC not configured (ALCHEMY_API_KEY / ALCHEMY_BASE_URL).");
  return url;
}

export function publicGenesisClient() {
  const network = activeNetwork();
  return createPublicClient({
    chain: genesisViemChain(network),
    transport: http(rpcUrl()),
  });
}

export async function walletOwnsGenesis(wallet: string): Promise<boolean> {
  const contract = genesisContractAddress();
  if (!contract || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) return false;
  try {
    const client = publicGenesisClient();
    const bal = await client.readContract({
      address: contract,
      abi: GENESIS_ABI,
      functionName: "balanceOf",
      args: [wallet as Address],
    });
    return bal > 0n;
  } catch (err) {
    console.warn("[genesis] balanceOf failed", err);
    return false;
  }
}

export async function mintGenesisToWallet(opts: {
  to: Address;
  tokenId: number;
}): Promise<{ txHash: Hex; tokenId: number }> {
  const contract = genesisContractAddress();
  if (!contract) throw new Error("GENESIS_NFT_CONTRACT is not set.");

  const key = process.env["GENESIS_MINTER_KEY"]?.trim();
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error("GENESIS_MINTER_KEY is not configured (server-only hex private key).");
  }

  const max = genesisMaxSupply();
  if (opts.tokenId < 1 || opts.tokenId > max) {
    throw new Error("tokenId out of range");
  }

  const network = activeNetwork();
  const account = privateKeyToAccount(key as Hex);
  const client = createWalletClient({
    account,
    chain: genesisViemChain(network),
    transport: http(rpcUrl()),
  });
  const publicClient = publicGenesisClient();

  const hash = await client.writeContract({
    address: contract,
    abi: GENESIS_ABI,
    functionName: "mint",
    args: [opts.to, BigInt(opts.tokenId)],
    chain: genesisViemChain(network),
    account,
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return { txHash: hash, tokenId: opts.tokenId };
}

export function explorerTxUrl(txHash: string): string {
  return explorerTxUrlFor(activeNetwork(), txHash);
}

export function explorerTokenUrl(tokenId: number): string {
  const contract = genesisContractAddress();
  const base = explorerBaseUrl(activeNetwork());
  if (!contract) return base;
  return `${base}/token/${contract}?a=${tokenId}`;
}

/** Chain id for UI / EIP-712 (unused until voucher path is wired on-chain). */
export function genesisChainId(): number {
  return chainId(activeNetwork());
}
