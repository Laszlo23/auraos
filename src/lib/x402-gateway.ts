/**
 * x402 (HTTP 402 Payment Required) gateway.
 *
 * Flow per request:
 *   1. No `X-PAYMENT` header  -> 402 + machine-readable `accepts` requirements.
 *   2. Header present         -> verify with the facilitator, run the handler,
 *                                settle on-chain, return `X-PAYMENT-RESPONSE`.
 *
 * Live mode needs `X402_PAY_TO` (the receiving address). Without it the gateway
 * stays in dev mode: requirements are still advertised and payloads still gate
 * access, but settlement is simulated and logged with status `dev`.
 */
import { X402_CATALOG, splitRevenue, type X402Endpoint } from "./x402-catalog";
import { activeNetwork, USDC_ADDRESSES, USDC_META, type AuraNetwork } from "./chain-config";

const DEV_PAY_TO = "0x000000000000000000000000000000000000dEaD";

export const getEndpoint = (slug: string) => X402_CATALOG.find((e) => e.slug === slug);

const isProd = () =>
  process.env["NODE_ENV"] === "production" || process.env["VITE_APP_ENV"] === "production";

const config = () => {
  const payTo = process.env["X402_PAY_TO"];
  // Prefer shared chain config so Alchemy / x402 / Vite stay aligned.
  const network = (process.env["X402_NETWORK"]
    ? (process.env["X402_NETWORK"] as string)
    : activeNetwork()) as AuraNetwork;
  const facilitator = process.env["X402_FACILITATOR_URL"] || "https://x402.org/facilitator";
  // Never allow unpaid settlement in production (ignore X402_ALLOW_DEV there).
  const allowDev = !isProd();
  return {
    payTo: payTo || DEV_PAY_TO,
    live: Boolean(payTo),
    allowDev,
    network: network === "base" ? "base" : "base-sepolia",
    facilitator,
  };
};

const atomic = (usdc: number) => Math.round(usdc * 1_000_000).toString();

export function paymentRequirements(ep: X402Endpoint, resource: string) {
  const { payTo, network } = config();
  const net = (network === "base" ? "base" : "base-sepolia") as AuraNetwork;
  const assetAddr = USDC_ADDRESSES[net];
  const meta = USDC_META[net];
  return {
    scheme: "exact",
    network: net,
    maxAmountRequired: atomic(ep.price_usdc),
    resource,
    description: ep.description,
    mimeType: "application/json",
    payTo,
    maxTimeoutSeconds: 60,
    asset: assetAddr,
    extra: { name: meta.name, version: meta.version },
  };
}

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-expose-headers": "x-payment-response",
      ...(init?.headers ?? {}),
    },
  });

export const jsonResponse = json;

export function paymentRequired(ep: X402Endpoint, resource: string, error: string) {
  return json(
    { x402Version: 1, error, accepts: [paymentRequirements(ep, resource)] },
    { status: 402 },
  );
}

export function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,x-payment",
      "access-control-max-age": "86400",
    },
  });
}

async function logCall(row: {
  slug: string;
  payer: string | null;
  amount: number;
  network: string;
  tx: string | null;
  status: string;
  latency: number;
  companyId?: string | null;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const split =
      row.amount > 0 && (row.status === "settled" || row.status === "dev")
        ? splitRevenue(row.amount)
        : { platform_fee: 0, owner_share: 0, treasury_share: 0 };
    await supabaseAdmin.from("x402_calls").insert({
      slug: row.slug,
      payer: row.payer,
      amount_usdc: row.amount,
      network: row.network,
      tx_hash: row.tx,
      status: row.status,
      latency_ms: row.latency,
      company_id: row.companyId ?? null,
      direction: "earned",
      ...split,
    });

    // Company P&L ledger (honest USDC) + AURA reserve credit for owner share
    if (row.companyId && row.amount > 0 && (row.status === "settled" || row.status === "dev")) {
      await supabaseAdmin.from("company_ledger_entries" as never).insert([
        {
          company_id: row.companyId,
          kind: "revenue",
          amount_usdc: row.amount,
          status: "settled",
          source: "x402",
          source_id: row.tx ?? row.slug,
          description: `x402 · ${row.slug}`,
        },
        {
          company_id: row.companyId,
          kind: "fee",
          amount_usdc: -(split.platform_fee + split.treasury_share),
          status: "settled",
          source: "x402",
          source_id: row.tx ?? row.slug,
          description: `x402 fees · ${row.slug}`,
        },
      ] as never);
    }

    // Route the founder slice into the company's AURA reserve (1 USDC = 1000 AURA internally).
    if (row.companyId && split.owner_share > 0) {
      const aura = Math.round(split.owner_share * 1000);
      if (aura > 0) {
        await supabaseAdmin.from("token_ledger").insert({
          company_id: row.companyId,
          kind: "grant",
          amount: aura,
          reason: `Agent revenue — ${row.slug}`,
        });
        const { data: sub } = await supabaseAdmin
          .from("subscriptions")
          .select("id, tokens_remaining")
          .eq("company_id", row.companyId)
          .maybeSingle();
        if (sub) {
          await supabaseAdmin
            .from("subscriptions")
            .update({ tokens_remaining: (sub.tokens_remaining ?? 0) + aura })
            .eq("id", sub.id);
        }
      }
    }
  } catch (e) {
    console.error("x402 log failed", e);
  }
}

