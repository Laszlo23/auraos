/**
 * Stripe Connect — founders sell on their own Stripe (direct charges).
 *
 * Prefers Accounts v2 (SaaS / merchant config). Falls back to Accounts v1 with
 * Standard-equivalent controller properties when v2 is not enabled for the
 * platform. See docs/connect-recommend-plan.md.
 *
 * Platform prerequisite: Connect must be activated at
 * https://dashboard.stripe.com/settings/connect/platform-setup
 */

import { SITE_URL } from "@/lib/site";
import { STRIPE_API_VERSION } from "@/lib/stripe-checkout";

/** Preview version required for `/v2/core/accounts` SaaS create samples. */
export const STRIPE_CONNECT_API_VERSION =
  process.env["STRIPE_CONNECT_API_VERSION"]?.trim() || "2026-07-29.preview";

export const STRIPE_CONNECT_PLATFORM_SETUP_URL =
  "https://dashboard.stripe.com/settings/connect/platform-setup";

export type StripeConnectStatus = {
  connected: boolean;
  stripeAccountId: string | null;
  chargesReady: boolean;
  payoutsReady: boolean;
  detailsSubmitted: boolean;
  requirementsDue: string[];
  dashboardUrl: string | null;
};

type V2Account = {
  id?: string;
  dashboard?: string;
  configuration?: {
    merchant?: {
      capabilities?: {
        card_payments?: { status?: string };
        stripe_balance?: { payouts?: { status?: string } };
      };
    };
  };
  requirements?: {
    summary?: { minimum_deadline?: { status?: string } };
    entries?: { await_reason?: string; description?: string }[];
  };
  error?: { message?: string; code?: string };
};

/** Classic / v1 Account shape (also returned when retrieving v2 IDs via v1). */
type V1Account = {
  id?: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  requirements?: {
    currently_due?: string[];
    eventually_due?: string[];
    past_due?: string[];
    disabled_reason?: string | null;
  };
  capabilities?: {
    card_payments?: string;
    transfers?: string;
  };
  error?: { message?: string; code?: string };
};

export type ConnectAccount = V2Account & V1Account;

type StripeErrorBody = {
  error?: { message?: string; code?: string; type?: string };
};

function secret(): string {
  const s = process.env["STRIPE_SECRET_KEY"]?.trim();
  if (!s) throw new Error("STRIPE_SECRET_KEY is not set");
  return s;
}

function defaultCountry(): string {
  const raw = (process.env["STRIPE_CONNECT_DEFAULT_COUNTRY"] ?? "AT").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(raw) ? raw : "AT";
}

export function formatConnectError(err: unknown, fallback: string): Error {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : fallback;
  const lower = raw.toLowerCase();
  if (
    lower.includes("signed up for connect") ||
    lower.includes("platform-setup") ||
    lower.includes("non_connect_platform") ||
    lower.includes("accounts v2 is not enabled")
  ) {
    return new Error(
      `Stripe Connect is not activated on the Aura platform account yet. Open ${STRIPE_CONNECT_PLATFORM_SETUP_URL}, complete Connect platform setup, then try again.`,
    );
  }
  return new Error(raw || fallback);
}

async function stripeV2Json(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<Response> {
  const headers: HeadersInit = {
    Authorization: `Bearer ${secret()}`,
    "Content-Type": "application/json",
    "Stripe-Version": STRIPE_CONNECT_API_VERSION,
  };
  return fetch(`https://api.stripe.com${path}`, {
    method: init.method ?? "GET",
    headers,
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
}

async function stripeForm(
  path: string,
  body: URLSearchParams,
  stripeAccount?: string,
): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secret()}`,
    "Content-Type": "application/x-www-form-urlencoded",
    "Stripe-Version": STRIPE_API_VERSION,
  };
  if (stripeAccount) headers["Stripe-Account"] = stripeAccount;
  return fetch(`https://api.stripe.com${path}`, {
    method: "POST",
    headers,
    body,
  });
}

function isV2Blocked(message: string, code?: string): boolean {
  const lower = message.toLowerCase();
  return (
    code === "non_connect_platform_accounts_v2_access_blocked" ||
    lower.includes("accounts v2 is not enabled") ||
    lower.includes("non_connect_platform")
  );
}

export function isMerchantChargesActive(account: ConnectAccount): boolean {
  if (account.configuration?.merchant?.capabilities?.card_payments?.status === "active") {
    return true;
  }
  if (account.capabilities?.card_payments === "active") return true;
  return Boolean(account.charges_enabled);
}

export function isMerchantPayoutsActive(account: ConnectAccount): boolean {
  const payouts = account.configuration?.merchant?.capabilities?.stripe_balance?.payouts?.status;
  if (payouts === "active") return true;
  if (account.capabilities?.transfers === "active") return true;
  return Boolean(account.payouts_enabled);
}

