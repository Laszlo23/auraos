/**
 * AURA T-0 Path B attach — Dynamic3 open pool + locked FlatStart book + $1,111 seed.
 * Dedicated machine only. Uses .aura-t0-treasury.json. Never ClankerTokenV4.
 *
 *   npx tsx scripts/aura-t0-attach.ts            # dry-run (simulate)
 *   npx tsx scripts/aura-t0-attach.ts --go       # broadcast
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ClankerDeployments,
  FEE_CONFIGS,
  getTickFromMarketCapUSDC,
} from "clanker-sdk";
import {
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  encodePacked,
  formatUnits,
  http,
  maxUint256,
  parseAbi,
  parseUnits,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

import {
  AURA_DEV_BUY_USDC,
  AURA_LP_BOOK_USDC,
  AURA_LP_DRIP_AURA,
  AURA_LP_DRIP_PRICE_USD,
  AURA_LP_FAR_AURA,
  AURA_LP_FAR_PRICE_USD,
  AURA_LP_NEAR_AURA,
  AURA_LP_NEAR_PRICE_USD,
  AURA_LP_START_PRICE_USD,
} from "../src/lib/aura-curve";
import { AURA_MAX_SUPPLY } from "../src/lib/aura-token";
import {
  ERC20_ABI,
  PERMIT2_ABI,
  UNI_V4_COMMAND_V4_SWAP,
  UNI_V4_DEFAULT_TICK_SPACING,
  UNI_V4_DYNAMIC_FEE,
  UNISWAP_V4_BASE,
  UNIVERSAL_ROUTER_ABI,
  auraV4PoolId,
  auraV4PoolKey,
  encodeV4ExactInSingleInput,
  sortAuraUsdcPair,
} from "../src/lib/aura-v4-book";
import { BASE_USDC } from "../src/lib/private-sale";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TREASURY_FILE = join(ROOT, ".aura-t0-treasury.json");
const DEPLOYED_FILE = join(ROOT, "contracts/aura/Aura.deployed.json");
const LOCK_TO = "0x000000000000000000000000000000000000dEaD" as Address;
const POSITION_MANAGER = "0x7C5f5A4bBd8fD63184577525326123B519429bDc" as Address;
const Q96 = 2n ** 96n;

const HOOK_INIT_ABI = parseAbi([
  "function initializePoolOpen(address clanker, address pairedToken, int24 tickIfToken0IsClanker, int24 tickSpacing, bytes poolData) returns (bytes32)",
]);

const POSITION_MANAGER_ABI = parseAbi([
  "function modifyLiquidities(bytes unlockData, uint256 deadline) payable",
  "function nextTokenId() view returns (uint256)",
  "function transferFrom(address from, address to, uint256 tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function approve(address to, uint256 tokenId)",
  "function setApprovalForAll(address operator, bool approved)",
]);

type Deployed = {
  aura: Address;
  pair: string | null;
  lpLocked: boolean;
  usdcLiquidity: string;
  poolId?: string;
  hooks?: string;
  positionIds?: string[];
  lockTo?: string;
  seedTx?: string;
  attachTxs?: string[];
  [key: string]: unknown;
};

function loadDotenv() {
  const path = join(ROOT, ".env");
  if (!existsSync(path)) return;
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

function readTreasury(): { address: Address; privateKey: `0x${string}` } {
  if (!existsSync(TREASURY_FILE)) {
    throw new Error("Missing .aura-t0-treasury.json — run treasury on this machine.");
  }
  return JSON.parse(readFileSync(TREASURY_FILE, "utf8")) as {
    address: Address;
    privateKey: `0x${string}`;
  };
}

/** Uniswap TickMath.getSqrtRatioAtTick (JS port). */
function getSqrtRatioAtTick(tick: number): bigint {
  if (tick < -887272 || tick > 887272) throw new Error(`tick out of range: ${tick}`);
  const absTick = tick < 0 ? -tick : tick;
  let ratio =
    (absTick & 0x1) !== 0
      ? 0xfffcb933bd6fad37aa2d162d1a594001n
      : 0x100000000000000000000000000000000n;
  const mul = (r: bigint, m: bigint) => (r * m) >> 128n;
  if ((absTick & 0x2) !== 0) ratio = mul(ratio, 0xfff97272373d413259a46990580e213an);
  if ((absTick & 0x4) !== 0) ratio = mul(ratio, 0xfff2e50f5f656932ef12357cf3c7fdccn);
  if ((absTick & 0x8) !== 0) ratio = mul(ratio, 0xffe5caca7e10e4e61c3624eaa0941cd0n);
  if ((absTick & 0x10) !== 0) ratio = mul(ratio, 0xffcb9843d60f6159c9db58835c926644n);
  if ((absTick & 0x20) !== 0) ratio = mul(ratio, 0xff973b41fa98c081472e6896dfb254c0n);
  if ((absTick & 0x40) !== 0) ratio = mul(ratio, 0xff2ea16466c96a3843ec78b326b52861n);
  if ((absTick & 0x80) !== 0) ratio = mul(ratio, 0xfe5dee046a99a2a811c461f1969c3053n);
  if ((absTick & 0x100) !== 0) ratio = mul(ratio, 0xfcbe86c7900a88aedcffc83b479aa3a4n);
  if ((absTick & 0x200) !== 0) ratio = mul(ratio, 0xf987a7253ac413176f2b074cf7815e54n);
  if ((absTick & 0x400) !== 0) ratio = mul(ratio, 0xf3392b0822b70005940c7a398e4b70f3n);
  if ((absTick & 0x800) !== 0) ratio = mul(ratio, 0xe7159475a2c29b7443b29c7fa6e889d9n);
  if ((absTick & 0x1000) !== 0) ratio = mul(ratio, 0xd097f3bdfd2022b8845ad8f792aa5825n);
  if ((absTick & 0x2000) !== 0) ratio = mul(ratio, 0xa9f746462d870fdf8a65dc1f90e061e5n);
  if ((absTick & 0x4000) !== 0) ratio = mul(ratio, 0x70d869a156d2a1b890bb3df62baf32f7n);
  if ((absTick & 0x8000) !== 0) ratio = mul(ratio, 0x31be135f97d08fd981231505542fcfa6n);
  if ((absTick & 0x10000) !== 0) ratio = mul(ratio, 0x9aa508b5b7a84e1c677de54f3e99bc9n);
  if ((absTick & 0x20000) !== 0) ratio = mul(ratio, 0x5d6af8dedb81196699c329225ee604n);
  if ((absTick & 0x40000) !== 0) ratio = mul(ratio, 0x2216e584f5fa1ea926041bedfe98n);
  if ((absTick & 0x80000) !== 0) ratio = mul(ratio, 0x48a170391f7dc42444e8fa2n);
  if (tick > 0) ratio = (2n ** 256n - 1n) / ratio;
  return (ratio >> 32n) + (ratio % (1n << 32n) === 0n ? 0n : 1n);
}

