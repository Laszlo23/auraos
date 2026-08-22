import { createServerFn } from "@tanstack/react-start";
import type { Hex } from "viem";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { gasSponsorshipEnabled, resolveNetwork } from "@/lib/chain-config";
import { resolveCompanyDeskNetwork } from "@/lib/desk-network.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

async function mirrorTreasuryAddress(
  supabase: SupabaseClient<Database>,
  handleId: string,
  address: string,
) {
  const { data: handle } = await supabase
    .from("handles")
    .select("company_id")
    .eq("id", handleId)
    .maybeSingle();
  if (!handle?.company_id) return;
  await supabase
    .from("subscriptions")
    .update({ wallet_address: address })
    .eq("company_id", handle.company_id);
}

function mergeDeployedChains(
  existing: unknown,
  network: string,
  deployed: boolean,
): Record<string, boolean> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, boolean>) }
      : {};
  base[network] = deployed;
  return base;
}

/**
 * Provisions (or refreshes) the founder's embedded Light Account on the company desk network.
 * New accounts get a random owner key encrypted at rest — not re-derivable
 * from WALLET_DERIVATION_SECRET alone. Same CREATE2 address works across chains.
 */
export const provisionSmartWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { handleId: string; redeploy?: boolean; network?: string }) => {
    if (!input.handleId) throw new Error("A handle is required.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const {
      mintOwnerPrivateKey,
      encryptOwnerKey,
      decryptOwnerKey,
      ownerFromPrivateKey,
      predictAddress,
      isDeployed,
      deploySmartAccount,
      deriveLegacyOwner,
    } = await import("./wallet.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const network =
      (data.network ? resolveNetwork(data.network) : null) ??
      (await resolveCompanyDeskNetwork(context.supabase, { userId: context.userId }));
    const apiKey = process.env["ALCHEMY_API_KEY"];
    // Caller must own the handle — otherwise slot griefing via unique (handle_id, slot).
    const { data: ownedHandle } = await context.supabase
      .from("handles")
      .select("id")
      .eq("id", data.handleId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!ownedHandle) {
      throw new Error("You do not own this handle.");
    }

    // Ownership check via user session, key material via service role only.
    const { data: owned } = await context.supabase
      .from("wallet_bindings")
      .select("id")
      .eq("handle_id", data.handleId)
      .eq("kind", "smart")
      .eq("user_id", context.userId)
      .maybeSingle();

    const { data: existing } = await supabaseAdmin
      .from("wallet_bindings")
      .select("id, address, owner_key_enc, legacy, deployed, owner_address, deployed_chains")
      .eq("handle_id", data.handleId)
      .eq("kind", "smart")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (owned && !existing) {
      throw new Error("Wallet row not readable via admin — check service role.");
    }

    // Re-use encrypted key material when present.
    if (existing?.owner_key_enc) {
      const pk = decryptOwnerKey(existing.owner_key_enc) as Hex;
      const owner = ownerFromPrivateKey(pk);
      const address = predictAddress(owner.address, network);
      let deployed = await isDeployed(address, network);
      let userOpHash: string | null = null;

      if ((!deployed && data.redeploy) || (!deployed && gasSponsorshipEnabled(network))) {
        const result = await deploySmartAccount(pk, network);
        deployed = result.deployed;
        userOpHash = result.userOpHash;
      }

      const deployedChains = mergeDeployedChains(
        (existing as { deployed_chains?: unknown }).deployed_chains,
        network,
        deployed,
      );

      await supabaseAdmin
        .from("wallet_bindings")
        .update({
          address,
          deployed,
          deployed_chains: deployedChains,
          owner_address: owner.address,
          chain: network,
          custody: "account_kit",
          legacy: false,
          provider: "alchemy",
          verified: true,
          verified_at: new Date().toISOString(),
        } as never)
        .eq("id", existing.id);

      await mirrorTreasuryAddress(context.supabase, data.handleId, address);

      return {
        address,
        deployed,
        confirmed: true,
        network,
        created: false,
        sponsored: gasSponsorshipEnabled(network),
        userOpHash,
        legacy: false,
        deployedChains,
      };
    }

    // Legacy row without encrypted key: freeze as receive-only unless we can
    // still derive with WALLET_DERIVATION_SECRET for one-time migration.
    if (existing && !existing.owner_key_enc) {
      const secret = process.env["WALLET_DERIVATION_SECRET"];
      if (secret && apiKey) {
        const owner = deriveLegacyOwner(secret, context.userId);
        const address = predictAddress(owner.address, network);
        const pk = mintOwnerPrivateKey();
        const newOwner = ownerFromPrivateKey(pk);
        const newAddress = predictAddress(newOwner.address, network);
        const enc = encryptOwnerKey(pk);
        const deployed = await isDeployed(newAddress, network);
        const deployedChains = mergeDeployedChains(null, network, deployed);

        await supabaseAdmin
          .from("wallet_bindings")
          .update({
            address: newAddress,
            owner_address: newOwner.address,
            owner_key_enc: enc,
            deployed,
            deployed_chains: deployedChains,
            chain: network,
            custody: "account_kit",
            legacy: address.toLowerCase() !== newAddress.toLowerCase(),
            label:
              address.toLowerCase() !== newAddress.toLowerCase()
                ? "Aura Smart Wallet (rotated)"
                : "Aura Smart Wallet",
            provider: "alchemy",
            verified: true,
            verified_at: new Date().toISOString(),
          } as never)
          .eq("id", existing.id);

        await mirrorTreasuryAddress(context.supabase, data.handleId, newAddress);

        return {
          address: newAddress,
          deployed,
          confirmed: true,
          network,
          created: false,
          sponsored: gasSponsorshipEnabled(network),
          userOpHash: null,
          legacy: address.toLowerCase() !== newAddress.toLowerCase(),
          previousAddress: address,
          deployedChains,
        };
      }

      await supabaseAdmin
        .from("wallet_bindings")
        .update({ legacy: true, verified: false })
        .eq("id", existing.id);
      return {
        address: existing.address,
        deployed: Boolean(existing.deployed),
        confirmed: false,
        network,
        created: false,
        sponsored: false,
        userOpHash: null,
        legacy: true,
      };
    }

    // Fresh provision
    if (!process.env["APP_USER_CONNECTION_KEY_SECRET"]) {
      throw new Error("APP_USER_CONNECTION_KEY_SECRET is required to provision smart wallets.");
    }
    if (!apiKey) {
      const pk = mintOwnerPrivateKey();
      const owner = ownerFromPrivateKey(pk);
      const address = predictAddress(owner.address, network);
      const enc = encryptOwnerKey(pk);

      const deployedChains = mergeDeployedChains(null, network, false);
      const { error } = await supabaseAdmin.from("wallet_bindings").insert({
        user_id: context.userId,
        handle_id: data.handleId,
        slot: 1,
        role: "treasury",
        chain: network,
        address,
        kind: "smart",
        provider: "alchemy",
        owner_address: owner.address,
        owner_key_enc: enc,
        deployed: false,
        deployed_chains: deployedChains,
        custody: "account_kit",
        legacy: false,
        label: "Aura Smart Wallet",
        verified: true,
        verified_at: new Date().toISOString(),
      } as never);
      if (error) throw error;

      await mirrorTreasuryAddress(context.supabase, data.handleId, address);

      return {
        address,
        deployed: false,
        confirmed: true,
        network,
        created: true,
        sponsored: false,
        userOpHash: null,
        legacy: false,
        deployedChains,
      };
    }

    const pk = mintOwnerPrivateKey();
    const owner = ownerFromPrivateKey(pk);
    const address = predictAddress(owner.address, network);
    const enc = encryptOwnerKey(pk);
    let deployed = await isDeployed(address, network);
    let userOpHash: string | null = null;

    if (!deployed && gasSponsorshipEnabled(network)) {
      const result = await deploySmartAccount(pk, network);
      deployed = result.deployed;
      userOpHash = result.userOpHash;
    }

    const deployedChains = mergeDeployedChains(null, network, deployed);
    const { error } = await supabaseAdmin.from("wallet_bindings").insert({
      user_id: context.userId,
      handle_id: data.handleId,
      slot: 1,
      role: "treasury",
      chain: network,
      address,
      kind: "smart",
      provider: "alchemy",
      owner_address: owner.address,
      owner_key_enc: enc,
      deployed,
      deployed_chains: deployedChains,
      custody: "account_kit",
      legacy: false,
      label: "Aura Smart Wallet",
      verified: true,
      verified_at: new Date().toISOString(),
    } as never);
    if (error) throw error;

    await mirrorTreasuryAddress(context.supabase, data.handleId, address);

    return {
      address,
      deployed,
      confirmed: true,
      network,
      created: true,
      sponsored: gasSponsorshipEnabled(network),
      userOpHash,
      legacy: false,
      deployedChains,
    };
  });

