/**
 * Idempotent live catalog: AURA card packs, Aura OS month/year, Lokal Payment Links.
 * Prints ids and buy.stripe.com URLs only — never the secret.
 *
 *   npx tsx scripts/ensure-stripe-payment-links.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SITE = "https://aibusiness.fun";
const VERSION = "2025-03-31.basil";

function loadDotEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  for (const line of raw.split("\n")) {
    const s = line.trim();
    if (!s || s.startsWith("#") || !s.includes("=")) continue;
    const i = s.indexOf("=");
    const k = s.slice(0, i);
    const v = s.slice(i + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(k in process.env)) process.env[k] = v;
  }
}

async function stripe(path: string, body?: URLSearchParams) {
  const secret = process.env["STRIPE_SECRET_KEY"]?.trim();
  if (!secret) throw new Error("STRIPE_SECRET_KEY missing");
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Stripe-Version": VERSION,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body,
  });
  const json = (await res.json()) as Record<string, unknown> & {
    error?: { message?: string };
    data?: Array<Record<string, unknown>>;
  };
  if (!res.ok) throw new Error(json.error?.message || `Stripe ${res.status} ${path}`);
  return json;
}

async function findProduct(envKey: string) {
  const page = await stripe("products?limit=100&active=true");
  return (page.data ?? []).find((p) => {
    const meta = (p.metadata ?? {}) as Record<string, string>;
    return meta.env_key === envKey;
  });
}

async function ensureProduct(opts: {
  envKey: string;
  name: string;
  description: string;
  taxCode: string;
}) {
  const existing = await findProduct(opts.envKey);
  if (existing?.id) {
    const body = new URLSearchParams();
    body.set("tax_code", opts.taxCode);
    await stripe(`products/${existing.id}`, body);
    return String(existing.id);
  }
  const body = new URLSearchParams();
  body.set("name", opts.name);
  body.set("description", opts.description);
  body.set("tax_code", opts.taxCode);
  body.set("metadata[env_key]", opts.envKey);
  body.set("metadata[app]", "auraos");
  const created = await stripe("products", body);
  return String(created.id);
}

async function ensurePrice(opts: {
  productId: string;
  unitAmount: number;
  currency: string;
  nickname: string;
  recurring?: "month" | "year";
}) {
  const page = await stripe(`prices?product=${opts.productId}&active=true&limit=20`);
  const hit = (page.data ?? []).find((p) => {
    const rec = p.recurring as { interval?: string } | null;
    const interval = rec?.interval ?? null;
    return (
      Number(p.unit_amount) === opts.unitAmount &&
      p.currency === opts.currency &&
      (opts.recurring ? interval === opts.recurring : !interval)
    );
  });
  if (hit?.id) return String(hit.id);
  const body = new URLSearchParams();
  body.set("product", opts.productId);
  body.set("unit_amount", String(opts.unitAmount));
  body.set("currency", opts.currency);
  body.set("nickname", opts.nickname);
  if (opts.recurring) body.set("recurring[interval]", opts.recurring);
  const created = await stripe("prices", body);
  return String(created.id);
}

async function ensurePaymentLink(opts: {
  priceId: string;
  successPath: string;
  metadata: Record<string, string>;
}) {
  const page = await stripe("payment_links?limit=100&active=true");
  const hit = (page.data ?? []).find((p) => {
    const meta = (p.metadata ?? {}) as Record<string, string>;
    return Object.entries(opts.metadata).every(([k, v]) => meta[k] === v);
  });
  if (hit?.id && hit.url) {
    return { id: String(hit.id), url: String(hit.url) };
  }
  const body = new URLSearchParams();
  body.set("line_items[0][price]", opts.priceId);
  body.set("line_items[0][quantity]", "1");
  body.set("after_completion[type]", "redirect");
  body.set("after_completion[redirect][url]", `${SITE}${opts.successPath}`);
  for (const [k, v] of Object.entries(opts.metadata)) {
    body.set(`metadata[${k}]`, v);
  }
  const created = await stripe("payment_links", body);
  return { id: String(created.id), url: String(created.url) };
}

async function main() {
  loadDotEnv();
  const out: Record<string, string> = {};

  const packs = [
    { id: "29", usd: 29 },
    { id: "111", usd: 111 },
    { id: "299", usd: 299 },
  ] as const;
  for (const pack of packs) {
    const productId = await ensureProduct({
      envKey: `STRIPE_PRICE_AURA_BUY_${pack.id}`,
      name: `AURA card pack $${pack.usd}`,
      description: "Card now. AURA sent to your Aura wallet after T-0. Not an on-chain swap.",
      taxCode: "txcd_10000000",
    });
    const priceId = await ensurePrice({
      productId,
      unitAmount: pack.usd * 100,
      currency: "usd",
      nickname: `aura_buy_${pack.id}`,
    });
    const link = await ensurePaymentLink({
      priceId,
      successPath: "/get?checkout=success&way=smart",
      metadata: { kind: "aura_buy", pack: pack.id, env_key: `STRIPE_PRICE_AURA_BUY_${pack.id}` },
    });
    out[`STRIPE_PRICE_AURA_BUY_${pack.id}`] = priceId;
    out[`STRIPE_PAYMENT_LINK_AURA_BUY_${pack.id}`] = link.url;
    console.log(`aura_buy_${pack.id}`, priceId, link.url);
  }

  const osMonthProduct = await ensureProduct({
    envKey: "STRIPE_PRICE_OS_MONTH",
    name: "Aura OS — monthly",
    description: "Aura OS software — billed monthly. Cancel anytime.",
    taxCode: "txcd_10103000",
  });
  const osMonthPrice = await ensurePrice({
    productId: osMonthProduct,
    unitAmount: 2900,
    currency: "usd",
    nickname: "os_month",
    recurring: "month",
  });
  const osMonthLink = await ensurePaymentLink({
    priceId: osMonthPrice,
    successPath: "/auth?seat=success",
    metadata: { kind: "founding_seat", os_plan: "month", env_key: "STRIPE_PRICE_OS_MONTH" },
  });
  out.STRIPE_PRICE_OS_MONTH = osMonthPrice;
  out.STRIPE_PAYMENT_LINK_OS_MONTH = osMonthLink.url;
  console.log("os_month", osMonthPrice, osMonthLink.url);

  const osYearProduct = await ensureProduct({
    envKey: "STRIPE_PRICE_OS_YEAR",
    name: "Aura OS — yearly",
    description: "Aura OS software — billed yearly. Best value vs monthly.",
    taxCode: "txcd_10103000",
  });
  const osYearPrice = await ensurePrice({
    productId: osYearProduct,
    unitAmount: 29900,
    currency: "usd",
    nickname: "os_year",
    recurring: "year",
  });
  const osYearLink = await ensurePaymentLink({
    priceId: osYearPrice,
    successPath: "/auth?seat=success",
    metadata: { kind: "founding_seat", os_plan: "year", env_key: "STRIPE_PRICE_OS_YEAR" },
  });
  out.STRIPE_PRICE_OS_YEAR = osYearPrice;
  out.STRIPE_PAYMENT_LINK_OS_YEAR = osYearLink.url;
  console.log("os_year", osYearPrice, osYearLink.url);

  const lokalMonthly = await findProduct("STRIPE_PRICE_MONTHLY");
  const lokalFounder = await findProduct("STRIPE_PRICE_FOUNDER");
  if (lokalMonthly?.default_price) {
    const link = await ensurePaymentLink({
      priceId: String(lokalMonthly.default_price),
      successPath: "/boost?checkout=success",
      metadata: { kind: "aura_reputation", env_key: "STRIPE_PRICE_MONTHLY" },
    });
    out.STRIPE_PRICE_MONTHLY = String(lokalMonthly.default_price);
    out.STRIPE_PAYMENT_LINK_MONTHLY = link.url;
    console.log("lokal_monthly", lokalMonthly.default_price, link.url);
  }
  if (lokalFounder?.default_price) {
    const link = await ensurePaymentLink({
      priceId: String(lokalFounder.default_price),
      successPath: "/boost?checkout=success",
      metadata: { kind: "local_seat", env_key: "STRIPE_PRICE_FOUNDER" },
    });
    out.STRIPE_PRICE_FOUNDER = String(lokalFounder.default_price);
    out.STRIPE_PAYMENT_LINK_FOUNDER = link.url;
    console.log("lokal_founder", lokalFounder.default_price, link.url);
  }

  console.log("ENV_KEYS", Object.keys(out).join(" "));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
