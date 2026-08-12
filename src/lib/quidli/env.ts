/** Server-only Quidli Connect credentials — never expose as VITE_*. */

import { USDC_ADDRESSES } from "@/lib/chain-config";

const BASE_USDC = USDC_ADDRESSES.base;

export function quidliApiKey(): string | undefined {
  return process.env["QUIDLI_API_KEY"]?.trim() || undefined;
}

export function quidliWebhookSecret(): string | undefined {
  return process.env["QUIDLI_WEBHOOK_SECRET"]?.trim() || quidliApiKey();
}

export function quidliApiBase(): string {
  return (
    process.env["QUIDLI_API_BASE"]?.trim().replace(/\/$/, "") || "https://api.connect.quid.li"
  );
}

export function quidliRewardTokenAddress(): string {
  const raw = process.env["QUIDLI_REWARD_TOKEN_ADDRESS"]?.trim();
  return (raw || BASE_USDC).toLowerCase();
}

export function quidliRewardChainId(): number {
  const n = Number(process.env["QUIDLI_REWARD_CHAIN_ID"] ?? "8453");
  return Number.isFinite(n) && n > 0 ? n : 8453;
}

/** Default tip size in USDC (human units, 6 decimals on Base). */
export function quidliDefaultAmountUsdc(): number {
  const n = Number(process.env["QUIDLI_DEFAULT_AMOUNT_USDC"] ?? "1");
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** USDC smallest units (6 decimals). */
export function usdcToBaseUnits(amountUsdc: number): string {
  const n = Math.round(amountUsdc * 1e6);
  return String(Math.max(0, n));
}

export function quidliDailySendCapUsd(): number {
  const n = Number(process.env["QUIDLI_DAILY_SEND_CAP_USD"] ?? "50");
  return Number.isFinite(n) && n > 0 ? n : 50;
}

export function quidliMaxPerRecipientUsd(): number {
  const n = Number(process.env["QUIDLI_MAX_PER_RECIPIENT_USD"] ?? "5");
  return Number.isFinite(n) && n > 0 ? n : 5;
}

export function quidliConfigured(): boolean {
  return Boolean(quidliApiKey());
}

export function quidliPublicWebhookUrl(origin?: string): string | undefined {
  const base =
    origin?.trim() ||
    process.env["SITE_URL"]?.trim() ||
    process.env["PUBLIC_APP_ORIGIN"]?.trim() ||
    "https://aibusiness.fun";
  return `${base.replace(/\/$/, "")}/api/webhooks/quidli`;
}