export async function retrieveConnectAccount(accountId: string): Promise<ConnectAccount> {
  const res = await stripeV2Json(
    `/v2/core/accounts/${encodeURIComponent(accountId)}?include[0]=configuration.merchant&include[1]=requirements&include[2]=identity`,
  );
  const json = (await res.json()) as ConnectAccount;
  if (res.ok) return json;

  const v2Msg = json.error?.message || `Could not load Stripe account (${res.status})`;
  // Fall back to classic retrieve (works for v1 Express/Standard and many v2 IDs).
  const v1 = await fetch(`https://api.stripe.com/v1/accounts/${encodeURIComponent(accountId)}`, {
    headers: {
      Authorization: `Bearer ${secret()}`,
      "Stripe-Version": STRIPE_API_VERSION,
    },
  });
  const v1json = (await v1.json()) as ConnectAccount;
  if (!v1.ok || !v1json.id) {
    throw formatConnectError(
      v1json.error?.message || v2Msg,
      `Could not load Stripe account (${res.status})`,
    );
  }
  return v1json;
}

async function createConnectMerchantAccountV2(opts: {
  displayName: string;
  contactEmail: string;
  country: string;
}): Promise<{
  account?: ConnectAccount;
  errorMessage?: string | undefined;
  errorCode?: string | undefined;
}> {
  const country = opts.country.toLowerCase();
  const res = await stripeV2Json("/v2/core/accounts", {
    method: "POST",
    body: {
      contact_email: opts.contactEmail,
      display_name: opts.displayName.slice(0, 100),
      dashboard: "full",
      identity: {
        country,
        entity_type: "company",
        business_details: {
          registered_name: opts.displayName.slice(0, 100),
        },
      },
      configuration: {
        merchant: {
          capabilities: {
            card_payments: { requested: true },
          },
        },
      },
      defaults: {
        currency: country === "us" ? "usd" : country === "gb" ? "gbp" : "eur",
        responsibilities: {
          fees_collector: "stripe",
          losses_collector: "stripe",
        },
        locales: [country === "de" || country === "at" ? "de-DE" : "en-US"],
      },
      include: ["configuration.merchant", "identity", "requirements"],
    },
  });
  const json = (await res.json()) as ConnectAccount & StripeErrorBody;
  if (res.ok && json.id) return { account: json };
  return {
    errorMessage: json.error?.message || `Could not create Stripe Connect account (${res.status})`,
    errorCode: json.error?.code,
  };
}

/**
 * Standard-equivalent controller properties: founder is MoR, pays Stripe fees,
 * full Dashboard, Stripe collects KYC / owns negative-balance liability.
 */
async function createConnectMerchantAccountV1(opts: {
  displayName: string;
  contactEmail: string;
  country: string;
}): Promise<ConnectAccount> {
  const form = new URLSearchParams();
  form.set("country", opts.country.toUpperCase());
  form.set("email", opts.contactEmail);
  form.set("business_type", "company");
  form.set("business_profile[name]", opts.displayName.slice(0, 100));
  form.set("capabilities[card_payments][requested]", "true");
  form.set("capabilities[transfers][requested]", "true");
  form.set("controller[fees][payer]", "account");
  form.set("controller[losses][payments]", "stripe");
  form.set("controller[requirement_collection]", "stripe");
  form.set("controller[stripe_dashboard][type]", "full");
  form.set("metadata[aura_connect]", "1");
  form.set("metadata[display_name]", opts.displayName.slice(0, 100));

  const res = await fetch("https://api.stripe.com/v1/accounts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": STRIPE_API_VERSION,
    },
    body: form,
  });
  const json = (await res.json()) as ConnectAccount;
  if (!res.ok || !json.id) {
    throw formatConnectError(
      json.error?.message || `Could not create Stripe Connect account (${res.status})`,
      "Could not create Stripe Connect account",
    );
  }
  return json;
}

export async function createConnectMerchantAccount(opts: {
  displayName: string;
  contactEmail: string;
  country?: string;
}): Promise<ConnectAccount> {
  const country = (opts.country ?? defaultCountry()).toUpperCase();
  const v2 = await createConnectMerchantAccountV2({
    displayName: opts.displayName,
    contactEmail: opts.contactEmail,
    country,
  });
  if (v2.account) return v2.account;

  const msg = v2.errorMessage || "Could not create Stripe Connect account";
  if (isV2Blocked(msg, v2.errorCode) || msg.toLowerCase().includes("signed up for connect")) {
    // Classic path once Connect platform is activated (and when v2 preview is blocked).
    try {
      return await createConnectMerchantAccountV1({
        displayName: opts.displayName,
        contactEmail: opts.contactEmail,
        country,
      });
    } catch (v1err) {
      throw formatConnectError(v1err, msg);
    }
  }
  throw formatConnectError(msg, msg);
}

