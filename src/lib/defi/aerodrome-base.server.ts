/**
 * Aerodrome Basic (vAMM) WETH/USDC LP on Base via Light Account UserOps.
 * Flow: OKX half-swap USDC→WETH → Router.addLiquidity → Gauge.deposit.
 */

import { encodeFunctionData, type Address, type Hex } from "viem";

import { alchemyRpcUrl, USDC_ADDRESSES, USDC_DECIMALS } from "@/lib/chain-config";
import { supplyUsdcToAaveBase } from "@/lib/defi/aave-base.server";
import { okxConfigured, okxDexSwap, parseOkxSwapCalldata } from "@/lib/okx.server";
import { executeBatchUserOps, executeContractUserOp } from "@/lib/wallet.server";

export const AERO_ROUTER = "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43" as Address;
export const AERO_FACTORY = "0x420DD381b31aEf6683db6B902084cB0FFECe40Da" as Address;
export const AERO_VOTER = "0x16613524e02ad97eDfeF371bC883F2F5d6C480A5" as Address;
export const AERO_WETH_USDC_POOL = "0xcDAC0d6c6C59727a65F871236188350531885C43" as Address;
export const AERO_WETH_USDC_GAUGE = "0x519BBD1Dd8C6A94C46080E24f316c14Ee758C025" as Address;
export const AERO_TOKEN = "0x940181a94A35A4569E4529A3CDfB74e38FD98631" as Address;
export const WETH_BASE = "0x4200000000000000000000000000000000000006" as Address;

const BASE = "base" as const;
const CHAIN_ID = "8453";
const STABLE = false;
const SLIPPAGE_BPS = 100n; // 1%

const ROUTER_ABI = [
  {
    name: "addLiquidity",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "stable", type: "bool" },
      { name: "amountADesired", type: "uint256" },
      { name: "amountBDesired", type: "uint256" },
      { name: "amountAMin", type: "uint256" },
      { name: "amountBMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [
      { name: "amountA", type: "uint256" },
      { name: "amountB", type: "uint256" },
      { name: "liquidity", type: "uint256" },
    ],
  },
  {
    name: "removeLiquidity",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "stable", type: "bool" },
      { name: "liquidity", type: "uint256" },
      { name: "amountAMin", type: "uint256" },
      { name: "amountBMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [
      { name: "amountA", type: "uint256" },
      { name: "amountB", type: "uint256" },
    ],
  },
  {
    name: "quoteAddLiquidity",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "stable", type: "bool" },
      { name: "_factory", type: "address" },
      { name: "amountADesired", type: "uint256" },
      { name: "amountBDesired", type: "uint256" },
    ],
    outputs: [
      { name: "amountA", type: "uint256" },
      { name: "amountB", type: "uint256" },
      { name: "liquidity", type: "uint256" },
    ],
  },
] as const;

const GAUGE_ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "earned",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getReward",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "account", type: "address" }],
    outputs: [],
  },
] as const;

const ERC20_APPROVE_SELECTOR = "0x095ea7b3";

function encodeApprove(spender: Address, amount: bigint): Hex {
  const spenderWord = spender.slice(2).toLowerCase().padStart(64, "0");
  const amountWord = amount.toString(16).padStart(64, "0");
  return `${ERC20_APPROVE_SELECTOR}${spenderWord}${amountWord}` as Hex;
}

function usdcToUnits(amountUsdc: number): bigint {
  if (!(amountUsdc > 0) || !Number.isFinite(amountUsdc)) {
    throw new Error("Invalid USDC amount");
  }
  return BigInt(Math.floor(amountUsdc * 10 ** USDC_DECIMALS[BASE]));
}

function unitsToUsdc(units: bigint): number {
  return Number(units) / 10 ** USDC_DECIMALS[BASE];
}

function withSlippageMin(amount: bigint): bigint {
  return (amount * (10_000n - SLIPPAGE_BPS)) / 10_000n;
}

