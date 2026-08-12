/**
 * Clanker deploy helper — Base ERC-20 + Uniswap V4 pool.
 * Signer = wallet owner EOA; tokenAdmin + primary rewards = Light Account (company smart wallet).
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
  formatEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

import { alchemyRpcUrl, activeNetwork } from "@/lib/chain-config";
import { companyTokenPresetById, type CompanyTokenPresetId } from "@/lib/company-token-presets";

export function clankerEnabled(): boolean {
  return process.env["CLANKER_ENABLED"] === "true" || process.env["CLANKER_ENABLED"] === "1";
}

export function clankerPlatformFeeBps(): number {
  const raw = Number(process.env["CLANKER_PLATFORM_FEE_BPS"] ?? 500);
  if (!Number.isFinite(raw)) return 500;
  return Math.max(0, Math.min(2000, Math.floor(raw)));
}

export function platformTreasuryAddress(): Address | null {
  const a = (process.env["X402_PAY_TO"] || process.env["OKX_PAYOUT_ADDRESS"] || "").trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(a)) return null;
  return a as Address;
}

export function clankerChainId(): number {
  const net = activeNetwork();
  if (net === "base-sepolia") return baseSepolia.id;
  return base.id;
}

function viemChainForClanker() {
  return clankerChainId() === baseSepolia.id ? baseSepolia : base;
}

export type ClankerDeployInput = {
  name: string;
  symbol: string;
  imageUrl?: string | null;
  presetId: CompanyTokenPresetId;
  /** Company Light Account — admin + primary reward recipient. */
  smartWallet: Address;
  /** Decrypted owner key that controls the Light Account. */
  ownerPrivateKey: Hex;
};

export type ClankerDeployResult = {
  txHash: string;
  tokenAddress: string;
  tokenAdmin: string;
  rewardRecipient: string;
  chainId: number;
  spec: Record<string, unknown>;
};

export async function fetchEthBalance(address: Address): Promise<bigint> {
  const rpc = alchemyRpcUrl() || process.env["ALCHEMY_RPC_URL"] || process.env["ALCHEMY_BASE_URL"];
  if (!rpc) throw new Error("Alchemy RPC not configured for ETH balance check");
  const client = createPublicClient({
    chain: viemChainForClanker(),
    transport: http(rpc),
  });
  return client.getBalance({ address });
}

export function buildClankerSpec(input: {
  name: string;
  symbol: string;
  imageUrl?: string | null;
  presetId: string;
  smartWallet: Address;
  ownerEoa: Address;
}): Record<string, unknown> {
  const preset =
    companyTokenPresetById(input.presetId) ?? companyTokenPresetById("community_standard")!;
  const platformBps = clankerPlatformFeeBps();
  const treasury = platformTreasuryAddress();
  const companyBps = treasury && platformBps > 0 ? 10_000 - platformBps : 10_000;

  const recipients: Array<{
    admin: Address;
    recipient: Address;
    bps: number;
    token: "Both" | "Paired" | "Clanker";
  }> = [
    {
      admin: input.smartWallet,
      recipient: input.smartWallet,
      bps: companyBps,
      token: "Both",
    },
  ];
  if (treasury && platformBps > 0) {
    recipients.push({
      admin: treasury,
      recipient: treasury,
      bps: platformBps,
      token: "Both",
    });
  }

  return {
    name: input.name,
    symbol: input.symbol,
    image: input.imageUrl ?? "",
    tokenAdmin: input.smartWallet,
    chainId: clankerChainId(),
    vanity: preset.vanity,
    feePreset: preset.feePreset,
    poolPositions: preset.poolPositions,
    vault: {
      percentage: preset.vaultPct,
      lockupDuration: preset.lockupDays * 86_400,
      vestingDuration: preset.vestingDays * 86_400,
      recipient: input.smartWallet,
    },
    ...(preset.devBuyEth > 0
      ? { devBuy: { ethAmount: preset.devBuyEth, recipient: input.smartWallet } }
      : {}),
    rewards: { recipients },
    signingNote:
      "Deploy signed by wallet owner EOA; tokenAdmin + rewards target company smart wallet.",
    ownerEoa: input.ownerEoa,
    platformFeeBps: platformBps,
  };
}