/**
 * Only allow same-origin relative paths. Blocks `//evil`, `@evil.com`, schemes,
 * and other open-redirect tricks when concatenated onto SITE_URL.
 */
export function sanitizeConnectReturnPath(
  path: string | undefined,
  fallback = "/billing?connect=return",
): string {
  const raw = (path ?? fallback).trim() || fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (raw.includes("://") || /[@\\]/.test(raw)) return fallback;
  if (!/^\/[A-Za-z0-9/_\-?&=.#%]*$/.test(raw)) return fallback;
  return raw;
}

export async function createConnectAccountLink(opts: {
  accountId: string;
  returnPath?: string;
  refreshPath?: string;
}): Promise<string> {
  const origin = (process.env["SITE_URL"] || SITE_URL).replace(/\/+$/, "");
  const returnPath = sanitizeConnectReturnPath(opts.returnPath, "/billing?connect=return");
  const refreshPath = sanitizeConnectReturnPath(opts.refreshPath, "/billing?connect=refresh");
  const returnUrl = `${origin}${returnPath}`;
  const refreshUrl = `${origin}${refreshPath}`;

  const res = await stripeV2Json("/v2/core/account_links", {
    method: "POST",
    body: {
      account: opts.accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          configurations: ["merchant"],
          return_url: returnUrl,
          refresh_url: refreshUrl,
        },
      },
    },
  });
  const json = (await res.json()) as { url?: string; error?: { message?: string } };
  if (res.ok && json.url) return json.url;

  // Classic Account Links — works for Express/Standard and many v2 accounts.
  const form = new URLSearchParams();
  form.set("account", opts.accountId);
  form.set("type", "account_onboarding");
  form.set("return_url", returnUrl);
  form.set("refresh_url", refreshUrl);
  const v1 = await fetch("https://api.stripe.com/v1/account_links", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const v1json = (await v1.json()) as { url?: string; error?: { message?: string } };
  if (!v1.ok || !v1json.url) {
    throw formatConnectError(
      json.error?.message ||
        v1json.error?.message ||
        `Could not start Stripe onboarding (${res.status})`,
      "Could not start Stripe onboarding",
    );
  }
  return v1json.url;
}

export async function createPriceOnConnectedAccount(opts: {
  stripeAccountId: string;
  name: string;
  amountCents: number;
  currency: string;
  interval: "one_time" | "day" | "week" | "month" | "year";
}): Promise<{ priceId: string; productId: string }> {
  const productBody = new URLSearchParams();
  productBody.set("name", opts.name.slice(0, 120));
  const productRes = await stripeForm("/v1/products", productBody, opts.stripeAccountId);
  const product = (await productRes.json()) as {
    id?: string;
    error?: { message?: string };
  };
  if (!productRes.ok || !product.id) {
    throw new Error(product.error?.message || "Could not create Stripe product on your account.");
  }

  const priceBody = new URLSearchParams();
  priceBody.set("product", product.id);
  priceBody.set("currency", opts.currency.toLowerCase());
  priceBody.set("unit_amount", String(Math.round(opts.amountCents)));
  if (opts.interval !== "one_time") {
    priceBody.set("recurring[interval]", opts.interval);
  }
  const priceRes = await stripeForm("/v1/prices", priceBody, opts.stripeAccountId);
  const price = (await priceRes.json()) as { id?: string; error?: { message?: string } };
  if (!priceRes.ok || !price.id) {
    throw new Error(price.error?.message || "Could not create Stripe price on your account.");
  }
  return { priceId: price.id, productId: product.id };
}

export function mapAccountToFlags(account: ConnectAccount): {
  chargesReady: boolean;
  payoutsReady: boolean;
  detailsSubmitted: boolean;
  requirementsDue: string[];
} {
  const v2Due = (account.requirements?.entries ?? [])
    .map((e) => e.description || e.await_reason || "")
    .filter(Boolean);
  const v1Due = [
    ...(account.requirements?.currently_due ?? []),
    ...(account.requirements?.past_due ?? []),
  ];
  const requirementsDue = [...v2Due, ...v1Due].filter(Boolean).slice(0, 12);
  const summary = account.requirements?.summary?.minimum_deadline?.status;
  const detailsSubmitted =
    typeof account.details_submitted === "boolean"
      ? account.details_submitted
      : summary !== "currently_due" && summary !== "past_due";

  return {
    chargesReady: isMerchantChargesActive(account),
    payoutsReady: isMerchantPayoutsActive(account),
    detailsSubmitted,
    requirementsDue,
  };
}
