/**
 * EIP-3009 TransferWithAuthorization helpers for USDC (x402 exact scheme).
 * Used when agents pay machine APIs from session keys / smart accounts.
 */
import {
  type Address,
  type Hex,
  encodeFunctionData,
  keccak256,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { USDC_ADDRESSES, USDC_META, type AuraNetwork, chainId } from "@/lib/chain-config";

export type TransferAuth = {
  from: Address;
  to: Address;
  value: bigint;
  validAfter: bigint;
  validBefore: bigint;
  nonce: Hex;
  v: number;
  r: Hex;
  s: Hex;
};

/**
 * Signs a USDC transferWithAuthorization for x402 facilitators.
 * Returns the authorization fields expected by the exact scheme.
 */
export async function signUsdcTransferAuthorization(opts: {
  privateKey: Hex;
  network: AuraNetwork;
  to: Address;
  valueAtomic: bigint;
  validSeconds?: number;
}): Promise<TransferAuth> {
  const account = privateKeyToAccount(opts.privateKey);
  const from = account.address;
  const validAfter = 0n;
  const validBefore = BigInt(Math.floor(Date.now() / 1000) + (opts.validSeconds ?? 60));
  const nonce = keccak256(toHex(`${from}:${opts.to}:${opts.valueAtomic}:${Date.now()}`));

  // Prefer account.signTypedData which matches EIP-712 USDC domains.
  const signature = await account.signTypedData({
    domain: {
      name: USDC_META[opts.network].name,
      version: USDC_META[opts.network].version,
      chainId: chainId(opts.network),
      verifyingContract: USDC_ADDRESSES[opts.network],
    },
    types: {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "TransferWithAuthorization",
    message: {
      from,
      to: opts.to,
      value: opts.valueAtomic,
      validAfter,
      validBefore,
      nonce,
    },
  });

  const r = `0x${signature.slice(2, 66)}` as Hex;
  const s = `0x${signature.slice(66, 130)}` as Hex;
  const v = Number.parseInt(signature.slice(130, 132), 16);

  return {
    from,
    to: opts.to,
    value: opts.valueAtomic,
    validAfter,
    validBefore,
    nonce,
    v,
    r,
    s,
  };
}

/** Encode transferWithAuthorization calldata (for direct UserOps, not x402 headers). */
export function encodeTransferWithAuthorization(auth: TransferAuth): Hex {
  return encodeFunctionData({
    abi: [
      {
        name: "transferWithAuthorization",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
          { name: "v", type: "uint8" },
          { name: "r", type: "bytes32" },
          { name: "s", type: "bytes32" },
        ],
        outputs: [],
      },
    ] as const,
    functionName: "transferWithAuthorization",
    args: [
      auth.from,
      auth.to,
      auth.value,
      auth.validAfter,
      auth.validBefore,
      auth.nonce,
      auth.v,
      auth.r,
      auth.s,
    ],
  });
}