/**
 * Grants an agent a scoped spending key with encrypted key material persisted
 * so the agent can actually sign later.
 */
export const issueAgentSessionKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      companyId: string;
      agentId: string | null;
      walletId: string | null;
      label: string;
      spendCap: number;
      allowedActions: string[];
      days: number;
    }) => {
      if (!input.companyId) throw new Error("Company is required.");
      return {
        ...input,
        label: (input.label || "Session key").slice(0, 80),
        spendCap: Math.max(0, Math.min(1_000_000, Math.floor(input.spendCap))),
        days: Math.max(1, Math.min(365, Math.floor(input.days))),
        allowedActions: input.allowedActions.slice(0, 12),
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { mintOwnerPrivateKey, encryptOwnerKey, ownerFromPrivateKey } =
      await import("./wallet.server");

    if (!process.env["APP_USER_CONNECTION_KEY_SECRET"]) {
      throw new Error("APP_USER_CONNECTION_KEY_SECRET is required for session keys.");
    }

    const pk = mintOwnerPrivateKey();
    const account = ownerFromPrivateKey(pk);
    const enc = encryptOwnerKey(pk);
    const slot = Math.floor(Math.random() * 1_000_000) + 1;

    const expires = new Date();
    expires.setDate(expires.getDate() + data.days);

    // Ensure api_buy is present when trade is allowed (x402 agent purchases).
    const actions = Array.from(
      new Set([
        ...data.allowedActions,
        ...(data.allowedActions.includes("trade") ? ["api_buy"] : []),
      ]),
    );

    const { data: row, error } = await context.supabase
      .from("agent_session_keys")
      .insert({
        user_id: context.userId,
        company_id: data.companyId,
        agent_id: data.agentId,
        wallet_id: data.walletId,
        key_address: account.address,
        key_material_enc: enc,
        derivation_slot: slot,
        label: data.label,
        spend_cap: data.spendCap,
        allowed_actions: actions,
        expires_at: expires.toISOString(),
      })
      .select(
        "id, user_id, company_id, agent_id, wallet_id, key_address, label, spend_cap, spent, allowed_actions, status, expires_at, created_at",
      )
      .single();
    if (error) throw error;
    return row;
  });

