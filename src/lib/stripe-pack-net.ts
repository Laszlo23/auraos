/**
 * Parse Stripe Checkout / PaymentIntent expansions into pack net proceeds.
 * Card charges settle as fiat. This is the fee/net ledger, not an on-chain swap.
 */

import { stripeCardFeeCentsEstimate, stripeNetCents } from "@/lib/aura-buy-lp";

export type StripePackNet = {
  amountCents: number;
  feeCents: number;
  netCents: number;
  paymentIntent: string | null;
  fundsAvailable: boolean;
  feeEstimated: boolean;
};

type StripeBalanceTransaction = {
  fee?: number | null;
  net?: number | null;
  status?: string | null;
  available_on?: number | null;
};

type StripeCharge = {
  paid?: boolean | null;
  refunded?: boolean | null;
  disputed?: boolean | null;
  captured?: boolean | null;
  balance_transaction?: string | StripeBalanceTransaction | null;
};

type StripePaymentIntent = {
  id?: string | null;
  status?: string | null;
  amount_received?: number | null;
  latest_charge?: string | StripeCharge | null;
};

export type StripeExpandedCheckout = {
  id?: string;
  amount_total?: number | null;
  payment_intent?: string | StripePaymentIntent | null;
  payment_status?: string | null;
};

export function stripeFundsAvailableFromBalance(
  bt: StripeBalanceTransaction | null | undefined,
  nowSec: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!bt) return false;
  if (bt.status === "available") return true;
  if (typeof bt.available_on === "number" && Number.isFinite(bt.available_on)) {
    return nowSec >= bt.available_on;
  }
  return false;
}

function asBalanceTransaction(value: unknown): StripeBalanceTransaction | null {
  if (!value || typeof value !== "object") return null;
  const row = value as StripeBalanceTransaction;
  return row;
}

function asCharge(value: unknown): StripeCharge | null {
  if (!value || typeof value !== "object") return null;
  return value as StripeCharge;
}

function asPaymentIntent(value: unknown): StripePaymentIntent | null {
  if (!value || typeof value !== "object") return null;
  return value as StripePaymentIntent;
}

export function stripePackNetFromCheckout(
  session: StripeExpandedCheckout,
  nowSec: number = Math.floor(Date.now() / 1000),
): StripePackNet {
  const amountCents =
    typeof session.amount_total === "number" && Number.isFinite(session.amount_total)
      ? Math.round(session.amount_total)
      : 0;

  const pi =
    typeof session.payment_intent === "object" && session.payment_intent
      ? asPaymentIntent(session.payment_intent)
      : null;
  const paymentIntent =
    (typeof session.payment_intent === "string" ? session.payment_intent : pi?.id) || null;

  const charge = asCharge(pi?.latest_charge);
  const bt = asBalanceTransaction(charge?.balance_transaction);

  const refunded = Boolean(charge?.refunded || charge?.disputed);
  const captured = charge?.captured !== false && charge?.paid !== false;

  let feeCents: number;
  let feeEstimated: boolean;
  if (typeof bt?.fee === "number" && Number.isFinite(bt.fee)) {
    feeCents = Math.round(bt.fee);
    feeEstimated = false;
  } else if (typeof bt?.net === "number" && Number.isFinite(bt.net) && amountCents > 0) {
    feeCents = Math.max(0, amountCents - Math.round(bt.net));
    feeEstimated = false;
  } else {
    feeCents = stripeCardFeeCentsEstimate(amountCents);
    feeEstimated = true;
  }

  const netCents = stripeNetCents(amountCents, feeCents);
  const fundsAvailable =
    !refunded &&
    captured &&
    session.payment_status !== "unpaid" &&
    stripeFundsAvailableFromBalance(bt, nowSec);

  return {
    amountCents,
    feeCents,
    netCents,
    paymentIntent,
    fundsAvailable,
    feeEstimated,
  };
}

export function stripeCheckoutExpandQuery(): string {
  return "expand[]=payment_intent.latest_charge.balance_transaction";
}