function mulDiv(a: bigint, b: bigint, denom: bigint): bigint {
  return (a * b) / denom;
}

function liquidityForAmount0(sqrtA: bigint, sqrtB: bigint, amount0: bigint): bigint {
  let sa = sqrtA;
  let sb = sqrtB;
  if (sa > sb) [sa, sb] = [sb, sa];
  const intermediate = mulDiv(sa, sb, Q96);
  return mulDiv(amount0, intermediate, sb - sa);
}

function liquidityForAmount1(sqrtA: bigint, sqrtB: bigint, amount1: bigint): bigint {
  let sa = sqrtA;
  let sb = sqrtB;
  if (sa > sb) [sa, sb] = [sb, sa];
  return mulDiv(amount1, Q96, sb - sa);
}

function liquidityForAmounts(
  sqrtP: bigint,
  sqrtA: bigint,
  sqrtB: bigint,
  amount0: bigint,
  amount1: bigint,
): bigint {
  let sa = sqrtA;
  let sb = sqrtB;
  if (sa > sb) [sa, sb] = [sb, sa];
  if (sqrtP <= sa) return liquidityForAmount1(sa, sb, amount1);
  if (sqrtP >= sb) return liquidityForAmount0(sa, sb, amount0);
  const l0 = liquidityForAmount0(sqrtP, sb, amount0);
  const l1 = liquidityForAmount1(sa, sqrtP, amount1);
  return l0 < l1 ? l0 : l1;
}

