/**
 * Base Builder Codes (ERC-8021) — attribute Aura UserOps / txs on Base.
 * Code from base.dev → Settings → Builder Code.
 */
import { Attribution } from "ox/erc8021";
import type { Hex } from "viem";

import type { AuraNetwork } from "@/lib/chain-config";

/** Registered Aura OS builder code on base.dev */
export const DEFAULT_BASE_BUILDER_CODE = "bc_b5w4t6pt";

/** Base Developer Portal app id — published as <meta name="base:app_id" /> for Base App discovery. */
export const DEFAULT_BASE_APP_ID = "6a7c1d39dd7780b052ef42e6";

export function baseBuilderCode(): string {
  return process.env["BASE_BUILDER_CODE"]?.trim() || DEFAULT_BASE_BUILDER_CODE;
}

export function baseAppId(): string {
  return (
    process.env["BASE_APP_ID"]?.trim() ||
    process.env["VITE_BASE_APP_ID"]?.trim() ||
    DEFAULT_BASE_APP_ID
  );
}

export function baseBuilderConfigured(): boolean {
  return Boolean(baseBuilderCode());
}

/** True when we should append ERC-8021 attribution (Base mainnet + Sepolia). */
export function shouldAttributeBaseBuilder(network: AuraNetwork): boolean {
  return network === "base" || network === "base-sepolia";
}

let cachedSuffix: Hex | null | undefined;

/** ERC-8021 dataSuffix hex for UserOp.callData / tx.data. */
export function baseBuilderDataSuffix(network: AuraNetwork): Hex | null {
  if (!shouldAttributeBaseBuilder(network)) return null;
  const code = baseBuilderCode();
  if (!code) return null;
  if (cachedSuffix === undefined) {
    try {
      cachedSuffix = Attribution.toDataSuffix({ codes: [code] }) as Hex;
    } catch (err) {
      console.warn(
        "[base-builder] failed to build dataSuffix",
        err instanceof Error ? err.message : err,
      );
      cachedSuffix = null;
    }
  }
  return cachedSuffix ?? null;
}
