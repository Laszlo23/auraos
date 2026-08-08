// Server-only wallet ownership verification.
import { verifyMessage } from "viem";

export function challengeMessage(handle: string, address: string, nonce: string) {
  return [
    "Aura OS — wallet binding",
    "",
    `Handle: @${handle}`,
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    "",
    "Signing proves you control this wallet. It costs no gas.",
  ].join("\n");
}

export async function verifyWalletSignature(input: {
  address: string;
  message: string;
  signature: string;
}) {
  try {
    return await verifyMessage({
      address: input.address as `0x${string}`,
      message: input.message,
      signature: input.signature as `0x${string}`,
    });
  } catch {
    return false;
  }
}
