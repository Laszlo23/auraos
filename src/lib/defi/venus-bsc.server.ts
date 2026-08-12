/**
 * Venus Core Pool USDC supply / withdraw on BNB Smart Chain via Light Account UserOps.
 * vUSDC: https://docs-v4.venus.io/deployed-contracts/markets
 */

import { encodeFunctionData, type Address, type Hex } from "viem";

import { alchemyRpcUrl, USDC_ADDRESSES, USDC_DECIMALS } from "@/lib/chain-config";
import { executeBatchUserOps, executeContractUserOp } from "@/lib/wallet.server";

export const VENUS_VUSDC_BSC = "0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8" as Address;

const BSC = "bsc" as const;

const VTOKEN_ABI = [
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "mintAmount", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "redeemUnderlying",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "redeemAmount", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOfUnderlying",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "exchangeRateStored",
    type: "function",
    stateMutability: "view",
    inputs: [],
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
  const decimals = USDC_DECIMALS[BSC];
  return BigInt(Math.floor(amountUsdc * 10 ** decimals));
}

function unitsToUsdc(units: bigint): number {
  return Number(units) / 10 ** USDC_DECIMALS[BSC];
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
  const data = `0x70a08231000000000000000000000000${owner.slice(2).toLowerCase()}` as Hex;
  const result = await ethCall(token, data);
  if (!result || result === "0x") return 0n;
  return BigInt(result);
}

/** Approximate underlying USDC from vToken balance via exchangeRateStored. */
export async function fetchVenusUsdcPositionUsdc(wallet: Address): Promise<number> {
  const vBal = await fetchErc20Balance(VENUS_VUSDC_BSC, wallet);
  if (vBal <= 0n) return 0;
  const rateData = encodeFunctionData({
    abi: VTOKEN_ABI,
    functionName: "exchangeRateStored",
  });
  const rateRaw = await ethCall(VENUS_VUSDC_BSC, rateData);
  if (!rateRaw || rateRaw === "0x") return 0;
  const rate = BigInt(rateRaw);
  // underlying = vTokenBalance * exchangeRate / 1e18
  const underlying = (vBal * rate) / 10n ** 18n;
  return unitsToUsdc(underlying);
}

export type VenusLiveResult = {
  userOpHash: string;
  wallet: Address;
  amountUsdc: number;
  amountUnits: string;
};

/** Approve USDC + mint vUSDC on Venus Core Pool (BSC). */
export async function supplyUsdcToVenusBsc(args: {
  privateKey: Hex;
  walletAddress: Address;
  amountUsdc: number;
}): Promise<VenusLiveResult> {
  const usdc = USDC_ADDRESSES[BSC] as Address;
  const amount = usdcToUnits(args.amountUsdc);
  if (amount < 10n ** 18n) throw new Error("Minimum live Venus supply is $1 USDC");

  const bal = await fetchErc20Balance(usdc, args.walletAddress);
  if (bal < amount) {
    throw new Error(
      `Need $${args.amountUsdc.toFixed(2)} USDC on BSC smart wallet (have ~$${unitsToUsdc(bal).toFixed(2)})`,
    );
  }

  const mintData = encodeFunctionData({
    abi: VTOKEN_ABI,
    functionName: "mint",
    args: [amount],
  });

  const result = await executeBatchUserOps(
    args.privateKey,
    [
      { target: usdc, data: encodeApprove(VENUS_VUSDC_BSC, amount) },
      { target: VENUS_VUSDC_BSC, data: mintData },
    ],
    BSC,
  );

  return {
    userOpHash: result.userOpHash,
    wallet: result.address,
    amountUsdc: args.amountUsdc,
    amountUnits: amount.toString(),
  };
}

/** Redeem underlying USDC from Venus (full position when amount omitted). */
export async function withdrawUsdcFromVenusBsc(args: {
  privateKey: Hex;
  walletAddress: Address;
  amountUsdc?: number;
}): Promise<VenusLiveResult & { withdrawnUsdc: number }> {
  const usdc = USDC_ADDRESSES[BSC] as Address;
  const usdcBefore = await fetchErc20Balance(usdc, args.walletAddress);
  const marked = await fetchVenusUsdcPositionUsdc(args.walletAddress);
  if (!(marked > 0)) throw new Error("No Venus vUSDC position to withdraw");

  const redeemUsdc =
    args.amountUsdc && args.amountUsdc > 0 ? Math.min(args.amountUsdc, marked) : marked;
  const amount = usdcToUnits(redeemUsdc);

  const redeemData = encodeFunctionData({
    abi: VTOKEN_ABI,
    functionName: "redeemUnderlying",
    args: [amount],
  });

  const result = await executeContractUserOp(
    args.privateKey,
    { target: VENUS_VUSDC_BSC, data: redeemData },
    BSC,
  );

  await new Promise((r) => setTimeout(r, 2500));
  let usdcAfter = await fetchErc20Balance(usdc, args.walletAddress);
  if (usdcAfter <= usdcBefore) {
    await new Promise((r) => setTimeout(r, 4000));
    usdcAfter = await fetchErc20Balance(usdc, args.walletAddress);
  }
  const gained = usdcAfter > usdcBefore ? unitsToUsdc(usdcAfter - usdcBefore) : redeemUsdc;

  return {
    userOpHash: result.userOpHash,
    wallet: result.address,
    amountUsdc: redeemUsdc,
    amountUnits: amount.toString(),
    withdrawnUsdc: Math.max(0, gained),
  };
}
