import { createPublicClient, createWalletClient, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

import {
  AURA_SQUARE,
  AURA_SQUARE_ABI,
  AURA_SQUARE_USDC,
  ERC6551_REGISTRY_ABI,
  auraSquareAddress,
} from "@/lib/aura-square";
import { alchemyRpcUrl } from "@/lib/chain-config";

const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

function rpcUrl(): string {
  return alchemyRpcUrl({ network: "base" }) || "https://mainnet.base.org";
}

function minterKey(): Hex {
  const key = process.env["AURA_SQUARE_MINTER_KEY"]?.trim() || process.env["GENESIS_MINTER_KEY"]?.trim();
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error("AURA_SQUARE_MINTER_KEY is not configured (server-only hex key).");
  }
  return key as Hex;
}

export async function mintSquareToWallet(to: Address): Promise<{ txHash: Hex }> {
  const contract = auraSquareAddress();
  if (!contract) throw new Error("AURA_SQUARE_CA is not set.");
  const account = privateKeyToAccount(minterKey());
  const wallet = createWalletClient({ account, chain: base, transport: http(rpcUrl()) });
  const hash = await wallet.writeContract({
    address: contract,
    abi: AURA_SQUARE_ABI,
    functionName: "mintTo",
    args: [to],
  });
  return { txHash: hash };
}

export async function fundSquareTba(tba: Address, usdcWhole: number): Promise<{ txHash: Hex }> {
  if (usdcWhole < AURA_SQUARE.tbaFundMinUsd || usdcWhole > AURA_SQUARE.tbaFundMaxUsd) {
    throw new Error("Fund amount is outside the published Square TBA range.");
  }
  const account = privateKeyToAccount(minterKey());
  const wallet = createWalletClient({ account, chain: base, transport: http(rpcUrl()) });
  const value = BigInt(Math.round(usdcWhole * 1_000_000));
  const hash = await wallet.writeContract({
    address: AURA_SQUARE_USDC,
    abi: ERC20_TRANSFER_ABI,
    functionName: "transfer",
    args: [tba, value],
  });
  return { txHash: hash };
}

export async function readSquareTba(tokenId: number): Promise<Address | null> {
  const contract = auraSquareAddress();
  if (!contract) return null;
  const client = createPublicClient({ chain: base, transport: http(rpcUrl()) });
  try {
    const tba = await client.readContract({
      address: AURA_SQUARE.registry,
      abi: ERC6551_REGISTRY_ABI,
      functionName: "account",
      args: [
        AURA_SQUARE.tbaImplementation,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        BigInt(AURA_SQUARE.chainId),
        contract,
        BigInt(tokenId),
      ],
    });
    return tba as Address;
  } catch {
    return null;
  }
}
