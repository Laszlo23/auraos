/**
 * PancakeSwap V2 USDT/USDC LP on BNB + MasterChef v2 farm via Light Account UserOps.
 * Flow: OKX half-swap USDC→USDT → Router.addLiquidity → MasterChef.deposit(pid).
 *
 * Note: pid 48 allocPoint may be 0 (no CAKE emissions) — LP still earns swap fees;
 * staking keeps the position farm-ready if emissions resume.
 */

import { encodeFunctionData, type Address, type Hex } from "viem";

import { alchemyRpcUrl, USDC_ADDRESSES, USDC_DECIMALS } from "@/lib/chain-config";
import { okxConfigured, okxDexSwap, parseOkxSwapCalldata } from "@/lib/okx.server";
import { executeBatchUserOps, executeContractUserOp } from "@/lib/wallet.server";

export const PANCAKE_ROUTER_V2 = "0x10ED43C718714eb63d5aA57B78B54704E256024E" as Address;
export const PANCAKE_USDT_USDC_LP = "0xEc6557348085Aa57C72514D67070dC863C0a5A8c" as Address;
export const PANCAKE_MASTERCHEF_V2 = "0xa5f8C5Dbd5F286960b9d90548680aE5ebFf07652" as Address;
/** MasterChef v2 pid for USDT-USDC LP (verified via lpToken(48)). */
export const PANCAKE_USDT_USDC_PID = 48n;
export const USDT_BSC = "0x55d398326f99059fF775485246999027B3197955" as Address;

const BSC = "bsc" as const;
const CHAIN_ID = "56";
const SLIPPAGE_BPS = 50n; // 0.5% — stables

const ROUTER_ABI = [
  {
    name: "addLiquidity",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
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
] as const;

const MASTERCHEF_ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_pid", type: "uint256" },
      { name: "_amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_pid", type: "uint256" },
      { name: "_amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "userInfo",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_pid", type: "uint256" },
      { name: "_user", type: "address" },
    ],
    outputs: [
      { name: "amount", type: "uint256" },
      { name: "rewardDebt", type: "uint256" },
      { name: "boostMultiplier", type: "uint256" },
    ],
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
  return BigInt(Math.floor(amountUsdc * 10 ** USDC_DECIMALS[BSC]));
}

function unitsToUsdc(units: bigint): number {
  return Number(units) / 10 ** USDC_DECIMALS[BSC];
}

function withSlippageMin(amount: bigint): bigint {
  return (amount * (10_000n - SLIPPAGE_BPS)) / 10_000n;
}

