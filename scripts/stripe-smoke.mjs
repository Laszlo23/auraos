#!/usr/bin/env node
/**
 * Stripe Checkout session smoke tests — no card charge.
 * Usage: node scripts/stripe-smoke.mjs
 * Loads .env from repo root (file values win over empty shell exports).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(resolve(root, ".env"), "utf8").split("\n")) {
  if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
  const i = line.indexOf("=");
  const k = line.slice(0, i).trim();
  const v = line.slice(i + 1).trim();
  if (!k) continue;
  // Prefer non-empty file values so empty shell exports cannot block.
  if (v) process.env[k] = v;
  else if (process.env[k] === undefined) process.env[k] = v;
}

const secret = process.env.STRIPE_SECRET_KEY?.trim();
if (!secret) {
  console.error("Missing STRIPE_SECRET_KEY");
  process.exit(1);
}

const site = process.env.SITE_URL?.trim() || "https://aibusiness.fun";

/** @type {{ kind: string; env: string; mode: "payment"|"subscription"; plan?: string }[]} */
const flows = [
  { kind: "founding_seat", env: "STRIPE_PRICE_FOUNDING_SEAT", mode: "payment" },
  { kind: "local_seat", env: "STRIPE_PRICE_LOCAL_SEAT", mode: "payment", plan: "local_seat" },
  { kind: "boost_pack", env: "STRIPE_PRICE_BOOST_SICHTBARKEIT", mode: "payment", plan: "sichtbarkeit" },
  { kind: "boost_pack", env: "STRIPE_PRICE_BOOST_BEWERTUNGEN", mode: "payment", plan: "bewertungen" },
  { kind: "boost_pack", env: "STRIPE_PRICE_BOOST_NEUKUNDEN", mode: "payment", plan: "neukunden" },
  { kind: "aura_plan", env: "STRIPE_PRICE_STARTER", mode: "subscription", plan: "starter" },
  { kind: "aura_plan", env: "STRIPE_PRICE_COMPANY", mode: "subscription", plan: "company" },
  { kind: "aura_plan", env: "STRIPE_PRICE_SCALE", mode: "subscription", plan: "scale" },
  { kind: "funnel_plan", env: "STRIPE_PRICE_OUTCOME_STARTER", mode: "subscription", plan: "outcome_starter" },
  { kind: "funnel_plan", env: "STRIPE_PRICE_OUTCOME_GROWTH", mode: "subscription", plan: "outcome_growth" },
  { kind: "funnel_plan", env: "STRIPE_PRICE_OUTCOME_PERFORMANCE", mode: "subscription", plan: "outcome_performance" },
  { kind: "funnel_plan", env: "STRIPE_PRICE_BIB_SETUP", mode: "payment", plan: "bib_setup" },
  { kind: "funnel_plan", env: "STRIPE_PRICE_BIB_OPERATE_STARTER", mode: "subscription", plan: "bib_operate_starter" },
  { kind: "genesis_nft", env: "STRIPE_PRICE_GENESIS_NFT", mode: "payment" },
  { kind: "site_demo", env: "STRIPE_PRICE_HOROSCOPE_DAILY", mode: "subscription" },
  { kind: "site_demo", env: "STRIPE_PRICE_TAROT_DAILY", mode: "subscription" },
];

async function createSession(flow) {
  const price = process.env[flow.env]?.trim();
  if (!price) return { ok: false, error: `missing ${flow.env}` };

  const params = new URLSearchParams();
  params.set("mode", flow.mode);
  params.set("success_url", `${site}/boost?checkout=success&smoke=1`);
  params.set("cancel_url", `${site}/boost?checkout=cancel&smoke=1`);
  params.set("managed_payments[enabled]", "true");
  params.set("line_items[0][price]", price);
  params.set("line_items[0][quantity]", "1");
  params.set("metadata[kind]", flow.kind);
  params.set("metadata[smoke]", "1");
  if (flow.plan) params.set("metadata[plan]", flow.plan);
  params.set("metadata[company_id]", "00000000-0000-0000-0000-000000000000");

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2025-03-31.basil",
    },
    body: params,
  });
  const json = await res.json();
  if (!res.ok || !json.url) {
    return { ok: false, error: json.error?.message || `HTTP ${res.status}`, price };
  }
  return {
    ok: true,
    id: json.id,
    amount_total: json.amount_total,
    currency: json.currency,
    price,
    url: Boolean(json.url),
    managed: json.managed_payments?.enabled ?? null,
  };
}

const rows = [];
let failed = 0;
for (const flow of flows) {
  const label = `${flow.kind}${flow.plan ? `/${flow.plan}` : ""}`;
  const result = await createSession(flow);
  if (result.ok) {
    console.log(`PASS ${label} ${result.id} ${result.amount_total}${result.currency}`);
    rows.push({ flow: label, status: "PASS", session: result.id, amount: result.amount_total, currency: result.currency });
  } else {
    failed += 1;
    console.error(`FAIL ${label}: ${result.error}`);
    rows.push({ flow: label, status: "FAIL", error: result.error });
  }
}

const md = [
  "# Stripe checklist",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## API session smoke (no card charge)",
  "",
  "| Flow | Status | Session / error |",
  "|------|--------|-----------------|",
  ...rows.map((r) =>
    r.status === "PASS"
      ? `| ${r.flow} | PASS | \`${r.session}\` · ${r.amount}${r.currency} |`
      : `| ${r.flow} | FAIL | ${r.error} |`,
  ),
  "",
  "## Live fulfillment (manual — charge then refund)",
  "",
  "| Flow | Entry | Expect | Done |",
  "|------|-------|--------|------|",
  "| Local Seat | `/boost` | `local_seat_paid_at` + boost | ☐ |",
  "| Boost Sichtbarkeit | `/boost` | grant + social kickoff | ☐ |",
  "| Founding seat | `/access` → auth | `grant_founding_seat` | ☐ |",
  "| AURA Starter | `/billing` | subscription + tokens | ☐ |",
  "| Outcome Starter | funnel `/billing` | funnel tokens | ☐ |",
  "| Genesis NFT | `/wallet` | genesis_purchases paid | ☐ |",
  "",
  "Webhook: `https://aibusiness.fun/api/billing/webhook` · event `checkout.session.completed`.",
  "",
  `Smoke summary: ${rows.filter((r) => r.status === "PASS").length}/${rows.length} passed.`,
  "",
];

writeFileSync(new URL("../docs/STRIPE_CHECKLIST.md", import.meta.url), md.join("\n"));
console.log(`\nWrote docs/STRIPE_CHECKLIST.md · failed=${failed}`);
process.exit(failed ? 1 : 0);
