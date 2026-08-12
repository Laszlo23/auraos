/**
 * GuessMarket prediction LP on Base via Light Account UserOps.
 * Catalog rail `base_limitless_pred`: create (or reuse) a market → seed USDC LP
 * for fee share (75% of trade fees). No API key required.
 *
 * Factory / market ABIs from guessmarket-mcp. Creation fee = 10 USDC.
 */

import { encodeFunctionData, type Address, type Hex } from "viem";

import { alchemyRpcUrl, USDC_ADDRESSES, USDC_DECIMALS } from "@/lib/chain-config";
import { executeBatchUserOps, executeContractUserOp } from "@/lib/wallet.server";

export const GUESSMARKET_FACTORY_BASE = "0x741B0057d06583F8533f8Cb7AEB6D8B04f48Bc93" as Address;
/** 10 USDC (6 decimals) — `marketCreationFee()` on factory. */
export const GUESSMARKET_CREATE_FEE_USDC = 10;

const BASE = "base" as const;
const API = "https://guessmarket.com/wp-json/guessmarket/v1";

const FACTORY_ABI = [
  {
    name: "createMarket",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "question_", type: "string" },
      { name: "endTime_", type: "uint256" },
    ],
    outputs: [{ name: "marketAddress", type: "address" }],
  },
  {
    name: "getMarketsByCreator",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "creator", type: "address" }],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    name: "marketCreationFee",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const MARKET_ABI = [
  {
    name: "addLiquidity",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "usdcAmount", type: "uint256" }],
    outputs: [{ name: "lpTokens", type: "uint256" }],
  },
  {
    name: "removeLiquidity",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "lpTokens", type: "uint256" }],
    outputs: [{ name: "usdcAmount", type: "uint256" }],
  },
  {
    name: "positions",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [
      { name: "yesShares", type: "uint256" },
      { name: "noShares", type: "uint256" },
      { name: "lpTokens", type: "uint256" },
    ],
  },
  {
    name: "question",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
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

async function ethCall(to: Address, data: Hex): Promise<Hex> {
  const urls = [
    alchemyRpcUrl({ network: BASE }),
    "https://mainnet.base.org",
    "https://base.llamarpc.com",
  ].filter(Boolean) as string[];

  let lastErr = "No Base RPC";
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
  throw new Error(`Base eth_call failed: ${lastErr}`);
}

async function fetchErc20Balance(token: Address, owner: Address): Promise<bigint> {
  const data = `0x70a08231000000000000000000000000${owner.slice(2).toLowerCase()}` as Hex;
  const result = await ethCall(token, data);
  if (!result || result === "0x") return 0n;
  return BigInt(result);
}

function decodeAddressArray(raw: Hex): Address[] {
  if (!raw || raw === "0x" || raw.length < 66) return [];
  const body = raw.slice(2);
  // ABI: offset, length, addresses…
  const offset = Number(BigInt(`0x${body.slice(0, 64)}`));
  const lenStart = offset * 2;
  const len = Number(BigInt(`0x${body.slice(lenStart, lenStart + 64)}`));
  const out: Address[] = [];
  for (let i = 0; i < len; i++) {
    const word = body.slice(lenStart + 64 + i * 64, lenStart + 64 + (i + 1) * 64);
    out.push(`0x${word.slice(24)}` as Address);
  }
  return out;
}

export async function fetchCreatorMarkets(wallet: Address): Promise<Address[]> {
  const data = encodeFunctionData({
    abi: FACTORY_ABI,
    functionName: "getMarketsByCreator",
    args: [wallet],
  });
  const raw = await ethCall(GUESSMARKET_FACTORY_BASE, data);
  return decodeAddressArray(raw);
}

export async function fetchMarketLpPosition(
  market: Address,
  wallet: Address,
): Promise<{ yesShares: bigint; noShares: bigint; lpTokens: bigint }> {
  const data = encodeFunctionData({
    abi: MARKET_ABI,
    functionName: "positions",
    args: [wallet],
  });
  const raw = await ethCall(market, data);
  if (!raw || raw === "0x" || raw.length < 194) {
    return { yesShares: 0n, noShares: 0n, lpTokens: 0n };
  }
  return {
    yesShares: BigInt(`0x${raw.slice(2, 66)}`),
    noShares: BigInt(`0x${raw.slice(66, 130)}`),
    lpTokens: BigInt(`0x${raw.slice(130, 194)}`),
  };
}

export type GuessMarketApiRow = {
  address: string;
  question: string;
  endTime: number;
  resolved: boolean;
  chain_id: number;
  liquidityFormatted?: string;
  yesPrice?: number;
  noPrice?: number;
  status?: string;
};

/** Public market index (includes resolved). */
export async function listGuessMarkets(args?: {
  status?: "active" | "resolved" | "all";
  page?: number;
}): Promise<GuessMarketApiRow[]> {
  const status = args?.status ?? "all";
  const page = args?.page ?? 1;
  const res = await fetch(`${API}/markets?status=${status}&page=${page}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`GuessMarket API ${res.status}`);
  const json = (await res.json()) as { markets?: GuessMarketApiRow[] };
  return json.markets ?? [];
}

/** Limitless public active markets (scout / autopilot — no API key). */
export type LimitlessMarketSummary = {
  slug: string;
  title: string;
  prices: [number, number];
  volumeFormatted?: string;
  yesToken?: string;
  noToken?: string;
  exchange?: string;
};

export async function listLimitlessActiveMarkets(limit = 8): Promise<LimitlessMarketSummary[]> {
  const res = await fetch(`https://api.limitless.exchange/markets/active?limit=${limit}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Limitless API ${res.status}`);
  const json = (await res.json()) as {
    data?: Array<{
      slug: string;
      title: string;
      prices?: number[];
      volumeFormatted?: string;
      tokens?: { yes?: string; no?: string };
      venue?: { exchange?: string };
    }>;
  };
  return (json.data ?? []).map((m) => ({
    slug: m.slug,
    title: m.title,
    prices: [Number(m.prices?.[0] ?? 0.5), Number(m.prices?.[1] ?? 0.5)] as [number, number],
    volumeFormatted: m.volumeFormatted,
    yesToken: m.tokens?.yes,
    noToken: m.tokens?.no,
    exchange: m.venue?.exchange,
  }));
}

export type GuessMarketLpResult = {
  userOpHash: string;
  wallet: Address;
  amountUsdc: number;
  market: Address;
  lpTokens: string;
  createdMarket: boolean;
  question: string;
  hashes: string[];
};

function defaultQuestion(): string {
  const q = new Date();
  q.setUTCMonth(q.getUTCMonth() + 3);
  const label = q.toISOString().slice(0, 10);
  return `Will Aura OS keep shipping live Base DeFi rails through ${label}?`;
}

/**
 * Park USDC as GuessMarket LP on Base.
 * If `market` omitted, creates a new market (costs $10 create fee) then seeds remaining as LP.
 */
export async function supplyUsdcToGuessMarketLp(args: {
  privateKey: Hex;
  walletAddress: Address;
  amountUsdc: number;
  /** Existing market to LP into (skips create fee). */
  market?: Address;
  question?: string;
  /** Days until market end when creating — default 90. */
  endDays?: number;
}): Promise<GuessMarketLpResult> {
  const usdc = USDC_ADDRESSES[BASE] as Address;
  const total = usdcToUnits(args.amountUsdc);
  const fee = usdcToUnits(GUESSMARKET_CREATE_FEE_USDC);
  const creating = !args.market;
  const minNeeded = creating ? fee + usdcToUnits(5) : usdcToUnits(5);
  if (total < minNeeded) {
    throw new Error(
      creating
        ? `GuessMarket create+LP needs ≥$${GUESSMARKET_CREATE_FEE_USDC + 5} USDC (fee + seed)`
        : "Minimum GuessMarket LP is $5 USDC",
    );
  }

  const bal = await fetchErc20Balance(usdc, args.walletAddress);
  if (bal < total) {
    throw new Error(
      `Need $${args.amountUsdc.toFixed(2)} USDC on Base smart wallet (have ~$${unitsToUsdc(bal).toFixed(2)})`,
    );
  }

  const hashes: string[] = [];
  let market = args.market;
  let createdMarket = false;
  const question = args.question?.trim() || defaultQuestion();

  if (!market) {
    const before = new Set(
      (await fetchCreatorMarkets(args.walletAddress)).map((a) => a.toLowerCase()),
    );
    const endTime = BigInt(
      Math.floor(Date.now() / 1000) + Math.max(7, args.endDays ?? 90) * 86_400,
    );
    const createOp = await executeBatchUserOps(
      args.privateKey,
      [
        { target: usdc, data: encodeApprove(GUESSMARKET_FACTORY_BASE, fee * 2n) },
        {
          target: GUESSMARKET_FACTORY_BASE,
          data: encodeFunctionData({
            abi: FACTORY_ABI,
            functionName: "createMarket",
            args: [question, endTime],
          }),
        },
      ],
      BASE,
    );
    hashes.push(createOp.userOpHash);
    createdMarket = true;

    await new Promise((r) => setTimeout(r, 3500));
    let after = await fetchCreatorMarkets(args.walletAddress);
    if (after.every((a) => before.has(a.toLowerCase()))) {
      await new Promise((r) => setTimeout(r, 5000));
      after = await fetchCreatorMarkets(args.walletAddress);
    }
    const fresh = after.find((a) => !before.has(a.toLowerCase()));
    if (!fresh) {
      throw new Error(
        "Market create submitted but address not indexed yet — retry allocate with market from factory",
      );
    }
    market = fresh;
  }

  const lpUsdc = creating
    ? (() => {
        const remain = total > fee ? total - fee : 0n;
        return remain > 0n ? remain : total;
      })()
    : total;
  if (lpUsdc < usdcToUnits(1)) {
    throw new Error("Not enough USDC left after create fee to seed LP");
  }

  const posBefore = await fetchMarketLpPosition(market, args.walletAddress);
  const lpOp = await executeBatchUserOps(
    args.privateKey,
    [
      { target: usdc, data: encodeApprove(market, lpUsdc * 2n) },
      {
        target: market,
        data: encodeFunctionData({
          abi: MARKET_ABI,
          functionName: "addLiquidity",
          args: [lpUsdc],
        }),
      },
    ],
    BASE,
  );
  hashes.push(lpOp.userOpHash);

  await new Promise((r) => setTimeout(r, 2500));
  let posAfter = await fetchMarketLpPosition(market, args.walletAddress);
  if (posAfter.lpTokens <= posBefore.lpTokens) {
    await new Promise((r) => setTimeout(r, 4000));
    posAfter = await fetchMarketLpPosition(market, args.walletAddress);
  }
  const minted =
    posAfter.lpTokens > posBefore.lpTokens
      ? posAfter.lpTokens - posBefore.lpTokens
      : posAfter.lpTokens;
  if (minted <= 0n) {
    throw new Error("LP mint not detected — check market on Basescan");
  }

  return {
    userOpHash: lpOp.userOpHash,
    wallet: args.walletAddress,
    amountUsdc: args.amountUsdc,
    market,
    lpTokens: minted.toString(),
    createdMarket,
    question,
    hashes,
  };
}

/** Burn GuessMarket LP tokens back to USDC. */
export async function withdrawUsdcFromGuessMarketLp(args: {
  privateKey: Hex;
  walletAddress: Address;
  market: Address;
  lpTokens: bigint;
}): Promise<{ userOpHash: string; wallet: Address; withdrawnUsdc: number; hashes: string[] }> {
  if (args.lpTokens <= 0n) throw new Error("Missing GuessMarket LP amount");
  const usdc = USDC_ADDRESSES[BASE] as Address;
  const hashes: string[] = [];
  const usdcBefore = await fetchErc20Balance(usdc, args.walletAddress);
  const pos = await fetchMarketLpPosition(args.market, args.walletAddress);
  const burn = args.lpTokens <= pos.lpTokens ? args.lpTokens : pos.lpTokens;
  if (burn <= 0n) throw new Error("No GuessMarket LP tokens to remove");

  const op = await executeContractUserOp(
    args.privateKey,
    {
      target: args.market,
      data: encodeFunctionData({
        abi: MARKET_ABI,
        functionName: "removeLiquidity",
        args: [burn],
      }),
    },
    BASE,
  );
  hashes.push(op.userOpHash);
  await new Promise((r) => setTimeout(r, 2500));

  let usdcAfter = await fetchErc20Balance(usdc, args.walletAddress);
  if (usdcAfter <= usdcBefore) {
    await new Promise((r) => setTimeout(r, 4000));
    usdcAfter = await fetchErc20Balance(usdc, args.walletAddress);
  }
  const gained =
    usdcAfter > usdcBefore ? unitsToUsdc(usdcAfter - usdcBefore) : unitsToUsdc(usdcAfter);

  return {
    userOpHash: op.userOpHash,
    wallet: args.walletAddress,
    withdrawnUsdc: Math.max(0, gained),
    hashes,
  };
}