async function ethCall(to: Address, data: Hex): Promise<Hex> {
  const urls = [
    alchemyRpcUrl({ network: BSC }),
    "https://bsc-dataseed.binance.org",
    "https://bsc-dataseed1.defibit.io",
  ].filter(Boolean) as string[];

  let lastErr = "No BSC RPC";
  for (const url of urls) {
    try {
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
      if (json.error?.message) {
        lastErr = json.error.message;
        continue;
      }
      return (json.result ?? "0x") as Hex;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(`BSC eth_call failed: ${lastErr}`);
}

async function fetchErc20Balance(token: Address, owner: Address): Promise<bigint> {
  const data =
    `0x70a08231000000000000000000000000${owner.slice(2).toLowerCase()}` as Hex;
  const result = await ethCall(token, data);
  if (!result || result === "0x") return 0n;
  return BigInt(result);
}

async function fetchFarmStaked(wallet: Address): Promise<bigint> {
  try {
    const data = encodeFunctionData({
      abi: MASTERCHEF_ABI,
      functionName: "userInfo",
      args: [PANCAKE_USDT_USDC_PID, wallet],
    });
    const raw = await ethCall(PANCAKE_MASTERCHEF_V2, data);
    if (!raw || raw === "0x" || raw.length < 66) return 0n;
    return BigInt(`0x${raw.slice(2, 66)}`);
  } catch {
    return 0n;
  }
}

export type PancakeLiveResult = {
  userOpHash: string;
  wallet: Address;
  amountUsdc: number;
  liquidity: string;
  pool: Address;
  farm: Address;
  pid: number;
  hashes: string[];
};

/** Park USDC into Pancake V2 USDT/USDC LP + MasterChef stake. */
export async function supplyUsdcToPancakeUsdtUsdcLp(args: {
  privateKey: Hex;
  walletAddress: Address;
  amountUsdc: number;
}): Promise<PancakeLiveResult> {
  if (!okxConfigured()) throw new Error("OKX DEX rails required for Pancake LP (half-swap)");
  const usdc = USDC_ADDRESSES[BSC] as Address;
  const totalUsdc = usdcToUnits(args.amountUsdc);
  if (totalUsdc < usdcToUnits(5)) throw new Error("Minimum live Pancake LP is $5 USDC");

  const bal = await fetchErc20Balance(usdc, args.walletAddress);
  if (bal < totalUsdc) {
    throw new Error(
      `Need $${args.amountUsdc.toFixed(2)} USDC on BSC smart wallet (have ~$${unitsToUsdc(bal).toFixed(2)})`,
    );
  }

  const hashes: string[] = [];
  const swapUsdc = totalUsdc / 2n;
  const swapRaw = await okxDexSwap({
    chainId: CHAIN_ID,
    fromTokenAddress: usdc,
    toTokenAddress: USDT_BSC,
    amount: swapUsdc.toString(),
    userWalletAddress: args.walletAddress,
    slippage: "0.5",
  });
  const parsed = parseOkxSwapCalldata(swapRaw);
  const swapOp = await executeBatchUserOps(
    args.privateKey,
    [
      {
        target: usdc,
        data: encodeApprove((parsed.approveTo || parsed.to) as Address, swapUsdc * 2n),
      },
      { target: parsed.to, data: parsed.data, value: parsed.value },
    ],
    BSC,
  );
  hashes.push(swapOp.userOpHash);

  await new Promise((r) => setTimeout(r, 2500));
  let usdtBal = await fetchErc20Balance(USDT_BSC, args.walletAddress);
  let usdcBal = await fetchErc20Balance(usdc, args.walletAddress);
  if (usdtBal <= 0n) {
    await new Promise((r) => setTimeout(r, 4000));
    usdtBal = await fetchErc20Balance(USDT_BSC, args.walletAddress);
    usdcBal = await fetchErc20Balance(usdc, args.walletAddress);
  }
  if (usdtBal <= 0n) {
    throw new Error("USDT not received after OKX swap — retry Pancake allocate shortly");
  }

  const usdcForLp = usdcBal < totalUsdc - swapUsdc + swapUsdc / 20n ? usdcBal : totalUsdc - swapUsdc;
  const useUsdc = usdcForLp > 0n ? usdcForLp : usdcBal;
  if (useUsdc <= 0n) throw new Error("No USDC left for Pancake LP leg");

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
  const addData = encodeFunctionData({
    abi: ROUTER_ABI,
    functionName: "addLiquidity",
    args: [
      USDT_BSC,
      usdc,
      usdtBal,
      useUsdc,
      withSlippageMin(usdtBal),
      withSlippageMin(useUsdc),
      args.walletAddress,
      deadline,
    ],
  });

  const lpBefore = await fetchErc20Balance(PANCAKE_USDT_USDC_LP, args.walletAddress);
  const addOp = await executeBatchUserOps(
    args.privateKey,
    [
      { target: USDT_BSC, data: encodeApprove(PANCAKE_ROUTER_V2, usdtBal) },
      { target: usdc, data: encodeApprove(PANCAKE_ROUTER_V2, useUsdc) },
      { target: PANCAKE_ROUTER_V2, data: addData },
    ],
    BSC,
  );
  hashes.push(addOp.userOpHash);

  await new Promise((r) => setTimeout(r, 2500));
  let lpAfter = await fetchErc20Balance(PANCAKE_USDT_USDC_LP, args.walletAddress);
  if (lpAfter <= lpBefore) {
    await new Promise((r) => setTimeout(r, 4000));
    lpAfter = await fetchErc20Balance(PANCAKE_USDT_USDC_LP, args.walletAddress);
  }
  const minted = lpAfter > lpBefore ? lpAfter - lpBefore : 0n;
  if (minted <= 0n) throw new Error("LP mint not detected — check wallet on BscScan");

  const stakeOp = await executeBatchUserOps(
    args.privateKey,
    [
      { target: PANCAKE_USDT_USDC_LP, data: encodeApprove(PANCAKE_MASTERCHEF_V2, minted) },
      {
        target: PANCAKE_MASTERCHEF_V2,
        data: encodeFunctionData({
          abi: MASTERCHEF_ABI,
          functionName: "deposit",
          args: [PANCAKE_USDT_USDC_PID, minted],
        }),
      },
    ],
    BSC,
  );
  hashes.push(stakeOp.userOpHash);

  return {
    userOpHash: stakeOp.userOpHash,
    wallet: args.walletAddress,
    amountUsdc: args.amountUsdc,
    liquidity: minted.toString(),
    pool: PANCAKE_USDT_USDC_LP,
    farm: PANCAKE_MASTERCHEF_V2,
    pid: Number(PANCAKE_USDT_USDC_PID),
    hashes,
  };
}

/** Unstake MasterChef LP → removeLiquidity → swap USDT dust back to USDC. */
export async function withdrawUsdcFromPancakeUsdtUsdcLp(args: {
  privateKey: Hex;
  walletAddress: Address;
  liquidity: bigint;
}): Promise<{ userOpHash: string; wallet: Address; withdrawnUsdc: number; hashes: string[] }> {
  if (args.liquidity <= 0n) throw new Error("Missing Pancake LP amount to withdraw");
  if (!okxConfigured()) throw new Error("OKX DEX rails required to exit Pancake LP to USDC");

  const usdc = USDC_ADDRESSES[BSC] as Address;
  const hashes: string[] = [];
  const usdcBefore = await fetchErc20Balance(usdc, args.walletAddress);

  const staked = await fetchFarmStaked(args.walletAddress);
  const walletLp = await fetchErc20Balance(PANCAKE_USDT_USDC_LP, args.walletAddress);
  let lpInHand = walletLp;

  if (staked > 0n) {
    const withdrawAmt = args.liquidity <= staked ? args.liquidity : staked;
    const unstakeOp = await executeContractUserOp(
      args.privateKey,
      {
        target: PANCAKE_MASTERCHEF_V2,
        data: encodeFunctionData({
          abi: MASTERCHEF_ABI,
          functionName: "withdraw",
          args: [PANCAKE_USDT_USDC_PID, withdrawAmt],
        }),
      },
      BSC,
    );
    hashes.push(unstakeOp.userOpHash);
    await new Promise((r) => setTimeout(r, 2500));
    lpInHand = await fetchErc20Balance(PANCAKE_USDT_USDC_LP, args.walletAddress);
  }

  const removeAmt =
    args.liquidity <= lpInHand ? args.liquidity : lpInHand > 0n ? lpInHand : 0n;
  if (removeAmt <= 0n) throw new Error("No Pancake USDT/USDC LP to remove");

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
  const removeData = encodeFunctionData({
    abi: ROUTER_ABI,
    functionName: "removeLiquidity",
    args: [USDT_BSC, usdc, removeAmt, 0n, 0n, args.walletAddress, deadline],
  });

  const removeOp = await executeBatchUserOps(
    args.privateKey,
    [
      { target: PANCAKE_USDT_USDC_LP, data: encodeApprove(PANCAKE_ROUTER_V2, removeAmt) },
      { target: PANCAKE_ROUTER_V2, data: removeData },
    ],
    BSC,
  );
  hashes.push(removeOp.userOpHash);

  await new Promise((r) => setTimeout(r, 2500));
  let usdtBal = await fetchErc20Balance(USDT_BSC, args.walletAddress);
  // Dust threshold ~$0.01 of 18-decimal USDT
  if (usdtBal > 10n ** 16n) {
    const swapRaw = await okxDexSwap({
      chainId: CHAIN_ID,
      fromTokenAddress: USDT_BSC,
      toTokenAddress: usdc,
      amount: usdtBal.toString(),
      userWalletAddress: args.walletAddress,
      slippage: "0.5",
    });
    const parsed = parseOkxSwapCalldata(swapRaw);
    const exitOp = await executeBatchUserOps(
      args.privateKey,
      [
        {
          target: USDT_BSC,
          data: encodeApprove((parsed.approveTo || parsed.to) as Address, usdtBal * 2n),
        },
        { target: parsed.to, data: parsed.data, value: parsed.value },
      ],
      BSC,
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