function encodeDynamic3PoolData(): Hex {
  const fee = FEE_CONFIGS.Dynamic3;
  const feeData = encodeAbiParameters(
    [
      { type: "uint24", name: "baseFee" },
      { type: "uint24", name: "maxLpFee" },
      { type: "uint256", name: "referenceTickFilterPeriod" },
      { type: "uint256", name: "resetPeriod" },
      { type: "int24", name: "resetTickFilter" },
      { type: "uint256", name: "feeControlNumerator" },
      { type: "uint24", name: "decayFilterBps" },
    ],
    [
      fee.baseFee * 100,
      fee.maxFee * 100,
      BigInt(fee.referenceTickFilterPeriod),
      BigInt(fee.resetPeriod),
      fee.resetTickFilter,
      BigInt(fee.feeControlNumerator),
      fee.decayFilterBps,
    ],
  );
  return encodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
          { type: "address", name: "extension" },
          { type: "bytes", name: "extensionData" },
          { type: "bytes", name: "feeData" },
        ],
      },
    ],
    [{ extension: zeroAddress, extensionData: "0x", feeData }],
  );
}

function priceToClankerTick(priceUsd: number): number {
  const mcap = AURA_MAX_SUPPLY * priceUsd;
  return getTickFromMarketCapUSDC(String(mcap), UNI_V4_DEFAULT_TICK_SPACING);
}

function flipBand(
  tickLowerCfg: number,
  tickUpperCfg: number,
  token0IsClanker: boolean,
): { tickLower: number; tickUpper: number } {
  if (token0IsClanker) return { tickLower: tickLowerCfg, tickUpper: tickUpperCfg };
  const a = -tickLowerCfg;
  const b = -tickUpperCfg;
  return { tickLower: Math.min(a, b), tickUpper: Math.max(a, b) };
}

