import { describe, expect, it } from "vitest";

import { isKeyedRpcUrl } from "@/lib/creator-mint-chain";

describe("isKeyedRpcUrl", () => {
  it("rejects Alchemy-style key paths", () => {
    expect(isKeyedRpcUrl("https://robinhood-mainnet.g.alchemy.com/v2/abc123secretkeyxxxx")).toBe(
      true,
    );
  });

  it("allows public Robinhood RPCs", () => {
    expect(isKeyedRpcUrl("https://rpc.robinhoodchain.com")).toBe(false);
    expect(isKeyedRpcUrl("https://testnet-rpc.robinhoodchain.com")).toBe(false);
  });
});
