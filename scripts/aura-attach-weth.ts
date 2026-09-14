/**
 * Attach Uniswap v3 AURA/WETH on Base so aggregators (OKX, etc.) can buy with ETH.
 * Same AuraToken CA — second venue, not a new coin.
 *
 *   npx tsx scripts/aura-attach-weth.ts          # dry-run
 *   npx tsx scripts/aura-attach-weth.ts --go     # broadcast from launch treasury
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createPublicClient,
  createWalletClient,
  formatEther,
  formatUnits,
  http,
  maxUint256,
  parseAbi,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

import { ERC20_ABI } from "../src/lib/aura-v4-book";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TREASURY_FILE = join(ROOT, ".aura-t0-treasury.json");
const DEPLOYED_FILE = join(ROOT, "contracts/aura/Aura.deployed.json");

const WETH = "0x4200000000000000000000000000000000000006" as Address;
const V3_FACTORY = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD" as Address;
const NFPM = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1" as Address;
const FEE = 3000; // 0.3%
const TICK_SPACING = 60;
const LOCK_TO = "0x000000000000000000000000000000000000dEaD" as Address;

/** How much native ETH to wrap into the WETH book (keep rest for gas). */
const ETH_FOR_LP = "0.05";

const FACTORY_ABI = parseAbi([
  "function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)",
  "function createPool(address tokenA, address tokenB, uint24 fee) returns (address pool)",
]);

const POOL_ABI = parseAbi([
  "function initialize(uint160 sqrtPriceX96)",
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
]);

const WETH_ABI = parseAbi([
  "function deposit() payable",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
]);

const NFPM_ABI = parseAbi([
  "function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
  "function transferFrom(address from, address to, uint256 tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)",
]);