async function ethCall(to: Address, data: Hex): Promise<Hex> {
  const url = alchemyRpcUrl({ network: BASE });
  if (!url) throw new Error("Alchemy RPC not configured for Base");
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });
  const json = (await res.json()) as { result?: string; error?: { message?: string } };
  if (json.error?.message) throw new Error(json.error.message);
  return (json.result ?? "0x") as Hex;
}

async function fetchErc20Balance(token: Address, owner: Address): Promise<bigint> {
  const data = `0x70a08231000000000000000000000000${owner.slice(2).toLowerCase()}` as Hex;
  const result = await ethCall(token, data);
  if (!result || result === "0x") return 0n;
  return BigInt(result);
}

async function quoteAddLiquidity(amountWeth: bigint, amountUsdc: bigint) {
  const data = encodeFunctionData({
    abi: ROUTER_ABI,
    functionName: "quoteAddLiquidity",
    args: [WETH_BASE, USDC_ADDRESSES[BASE], STABLE, AERO_FACTORY, amountWeth, amountUsdc],
  });
  const raw = await ethCall(AERO_ROUTER, data);
  if (!raw || raw === "0x" || raw.length < 194) {
    throw new Error("Aerodrome quoteAddLiquidity failed");
  }
  const amountA = BigInt(`0x${raw.slice(2, 66)}`);
  const amountB = BigInt(`0x${raw.slice(66, 130)}`);
  const liquidity = BigInt(`0x${raw.slice(130, 194)}`);
  return { amountA, amountB, liquidity };
}

export type AeroLiveResult = {
  userOpHash: string;
  wallet: Address;
  amountUsdc: number;
  liquidity: string;
  pool: Address;
  gauge: Address;
  hashes: string[];
};

