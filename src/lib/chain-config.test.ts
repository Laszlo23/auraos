import { describe, expect, it } from "vitest";

import {
  alchemySubdomain,
  chainId,
  chainLabel,
  resolveNetwork,
  supportsX402Settle,
  USDC_ADDRESSES,
  USDC_DECIMALS,
  x402SettleNetwork,
} from "./chain-config";
import { resolvePairTokens, tradableSymbolsFor } from "./trading/tokens";
import { FOUNDER_AURA_PER_USDC, ledgerToOnchainAura, ROADMAP } from "./subscription";

describe("chain-config", () => {
  it("normalizes network aliases including BNB/BSC and Robinhood", () => {
    expect(resolveNetwork("base")).toBe("base");
    expect(resolveNetwork("base-mainnet")).toBe("base");
    expect(resolveNetwork("base-sepolia")).toBe("base-sepolia");
    expect(resolveNetwork("bsc")).toBe("bsc");
    expect(resolveNetwork("bnb")).toBe("bsc");
    expect(resolveNetwork("bnb-mainnet")).toBe("bsc");
    expect(resolveNetwork("opbnb")).toBe("opbnb");
    expect(resolveNetwork("robinhood")).toBe("robinhood");
    expect(resolveNetwork("robinhood-mainnet")).toBe("robinhood");
    expect(resolveNetwork("unknown")).toBe("base-sepolia");
  });

  it("maps chain ids and alchemy hosts", () => {
    expect(chainId("base")).toBe(8453);
    expect(chainId("base-sepolia")).toBe(84532);
    expect(chainId("bsc")).toBe(56);
    expect(chainId("opbnb")).toBe(204);
    expect(chainId("robinhood")).toBe(4663);
    expect(alchemySubdomain("base")).toBe("base-mainnet");
    expect(alchemySubdomain("base-sepolia")).toBe("base-sepolia");
    expect(alchemySubdomain("bsc")).toBe("bnb-mainnet");
    expect(alchemySubdomain("opbnb")).toBe("opbnb-mainnet");
    expect(alchemySubdomain("robinhood")).toBe("robinhood-mainnet");
    expect(chainLabel("bsc")).toBe("BNB Smart Chain");
    expect(chainLabel("robinhood")).toBe("Robinhood Chain");
  });

  it("has USDC/USDG addresses and decimals per network", () => {
    expect(USDC_ADDRESSES.base.startsWith("0x")).toBe(true);
    expect(USDC_ADDRESSES.bsc.startsWith("0x")).toBe(true);
    expect(USDC_ADDRESSES.robinhood.toLowerCase()).toBe(
      "0x5fc5360d0400a0fd4f2af552add042d716f1d168",
    );
    expect(USDC_DECIMALS.base).toBe(6);
    expect(USDC_DECIMALS.bsc).toBe(18);
    expect(USDC_DECIMALS.robinhood).toBe(6);
  });

  it("keeps x402 settlement on Base family", () => {
    expect(supportsX402Settle("base")).toBe(true);
    expect(supportsX402Settle("bsc")).toBe(false);
    expect(supportsX402Settle("opbnb")).toBe(false);
    expect(supportsX402Settle("robinhood")).toBe(false);
  });
});

describe("trading tokens", () => {
  it("resolves WBNB/USDC on BSC with 18-decimal USDC", () => {
    const pair = resolvePairTokens("WBNB/USDC", "bsc");
    expect(pair.base.toLowerCase()).toBe("0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c");
    expect(pair.quoteDecimals).toBe(18);
    expect(tradableSymbolsFor("bsc")[0]).toBe("WBNB/USDC");
  });

  it("resolves WETH/USDG on Robinhood", () => {
    const pair = resolvePairTokens("WETH/USDG", "robinhood");
    expect(pair.base.toLowerCase()).toBe("0x0bd7d308f8e1639fab988df18a8011f41eacad73");
    expect(pair.quoteDecimals).toBe(6);
    expect(tradableSymbolsFor("robinhood")[0]).toBe("WETH/USDG");
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