async function main() {
  loadDotenv();
  const go = process.argv.includes("--go");
  const treasury = readTreasury();
  const deployed = JSON.parse(readFileSync(DEPLOYED_FILE, "utf8")) as Deployed;
  const aura = deployed.aura;
  if (!aura || aura === zeroAddress) throw new Error("Aura.deployed.json missing aura");

  const account = privateKeyToAccount(treasury.privateKey);
  if (account.address.toLowerCase() !== treasury.address.toLowerCase()) {
    throw new Error("Treasury key/address mismatch");
  }
  if (account.address.toLowerCase() !== String(deployed.deployer).toLowerCase()) {
    throw new Error("Treasury is not the Aura deployer / tokenAdmin");
  }

  const rpc =
    process.env["BASE_RPC"] ||
    process.env["ALCHEMY_BASE_URL"] ||
    process.env["ALCHEMY_RPC_URL"] ||
    "https://mainnet.base.org";
  const publicClient = createPublicClient({ chain: base, transport: http(rpc) });
  const wallet = createWalletClient({ account, chain: base, transport: http(rpc) });

  const hook = ClankerDeployments["8453"].clanker_v4.related
    .feeDynamicHookV2 as Address;
  const tickStartCfg = priceToClankerTick(AURA_LP_START_PRICE_USD);
  const near = {
    lower: priceToClankerTick(AURA_LP_NEAR_PRICE_USD.min),
    upper: priceToClankerTick(AURA_LP_NEAR_PRICE_USD.max),
    aura: AURA_LP_NEAR_AURA,
  };
  const drip = {
    lower: priceToClankerTick(AURA_LP_DRIP_PRICE_USD.min),
    upper: priceToClankerTick(AURA_LP_DRIP_PRICE_USD.max),
    aura: AURA_LP_DRIP_AURA,
  };
  const far = {
    lower: priceToClankerTick(AURA_LP_FAR_PRICE_USD.min),
    upper: priceToClankerTick(AURA_LP_FAR_PRICE_USD.max),
    aura: AURA_LP_FAR_AURA,
  };

  const token0IsClanker = aura.toLowerCase() < BASE_USDC.toLowerCase();
  const startingTick = token0IsClanker ? tickStartCfg : -tickStartCfg;
  // One in-range book covering FlatStart ($0.001 → $0.08). Tick upper is
  // start+spacing so the init tick stays inside the range (both assets used).
  const cover = flipBand(far.lower, near.lower, token0IsClanker);
  let tickLower = cover.tickLower;
  let tickUpper = cover.tickUpper;
  if (startingTick >= tickUpper) tickUpper = startingTick + UNI_V4_DEFAULT_TICK_SPACING;
  if (startingTick < tickLower) tickLower = startingTick - UNI_V4_DEFAULT_TICK_SPACING;
  // Keep unused band consts referenced for desk logging / future multi-mint.
  void near;
  void drip;
  void far;

  const pair = sortAuraUsdcPair(aura, BASE_USDC);
  const poolKey = auraV4PoolKey({
    aura,
    hooks: hook,
    fee: UNI_V4_DYNAMIC_FEE,
    tickSpacing: UNI_V4_DEFAULT_TICK_SPACING,
  });
  const poolId = auraV4PoolId(poolKey);
  const poolData = encodeDynamic3PoolData();

  const bookUsdc = parseUnits(String(AURA_LP_BOOK_USDC), 6);
  const seedUsdc = parseUnits(String(AURA_DEV_BUY_USDC), 6);
  const auraAmt = parseUnits(String(AURA_LP_NEAR_AURA + AURA_LP_DRIP_AURA + AURA_LP_FAR_AURA), 18);
  const sqrtP = getSqrtRatioAtTick(startingTick);
  const amount0 =
    pair.currency0.toLowerCase() === BASE_USDC.toLowerCase() ? bookUsdc : auraAmt;
  const amount1 =
    pair.currency1.toLowerCase() === BASE_USDC.toLowerCase() ? bookUsdc : auraAmt;
  const liquidity = liquidityForAmounts(
    sqrtP,
    getSqrtRatioAtTick(tickLower),
    getSqrtRatioAtTick(tickUpper),
    amount0,
    amount1,
  );
  if (liquidity === 0n) {
    throw new Error(`Zero liquidity for ${tickLower}/${tickUpper} — check tick math`);
  }
  const mintPlans = [
    { tickLower, tickUpper, auraAmt, usdcAmt: bookUsdc, amount0, amount1, liquidity },
  ];
  const hookData = encodeAbiParameters([{ type: "address" }], [account.address]);

  const [eth, usdcBal, auraBal, nextId] = await Promise.all([
    publicClient.getBalance({ address: account.address }),
    publicClient.readContract({
      address: BASE_USDC,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    }),
    publicClient.readContract({
      address: aura,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    }),
    publicClient.readContract({
      address: POSITION_MANAGER,
      abi: POSITION_MANAGER_ABI,
      functionName: "nextTokenId",
    }),
  ]);

  const auraNeeded = mintPlans.reduce((s, p) => s + p.auraAmt, 0n);
  const usdcNeeded = bookUsdc + seedUsdc;

  console.log("AURA T-0 attach (Path B — Dynamic3 open + native v4 LP)");
  console.log({
    mode: go ? "BROADCAST" : "dry-run",
    treasury: account.address,
    aura,
    hook,
    poolId,
    startingTick,
    tickStartCfg,
    eth: formatUnits(eth, 18),
    usdc: formatUnits(usdcBal, 6),
    auraBal: formatUnits(auraBal, 18),
    nextPositionId: nextId.toString(),
    bands: mintPlans.map((p) => ({
      ticks: [p.tickLower, p.tickUpper],
      aura: formatUnits(p.auraAmt, 18),
      usdc: formatUnits(p.usdcAmt, 6),
      liquidity: p.liquidity.toString(),
    })),
  });

  if (usdcBal < usdcNeeded) {
    throw new Error(`Need ${formatUnits(usdcNeeded, 6)} USDC, have ${formatUnits(usdcBal, 6)}`);
  }
  if (auraBal < auraNeeded) {
    throw new Error(`Need ${formatUnits(auraNeeded, 18)} AURA, have ${formatUnits(auraBal, 18)}`);
  }
  if (eth < parseUnits("0.01", 18)) throw new Error("Need ≥0.01 ETH gas");

  if (!go) {
    console.log("\nDry-run OK. Re-run with --go to broadcast.");
    return;
  }

  const txs: Hex[] = [];
  const send = async (label: string, hash: Hex) => {
    console.log(label, hash);
    txs.push(hash);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`${label} reverted`);
    return receipt;
  };

  const write = async (
    label: string,
    args: Parameters<typeof wallet.writeContract>[0],
  ) => {
    const fees = await publicClient.estimateFeesPerGas();
    const maxPriorityFeePerGas =
      (fees.maxPriorityFeePerGas ?? 1_000_000n) * 3n;
    const maxFeePerGas =
      ((fees.maxFeePerGas ?? 5_000_000n) + maxPriorityFeePerGas) * 2n;
    const hash = await wallet.writeContract({
      ...args,
      maxFeePerGas,
      maxPriorityFeePerGas,
    } as never);
    return send(label, hash);
  };

  // 1) Initialize Dynamic3 open pool (skip if already live)
  try {
    await publicClient.simulateContract({
      account: account.address,
      address: hook,
      abi: HOOK_INIT_ABI,
      functionName: "initializePoolOpen",
      args: [aura, BASE_USDC, tickStartCfg, UNI_V4_DEFAULT_TICK_SPACING, poolData],
    });
    await write("initializePoolOpen", {
      address: hook,
      abi: HOOK_INIT_ABI,
      functionName: "initializePoolOpen",
      args: [aura, BASE_USDC, tickStartCfg, UNI_V4_DEFAULT_TICK_SPACING, poolData],
    });
  } catch (e) {
    const msg = e instanceof Error ? `${e.message} ${e.cause ?? ""}` : String(e);
    const fromBlock = (await publicClient.getBlockNumber()) - 500n;
    const recent = await publicClient.getLogs({
      address: hook,
      fromBlock,
      toBlock: "latest",
    });
    if (recent.length > 0) {
      console.log("pool already initialized — continuing");
      for (const l of recent) {
        if (l.transactionHash) txs.push(l.transactionHash);
      }
    } else {
      throw e instanceof Error ? e : new Error(msg);
    }
  }

  // 2) Approvals → Permit2 → PositionManager (skip if already live)
  const permit2AllowanceAbi = parseAbi([
    "function allowance(address user, address token, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)",
  ]);
  const now = Math.floor(Date.now() / 1000);
  for (const token of [aura, BASE_USDC] as Address[]) {
    const allowance = await publicClient.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [account.address, UNISWAP_V4_BASE.permit2],
    });
    if (allowance < maxUint256 / 2n) {
      await write(`approve permit2 ${token.slice(0, 10)}`, {
        address: token,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [UNISWAP_V4_BASE.permit2, maxUint256],
      });
    }
    const [amt, exp] = await publicClient.readContract({
      address: UNISWAP_V4_BASE.permit2,
      abi: permit2AllowanceAbi,
      functionName: "allowance",
      args: [account.address, token, POSITION_MANAGER],
    });
    if (amt >= 2n ** 100n && Number(exp) > now + 600) {
      console.log(`permit2 → PM ${token.slice(0, 10)} already set`);
      continue;
    }
    await write(`permit2 → PM ${token.slice(0, 10)}`, {
      address: UNISWAP_V4_BASE.permit2,
      abi: PERMIT2_ABI,
      functionName: "approve",
      args: [token, POSITION_MANAGER, 2n ** 160n - 1n, 2 ** 48 - 1],
    });
  }

  // Refresh nextTokenId after any prior mints
  const mintNextId = await publicClient.readContract({
    address: POSITION_MANAGER,
    abi: POSITION_MANAGER_ABI,
    functionName: "nextTokenId",
  });

  // 3) Mint FlatStart book + settle
  const actionBytes = new Uint8Array([...mintPlans.map(() => 0x02), 0x0d]);
  const actions = `0x${Buffer.from(actionBytes).toString("hex")}` as Hex;
  const params: Hex[] = mintPlans.map((p) =>
    encodeAbiParameters(
      [
        {
          type: "tuple",
          components: [
            { type: "address", name: "currency0" },
            { type: "address", name: "currency1" },
            { type: "uint24", name: "fee" },
            { type: "int24", name: "tickSpacing" },
            { type: "address", name: "hooks" },
          ],
        },
        { type: "int24" },
        { type: "int24" },
        { type: "uint256" },
        { type: "uint128" },
        { type: "uint128" },
        { type: "address" },
        { type: "bytes" },
      ],
      [
        {
          currency0: poolKey.currency0,
          currency1: poolKey.currency1,
          fee: poolKey.fee,
          tickSpacing: poolKey.tickSpacing,
          hooks: poolKey.hooks,
        },
        p.tickLower,
        p.tickUpper,
        p.liquidity,
        p.amount0,
        p.amount1,
        account.address,
        hookData,
      ],
    ),
  );
  params.push(
    encodeAbiParameters(
      [{ type: "address" }, { type: "address" }],
      [poolKey.currency0, poolKey.currency1],
    ),
  );
  const unlockData = encodeAbiParameters(
    [{ type: "bytes" }, { type: "bytes[]" }],
    [actions, params],
  );
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);

  // Skip mint if position already held / AURA already spent
  const auraNow = await publicClient.readContract({
    address: aura,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });
  let positionIds: bigint[] = [];
  const candidateId = mintNextId > 0n ? mintNextId - 1n : 0n;
  const candidateOwner =
    candidateId > 0n
      ? await publicClient
          .readContract({
            address: POSITION_MANAGER,
            abi: POSITION_MANAGER_ABI,
            functionName: "ownerOf",
            args: [candidateId],
          })
          .catch(() => null)
      : null;

  if (
    candidateOwner &&
    (candidateOwner.toLowerCase() === account.address.toLowerCase() ||
      candidateOwner.toLowerCase() === LOCK_TO.toLowerCase())
  ) {
    console.log(`LP already minted as position ${candidateId}`);
    positionIds = [candidateId];
  } else if (auraNow + parseUnits("1000", 18) < auraBal) {
    throw new Error("AURA spent but position not found on treasury — inspect manually");
  } else {
    await write("mint FlatStart LP", {
      address: POSITION_MANAGER,
      abi: POSITION_MANAGER_ABI,
      functionName: "modifyLiquidities",
      args: [unlockData, deadline],
    });
    positionIds = mintPlans.map((_, i) => mintNextId + BigInt(i));
  }

  // 4) Lock — transfer position NFTs to dead
  for (const id of positionIds) {
    const owner = await publicClient
      .readContract({
        address: POSITION_MANAGER,
        abi: POSITION_MANAGER_ABI,
        functionName: "ownerOf",
        args: [id],
      })
      .catch(() => null);
    if (!owner) {
      console.log(`position ${id} missing — skip`);
      continue;
    }
    if (owner.toLowerCase() === LOCK_TO.toLowerCase()) {
      console.log(`position ${id} already locked`);
      continue;
    }
    if (owner.toLowerCase() !== account.address.toLowerCase()) {
      throw new Error(`position ${id} owned by ${owner}, not treasury`);
    }
    await write(`lock position ${id}`, {
      address: POSITION_MANAGER,
      abi: POSITION_MANAGER_ABI,
      functionName: "transferFrom",
      args: [account.address, LOCK_TO, id],
    });
  }

  // 5) Seed buy $1,111 USDC → AURA
  const usdcNow = await publicClient.readContract({
    address: BASE_USDC,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });
  let seedHash: Hex | undefined = deployed.seedTx as Hex | undefined;
  if (usdcNow + seedUsdc / 2n < usdcBal - bookUsdc) {
    console.log("seed USDC already spent — skipping seed");
  } else {
    const exp2 = 2 ** 48 - 1;
    await write("permit2 → UniversalRouter", {
      address: UNISWAP_V4_BASE.permit2,
      abi: PERMIT2_ABI,
      functionName: "approve",
      args: [BASE_USDC, UNISWAP_V4_BASE.universalRouter, 2n ** 160n - 1n, exp2],
    });

    const swapInput = encodeV4ExactInSingleInput({
      key: poolKey,
      zeroForOne: pair.zeroForOneUsdcIn,
      amountIn: seedUsdc,
      amountOutMinimum: 0n,
    });
    const commands = encodePacked(["uint8"], [UNI_V4_COMMAND_V4_SWAP]);
    const seedReceipt = await write("seed $1,111 USDC", {
      address: UNISWAP_V4_BASE.universalRouter,
      abi: UNIVERSAL_ROUTER_ABI,
      functionName: "execute",
      args: [commands, [swapInput], deadline],
    });
    seedHash = seedReceipt.transactionHash;
  }

  const updated: Deployed = {
    ...deployed,
    pair: poolId,
    poolId,
    hooks: hook,
    lpLocked: true,
    usdcLiquidity: String(AURA_LP_BOOK_USDC),
    positionIds: positionIds.map(String),
    lockTo: LOCK_TO,
    seedTx: seedHash,
    attachTxs: txs,
    attachedAt: new Date().toISOString(),
  };
  writeFileSync(DEPLOYED_FILE, JSON.stringify(updated, null, 2) + "\n");

  console.log("\nAttached.");
  console.log({
    poolId,
    hooks: hook,
    positionIds: positionIds.map(String),
    lockTo: LOCK_TO,
    dexscreener: `https://dexscreener.com/base/${aura}`,
    next: "npx tsx scripts/aura-t0-operator.ts post-t0 → publish CA on VPS + pin X",
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
