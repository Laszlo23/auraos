import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AURA_SQUARE, auraSquareAddress } from "@/lib/aura-square";
import { SITE_URL } from "@/lib/site";

type LooseDb = { from: (table: string) => any };

async function adminDb(): Promise<LooseDb> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as LooseDb;
}

export const createSquareCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    throw new Error(
      "Aura Square mint is wallet-only. Connect a wallet on /square and pay $11 USDC on Base.",
    );
  });

export const createSquareTbaFundCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { tokenId?: number; amountUsd?: number }) => ({
    tokenId: Math.floor(Number(input?.tokenId ?? 0)),
    amountUsd: Math.floor(Number(input?.amountUsd ?? 0)),
  }))
  .handler(async ({ context, data }) => {
    if (!auraSquareAddress()) {
      throw new Error("Aura Square CA is not published yet.");
    }
    if (data.tokenId < 1 || data.tokenId > AURA_SQUARE.maxSupply) {
      throw new Error("Unknown Square token id.");
    }
    if (data.amountUsd < AURA_SQUARE.tbaFundMinUsd || data.amountUsd > AURA_SQUARE.tbaFundMaxUsd) {
      throw new Error(
        `Fund amount must be ${AURA_SQUARE.tbaFundMinUsd}–${AURA_SQUARE.tbaFundMaxUsd} USDC.`,
      );
    }
    const secret = process.env["STRIPE_SECRET_KEY"];
    if (!secret) throw new Error("Stripe is not configured.");

    const { createStripeCheckoutSession } = await import("@/lib/stripe-checkout");
    const db = await adminDb();
    const { data: row } = await db
      .from("square_tba_funds")
      .insert({
        user_id: context.userId,
        token_id: data.tokenId,
        amount_usdc: data.amountUsd,
        amount_cents: data.amountUsd * 100,
        status: "pending",
      })
      .select("id")
      .single();

    const site = process.env["SITE_URL"] || SITE_URL;
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", `${site}/square?fund=success`);
    params.set("cancel_url", `${site}/square?fund=cancel`);
    params.set("client_reference_id", context.userId);
    params.set("metadata[kind]", "square_tba_fund");
    params.set("metadata[user_id]", context.userId);
    params.set("metadata[token_id]", String(data.tokenId));
    params.set("metadata[fund_id]", String(row?.id ?? ""));
    params.set("metadata[amount_usdc]", String(data.amountUsd));
    params.set("line_items[0][price_data][currency]", "usd");
    params.set("line_items[0][price_data][unit_amount]", String(data.amountUsd * 100));
    params.set("line_items[0][price_data][product_data][name]", `Aura Square TBA fund #${data.tokenId}`);
    params.set("line_items[0][quantity]", "1");

    const session = await createStripeCheckoutSession(secret, params);
    if (row?.id) {
      await db
        .from("square_tba_funds")
        .update({ stripe_session_id: session.id, updated_at: new Date().toISOString() })
        .eq("id", row.id);
    }
    return { url: session.url, id: session.id };
  });

export async function markSquarePaidFromStripe(opts: {
  userId: string;
  sessionId: string;
  amountCents?: number;
}) {
  const db = await adminDb();
  const { data: row } = await db
    .from("square_purchases")
    .select("*")
    .eq("user_id", opts.userId)
    .maybeSingle();
  await db.from("square_purchases").upsert(
    {
      user_id: opts.userId,
      status: "paid",
      stripe_session_id: opts.sessionId,
      amount_cents: opts.amountCents ?? AURA_SQUARE.mintUsd * 100,
      amount_usdc: AURA_SQUARE.mintUsd,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  const wallet = (row?.wallet as string | undefined) ?? null;
  if (wallet && /^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    try {
      const { mintSquareToWallet } = await import("@/lib/aura-square.server");
      const minted = await mintSquareToWallet(wallet as `0x${string}`);
      await db
        .from("square_purchases")
        .update({
          status: "minted",
          tx_hash: minted.txHash,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", opts.userId);
    } catch (error) {
      console.error("[square] mint after Stripe failed", error);
    }
  }
}

export async function markSquareTbaFundFromStripe(opts: {
  userId: string;
  sessionId: string;
  tokenId: number;
  amountUsd: number;
  fundId?: string;
}) {
  const db = await adminDb();
  const q = opts.fundId
    ? db.from("square_tba_funds").update({
        status: "paid",
        stripe_session_id: opts.sessionId,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", opts.fundId)
    : db.from("square_tba_funds").update({
        status: "paid",
        stripe_session_id: opts.sessionId,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("user_id", opts.userId).eq("token_id", opts.tokenId).eq("status", "pending");
  await q;

  try {
    const { fundSquareTba, readSquareTba } = await import("@/lib/aura-square.server");
    const tba = await readSquareTba(opts.tokenId);
    if (!tba) return;
    const sent = await fundSquareTba(tba, opts.amountUsd);
    const patch = {
      status: "sent",
      tba,
      tx_hash: sent.txHash,
      updated_at: new Date().toISOString(),
    };
    if (opts.fundId) {
      await db.from("square_tba_funds").update(patch).eq("id", opts.fundId);
    } else {
      await db
        .from("square_tba_funds")
        .update(patch)
        .eq("user_id", opts.userId)
        .eq("token_id", opts.tokenId)
        .eq("stripe_session_id", opts.sessionId);
    }
  } catch (error) {
    console.error("[square] TBA fund after Stripe failed", error);
  }
}
