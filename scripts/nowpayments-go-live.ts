#!/usr/bin/env node
/**
 * NOWPayments go-live smoke (no real customer charge).
 * Usage: npx tsx scripts/nowpayments-go-live.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

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

async function getJson(url: string, key: string) {
  const res = await fetch(url, { headers: { "x-api-key": key } });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, json };
}

async function main() {
  loadDotenv();
  const key = process.env["NOWPAYMENTS_API_KEY"]?.trim();
  const ipn =
    process.env["NOWPAYMENTS_IPN_SECRET"]?.trim() || process.env["NOWPAYMENTS_SECRET_KEY"]?.trim();
  if (!key) throw new Error("NOWPAYMENTS_API_KEY missing");
  if (!ipn) throw new Error("NOWPAYMENTS_IPN_SECRET missing");

  const status = await getJson("https://api.nowpayments.io/v1/status", key);
  if (status.status !== 200) throw new Error(`status ${status.status}`);

  const estimate = await getJson(
    "https://api.nowpayments.io/v1/estimate?amount=99&currency_from=eur&currency_to=usdc",
    key,
  );
  if (estimate.status !== 200) throw new Error(`estimate ${estimate.status}`);

  const invoice = await fetch("https://api.nowpayments.io/v1/invoice", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key },
    body: JSON.stringify({
      price_amount: 99,
      price_currency: "eur",
      pay_currency: "usdc",
      order_id: `go-live-smoke-${Date.now()}`,
      order_description: "Aura Local Seat go-live smoke (do not pay)",
      ipn_callback_url: "https://aibusiness.fun/api/billing/crypto-ipn",
      success_url: "https://aibusiness.fun/boost?checkout=success&crypto=1",
      cancel_url: "https://aibusiness.fun/boost?checkout=cancel&crypto=1",
      is_fixed_rate: false,
    }),
  });
  const invJson = (await invoice.json().catch(() => ({}))) as {
    id?: string | number;
    invoice_url?: string;
    message?: string;
  };
  if (!invoice.ok || !invJson.id) {
    throw new Error(invJson.message || `invoice ${invoice.status}`);
  }

  process.stdout.write(
    [
      "NOWPayments go-live smoke OK",
      `status ${status.status}`,
      `estimate_usdc ${String(estimate.json["estimated_amount"] ?? "")}`,
      `invoice ${String(invJson.id)}`,
      `ipn_secret_set ${Boolean(ipn)}`,
      "Do not pay the smoke invoice.",
      "",
    ].join("\n"),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
