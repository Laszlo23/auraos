/**
 * Aave V3 USDC supply / withdraw on Base via Light Account UserOps.
 * Addresses from bgd-labs/aave-address-book (AaveV3Base).
 */

import {
  encodeFunctionData,
  maxUint256,
  type Address,
  type Hex,
} from "viem";

import { alchemyRpcUrl, networkSpec, USDC_ADDRESSES, USDC_DECIMALS } from "@/lib/chain-config";
import { executeBatchUserOps, executeContractUserOp } from "@/lib/wallet.server";

export const AAVE_V3_BASE_POOL = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5" as Address;
export const AAVE_V3_BASE_AUSDC = "0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB" as Address;

const BASE = "base" as const;

const POOL_ABI = [
  {
    name: "supply",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "onBehalfOf", type: "address" },
      { name: "referralCode", type: "uint16" },
    ],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "to", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
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
  const decimals = USDC_DECIMALS[BASE];
  return BigInt(Math.floor(amountUsdc * 10 ** decimals));
}

function unitsToUsdc(units: bigint): number {
  return Number(units) / 10 ** USDC_DECIMALS[BASE];
}

async function ethCall(to: Address, data: Hex): Promise<bigint> {
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
  if (!json.result || json.result === "0x") return 0n;
  return BigInt(json.result);
}

export async function fetchErc20Balance(token: Address, owner: Address): Promise<bigint> {
  const data =
    `0x70a08231000000000000000000000000${owner.slice(2).toLowerCase()}` as Hex;
  return ethCall(token, data);
}

export async function fetchAaveUsdcPositionUsdc(wallet: Address): Promise<number> {
  const bal = await fetchErc20Balance(AAVE_V3_BASE_AUSDC, wallet);
  return unitsToUsdc(bal);
}

export type AaveLiveResult = {
  userOpHash: string;
  wallet: Address;
  amountUsdc: number;
  amountUnits: string;
};

/** Approve USDC + supply into Aave V3 Pool on Base. */
export async function supplyUsdcToAaveBase(args: {
  privateKey: Hex;
  walletAddress: Address;
  amountUsdc: number;
}): Promise<AaveLiveResult> {
  const usdc = USDC_ADDRESSES[BASE] as Address;
  const amount = usdcToUnits(args.amountUsdc);
  if (amount < 1_000_000n) throw new Error("Minimum live supply is $1 USDC");

  const bal = await fetchErc20Balance(usdc, args.walletAddress);
  if (bal < amount) {
    const have = unitsToUsdc(bal);
    throw new Error(
      `Need $${args.amountUsdc.toFixed(2)} USDC on Base smart wallet (have ~$${have.toFixed(2)})`,
    );
  }

  const supplyData = encodeFunctionData({
    abi: POOL_ABI,
    functionName: "supply",
    args: [usdc, amount, args.walletAddress, 0],
  });

  const calls = [
    { target: usdc, data: encodeApprove(AAVE_V3_BASE_POOL, amount) },
    { target: AAVE_V3_BASE_POOL, data: supplyData },
  ];

  const result = await executeBatchUserOps(args.privateKey, calls, BASE);
  return {
    userOpHash: result.userOpHash,
    wallet: result.address,
    amountUsdc: args.amountUsdc,
    amountUnits: amount.toString(),
  };
}

/** Withdraw USDC from Aave (amountUsdc or full aToken balance when omit / max). */
export async function withdrawUsdcFromAaveBase(args: {
  privateKey: Hex;
  walletAddress: Address;
  /** If omitted or <=0, withdraw max (all aUSDC). */
  amountUsdc?: number;
}): Promise<AaveLiveResult & { withdrawnUsdc: number }> {
  const usdc = USDC_ADDRESSES[BASE] as Address;
  const aBal = await fetchErc20Balance(AAVE_V3_BASE_AUSDC, args.walletAddress);
  if (aBal <= 0n) throw new Error("No Aave aUSDC position to withdraw");

  const want =
    args.amountUsdc && args.amountUsdc > 0 ? usdcToUnits(args.amountUsdc) : maxUint256;
  const amount = want === maxUint256 || want >= aBal ? maxUint256 : want;
  const expectedUsdc = amount === maxUint256 ? unitsToUsdc(aBal) : unitsToUsdc(amount);

  const withdrawData = encodeFunctionData({
    abi: POOL_ABI,
    functionName: "withdraw",
    args: [usdc, amount, args.walletAddress],
  });

  const result = await executeContractUserOp(
    args.privateKey,
    { target: AAVE_V3_BASE_POOL, data: withdrawData },
    BASE,
  );

  return {
    userOpHash: result.userOpHash,
    wallet: result.address,
    amountUsdc: expectedUsdc,
    amountUnits: amount === maxUint256 ? aBal.toString() : amount.toString(),
    withdrawnUsdc: expectedUsdc,
  };
}

export function aaveBaseExplorerTx(userOpHash: string): string {
  return `${networkSpec(BASE).explorer}/tx/${userOpHash}`;
}