function loadDotenv() {
  for (const name of [".env", ".env.local"]) {
    const path = join(ROOT, name);
    if (!existsSync(path)) continue;
    for (const raw of readFileSync(path, "utf8").split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const eq = line.indexOf("=");
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function encodeSqrtRatioX96(amount1: bigint, amount0: bigint): bigint {
  // sqrt(amount1/amount0) * 2^96 — integer approx via float for launch sizing
  const ratio = Number(amount1) / Number(amount0);
  const sqrt = Math.sqrt(ratio);
  return BigInt(Math.floor(sqrt * 2 ** 96));
}

function priceToTick(auraPerEth: number): number {
  const rawTick = Math.log(auraPerEth) / Math.log(1.0001);
  return Math.floor(rawTick / TICK_SPACING) * TICK_SPACING;
}

async function main() {
  loadDotenv();
  const go = process.argv.includes("--go");
  const treasury = JSON.parse(readFileSync(TREASURY_FILE, "utf8")) as {
    address: Address;
    privateKey: `0x${string}`;
  };
  const deployed = JSON.parse(readFileSync(DEPLOYED_FILE, "utf8")) as Record<
    string,
    unknown
  > & { aura: Address };

  const account = privateKeyToAccount(treasury.privateKey);
  if (account.address.toLowerCase() !== treasury.address.toLowerCase()) {
    throw new Error("treasury key mismatch");
  }

  const rpc =
    process.env["ALCHEMY_BASE_URL"] ||
    process.env["BASE_RPC"] ||
    process.env["ALCHEMY_RPC_URL"];
  if (!rpc) throw new Error("need Alchemy RPC");
  const publicClient = createPublicClient({ chain: base, transport: http(rpc) });
  const wallet = createWalletClient({ account, chain: base, transport: http(rpc) });

  const aura = deployed.aura;
  const token0 = WETH.toLowerCase() < aura.toLowerCase() ? WETH : aura;
  const token1 = token0 === WETH ? aura : WETH;

  const ds = await fetch(
    `https://api.dexscreener.com/latest/dex/tokens/${aura}`,
  ).then((r) => r.json());
  const ethDs = await fetch(
    `https://api.dexscreener.com/latest/dex/tokens/${WETH}`,
  ).then((r) => r.json());
  const auraUsd = Number(ds.pairs?.[0]?.priceUsd || 0);
  const ethUsd = Number(
    (ethDs.pairs || []).find((p: { quoteToken?: { symbol?: string } }) => p.quoteToken?.symbol === "USDC")
      ?.priceUsd ||
      ethDs.pairs?.[0]?.priceUsd ||
      0,
  );
  if (!(auraUsd > 0) || !(ethUsd > 0)) throw new Error("could not read live prices");
  const auraPerEth = ethUsd / auraUsd;

  const ethLp = parseUnits(ETH_FOR_LP, 18);
  // Match notional: ethUsd * ETH_FOR_LP worth of AURA
  const auraLpWhole = Math.floor((ethUsd * Number(ETH_FOR_LP)) / auraUsd);
  const auraLp = parseUnits(String(auraLpWhole), 18);

  const amount0Desired = token0 === WETH ? ethLp : auraLp;
  const amount1Desired = token1 === WETH ? ethLp : auraLp;
  const sqrtPriceX96 = encodeSqrtRatioX96(amount1Desired, amount0Desired);
  const tick = priceToTick(token0 === WETH ? auraPerEth : 1 / auraPerEth);
  // Wide band around spot (± ~full practical range for meme depth)
  const tickLower = Math.max(-887220, tick - 120_000);
  const tickUpper = Math.min(887220, tick + 120_000);
  const tickLowerAligned = Math.floor(tickLower / TICK_SPACING) * TICK_SPACING;
  const tickUpperAligned = Math.ceil(tickUpper / TICK_SPACING) * TICK_SPACING;

  const existing = await publicClient.readContract({
    address: V3_FACTORY,
    abi: FACTORY_ABI,
    functionName: "getPool",
    args: [token0, token1, FEE],
  });

  const [ethBal, auraBal] = await Promise.all([
    publicClient.getBalance({ address: account.address }),
    publicClient.readContract({
      address: aura,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    }),
  ]);

  console.log({
    mode: go ? "BROADCAST" : "dry-run",
    aura,
    token0,
    token1,
    fee: FEE,
    existingPool: existing,
    auraUsd,
    ethUsd,
    auraPerEth,
    ethForLp: ETH_FOR_LP,
    auraForLp: auraLpWhole,
    tick,
    ticks: [tickLowerAligned, tickUpperAligned],
    ethBal: formatEther(ethBal),
    auraBal: formatUnits(auraBal, 18),
  });

  if (ethBal < ethLp + parseUnits("0.03", 18)) {
    throw new Error("Need ETH for LP + ≥0.03 gas reserve");
  }
  if (auraBal < auraLp) throw new Error("Need more AURA for WETH book");

  if (!go) {
    console.log("\nDry-run OK. Re-run with --go to broadcast.");
    return;
  }

  async function write(label: string, args: Parameters<typeof wallet.writeContract>[0]) {
    const fees = await publicClient.estimateFeesPerGas();
    const maxPriorityFeePerGas = (fees.maxPriorityFeePerGas ?? 1_000_000n) * 4n;
    const maxFeePerGas = ((fees.maxFeePerGas ?? 5_000_000n) + maxPriorityFeePerGas) * 3n;
    const nonce = await publicClient.getTransactionCount({
      address: account.address,
      blockTag: "pending",
    });
    const hash = await wallet.writeContract({
      ...args,
      maxFeePerGas,
      maxPriorityFeePerGas,
      nonce,
    } as never);
    console.log(label, hash);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`${label} reverted`);
    return receipt;
  }

  // 1) Wrap ETH → WETH
  const wethBal = await publicClient.readContract({
    address: WETH,
    abi: WETH_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });
  if (wethBal < ethLp) {
    await write("wrap ETH→WETH", {
      address: WETH,
      abi: WETH_ABI,
      functionName: "deposit",
      value: ethLp - wethBal,
    });
  }

  // 2) Create + initialize pool if needed
  let pool = existing;
  if (pool === "0x0000000000000000000000000000000000000000") {
    const created = await write("createPool", {
      address: V3_FACTORY,
      abi: FACTORY_ABI,
      functionName: "createPool",
      args: [token0, token1, FEE],
    });
    pool = await publicClient.readContract({
      address: V3_FACTORY,
      abi: FACTORY_ABI,
      functionName: "getPool",
      args: [token0, token1, FEE],
    });
    console.log("pool", pool, "createTx", created.transactionHash);
    await write("initialize pool", {
      address: pool,
      abi: POOL_ABI,
      functionName: "initialize",
      args: [sqrtPriceX96],
    });
  } else {
    console.log("pool already exists", pool);
  }

  // 3) Approvals
  for (const [token, amount] of [
    [WETH, ethLp],
    [aura, auraLp],
  ] as const) {
    const allowance = await publicClient.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [account.address, NFPM],
    });
    if (allowance < amount) {
      await write(`approve ${token.slice(0, 10)}`, {
        address: token,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [NFPM, maxUint256],
      });
    }
  }

  // 4) Mint LP to treasury then lock
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
  const mintReceipt = await write("mint AURA/WETH LP", {
    address: NFPM,
    abi: NFPM_ABI,
    functionName: "mint",
    args: [
      {
        token0,
        token1,
        fee: FEE,
        tickLower: tickLowerAligned,
        tickUpper: tickUpperAligned,
        amount0Desired,
        amount1Desired,
        amount0Min: 0n,
        amount1Min: 0n,
        recipient: account.address,
        deadline,
      },
    ],
  });

  // Parse IncreaseLiquidity / Transfer mint for tokenId
  const transferTopic =
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  let tokenId: bigint | null = null;
  for (const log of mintReceipt.logs) {
    if (
      log.address.toLowerCase() === NFPM.toLowerCase() &&
      log.topics[0] === transferTopic &&
      log.topics[1]?.toLowerCase() ===
        "0x0000000000000000000000000000000000000000000000000000000000000000"
    ) {
      tokenId = BigInt(log.topics[3]!);
    }
  }
  if (tokenId == null) throw new Error("could not find minted position tokenId");

  await write(`lock position ${tokenId}`, {
    address: NFPM,
    abi: NFPM_ABI,
    functionName: "transferFrom",
    args: [account.address, LOCK_TO, tokenId],
  });

  const updated = {
    ...deployed,
    poolWeth: pool,
    poolWethFee: FEE,
    poolWethPositionId: String(tokenId),
    poolWethLockTo: LOCK_TO,
    poolWethAttachedAt: new Date().toISOString(),
    ethLiquidity: ETH_FOR_LP,
  };
  writeFileSync(DEPLOYED_FILE, JSON.stringify(updated, null, 2) + "\n");

  console.log("\nAURA/WETH attached.");
  console.log({
    pool,
    fee: FEE,
    tokenId: String(tokenId),
    dexscreener: `https://dexscreener.com/base/${aura}`,
    okxHint: "ETH→AURA should route via this Uniswap v3 pair",
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
