/**
 * Deepen aggregator-visible Uni v3 books so 1inch / OKX can quote AURA.
 *
 * 1inch Pathfinder typically needs ~$10k connector liquidity in an aggregated
 * Uni v3 source. Our Uni v4 AURA/USDC book is not enough for that; the thin
 * AURA/WETH book (~$250) is not either.
 *
 * From launch treasury:
 *   - Mint locked Uni v3 AURA/USDC 0.3% with most remaining USDC
 *   - Swap a slice of USDC → WETH and mint locked AURA/WETH into the existing pool
 *
 *   npx tsx scripts/aura-deepen-aggregators.ts
 *   npx tsx scripts/aura-deepen-aggregators.ts --go
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  formatEther,
  formatUnits,
  http,
  maxUint256,
  parseAbi,
  parseAbiItem,
  parseUnits,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

import { ERC20_ABI } from "../src/lib/aura-v4-book";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TREASURY_FILE = join(ROOT, ".aura-t0-treasury.json");
const DEPLOYED_FILE = join(ROOT, "contracts/aura/Aura.deployed.json");

const WETH = "0x4200000000000000000000000000000000000006" as Address;
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address;
const V3_FACTORY = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD" as Address;
const NFPM = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1" as Address;
/** Uniswap SwapRouter02 on Base */
const SWAP_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481" as Address;
const FEE = 3000;
const TICK_SPACING = 60;
const LOCK_TO = "0x000000000000000000000000000000000000dEaD" as Address;

/** Leave some USDC + ETH for gas / later POL. */
const USDC_FOR_V3_USDC_BOOK = "5800";
const USDC_FOR_WETH_DEEPEN = "250";
const ETH_GAS_RESERVE = parseUnits("0.025", 18);

const FACTORY_ABI = parseAbi([
  "function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)",
  "function createPool(address tokenA, address tokenB, uint24 fee) returns (address pool)",
]);

const POOL_ABI = parseAbi([
  "function initialize(uint160 sqrtPriceX96)",
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
]);

const NFPM_ABI = parseAbi([
  "function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
  "function transferFrom(address from, address to, uint256 tokenId)",
]);

const ROUTER_ABI = parseAbi([
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) payable returns (uint256 amountOut)",
]);

const WETH_ABI = parseAbi([
  "function deposit() payable",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
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

/** Integer sqrt for Q64.96 — avoids float precision bugs on init. */
function sqrtBigInt(n: bigint): bigint {
  if (n < 0n) throw new Error("sqrt of negative");
  if (n < 2n) return n;
  let x = n;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + n / x) / 2n;
  }
  return x;
}

function encodeSqrtRatioX96(amount1: bigint, amount0: bigint): bigint {
  if (amount0 === 0n) throw new Error("amount0=0");
  // sqrt(amount1/amount0) * 2^96 = sqrt(amount1 * 2^192 / amount0)
  return sqrtBigInt((amount1 << 192n) / amount0);
}

function alignTicks(center: number): { lower: number; upper: number } {
  const lower = Math.max(-887220, center - 120_000);
  const upper = Math.min(887220, center + 120_000);
  return {
    lower: Math.floor(lower / TICK_SPACING) * TICK_SPACING,
    upper: Math.ceil(upper / TICK_SPACING) * TICK_SPACING,
  };
}

