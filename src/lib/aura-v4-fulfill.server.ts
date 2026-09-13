/**
 * Official-book fulfillment: exact-in USDC → AURA on the published Uni v4 pool,
 * then transfer AURA to the buyer's Light Account.
 * Dark until AURA_CA_PUBLISH + pool id + hook. Never uses AURA_T0_KEY.
 */
import {
  createPublicClient,
  createWalletClient,
  encodePacked,
  http,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

import { auraPoolUsdcId } from "@/lib/aura-curve";
import { publishedAuraTokenAddress } from "@/lib/aura-token";
import {
  applySlippageBps,
  AURA_BUY_SLIPPAGE_BPS_DEFAULT,
} from "@/lib/aura-buy-lp";
import {
  assertPublishedPoolId,
  auraV4PoolKey,
  encodeV4ExactInSingleInput,
  ERC20_ABI,
  sortAuraUsdcPair,
  UNI_V4_COMMAND_V4_SWAP,
  UNI_V4_DEFAULT_TICK_SPACING,
  UNI_V4_DYNAMIC_FEE,
  UNIVERSAL_ROUTER_ABI,
  UNISWAP_V4_BASE,
  V4_QUOTER_ABI,
} from "@/lib/aura-v4-book";
import { alchemyRpcUrl } from "@/lib/chain-config";
import { BASE_USDC, isBaseAddress } from "@/lib/private-sale";

export type AuraV4FulfillConfig = {
  aura: Address;
  poolId: Hex;
  hooks: Address;
  fee: number;
  tickSpacing: number;
  router: Address;
  quoter: Address;
  slippageBps: number;
};

function rpcUrl(): string {
  return alchemyRpcUrl({ network: "base" }) || "https://mainnet.base.org";
}

function readEnvAddress(name: string): Address | null {
  const raw = process.env[name]?.trim() || "";
  return isBaseAddress(raw) ? (raw as Address) : null;
}

function readEnvInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim() || "";
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
}

export function auraFulfillPrivateKey(): Hex {
  const key = process.env["AURA_FULFILL_KEY"]?.trim() || "";
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error("AURA_FULFILL_KEY is not configured (server-only hex key).");
  }
  const t0 = process.env["AURA_T0_KEY"]?.trim() || "";
  if (t0 && key.toLowerCase() === t0.toLowerCase()) {
    throw new Error("AURA_FULFILL_KEY must not be AURA_T0_KEY.");
  }
  return key as Hex;
}

export function auraFulfillAddress(): Address {
  return privateKeyToAccount(auraFulfillPrivateKey()).address;
}

export function readAuraV4FulfillConfig(): AuraV4FulfillConfig | null {
  const aura = publishedAuraTokenAddress();
  const poolId = auraPoolUsdcId();
  const hooks = readEnvAddress("AURA_V4_HOOK") || readEnvAddress("AURA_POOL_HOOK");
  if (!aura || !poolId || !hooks) return null;
  if (!/^0x[a-fA-F0-9]{64}$/.test(poolId)) return null;
  const router =
    readEnvAddress("AURA_V4_UNIVERSAL_ROUTER") || (UNISWAP_V4_BASE.universalRouter as Address);
  const quoter = readEnvAddress("AURA_V4_QUOTER") || (UNISWAP_V4_BASE.quoter as Address);
  return {
    aura,
    poolId: poolId as Hex,
    hooks,
    fee: readEnvInt("AURA_V4_FEE", UNI_V4_DYNAMIC_FEE),
    tickSpacing: readEnvInt("AURA_V4_TICK_SPACING", UNI_V4_DEFAULT_TICK_SPACING),
    router,
    quoter,
    slippageBps: readEnvInt("AURA_BUY_SLIPPAGE_BPS", AURA_BUY_SLIPPAGE_BPS_DEFAULT),
  };
}

