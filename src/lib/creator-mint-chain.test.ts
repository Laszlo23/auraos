import { describe, expect, it } from "vitest";

import { clientCreatorRpcUrl, isKeyedRpcUrl } from "@/lib/creator-mint-chain";

describe("isKeyedRpcUrl", () => {
  it("rejects Alchemy-style key paths", () => {
    expect(isKeyedRpcUrl("https://robinhood-mainnet.g.alchemy.com/v2/abc123secretkeyxxxx")).toBe(
      true,
    );
  });

  it("allows public Robinhood RPCs", () => {
    expect(isKeyedRpcUrl("https://rpc.mainnet.chain.robinhood.com")).toBe(false);
    expect(isKeyedRpcUrl("https://rpc.testnet.chain.robinhood.com")).toBe(false);
  });
});

describe("clientCreatorRpcUrl", () => {
  it("falls back to Robinhood's public mainnet RPC", () => {
    expect(clientCreatorRpcUrl()).toBe("https://rpc.mainnet.chain.robinhood.com");
  });
});
