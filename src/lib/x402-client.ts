/**
 * Agent-side x402 buyer — server-mediated.
 *
 * Live mode (`X402_PAY_TO` set): signs EIP-3009 USDC TransferWithAuthorization
 * from the session key when encrypted material exists.
 * Dev mode: simulated settlement in non-production (never in production without X402_PAY_TO).
 */
import { createServerFn } from "@tanstack/react-start";
import type { Address, Hex } from "viem";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { X402_CATALOG } from "@/lib/x402-catalog";
import { activeNetwork, resolveNetwork } from "@/lib/chain-config";
import { isProdRuntime, resolveX402PayTo } from "@/lib/x402-config";
import { SITE_URL } from "@/lib/site";

export type AgentPurchase = {
  slug: string;
  amount_usdc: number;
  resultJson: string;
  spent_id: string;
  mode: "live" | "dev" | "simulated";
  simulated: boolean;
};

function x402Mode(): { live: boolean; allowDev: boolean; payTo: string | null } {
  const payTo = resolveX402PayTo();
  // Never allow unpaid/dev settlement in production.
  const allowDev = !isProdRuntime();
  return { live: Boolean(payTo), allowDev, payTo };
}

async function buildPaymentHeader(opts: {
  payer: string;
  priceUsdc: number;
  network: ReturnType<typeof activeNetwork>;
  privateKey: Hex | null;
  live: boolean;
  payTo: string | null;
}): Promise<{ header: string; simulated: boolean }> {
  const value = String(Math.round(opts.priceUsdc * 1e6));

  if (opts.live) {
    if (!opts.privateKey || !opts.payTo) {
      throw new Error(
        "Live agent buys need an encrypted session key and X402_PAY_TO. Issue a new session key after the security migration.",
      );
    }
    const { signUsdcTransferAuthorization } = await import("./usdc-authorization.server");
    const auth = await signUsdcTransferAuthorization({
      privateKey: opts.privateKey,
      network: opts.network,
      to: opts.payTo as Address,
      valueAtomic: BigInt(value),
    });

    const payload = {
      x402Version: 1,
      scheme: "exact",
      network: opts.network,
      payload: {
        signature: undefined as unknown,
        authorization: {
          from: auth.from,
          to: auth.to,
          value,
          validAfter: auth.validAfter.toString(),
          validBefore: auth.validBefore.toString(),
          nonce: auth.nonce,
          v: auth.v,
          r: auth.r,
          s: auth.s,
        },
      },
    };

    // x402 exact scheme typically wants signature as concatenated or separate;
    // include both forms for facilitator compatibility.
    (payload.payload as { signature: string }).signature =
      `0x${auth.r.slice(2)}${auth.s.slice(2)}${auth.v.toString(16).padStart(2, "0")}`;

    return { header: btoa(JSON.stringify(payload)), simulated: false };
  }

  let commitment = "unsigned";
  if (opts.privateKey) {
    const { privateKeyToAccount } = await import("viem/accounts");
    const account = privateKeyToAccount(opts.privateKey);
    commitment = await account.signMessage({
      message: `aura:x402:${opts.network}:${opts.payer}:${value}`,
    });
  }

  const payload = {
    x402Version: 1,
    scheme: "exact",
    network: opts.network,
    payload: {
      authorization: { from: opts.payer, value },
      auraCommitment: commitment,
    },
  };
  return { header: btoa(JSON.stringify(payload)), simulated: true };
}

export const agentBuy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { sessionKeyId: string; companyId: string; slug: string; input: unknown }) => {
    if (!input.sessionKeyId || !input.companyId || !input.slug) {
      throw new Error("sessionKeyId, companyId and slug are required.");
    }
    return input;
  })
  .handler(async ({ data, context }): Promise<AgentPurchase> => {
    const ep = X402_CATALOG.find((e) => e.slug === data.slug);
    if (!ep) throw new Error("Unknown endpoint");

    const { live, allowDev, payTo } = x402Mode();
    if (!live && !allowDev) {
      throw new Error(
        "x402 is misconfigured: set X402_PAY_TO (or OKX_PAYOUT_ADDRESS) for production.",
      );
    }

    const { data: sk, error: skErr } = await context.supabase
      .from("agent_session_keys")
      .select("id, key_address, key_material_enc, status, allowed_actions, company_id")
      .eq("id", data.sessionKeyId)
      .maybeSingle();
    if (skErr) throw skErr;
    if (!sk) throw new Error("Session key not found");
    if (sk.company_id !== data.companyId) throw new Error("Session key company mismatch");
    if (sk.status !== "active") throw new Error("Session key inactive");

    if (live && !sk.key_material_enc && !allowDev) {
      throw new Error(
        "This session key cannot sign (no encrypted material). Revoke it and issue a new key.",
      );
    }

    const { data: spend, error } = await context.supabase.rpc("agent_spend", {
      _session_key_id: data.sessionKeyId,
      _slug: data.slug,
      _amount: ep.price_usdc,
      _action: "api_buy",
    });
    if (error) throw new Error(error.message.replace(/_/g, " "));
    const row = (Array.isArray(spend) ? spend[0] : spend) as { id: string; payer: string } | null;
    if (!row) throw new Error("Spend was not recorded");

    let privateKey: Hex | null = null;
    if (sk.key_material_enc) {
      try {
        const { decryptOwnerKey } = await import("./wallet.server");
        privateKey = decryptOwnerKey(sk.key_material_enc);
      } catch {
        privateKey = null;
      }
    }

    const network = resolveNetwork(process.env["X402_NETWORK"]) || activeNetwork();
    // Buyer must use an x402-capable settle network (Base family).
    const settleNet =
      network === "base" || network === "base-sepolia" ? network : ("base" as const);
    const useLive = live && Boolean(privateKey);

    if (live && !useLive && !allowDev) {
      throw new Error("Could not decrypt session key for live USDC authorization.");
    }

    const { header, simulated } = await buildPaymentHeader({
      payer: row.payer,
      priceUsdc: ep.price_usdc,
      network: settleNet,
      privateKey,
      live: useLive,
      payTo,
    });

    const origin = process.env["SITE_URL"] || process.env["OAUTH_REDIRECT_BASE"] || SITE_URL;
    const res = await fetch(`${origin}${ep.path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-payment": header,
        "x-aura-company": data.companyId,
      },
      body: JSON.stringify(typeof data.input === "string" ? JSON.parse(data.input) : data.input),
    });
    const result = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(
        typeof result["error"] === "string" ? result["error"] : `Call failed (${res.status})`,
      );
    }

    await context.supabase
      .from("x402_calls")
      .update({ status: simulated ? "dev" : "settled", network })
      .eq("id", row.id);

    return {
      slug: ep.slug,
      amount_usdc: ep.price_usdc,
      resultJson: JSON.stringify(result),
      spent_id: row.id,
      mode: useLive ? ("live" as const) : simulated ? ("simulated" as const) : ("dev" as const),
      simulated,
    };
  });

/** Browser-compatible wrapper matching the old agentBuy(opts) shape. */
export async function agentBuyClient(opts: {
  sessionKeyId: string;
  companyId: string;
  slug: string;
  input: unknown;
}): Promise<AgentPurchase & { result: unknown }> {
  const purchase = (await agentBuy({ data: opts })) as AgentPurchase;
  return {
    ...purchase,
    result: JSON.parse(purchase.resultJson) as unknown,
  };
}
