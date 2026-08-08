import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const lookupInput = z.object({
  fioHandle: z.string().min(3),
  chainCode: z.string().default("ETH"),
  tokenCode: z.string().default("ETH"),
});

/** Read-only FIO resolution — shows what a handle maps to before attesting. */
export const resolveFio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => lookupInput.parse(input))
  .handler(async ({ data }) => {
    const { isValidFioHandle, lookupFioHandle, normaliseFioHandle } = await import("./fio.server");
    const fioHandle = normaliseFioHandle(data.fioHandle);
    if (!isValidFioHandle(fioHandle)) throw new Error("FIO handles look like name@domain.");
    return lookupFioHandle({ ...data, fioHandle });
  });

/**
 * Attests a FIO handle against a verified wallet slot: the FIO chain mapping must
 * resolve to the exact address the founder already proved ownership of by signature.
 */
export const attestFio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => lookupInput.extend({ walletId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { isValidFioHandle, lookupFioHandle, normaliseFioHandle } = await import("./fio.server");
    const fioHandle = normaliseFioHandle(data.fioHandle);
    if (!isValidFioHandle(fioHandle)) throw new Error("FIO handles look like name@domain.");

    const { data: wallet, error } = await context.supabase
      .from("wallet_bindings")
      .select("id, address, verified, handle_id")
      .eq("id", data.walletId)
      .maybeSingle();
    if (error) throw error;
    if (!wallet) throw new Error("Wallet slot not found.");
    if (!wallet.verified) throw new Error("Verify that wallet with a signature first.");

    const lookup = await lookupFioHandle({
      fioHandle,
      chainCode: data.chainCode,
      tokenCode: data.tokenCode,
    });
    if (!lookup.registered) throw new Error("That FIO handle is not registered on chain.");
    if (!lookup.publicAddress) {
      throw new Error(`No ${data.tokenCode} address is mapped to ${fioHandle} yet.`);
    }

    const matches = lookup.publicAddress.toLowerCase() === wallet.address.toLowerCase();

    const { data: row, error: upsertError } = await context.supabase
      .from("fio_attestations")
      .upsert(
        {
          user_id: context.userId,
          handle_id: wallet.handle_id,
          wallet_id: wallet.id,
          fio_handle: fioHandle,
          chain_code: data.chainCode,
          token_code: data.tokenCode,
          resolved_address: lookup.publicAddress,
          verified: matches,
          attested_at: matches ? new Date().toISOString() : null,
        },
        { onConflict: "handle_id,fio_handle,chain_code,token_code" },
      )
      .select("*")
      .single();
    if (upsertError) throw upsertError;

    if (!matches) {
      throw new Error(
        `${fioHandle} maps to ${lookup.publicAddress.slice(0, 10)}… which is not this wallet.`,
      );
    }
    return row;
  });

/**
 * Re-resolves every stored attestation for the caller against the FIO chain and
 * flags any whose on-chain mapping moved away from the attested wallet.
 */
export const revalidateFio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { handleId: string }) => input)
  .handler(async ({ data, context }) => {
    const { lookupFioHandle } = await import("./fio.server");

    const { data: rows, error } = await context.supabase
      .from("fio_attestations")
      .select("id, fio_handle, chain_code, token_code, resolved_address, wallet_id")
      .eq("handle_id", data.handleId);
    if (error) throw error;
    if (!rows?.length) return { checked: 0, changed: 0 };

    const walletIds = rows.map((r) => r.wallet_id).filter((id): id is string => Boolean(id));
    const wallets = walletIds.length
      ? ((await context.supabase.from("wallet_bindings").select("id, address").in("id", walletIds))
          .data ?? [])
      : [];
    const addressFor = new Map(wallets.map((w) => [w.id, w.address.toLowerCase()]));

    const now = new Date().toISOString();
    let changed = 0;

    for (const row of rows) {
      const lookup = await lookupFioHandle({
        fioHandle: row.fio_handle,
        chainCode: row.chain_code,
        tokenCode: row.token_code,
      });
      const expected = row.wallet_id ? addressFor.get(row.wallet_id) : undefined;
      const current = lookup.publicAddress?.toLowerCase() ?? null;

      let status: "valid" | "changed" | "unmapped" = "valid";
      if (!lookup.registered || !current) status = "unmapped";
      else if (!expected || current !== expected) status = "changed";

      if (status !== "valid") changed += 1;

      await context.supabase
        .from("fio_attestations")
        .update({
          status,
          verified: status === "valid",
          previous_address:
            current && current !== row.resolved_address?.toLowerCase()
              ? row.resolved_address
              : null,
          resolved_address: lookup.publicAddress ?? row.resolved_address,
          last_checked_at: now,
        })
        .eq("id", row.id);
    }

    return { checked: rows.length, changed };
  });
