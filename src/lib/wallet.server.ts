/**
 * Server-only smart wallet: Alchemy Light Account v2 + encrypted per-user owner keys.
 *
 * Security model:
 * - Each founder gets a unique randomly generated owner private key.
 * - The key is encrypted at rest (AES-GCM via APP_USER_CONNECTION_KEY_SECRET).
 * - Reconstructing funds requires BOTH the ciphertext in Postgres AND the server secret.
 * - Legacy `WALLET_DERIVATION_SECRET` deterministic keys are supported only for migration
 *   of existing counterfactual addresses (marked legacy, no new verified claims).
 */
import { LocalAccountSigner } from "@aa-sdk/core";
import { alchemy, base, baseSepolia } from "@account-kit/infra";
import {
  createLightAccountAlchemyClient,
  getDefaultLightAccountFactoryAddress,
  predictLightAccountAddress,
} from "@account-kit/smart-contracts";
import { type Address, type Hex, concatHex, keccak256, toHex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import {
  activeNetwork,
  alchemyRpcUrl,
  gasPolicyId,
  gasSponsorshipEnabled,
  type AuraNetwork,
} from "@/lib/chain-config";
import { decryptConnectionKey, encryptConnectionKey } from "@/server/connectionKeyCrypto";

export const LIGHT_ACCOUNT_VERSION = "v2.0.0" as const;

/** Alchemy LightAccount v2.0.0 factory — same address on every supported chain. */
export const LIGHT_ACCOUNT_FACTORY = "0x0000000000400CdFef5E2714E63d8040b700BC24" as Address;

export function viemChain(network: AuraNetwork = activeNetwork()) {
  return network === "base" ? base : baseSepolia;
}

export function mintOwnerPrivateKey(): Hex {
  return generatePrivateKey();
}

export function encryptOwnerKey(privateKey: Hex): string {
  return encryptConnectionKey(privateKey);
}

export function decryptOwnerKey(ciphertext: string): Hex {
  const raw = decryptConnectionKey(ciphertext);
  if (!/^0x[0-9a-fA-F]{64}$/.test(raw)) throw new Error("Corrupt owner key material.");
  return raw as Hex;
}

export function ownerFromPrivateKey(privateKey: Hex) {
  return privateKeyToAccount(privateKey);
}

export function localSigner(privateKey: Hex) {
  return LocalAccountSigner.privateKeyToAccountSigner(privateKey);
}

/** Counterfactual Light Account address for an owner (salt 0). */
export function predictAddress(ownerAddress: Address, network: AuraNetwork = activeNetwork()): Address {
  const factory =
    getDefaultLightAccountFactoryAddress(viemChain(network), LIGHT_ACCOUNT_VERSION) ??
    LIGHT_ACCOUNT_FACTORY;
  return predictLightAccountAddress({
    factoryAddress: factory,
    salt: 0n,
    ownerAddress,
    version: LIGHT_ACCOUNT_VERSION,
  });
}

/** Legacy deterministic owner — only for reading old rows during migration. */
export function deriveLegacyOwner(secret: string, userId: string, slot = 0) {
  const seed = keccak256(toHex(`aura:v1:${secret}:${userId}:${slot}`));
  return privateKeyToAccount(seed as Hex);
}

export function legacyFallbackAddress(secret: string, userId: string): Address {
  const digest = keccak256(concatHex([toHex(secret), toHex(userId)]));
  return `0x${digest.slice(-40)}` as Address;
}

/** True once the account has bytecode on chain. */
export async function isDeployed(address: string, network: AuraNetwork = activeNetwork()) {
  const url = alchemyRpcUrl({ network });
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "eth_getCode",
        params: [address, "latest"],
      }),
    });
    const json = (await res.json()) as { result?: string };
    return Boolean(json.result && json.result !== "0x");
  } catch {
    return false;
  }
}

export type LightClient = Awaited<ReturnType<typeof createLightAccountAlchemyClient>>;