/** Revokes a session key immediately and clears signing material. */
export const revokeAgentSessionKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("agent_session_keys")
      .update({ status: "revoked", key_material_enc: null })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/** Attempts a sponsored deploy of the founder's smart account. */
export const deploySmartWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { handleId: string }) => input)
  .handler(async ({ data, context }) => {
    return provisionSmartWallet({ data: { handleId: data.handleId, redeploy: true } });
  });

/**
 * One-time reveal of the Light Account owner EOA private key for the authenticated founder.
 * There is no mnemonic — only a random hex key. Anyone with this key can control the smart wallet.
 */
export const exportSmartWalletOwnerKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { handleId: string; confirmation: string }) => {
    if (!input.handleId) throw new Error("A handle is required.");
    return {
      handleId: input.handleId,
      confirmation: (input.confirmation ?? "").trim().toUpperCase(),
    };
  })
  .handler(async ({ data, context }) => {
    if (data.confirmation !== "EXPORT") {
      throw new Error(
        "Type EXPORT to confirm you understand this cannot be undone in the browser.",
      );
    }

    const { rateLimitConsume } = await import("@/lib/rate-limit.server");
    const limited = rateLimitConsume(`wallet-export:${context.userId}`, {
      limit: 3,
      windowMs: 60 * 60 * 1000,
    });
    if (!limited.ok) {
      throw new Error(`Too many export attempts. Try again in ${limited.retryAfterSec}s.`);
    }

    const { data: ownedHandle } = await context.supabase
      .from("handles")
      .select("id")
      .eq("id", data.handleId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!ownedHandle) {
      throw new Error("You do not own this handle.");
    }

    const { decryptOwnerKey, ownerFromPrivateKey } = await import("./wallet.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: wallet } = await supabaseAdmin
      .from("wallet_bindings")
      .select("id, address, owner_address, owner_key_enc, legacy, kind")
      .eq("handle_id", data.handleId)
      .eq("kind", "smart")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!wallet?.owner_key_enc) {
      throw new Error("No exportable owner key on this wallet. Provision your smart wallet first.");
    }
    if (wallet.legacy) {
      throw new Error(
        "This legacy wallet cannot be exported safely. Contact support to rotate to a new Light Account.",
      );
    }

    const privateKey = decryptOwnerKey(wallet.owner_key_enc) as Hex;
    const owner = ownerFromPrivateKey(privateKey);
    if (
      wallet.owner_address &&
      owner.address.toLowerCase() !== wallet.owner_address.toLowerCase()
    ) {
      throw new Error("Owner key failed integrity check. Export blocked.");
    }

    // Audit without logging plaintext key material.
    await supabaseAdmin.from("app_events").insert({
      user_id: context.userId,
      event: "wallet_owner_key_exported",
      props: {
        handle_id: data.handleId,
        wallet_id: wallet.id,
        smart_wallet: wallet.address,
        owner_address: owner.address,
      },
    });

    return {
      privateKey,
      ownerAddress: owner.address,
      smartWalletAddress: wallet.address as string,
      format: "hex" as const,
      note: "This is the Light Account owner EOA key (not a seed phrase). Import it into a compatible wallet to control your smart account.",
    };
  });
