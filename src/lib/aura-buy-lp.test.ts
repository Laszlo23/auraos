import { describe, expect, it } from "vitest";

import {
  AURA_BUY_LP_COPY,
  AURA_BUY_LP_STATUSES,
  applySlippageBps,
  auraBuyFulfillDecision,
  centsToUsd,
  nextAuraBuyLpStatus,
  stripeCardFeeCentsEstimate,
  stripeNetCents,
  toAuraBuyPublicReceipt,
  usdcUnitsFromNetCents,
  usdcUnitsFromNetUsd,
} from "@/lib/aura-buy-lp";

describe("AURA buy LP rail", () => {
  it("takes 100% of net after a typical Stripe card fee", () => {
    expect(stripeCardFeeCentsEstimate(11100)).toBe(Math.round((11100 * 290) / 10_000) + 30);
    expect(stripeNetCents(11100, 352)).toBe(10748);
    expect(centsToUsd(10748)).toBe(107.48);
    expect(usdcUnitsFromNetCents(10748)).toBe(107_480_000n);
    expect(usdcUnitsFromNetUsd(29)).toBe(29_000_000n);
  });

  it("never fulfills before the official book is published", () => {
    expect(
      auraBuyFulfillDecision({
        caPublished: false,
        poolId: null,
        hook: null,
        fundsAvailable: true,
        floatCovers: true,
      }).reason,
    ).toBe("pre_t0");
    expect(
      auraBuyFulfillDecision({
        caPublished: true,
        poolId: "0x".padEnd(66, "a"),
        hook: null,
        fundsAvailable: true,
        floatCovers: true,
      }).reason,
    ).toBe("missing_hook");
    expect(
      auraBuyFulfillDecision({
        caPublished: true,
        poolId: "0x".padEnd(66, "a"),
        hook: "0x1111111111111111111111111111111111111111",
        fundsAvailable: false,
        floatCovers: false,
      }).reason,
    ).toBe("funds_held");
    expect(
      auraBuyFulfillDecision({
        caPublished: true,
        poolId: "0x".padEnd(66, "a"),
        hook: "0x1111111111111111111111111111111111111111",
        fundsAvailable: false,
        floatCovers: true,
      }),
    ).toEqual({ ok: true, reason: "live_book" });
  });

  it("walks reserved → usdc_onchain → swapped → sent", () => {
    expect(AURA_BUY_LP_STATUSES).toEqual(["reserved", "usdc_onchain", "swapped", "sent"]);
    expect(nextAuraBuyLpStatus("reserved", "float")).toBe("usdc_onchain");
    expect(nextAuraBuyLpStatus("usdc_onchain", "swapped")).toBe("swapped");
    expect(nextAuraBuyLpStatus("swapped", "sent")).toBe("sent");
    expect(nextAuraBuyLpStatus("reserved", "sent")).toBe("reserved");
  });

  it("applies a tight slippage bound", () => {
    expect(applySlippageBps(1_000_000n, 200)).toBe(980_000n);
    expect(applySlippageBps(100n, 10_000)).toBe(95n);
  });

  it("hides unpaid rows from public receipts", () => {
    expect(
      toAuraBuyPublicReceipt({
        id: "1",
        pack: "111",
        amount_usd: 111,
        net_usd: 107.48,
        wallet: "0xabc",
        created_at: "2026-09-13T00:00:00.000Z",
        lp_status: "reserved",
      }),
    ).toBeNull();
    expect(
      toAuraBuyPublicReceipt({
        id: "2",
        pack: "29",
        amount_usd: 29,
        net_usd: 28,
        wallet: "0xabc",
        swap_tx_hash: "0xsw",
        tx_hash: "0xsw",
        created_at: "2026-09-13T00:00:00.000Z",
        lp_status: "sent",
      }),
    ).toMatchObject({ netUsd: 28, swapTxHash: "0xsw" });
  });

  it("says the live official tick, not a Stripe-implied price", () => {
    expect(AURA_BUY_LP_COPY.rail).toMatch(/live official Uniswap v4/i);
    expect(AURA_BUY_LP_COPY.rail).toMatch(/Not a Stripe-implied token price/);
    expect(AURA_BUY_LP_COPY.rail).not.toMatch(/0x[a-fA-F0-9]{40}/);
  });
});
