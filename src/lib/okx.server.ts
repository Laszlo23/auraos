/**
 * Server-only OKX Web3 / DEX rails (Trade API v6).
 *
 * Members never install OKX Wallet. This module is for agent treasury actions:
 * quotes, swaps, builder-code attribution, and optional platform payouts.
 *
 * V5 aggregator endpoints return deprecation errors (upgrade to V6).
 * Docs: https://web3.okx.com/onchainos/dev-docs/trade/dex-get-quote
 */
import { createHmac } from "node:crypto";

const OKX_BASE = "https://web3.okx.com";

export type OkxQuote = {
  chainId: string;
  fromToken: string;
  toToken: string;
  amount: string;
  estimatedAmount?: string;
  raw: unknown;
};

function okxCredentials() {
  const apiKey = process.env["OKX_API_KEY"];
  const secret = process.env["OKX_SECRET_KEY"];
  const passphrase = process.env["OKX_PASSPHRASE"];
  if (!apiKey || !secret || !passphrase) return null;
  return { apiKey, secret, passphrase };
}

export function okxConfigured(): boolean {
  return Boolean(okxCredentials());
}

export function okxBuilderCode(): string | null {
  return process.env["OKX_BUILDER_CODE"] || null;
}

export function okxPayoutAddress(): string | null {
  return process.env["OKX_PAYOUT_ADDRESS"] || null;
}

/**
 * Optional referrer fee on swaps (OKX: must be > 0 and ≤ 3 on EVM).
 * Omit / leave unset for zero platform fee — never send "0" (API rejects it).
 */
export function okxFeePercent(): string | null {
  const raw = process.env["OKX_FEE_PERCENT"]?.trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 3) return null;
  // Keep API-friendly precision (OKX allows up to 9 decimals; 4 is plenty).
  return String(Math.min(3, Math.round(n * 1e4) / 1e4));
}

/** Attach referrer fee params only when both fee + payout address are valid. */
function appendOkxFeeParams(params: URLSearchParams) {
  const fee = okxFeePercent();
  const payout = okxPayoutAddress();
  if (!fee || !payout) return;
  params.set("feePercent", fee);
  params.set("fromTokenReferrerWalletAddress", payout);
}

function okxProjectId(): string | null {
  return process.env["OKX_PROJECT_ID"]?.trim() || null;
}

function sign(secret: string, timestamp: string, method: string, path: string, body: string) {
  const prehash = `${timestamp}${method.toUpperCase()}${path}${body}`;
  return createHmac("sha256", secret).update(prehash).digest("base64");
}

