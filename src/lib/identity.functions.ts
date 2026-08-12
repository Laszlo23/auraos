import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Issues a fresh one-time challenge for a wallet slot and returns the message to sign. */
export const issueWalletChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { walletId: string }) => input)
  .handler(async ({ data, context }) => {
    const { challengeMessage } = await import("./identity.server");
    const { data: wallet, error } = await context.supabase
      .from("wallet_bindings")
      .select("id, address, handle_id, handles(handle)")
      .eq("id", data.walletId)
      .maybeSingle();
    if (error) throw error;
    if (!wallet) throw new Error("Wallet slot not found.");

    const nonce = crypto.randomUUID();
    const { error: updateError } = await context.supabase
      .from("wallet_bindings")
      .update({ verify_nonce: nonce })
      .eq("id", wallet.id);
    if (updateError) throw updateError;

    const handle = (wallet.handles as { handle: string } | null)?.handle ?? "founder";
    return { message: challengeMessage(handle, wallet.address, nonce) };
  });

/** Verifies an EIP-191 signature against the stored challenge and marks the wallet verified. */
export const confirmWalletBinding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { walletId: string; signature: string }) => input)
  .handler(async ({ data, context }) => {
    const { challengeMessage, verifyWalletSignature } = await import("./identity.server");
    const { data: wallet, error } = await context.supabase
      .from("wallet_bindings")
      .select("id, address, verify_nonce, handles(handle)")
      .eq("id", data.walletId)
      .maybeSingle();
    if (error) throw error;
    if (!wallet?.verify_nonce) throw new Error("Request a new signing challenge first.");

    const handle = (wallet.handles as { handle: string } | null)?.handle ?? "founder";
    const ok = await verifyWalletSignature({
      address: wallet.address,
      message: challengeMessage(handle, wallet.address, wallet.verify_nonce),
      signature: data.signature,
    });
    if (!ok) throw new Error("That signature does not match the wallet address.");

    const { error: updateError } = await context.supabase
      .from("wallet_bindings")
      .update({ verified: true, verified_at: new Date().toISOString(), verify_nonce: null })
      .eq("id", wallet.id);
    if (updateError) throw updateError;
    return { verified: true };
  });
