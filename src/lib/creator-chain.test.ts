import { describe, expect, it } from "vitest";

import { creatorChainId, creatorNetwork, defaultDeskNetworkForFunnel } from "@/lib/chain-config";

describe("creator chain config", () => {
  it("defaults creator network to robinhood mainnet", () => {
    const prev = process.env["CREATOR_NETWORK"];
    delete process.env["CREATOR_NETWORK"];
    expect(creatorNetwork()).toBe("robinhood");
    expect(creatorChainId()).toBe(4663);
    if (prev) process.env["CREATOR_NETWORK"] = prev;
  });

  it("sets builders funnel desk to robinhood", () => {
    expect(defaultDeskNetworkForFunnel("builders")).toBe("robinhood");
    expect(defaultDeskNetworkForFunnel("os")).toBe("base");
  });
});