async function devHash(seed: string) {
  const bytes = new TextEncoder().encode(seed);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return `0x${Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;
}

type Facilitated = { ok: boolean; payer: string | null; tx: string | null; reason?: string };

async function facilitate(
  kind: "verify" | "settle",
  payload: unknown,
  requirements: unknown,
): Promise<Facilitated> {
  const { facilitator } = config();
  try {
    const res = await fetch(`${facilitator}/${kind}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        x402Version: 1,
        paymentPayload: payload,
        paymentRequirements: requirements,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      isValid?: boolean;
      success?: boolean;
      payer?: string;
      transaction?: string;
      invalidReason?: string;
      errorReason?: string;
    };
    const ok = kind === "verify" ? Boolean(body.isValid) : Boolean(body.success);
    return {
      ok: res.ok && ok,
      payer: body.payer ?? null,
      tx: body.transaction ?? null,
      ...(body.invalidReason || body.errorReason
        ? { reason: body.invalidReason || body.errorReason }
        : {}),
    };
  } catch (e) {
    console.error(`x402 ${kind} failed`, e);
    return { ok: false, payer: null, tx: null, reason: "facilitator_unreachable" };
  }
}

/**
 * Wraps a handler in the paywall. `work` only runs once payment verifies.
 */
export async function withPayment(
  slug: string,
  request: Request,
  work: () => Promise<unknown>,
): Promise<Response> {
  const ep = getEndpoint(slug);
  if (!ep) return json({ error: "unknown_endpoint" }, { status: 404 });

  const started = Date.now();
  const { live, allowDev, network } = config();
  const resource = new URL(request.url).toString();
  const header = request.headers.get("x-payment");
  // Optional attribution: the company whose agents this endpoint is credited to.
  const raw = request.headers.get("x-aura-company");
  const companyId = raw && /^[0-9a-f-]{36}$/i.test(raw) ? raw : null;

  if (!live && !allowDev) {
    return json(
      {
        error: "x402_misconfigured",
        message: "X402_PAY_TO must be set in production. Simulated settlement is disabled.",
      },
      { status: 503 },
    );
  }

  if (!header) return paymentRequired(ep, resource, "X-PAYMENT header is required");

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(atob(header)) as Record<string, unknown>;
  } catch {
    return paymentRequired(ep, resource, "X-PAYMENT must be base64-encoded JSON");
  }

  const requirements = paymentRequirements(ep, resource);
  let payer: string | null =
    typeof (payload as { payload?: { authorization?: { from?: string } } }).payload?.authorization
      ?.from === "string"
      ? (payload as { payload: { authorization: { from: string } } }).payload.authorization.from
      : null;
  let tx: string | null = null;
  let status = "dev";

  if (live) {
    const verified = await facilitate("verify", payload, requirements);
    if (!verified.ok) {
      await logCall({
        slug,
        payer,
        amount: ep.price_usdc,
        network,
        tx: null,
        status: "rejected",
        latency: Date.now() - started,
        companyId,
      });
      return paymentRequired(ep, resource, verified.reason || "payment_invalid");
    }
    payer = verified.payer ?? payer;
  }

  let result: unknown;
  try {
    result = await work();
  } catch (e) {
    console.error(`x402 handler ${slug} failed`, e);
    await logCall({
      slug,
      payer,
      amount: 0,
      network,
      tx: null,
      status: "handler_error",
      latency: Date.now() - started,
      companyId,
    });
    return json({ error: "upstream_failed" }, { status: 502 });
  }

  if (live) {
    const settled = await facilitate("settle", payload, requirements);
    tx = settled.tx;
    status = settled.ok ? "settled" : "settle_failed";
  } else {
    tx = await devHash(`${slug}:${header}:${started}`);
    status = "dev";
  }

  await logCall({
    slug,
    payer,
    amount: ep.price_usdc,
    network,
    tx,
    status,
    latency: Date.now() - started,
    companyId,
  });

  const receipt = {
    success: status !== "settle_failed",
    transaction: tx,
    network,
    payer,
    mode: live ? "live" : "dev",
    split: splitRevenue(ep.price_usdc),
  };
  return json(result, { headers: { "x-payment-response": btoa(JSON.stringify(receipt)) } });
}
