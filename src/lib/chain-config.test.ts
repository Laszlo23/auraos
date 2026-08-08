import { describe, expect, it } from "vitest";

import {
  alchemySubdomain,
  chainId,
  resolveNetwork,
  USDC_ADDRESSES,
} from "./chain-config";
import { FOUNDER_AURA_PER_USDC, ledgerToOnchainAura, ROADMAP } from "./subscription";

describe("chain-config", () => {
  it("normalizes network aliases", () => {
    expect(resolveNetwork("base")).toBe("base");
    expect(resolveNetwork("base-mainnet")).toBe("base");
    expect(resolveNetwork("base-sepolia")).toBe("base-sepolia");
    expect(resolveNetwork("unknown")).toBe("base-sepolia");
  });

  it("maps chain ids and alchemy hosts", () => {
    expect(chainId("base")).toBe(8453);
    expect(chainId("base-sepolia")).toBe(84532);
    expect(alchemySubdomain("base")).toBe("base-mainnet");
    expect(alchemySubdomain("base-sepolia")).toBe("base-sepolia");
  });

  it("has USDC addresses for both networks", () => {
    expect(USDC_ADDRESSES.base.startsWith("0x")).toBe(true);
    expect(USDC_ADDRESSES["base-sepolia"].startsWith("0x")).toBe(true);
  });
});

describe("tokenization roadmap", () => {
  it("keeps ledger-first phases and 1:1 migration helper", () => {
    expect(ROADMAP[0]?.state).toBe("live");
    expect(ROADMAP[1]?.state).toBe("live");
    expect(FOUNDER_AURA_PER_USDC).toBe(1000);
    expect(ledgerToOnchainAura(12_500)).toBe(12_500);
    expect(ledgerToOnchainAura(-1)).toBe(0);
  });
});
