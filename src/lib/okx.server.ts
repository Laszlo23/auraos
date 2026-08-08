/**
 * Server-only OKX Web3 / DEX rails.
 *
 * Members never install OKX Wallet. This module is for agent treasury actions:
 * quotes, swaps, builder-code attribution, and optional platform payouts.
 */
import { createHmac } from "node:crypto";

const OKX_BASE = "https://www.okx.com";

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

  const res = await fetch(`${OKX_BASE}${pathWithQuery}`, {
    ...init,
    method,
    headers: {
      "content-type": "application/json",
      "OK-ACCESS-KEY": creds.apiKey,
      "OK-ACCESS-SIGN": signature,
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": creds.passphrase,
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
 * DEX aggregator quote (OKX Web3 DEX API).
 * Docs: GET /api/v5/dex/aggregator/quote
 */
export async function okxDexQuote(input: {
  chainId: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  slippage?: string;
}): Promise<OkxQuote> {
  const params = new URLSearchParams({
    chainId: input.chainId,
    fromTokenAddress: input.fromTokenAddress,
    toTokenAddress: input.toTokenAddress,
    amount: input.amount,
    slippage: input.slippage ?? "0.5",
  });
  const builder = okxBuilderCode();
  if (builder) params.set("feePercent", "0");

  const path = `/api/v5/dex/aggregator/quote?${params.toString()}`;
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
    chainId: input.chainId,
    fromTokenAddress: input.fromTokenAddress,
    toTokenAddress: input.toTokenAddress,
    amount: input.amount,
    userWalletAddress: input.userWalletAddress,
    slippage: input.slippage ?? "0.5",
  });
  const builder = okxBuilderCode();
  if (builder) params.set("feePercent", "0");

  const path = `/api/v5/dex/aggregator/swap?${params.toString()}`;
  return okxFetch(path);
}

/** Lightweight token risk hint via OKX security endpoint when available. */
export async function okxTokenSecurity(input: {
  chainId: string;
  tokenAddress: string;
}): Promise<{ ok: boolean; raw: unknown }> {
  try {
    const params = new URLSearchParams({
      chainId: input.chainId,
      tokenAddress: input.tokenAddress,
    });
    const path = `/api/v5/wallet/pre-transaction/token-security?${params.toString()}`;
    const data = await okxFetch(path);
    return { ok: true, raw: data };
  } catch (e) {
    return { ok: false, raw: { error: e instanceof Error ? e.message : "security_unavailable" } };
  }
}