export async function fulfillmentUsdcBalance(): Promise<bigint> {
  const client = createPublicClient({ chain: base, transport: http(rpcUrl()) });
  return (await client.readContract({
    address: BASE_USDC,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [auraFulfillAddress()],
  })) as bigint;
}

export async function quoteAuraOut(amountIn: bigint, config: AuraV4FulfillConfig): Promise<bigint> {
  const key = auraV4PoolKey({
    aura: config.aura,
    hooks: config.hooks,
    fee: config.fee,
    tickSpacing: config.tickSpacing,
  });
  assertPublishedPoolId(key, config.poolId);
  const pair = sortAuraUsdcPair(config.aura);
  const client = createPublicClient({ chain: base, transport: http(rpcUrl()) });
  const { result } = await client.simulateContract({
    address: config.quoter,
    abi: V4_QUOTER_ABI,
    functionName: "quoteExactInputSingle",
    args: [
      {
        poolKey: key,
        zeroForOne: pair.zeroForOneUsdcIn,
        exactAmount: amountIn,
        hookData: "0x",
      },
    ],
  });
  const amountOut = Array.isArray(result) ? result[0] : result;
  if (typeof amountOut !== "bigint" || amountOut <= 0n) {
    throw new Error("Official book quote returned no AURA.");
  }
  return amountOut;
}

export async function swapUsdcForAuraOnOfficialBook(input: {
  amountIn: bigint;
  buyer: Address;
}): Promise<{ swapTxHash: Hex; sendTxHash: Hex; amountOut: bigint }> {
  if (!isBaseAddress(input.buyer)) {
    throw new Error("Valid Base buyer wallet required.");
  }
  const config = readAuraV4FulfillConfig();
  if (!config) {
    throw new Error("Official AURA book is not published yet.");
  }
  const key = auraV4PoolKey({
    aura: config.aura,
    hooks: config.hooks,
    fee: config.fee,
    tickSpacing: config.tickSpacing,
  });
  assertPublishedPoolId(key, config.poolId);
  const pair = sortAuraUsdcPair(config.aura);
  const quoted = await quoteAuraOut(input.amountIn, config);
  const amountOutMinimum = applySlippageBps(quoted, config.slippageBps);
  if (amountOutMinimum <= 0n) {
    throw new Error("Slippage bound left no AURA.");
  }

  const account = privateKeyToAccount(auraFulfillPrivateKey());
  const wallet = createWalletClient({ account, chain: base, transport: http(rpcUrl()) });
  const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl()) });

  const float = (await publicClient.readContract({
    address: BASE_USDC,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address],
  })) as bigint;
  if (float < input.amountIn) {
    throw new Error("Fulfillment wallet USDC float does not cover this pack.");
  }

  const fundHash = await wallet.writeContract({
    address: BASE_USDC,
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [config.router, input.amountIn],
  });
  await publicClient.waitForTransactionReceipt({ hash: fundHash });

  const commands = encodePacked(["uint8"], [UNI_V4_COMMAND_V4_SWAP]);
  const swapInput = encodeV4ExactInSingleInput({
    key,
    zeroForOne: pair.zeroForOneUsdcIn,
    amountIn: input.amountIn,
    amountOutMinimum,
  });
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 180);
  const swapHash = await wallet.writeContract({
    address: config.router,
    abi: UNIVERSAL_ROUTER_ABI,
    functionName: "execute",
    args: [commands, [swapInput], deadline],
  });
  await publicClient.waitForTransactionReceipt({ hash: swapHash });

  const auraOut = (await publicClient.readContract({
    address: config.aura,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address],
  })) as bigint;
  if (auraOut < amountOutMinimum) {
    throw new Error("Official book swap did not deliver the minimum AURA.");
  }

  const sendHash = await wallet.writeContract({
    address: config.aura,
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [input.buyer, auraOut],
  });
  await publicClient.waitForTransactionReceipt({ hash: sendHash });

  return { swapTxHash: swapHash, sendTxHash: sendHash, amountOut: auraOut };
}