/** Park USDC into Aerodrome volatile WETH/USDC LP + gauge. */
export async function supplyUsdcToAerodromeWethLp(args: {
  privateKey: Hex;
  walletAddress: Address;
  amountUsdc: number;
}): Promise<AeroLiveResult> {
  if (!okxConfigured()) throw new Error("OKX DEX rails required for Aerodrome LP (half-swap)");
  const usdc = USDC_ADDRESSES[BASE] as Address;
  const totalUsdc = usdcToUnits(args.amountUsdc);
  if (totalUsdc < 5_000_000n) throw new Error("Minimum live Aerodrome LP is $5 USDC");

  const bal = await fetchErc20Balance(usdc, args.walletAddress);
  if (bal < totalUsdc) {
    throw new Error(
      `Need $${args.amountUsdc.toFixed(2)} USDC on Base smart wallet (have ~$${unitsToUsdc(bal).toFixed(2)})`,
    );
  }

  const hashes: string[] = [];
  const swapUsdc = totalUsdc / 2n;
  const swapRaw = await okxDexSwap({
    chainId: CHAIN_ID,
    fromTokenAddress: usdc,
    toTokenAddress: WETH_BASE,
    amount: swapUsdc.toString(),
    userWalletAddress: args.walletAddress,
    slippage: "1",
  });
  const parsed = parseOkxSwapCalldata(swapRaw);
  const swapCalls: { target: Address; data: Hex; value?: bigint }[] = [
    {
      target: usdc,
      data: encodeApprove((parsed.approveTo || parsed.to) as Address, swapUsdc * 2n),
    },
    {
      target: parsed.to,
      data: parsed.data,
      value: parsed.value,
    },
  ];
  const swapOp = await executeBatchUserOps(args.privateKey, swapCalls, BASE);
  hashes.push(swapOp.userOpHash);

  // Settle briefly then size LP from balances
  await new Promise((r) => setTimeout(r, 2500));
  let wethBal = await fetchErc20Balance(WETH_BASE, args.walletAddress);
  let usdcBal = await fetchErc20Balance(usdc, args.walletAddress);
  if (wethBal <= 0n) {
    // Retry once — UserOp may still be pending
    await new Promise((r) => setTimeout(r, 4000));
    wethBal = await fetchErc20Balance(WETH_BASE, args.walletAddress);
    usdcBal = await fetchErc20Balance(usdc, args.walletAddress);
  }
  if (wethBal <= 0n) {
    throw new Error("WETH not received after OKX swap — retry Aerodrome allocate shortly");
  }

  const usdcForLp =
    usdcBal < totalUsdc - swapUsdc + swapUsdc / 20n ? usdcBal : totalUsdc - swapUsdc;
  const useUsdc = usdcForLp > 0n ? usdcForLp : usdcBal;
  if (useUsdc <= 0n) throw new Error("No USDC left for Aerodrome LP leg");

  const quote = await quoteAddLiquidity(wethBal, useUsdc);
  if (quote.liquidity <= 0n) throw new Error("Aerodrome quote returned 0 liquidity");

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
  const addData = encodeFunctionData({
    abi: ROUTER_ABI,
    functionName: "addLiquidity",
    args: [
      WETH_BASE,
      usdc,
      STABLE,
      wethBal,
      useUsdc,
      withSlippageMin(quote.amountA),
      withSlippageMin(quote.amountB),
      args.walletAddress,
      deadline,
    ],
  });

  const lpBefore = await fetchErc20Balance(AERO_WETH_USDC_POOL, args.walletAddress);
  const addOp = await executeBatchUserOps(
    args.privateKey,
    [
      { target: WETH_BASE, data: encodeApprove(AERO_ROUTER, wethBal) },
      { target: usdc, data: encodeApprove(AERO_ROUTER, useUsdc) },
      { target: AERO_ROUTER, data: addData },
    ],
    BASE,
  );
  hashes.push(addOp.userOpHash);

  await new Promise((r) => setTimeout(r, 2500));
  let lpAfter = await fetchErc20Balance(AERO_WETH_USDC_POOL, args.walletAddress);
  if (lpAfter <= lpBefore) {
    await new Promise((r) => setTimeout(r, 4000));
    lpAfter = await fetchErc20Balance(AERO_WETH_USDC_POOL, args.walletAddress);
  }
  const minted = lpAfter > lpBefore ? lpAfter - lpBefore : quote.liquidity;
  if (minted <= 0n) throw new Error("LP mint not detected — check wallet on Basescan");

  const stakeOp = await executeBatchUserOps(
    args.privateKey,
    [
      { target: AERO_WETH_USDC_POOL, data: encodeApprove(AERO_WETH_USDC_GAUGE, minted) },
      {
        target: AERO_WETH_USDC_GAUGE,
        data: encodeFunctionData({
          abi: GAUGE_ABI,
          functionName: "deposit",
          args: [minted],
        }),
      },
    ],
    BASE,
  );
  hashes.push(stakeOp.userOpHash);

  return {
    userOpHash: stakeOp.userOpHash,
    wallet: args.walletAddress,
    amountUsdc: args.amountUsdc,
    liquidity: minted.toString(),
    pool: AERO_WETH_USDC_POOL,
    gauge: AERO_WETH_USDC_GAUGE,
    hashes,
  };
}