async function okxFetch(pathWithQuery: string, init?: RequestInit) {
  const creds = okxCredentials();
  if (!creds) throw new Error("OKX API is not configured.");

  const method = (init?.method ?? "GET").toUpperCase();
  const body = typeof init?.body === "string" ? init.body : "";
  const timestamp = new Date().toISOString();
  const signature = sign(creds.secret, timestamp, method, pathWithQuery, body);
  const projectId = okxProjectId();

  const res = await fetch(`${OKX_BASE}${pathWithQuery}`, {
    ...init,
    method,
    headers: {
      "content-type": "application/json",
      "OK-ACCESS-KEY": creds.apiKey,
      "OK-ACCESS-SIGN": signature,
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": creds.passphrase,
      ...(projectId ? { "OK-ACCESS-PROJECT": projectId } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const json = (await res.json().catch(() => ({}))) as {
    code?: string;
    msg?: string;
    data?: unknown;
  };
  if (!res.ok || (json.code && json.code !== "0")) {
    throw new Error(json.msg || `OKX request failed (${res.status})`);
  }
  return json.data;
}

/**
 * DEX aggregator quote (OKX Trade API v6).
 * Docs: GET /api/v6/dex/aggregator/quote
 */
export async function okxDexQuote(input: {
  chainId: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  slippage?: string;
}): Promise<OkxQuote> {
  const params = new URLSearchParams({
    chainIndex: input.chainId,
    fromTokenAddress: input.fromTokenAddress,
    toTokenAddress: input.toTokenAddress,
    amount: input.amount,
    swapMode: "exactIn",
    slippagePercent: input.slippage ?? "0.5",
  });
  appendOkxFeeParams(params);

  const path = `/api/v6/dex/aggregator/quote?${params.toString()}`;
  const data = await okxFetch(path);
  const row = Array.isArray(data) ? data[0] : data;
  const estimated =
    row && typeof row === "object" && "toTokenAmount" in row
      ? String((row as { toTokenAmount: string }).toTokenAmount)
      : undefined;

  return {
    chainId: input.chainId,
    fromToken: input.fromTokenAddress,
    toToken: input.toTokenAddress,
    amount: input.amount,
    ...(estimated ? { estimatedAmount: estimated } : {}),
    raw: data,
  };
}

/**
 * DEX swap instruction (calldata). Execution still goes through the smart wallet /
 * session key — this only fetches the route.
 * Docs: GET /api/v6/dex/aggregator/swap
 */
export async function okxDexSwap(input: {
  chainId: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  userWalletAddress: string;
  slippage?: string;
}): Promise<unknown> {
  const params = new URLSearchParams({
    chainIndex: input.chainId,
    fromTokenAddress: input.fromTokenAddress,
    toTokenAddress: input.toTokenAddress,
    amount: input.amount,
    userWalletAddress: input.userWalletAddress,
    swapMode: "exactIn",
    slippagePercent: input.slippage ?? "0.5",
  });
  appendOkxFeeParams(params);

  const path = `/api/v6/dex/aggregator/swap?${params.toString()}`;
  return okxFetch(path);
}

function parseApproveTo(raw: unknown): `0x${string}` | undefined {
  if (!raw) return undefined;

  const tryObj = (o: Record<string, unknown>): `0x${string}` | undefined => {
    const candidate =
      (typeof o["to"] === "string" && o["to"]) ||
      (typeof o["approveContract"] === "string" && o["approveContract"]) ||
      (typeof o["dexContractAddress"] === "string" && o["dexContractAddress"]) ||
      "";
    if (/^0x[a-fA-F0-9]{40}$/.test(candidate)) return candidate as `0x${string}`;
    return undefined;
  };

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return tryObj(parsed);
    } catch {
      return undefined;
    }
  }
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const hit = parseApproveTo(item);
      if (hit) return hit;
    }
    return undefined;
  }
  if (typeof raw === "object") return tryObj(raw as Record<string, unknown>);
  return undefined;
}

/** Normalize OKX aggregator swap response into calldata for Light Account UserOps. */
export function parseOkxSwapCalldata(raw: unknown): {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
  toAmount?: string;
  approveTo?: `0x${string}`;
} {
  const root = Array.isArray(raw) ? raw[0] : raw;
  const obj = (root ?? {}) as Record<string, unknown>;
  const tx = (obj["tx"] ?? obj) as Record<string, unknown>;
  const to = String(tx["to"] ?? "");
  const data = String(tx["data"] ?? "");
  if (!/^0x[a-fA-F0-9]{40}$/.test(to) || !data.startsWith("0x")) {
    throw new Error("OKX swap response missing calldata");
  }
  const valueRaw = tx["value"];
  const value =
    typeof valueRaw === "string" || typeof valueRaw === "number" ? BigInt(valueRaw) : 0n;
  const router = obj["routerResult"] as Record<string, unknown> | undefined;
  const toAmount =
    router && typeof router["toTokenAmount"] === "string"
      ? router["toTokenAmount"]
      : typeof obj["toTokenAmount"] === "string"
        ? obj["toTokenAmount"]
        : undefined;
  const approveTo = parseApproveTo(
    obj["approveTransaction"] ?? obj["approveData"] ?? obj["approvalAddress"],
  );
  return {
    to: to as `0x${string}`,
    data: data as `0x${string}`,
    value,
    ...(toAmount ? { toAmount } : {}),
    ...(approveTo ? { approveTo } : {}),
  };
}

/** Lightweight token risk hint via OKX security endpoint when available. */
export async function okxTokenSecurity(input: {
  chainId: string;
  tokenAddress: string;
}): Promise<{ ok: boolean; raw: unknown }> {
  try {
    const params = new URLSearchParams({
      chainIndex: input.chainId,
      tokenContractAddress: input.tokenAddress,
    });
    // Prefer v6 path; fall back silently if unavailable.
    const path = `/api/v6/dex/security/token?${params.toString()}`;
    const data = await okxFetch(path);
    return { ok: true, raw: data };
  } catch (e) {
    return { ok: false, raw: { error: e instanceof Error ? e.message : "security_unavailable" } };
  }
}