function parseMintTokenId(
  logs: { address: Address; data: `0x${string}`; topics: [] | [`0x${string}`, ...`0x${string}`[]] }[],
): bigint {
  const increase = parseAbiItem(
    "event IncreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
  );
  let tokenId: bigint | null = null;
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: [increase],
        data: log.data,
        topics: log.topics,
      });
      tokenId = (decoded.args as { tokenId: bigint }).tokenId;
    } catch {
      /* not this event */
    }
  }
  if (tokenId == null) throw new Error("could not find minted position tokenId");
  return tokenId;
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
  > & { aura: Address; poolWeth?: Address };

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
  const usdcBook = parseUnits(USDC_FOR_V3_USDC_BOOK, 6);
  const usdcToWeth = parseUnits(USDC_FOR_WETH_DEEPEN, 6);

  const ds = await fetch(
    `https://api.dexscreener.com/latest/dex/tokens/${aura}`,
  ).then((r) => r.json());
  const ethDs = await fetch(
    `https://api.dexscreener.com/latest/dex/tokens/${WETH}`,
  ).then((r) => r.json());
  const auraUsd = Number(
    (ds.pairs || []).find(
      (p: { quoteToken?: { symbol?: string }; chainId?: string }) =>
        p.chainId === "base" && p.quoteToken?.symbol === "WETH",
    )?.priceUsd ||
      ds.pairs?.[0]?.priceUsd ||
      0,
  );
  const ethUsd = Number(
    (ethDs.pairs || []).find(
      (p: { quoteToken?: { symbol?: string } }) => p.quoteToken?.symbol === "USDC",
    )?.priceUsd ||
      ethDs.pairs?.[0]?.priceUsd ||
      0,
  );
  if (!(auraUsd > 0) || !(ethUsd > 0)) throw new Error("could not read live prices");

  const auraForUsdcBook = parseUnits(
    String(Math.floor(Number(USDC_FOR_V3_USDC_BOOK) / auraUsd)),
    18,
  );
  // After USDC→WETH, expect ~usdc/ethUsd ETH worth of WETH
  const wethExpectedWhole = Number(USDC_FOR_WETH_DEEPEN) / ethUsd;
  const auraForWethBook = parseUnits(
    String(Math.floor((Number(USDC_FOR_WETH_DEEPEN) * 1.05) / auraUsd)),
    18,
  );

  const [ethBal, auraBal, usdcBal] = await Promise.all([
    publicClient.getBalance({ address: account.address }),
    publicClient.readContract({
      address: aura,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    }),
    publicClient.readContract({
      address: USDC,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    }),
  ]);

  const needUsdc = usdcBook + usdcToWeth;
  console.log({
    mode: go ? "BROADCAST" : "dry-run",
    aura,
    auraUsd,
    ethUsd,
    usdcForV3Usdc: USDC_FOR_V3_USDC_BOOK,
    usdcForWeth: USDC_FOR_WETH_DEEPEN,
    auraForUsdcBook: formatUnits(auraForUsdcBook, 18),
    auraForWethBook: formatUnits(auraForWethBook, 18),
    wethExpectedApprox: wethExpectedWhole,
    ethBal: formatEther(ethBal),
    auraBal: formatUnits(auraBal, 18),
    usdcBal: formatUnits(usdcBal, 6),
    poolWeth: deployed.poolWeth,
  });

  if (ethBal < ETH_GAS_RESERVE) throw new Error("need ≥0.025 ETH gas reserve");
  if (usdcBal < needUsdc) throw new Error("not enough USDC on treasury");
  if (auraBal < auraForUsdcBook + auraForWethBook) {
    throw new Error("not enough AURA on treasury");
  }

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

  async function ensureApprove(token: Address, spender: Address, amount: bigint) {
    const allowance = await publicClient.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [account.address, spender],
    });
    if (allowance < amount) {
      await write(`approve ${token.slice(0, 10)}→${spender.slice(0, 10)}`, {
        address: token,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [spender, maxUint256],
      });
    }
  }

  async function ensurePool(
    token0: Address,
    token1: Address,
    amount0Desired: bigint,
    amount1Desired: bigint,
  ): Promise<Address> {
    let pool = await publicClient.readContract({
      address: V3_FACTORY,
      abi: FACTORY_ABI,
      functionName: "getPool",
      args: [token0, token1, FEE],
    });

    if (pool === "0x0000000000000000000000000000000000000000") {
      const created = await write(`createPool ${token0.slice(0, 8)}/${token1.slice(0, 8)}`, {
        address: V3_FACTORY,
        abi: FACTORY_ABI,
        functionName: "createPool",
        args: [token0, token1, FEE],
      });
      const poolCreated = parseAbiItem(
        "event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)",
      );
      for (const log of created.logs) {
        try {
          const decoded = decodeEventLog({
            abi: [poolCreated],
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "PoolCreated") {
            pool = (decoded.args as { pool: Address }).pool;
          }
        } catch {
          /* not this event */
        }
      }
      if (pool === "0x0000000000000000000000000000000000000000") {
        for (let i = 0; i < 8; i++) {
          await new Promise((r) => setTimeout(r, 500));
          pool = await publicClient.readContract({
            address: V3_FACTORY,
            abi: FACTORY_ABI,
            functionName: "getPool",
            args: [token0, token1, FEE],
          });
          if (pool !== "0x0000000000000000000000000000000000000000") break;
        }
      }
      if (pool === "0x0000000000000000000000000000000000000000") {
        throw new Error("createPool did not appear in factory");
      }
      console.log("created pool", pool);
    } else {
      console.log("pool exists", pool);
    }

    // Initialize if still at sqrtPrice 0 (fresh pool)
    let needsInit = false;
    try {
      const slot0 = await publicClient.readContract({
        address: pool,
        abi: POOL_ABI,
        functionName: "slot0",
      });
      needsInit = slot0[0] === 0n;
    } catch {
      needsInit = true;
    }
    if (needsInit) {
      const sqrtPriceX96 = encodeSqrtRatioX96(amount1Desired, amount0Desired);
      await write("initialize pool", {
        address: pool,
        abi: POOL_ABI,
        functionName: "initialize",
        args: [sqrtPriceX96],
      });
      console.log("initialized", pool, "sqrt", sqrtPriceX96.toString());
    }
    return pool;
  }

  async function mintAndLock(params: {
    tokenA: Address;
    tokenB: Address;
    amountA: bigint;
    amountB: bigint;
    label: string;
  }) {
    const token0 =
      params.tokenA.toLowerCase() < params.tokenB.toLowerCase()
        ? params.tokenA
        : params.tokenB;
    const token1 = token0 === params.tokenA ? params.tokenB : params.tokenA;
    const amount0Desired =
      token0 === params.tokenA ? params.amountA : params.amountB;
    const amount1Desired =
      token1 === params.tokenA ? params.amountA : params.amountB;

    const pool = await ensurePool(token0, token1, amount0Desired, amount1Desired);

    // Wait for init to be visible on the RPC (avoids LOK from stale unlocked=false).
    let tick = 0;
    for (let i = 0; i < 20; i++) {
      const slot0 = await publicClient.readContract({
        address: pool,
        abi: POOL_ABI,
        functionName: "slot0",
      });
      if (slot0[0] !== 0n && slot0[6] === true) {
        tick = Number(slot0[1]);
        break;
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    if (!Number.isFinite(tick) || tick === 0) {
      // last resort read
      const slot0 = await publicClient.readContract({
        address: pool,
        abi: POOL_ABI,
        functionName: "slot0",
      });
      if (slot0[0] === 0n || slot0[6] !== true) {
        throw new Error(`pool ${pool} not ready for mint (sqrt/unlocked)`);
      }
      tick = Number(slot0[1]);
    }
    const { lower, upper } = alignTicks(tick);
    console.log({ pool, tick, lower, upper });

    await ensureApprove(params.tokenA, NFPM, params.amountA);
    await ensureApprove(params.tokenB, NFPM, params.amountB);

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
    const mintReceipt = await write(`mint ${params.label}`, {
      address: NFPM,
      abi: NFPM_ABI,
      functionName: "mint",
      args: [
        {
          token0,
          token1,
          fee: FEE,
          tickLower: lower,
          tickUpper: upper,
          amount0Desired,
          amount1Desired,
          amount0Min: 0n,
          amount1Min: 0n,
          recipient: account.address,
          deadline,
        },
      ],
    });
    const tokenId = parseMintTokenId(mintReceipt.logs);
    await write(`lock ${params.label} #${tokenId}`, {
      address: NFPM,
      abi: NFPM_ABI,
      functionName: "transferFrom",
      args: [account.address, LOCK_TO, tokenId],
    });
    return { pool, tokenId };
  }

  // ── 1) Uni v3 AURA/USDC (what 1inch needs for USD pricing) ──────────
  const usdcAura = await mintAndLock({
    tokenA: aura,
    tokenB: USDC,
    amountA: auraForUsdcBook,
    amountB: usdcBook,
    label: "AURA/USDC v3",
  });

  // ── 2) USDC → WETH then deepen existing AURA/WETH ───────────────────
  await ensureApprove(USDC, SWAP_ROUTER, usdcToWeth);
  const wethBefore = await publicClient.readContract({
    address: WETH,
    abi: WETH_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });
  // Prefer 0.05% USDC/WETH pool on Base; fall back handled by revert → try 0.3%
  let swapped = false;
  for (const fee of [500, 3000, 100] as const) {
    try {
      await write(`USDC→WETH fee ${fee}`, {
        address: SWAP_ROUTER,
        abi: ROUTER_ABI,
        functionName: "exactInputSingle",
        args: [
          {
            tokenIn: USDC,
            tokenOut: WETH,
            fee,
            recipient: account.address,
            amountIn: usdcToWeth,
            amountOutMinimum: 0n,
            sqrtPriceLimitX96: 0n,
          },
        ],
      });
      swapped = true;
      break;
    } catch (err) {
      console.warn(`swap fee ${fee} failed`, err);
    }
  }
  if (!swapped) throw new Error("USDC→WETH swap failed on all fee tiers");

  const wethAfter = await publicClient.readContract({
    address: WETH,
    abi: WETH_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });
  const wethGained = wethAfter - wethBefore;
  if (wethGained <= 0n) throw new Error("no WETH received from swap");
  console.log("WETH gained", formatEther(wethGained));

  const wethAura = await mintAndLock({
    tokenA: aura,
    tokenB: WETH,
    amountA: auraForWethBook,
    amountB: wethGained,
    label: "AURA/WETH deepen",
  });

  const updated = {
    ...deployed,
    poolUsdcV3: usdcAura.pool,
    poolUsdcV3Fee: FEE,
    poolUsdcV3PositionId: String(usdcAura.tokenId),
    poolUsdcV3Usdc: USDC_FOR_V3_USDC_BOOK,
    poolUsdcV3AttachedAt: new Date().toISOString(),
    poolWethDeepenPositionId: String(wethAura.tokenId),
    poolWethDeepenUsdc: USDC_FOR_WETH_DEEPEN,
    poolWethDeepenAt: new Date().toISOString(),
    aggregatorLiquidityNote:
      "Uni v3 AURA/USDC + deeper AURA/WETH for 1inch/OKX Pathfinder (~$10k connector target)",
  };
  writeFileSync(DEPLOYED_FILE, JSON.stringify(updated, null, 2) + "\n");

  console.log("\nAggregator books deepened.");
  console.log({
    poolUsdcV3: usdcAura.pool,
    poolWeth: wethAura.pool,
    dexscreener: `https://dexscreener.com/base/${aura}`,
    inchHint: "Wait a few minutes for 1inch to index Uni v3 USDC depth, then retry quote",
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