/** Unstake gauge LP → removeLiquidity → swap WETH dust back to USDC. */
export async function withdrawUsdcFromAerodromeWethLp(args: {
  privateKey: Hex;
  walletAddress: Address;
  liquidity: bigint;
}): Promise<{ userOpHash: string; wallet: Address; withdrawnUsdc: number; hashes: string[] }> {
  if (args.liquidity <= 0n) throw new Error("Missing Aerodrome LP amount to withdraw");
  if (!okxConfigured()) throw new Error("OKX DEX rails required to exit Aerodrome LP to USDC");

  const usdc = USDC_ADDRESSES[BASE] as Address;
  const hashes: string[] = [];
  const usdcBefore = await fetchErc20Balance(usdc, args.walletAddress);

  const gaugeBalData = encodeFunctionData({
    abi: GAUGE_ABI,
    functionName: "balanceOf",
    args: [args.walletAddress],
  });
  const gaugeBalRaw = await ethCall(AERO_WETH_USDC_GAUGE, gaugeBalData);
  const gaugeBal = gaugeBalRaw && gaugeBalRaw !== "0x" ? BigInt(gaugeBalRaw) : 0n;
  const withdrawAmt = args.liquidity <= gaugeBal ? args.liquidity : gaugeBal;
  if (withdrawAmt <= 0n) throw new Error("No staked Aerodrome LP in gauge");

  const unstakeOp = await executeContractUserOp(
    args.privateKey,
    {
      target: AERO_WETH_USDC_GAUGE,
      data: encodeFunctionData({
        abi: GAUGE_ABI,
        functionName: "withdraw",
        args: [withdrawAmt],
      }),
    },
    BASE,
  );
  hashes.push(unstakeOp.userOpHash);

  await new Promise((r) => setTimeout(r, 2500));
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
  const removeData = encodeFunctionData({
    abi: ROUTER_ABI,
    functionName: "removeLiquidity",
    args: [WETH_BASE, usdc, STABLE, withdrawAmt, 0n, 0n, args.walletAddress, deadline],
  });

  const removeOp = await executeBatchUserOps(
    args.privateKey,
    [
      { target: AERO_WETH_USDC_POOL, data: encodeApprove(AERO_ROUTER, withdrawAmt) },
      { target: AERO_ROUTER, data: removeData },
    ],
    BASE,
  );
  hashes.push(removeOp.userOpHash);

  await new Promise((r) => setTimeout(r, 2500));
  const wethBal = await fetchErc20Balance(WETH_BASE, args.walletAddress);
  if (wethBal > 10n ** 12n) {
    const swapRaw = await okxDexSwap({
      chainId: CHAIN_ID,
      fromTokenAddress: WETH_BASE,
      toTokenAddress: usdc,
      amount: wethBal.toString(),
      userWalletAddress: args.walletAddress,
      slippage: "1",
    });
    const parsed = parseOkxSwapCalldata(swapRaw);
    const exitOp = await executeBatchUserOps(
      args.privateKey,
      [
        {
          target: WETH_BASE,
          data: encodeApprove((parsed.approveTo || parsed.to) as Address, wethBal * 2n),
        },
        { target: parsed.to, data: parsed.data, value: parsed.value },
      ],
      BASE,
    );
    hashes.push(exitOp.userOpHash);
    await new Promise((r) => setTimeout(r, 2500));
  }

  const usdcAfter = await fetchErc20Balance(usdc, args.walletAddress);
  const gained =
    usdcAfter > usdcBefore ? unitsToUsdc(usdcAfter - usdcBefore) : unitsToUsdc(usdcAfter);

  return {
    userOpHash: hashes[hashes.length - 1]!,
    wallet: args.walletAddress,
    withdrawnUsdc: Math.max(0, gained),
    hashes,
  };
}

/** Pending AERO emissions for a staker (0 if none / call fails). */
export async function fetchAeroGaugeEarned(wallet: Address): Promise<bigint> {
  try {
    const data = encodeFunctionData({
      abi: GAUGE_ABI,
      functionName: "earned",
      args: [wallet],
    });
    const raw = await ethCall(AERO_WETH_USDC_GAUGE, data);
    if (!raw || raw === "0x") return 0n;
    return BigInt(raw);
  } catch {
    return 0n;
  }
}

export type AeroCompoundResult = {
  userOpHash: string;
  wallet: Address;
  aeroClaimed: string;
  usdcOut: number;
  parkedToAave: boolean;
  hashes: string[];
  skipped?: string;
};

/**
 * Claim gauge AERO → OKX swap to USDC → optional Aave park.
 * No-ops (skipped) when earned dust is too small.
 */