/** Builds a sponsored (when policy set) Light Account client for an owner key. */
export async function createSponsoredLightClient(privateKey: Hex) {
  const apiKey = process.env["ALCHEMY_API_KEY"];
  if (!apiKey) throw new Error("ALCHEMY_API_KEY is not configured.");
  const network = activeNetwork();
  const chain = viemChain(network);
  const policyId = gasPolicyId();

  return createLightAccountAlchemyClient({
    transport: alchemy({ apiKey }),
    chain,
    signer: localSigner(privateKey),
    ...(policyId ? { policyId } : {}),
  });
}

/**
 * Deploys (or no-ops if already deployed) via a zero-value self-call UserOp.
 * Requires Alchemy + optional Gas Manager policy for true gasless UX.
 */
export async function deploySmartAccount(privateKey: Hex): Promise<{
  address: Address;
  deployed: boolean;
  userOpHash: string | null;
  sponsored: boolean;
}> {
  const client = await createSponsoredLightClient(privateKey);
  const address = client.account.address as Address;
  const network = activeNetwork();
  if (await isDeployed(address, network)) {
    return { address, deployed: true, userOpHash: null, sponsored: gasSponsorshipEnabled() };
  }

  const sponsored = gasSponsorshipEnabled();
  try {
    const result = await client.sendUserOperation({
      uo: {
        target: address,
        data: "0x",
        value: 0n,
      },
    });
    const userOpHash =
      typeof result === "string"
        ? result
        : ((result as { hash?: string }).hash ?? null);
    return { address, deployed: true, userOpHash, sponsored };
  } catch (e) {
    // Without a paymaster and without ETH, deploy will fail — keep counterfactual.
    console.warn("smart account deploy deferred", e instanceof Error ? e.message : e);
    return { address, deployed: false, userOpHash: null, sponsored };
  }
}

/**
 * Execute an arbitrary contract call (e.g. OKX DEX router swap) via Light Account UserOp.
 */
export async function executeContractUserOp(
  privateKey: Hex,
  call: { target: Address; data: Hex; value?: bigint },
): Promise<{ userOpHash: string; address: Address }> {
  const client = await createSponsoredLightClient(privateKey);
  const address = client.account.address as Address;
  const result = await client.sendUserOperation({
    uo: {
      target: call.target,
      data: call.data,
      value: call.value ?? 0n,
    },
  });
  const userOpHash =
    typeof result === "string"
      ? result
      : String((result as { hash?: string }).hash ?? result);
  return { userOpHash, address };
}

/**
 * Batch approve + swap when OKX returns both transactions.
 */
export async function executeBatchUserOps(
  privateKey: Hex,
  calls: { target: Address; data: Hex; value?: bigint }[],
): Promise<{ userOpHash: string; address: Address }> {
  const client = await createSponsoredLightClient(privateKey);
  const address = client.account.address as Address;
  if (calls.length === 0) throw new Error("No calls to execute");
  if (calls.length === 1) {
    return executeContractUserOp(privateKey, calls[0]!);
  }
  // Account Kit Light Account supports batch via array uo when available
  try {
    const result = await client.sendUserOperation({
      uo: calls.map((c) => ({
        target: c.target,
        data: c.data,
        value: c.value ?? 0n,
      })),
    });
    const userOpHash =
      typeof result === "string"
        ? result
        : String((result as { hash?: string }).hash ?? result);
    return { userOpHash, address };
  } catch {
    // Fallback: sequential (approve then swap)
    let last = { userOpHash: "", address };
    for (const c of calls) {
      last = await executeContractUserOp(privateKey, c);
    }
    return last;
  }
}

/** Sign an EIP-191 personal message with the Light Account (or owner fallback). */
export async function signPersonalMessage(privateKey: Hex, message: string): Promise<Hex> {
  try {
    const client = await createSponsoredLightClient(privateKey);
    return (await client.signMessage({ message })) as Hex;
  } catch {
    const account = ownerFromPrivateKey(privateKey);
    return account.signMessage({ message });
  }
}

export { activeNetwork, gasSponsorshipEnabled };