/** Deploy via Clanker SDK. Requires CLANKER_ENABLED=true. */
export async function deployCompanyTokenClanker(
  input: ClankerDeployInput,
): Promise<ClankerDeployResult> {
  if (!clankerEnabled()) {
    throw new Error("Company token deploy is disabled (set CLANKER_ENABLED=true)");
  }

  const preset = companyTokenPresetById(input.presetId);
  if (!preset) throw new Error("Unknown launch preset");

  const rpc = alchemyRpcUrl() || process.env["ALCHEMY_RPC_URL"] || process.env["ALCHEMY_BASE_URL"];
  if (!rpc) throw new Error("Alchemy RPC not configured");

  const account = privateKeyToAccount(input.ownerPrivateKey);
  const chain = viemChainForClanker();
  const publicClient = createPublicClient({ chain, transport: http(rpc) });
  const wallet = createWalletClient({ account, chain, transport: http(rpc) });

  const bal = await publicClient.getBalance({ address: account.address });
  const minWei =
    preset.devBuyEth > 0 ? BigInt(Math.ceil((preset.devBuyEth + 0.005) * 1e18)) : 10n ** 15n; // 0.001 ETH gas floor
  if (bal < minWei) {
    throw new Error(
      `Fund the wallet owner with Base ETH for gas${preset.devBuyEth > 0 ? ` + ${preset.devBuyEth} ETH dev buy` : ""} (balance ${formatEther(bal)} ETH)`,
    );
  }

  const spec = buildClankerSpec({
    name: input.name,
    symbol: input.symbol,
    imageUrl: input.imageUrl,
    presetId: input.presetId,
    smartWallet: input.smartWallet,
    ownerEoa: account.address,
  });

  const { Clanker } = await import("clanker-sdk/v4");
  const { FEE_CONFIGS, POOL_POSITIONS } = await import("clanker-sdk");

  const clanker = new Clanker({
    wallet: wallet as never,
    publicClient: publicClient as never,
  });

  const fees =
    preset.feePreset === "StaticBasic" ? FEE_CONFIGS.StaticBasic : FEE_CONFIGS.DynamicBasic;
  const positions =
    preset.poolPositions === "Project" ? POOL_POSITIONS.Project : POOL_POSITIONS.Standard;

  const rewards = spec["rewards"] as {
    recipients: Array<{ admin: Address; recipient: Address; bps: number; token: "Both" }>;
  };

  const deployConfig: Record<string, unknown> = {
    name: input.name,
    symbol: input.symbol,
    image: input.imageUrl || "",
    tokenAdmin: input.smartWallet,
    chainId: clankerChainId(),
    vanity: preset.vanity,
    pool: {
      pairedToken: "WETH",
      positions,
    },
    fees,
    sniperFees: {
      startingFee: 666_777,
      endingFee: 41_673,
      secondsToDecay: 15,
    },
    vault: {
      percentage: preset.vaultPct,
      lockupDuration: preset.lockupDays * 86_400,
      vestingDuration: preset.vestingDays * 86_400,
      recipient: input.smartWallet,
    },
    rewards,
    context: {
      interface: "Aura OS",
      platform: "auraos",
      id: input.symbol,
    },
  };

  if (preset.devBuyEth > 0) {
    deployConfig["devBuy"] = {
      ethAmount: preset.devBuyEth,
      recipient: input.smartWallet,
    };
  }

  const { txHash, waitForTransaction, error } = await clanker.deploy(deployConfig as never);
  if (error) throw new Error(typeof error === "string" ? error : (error.message ?? String(error)));
  if (!txHash || !waitForTransaction) throw new Error("Clanker deploy returned no transaction");

  const waited = await waitForTransaction();
  if (waited && typeof waited === "object" && "error" in waited && waited.error) {
    const waitErr = waited.error as { message?: string } | string;
    throw new Error(typeof waitErr === "string" ? waitErr : (waitErr.message ?? String(waitErr)));
  }
  const address =
    waited && typeof waited === "object" && "address" in waited
      ? (waited as { address: string }).address
      : null;
  if (!address) throw new Error("Clanker deploy confirmed without token address");

  return {
    txHash: String(txHash),
    tokenAddress: String(address),
    tokenAdmin: input.smartWallet,
    rewardRecipient: input.smartWallet,
    chainId: clankerChainId(),
    spec,
  };
}