export async function claimAndCompoundAeroRewards(args: {
  privateKey: Hex;
  walletAddress: Address;
  /** When true, supply resulting USDC into Aave V3 Base. */
  parkToAave?: boolean;
  /** Min AERO (wei) before claiming — default ~0.01 AERO. */
  minAeroWei?: bigint;
}): Promise<AeroCompoundResult> {
  if (!okxConfigured()) throw new Error("OKX DEX rails required to compound AERO → USDC");

  const hashes: string[] = [];
  const usdc = USDC_ADDRESSES[BASE] as Address;
  const minAero = args.minAeroWei ?? 10n ** 16n; // 0.01 AERO
  const earned = await fetchAeroGaugeEarned(args.walletAddress);
  const walletAero = await fetchErc20Balance(AERO_TOKEN, args.walletAddress);
  const claimable = earned > 0n ? earned : 0n;

  if (claimable < minAero && walletAero < minAero) {
    return {
      userOpHash: "",
      wallet: args.walletAddress,
      aeroClaimed: "0",
      usdcOut: 0,
      parkedToAave: false,
      hashes: [],
      skipped: "AERO rewards below compound threshold",
    };
  }

  if (claimable >= minAero) {
    const claimOp = await executeContractUserOp(
      args.privateKey,
      {
        target: AERO_WETH_USDC_GAUGE,
        data: encodeFunctionData({
          abi: GAUGE_ABI,
          functionName: "getReward",
          args: [args.walletAddress],
        }),
      },
      BASE,
    );
    hashes.push(claimOp.userOpHash);
    await new Promise((r) => setTimeout(r, 2500));
  }

  let aeroBal = await fetchErc20Balance(AERO_TOKEN, args.walletAddress);
  if (aeroBal < minAero) {
    await new Promise((r) => setTimeout(r, 4000));
    aeroBal = await fetchErc20Balance(AERO_TOKEN, args.walletAddress);
  }
  if (aeroBal < minAero) {
    return {
      userOpHash: hashes[hashes.length - 1] ?? "",
      wallet: args.walletAddress,
      aeroClaimed: claimable.toString(),
      usdcOut: 0,
      parkedToAave: false,
      hashes,
      skipped: "AERO not yet in wallet after claim",
    };
  }

  const usdcBefore = await fetchErc20Balance(usdc, args.walletAddress);
  const swapRaw = await okxDexSwap({
    chainId: CHAIN_ID,
    fromTokenAddress: AERO_TOKEN,
    toTokenAddress: usdc,
    amount: aeroBal.toString(),
    userWalletAddress: args.walletAddress,
    slippage: "1.5",
  });
  const parsed = parseOkxSwapCalldata(swapRaw);
  const swapOp = await executeBatchUserOps(
    args.privateKey,
    [
      {
        target: AERO_TOKEN,
        data: encodeApprove((parsed.approveTo || parsed.to) as Address, aeroBal * 2n),
      },
      { target: parsed.to, data: parsed.data, value: parsed.value },
    ],
    BASE,
  );
  hashes.push(swapOp.userOpHash);
  await new Promise((r) => setTimeout(r, 2500));

  let usdcAfter = await fetchErc20Balance(usdc, args.walletAddress);
  if (usdcAfter <= usdcBefore) {
    await new Promise((r) => setTimeout(r, 4000));
    usdcAfter = await fetchErc20Balance(usdc, args.walletAddress);
  }
  const gainedUnits = usdcAfter > usdcBefore ? usdcAfter - usdcBefore : 0n;
  const usdcOut = unitsToUsdc(gainedUnits);

  let parkedToAave = false;
  if (args.parkToAave && usdcOut >= 1) {
    const park = await supplyUsdcToAaveBase({
      privateKey: args.privateKey,
      walletAddress: args.walletAddress,
      amountUsdc: Math.floor(usdcOut * 100) / 100,
    });
    hashes.push(park.userOpHash);
    parkedToAave = true;
  }

  return {
    userOpHash: hashes[hashes.length - 1]!,
    wallet: args.walletAddress,
    aeroClaimed: aeroBal.toString(),
    usdcOut,
    parkedToAave,
    hashes,
  };
}
