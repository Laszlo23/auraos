import { describe, expect, it } from "vitest";

import {
  AURA_BUY_BASE_APP_URL,
  AURA_BUY_BINANCE_URL,
  AURA_BUY_COPY,
  AURA_BUY_MAX_USD,
  AURA_BUY_MIN_USD,
  AURA_BUY_PACKS,
  AURA_BUY_PATH,
  AURA_BUY_PRESETS_USD,
  INVESTOR_DESK_REQUIRES_FOUNDING_SEAT,
  auraBuyOfficialCa,
  auraBuyPackById,
  auraBuyPackFromAmountCents,
  auraBuyPackIdFromUsd,
  auraBuyPacksEnabled,
  investorHandleForUser,
  isAuraBuyPackId,
  parseAuraBuyUsd,
} from "@/lib/aura-buy-guide";
import { AURA_TOKEN_CA } from "@/lib/aura-token";

describe("AURA buy guide SSOT", () => {
  it("allows any whole USD in range, with $29 / $111 / $299 as presets", () => {
    expect(AURA_BUY_MIN_USD).toBe(11);
    expect(AURA_BUY_MAX_USD).toBe(10_000);
    expect([...AURA_BUY_PRESETS_USD]).toEqual([29, 111, 299]);
    expect(AURA_BUY_PACKS.map((p) => p.usd)).toEqual([29, 111, 299]);
    expect(isAuraBuyPackId("111")).toBe(true);
    expect(isAuraBuyPackId("30")).toBe(true);
    expect(isAuraBuyPackId("10")).toBe(false);
    expect(isAuraBuyPackId("10001")).toBe(false);
    expect(parseAuraBuyUsd("47")).toBe(47);
    expect(parseAuraBuyUsd("$1,250")).toBe(1250);
    expect(parseAuraBuyUsd(5)).toBeNull();
    expect(auraBuyPackIdFromUsd(47)).toBe("47");
    expect(auraBuyPackById("299")?.usd).toBe(299);
    expect(auraBuyPackFromAmountCents(11100)).toBe("111");
    expect(auraBuyPackFromAmountCents(4700)).toBe("47");
    expect(auraBuyPackFromAmountCents(50)).toBeUndefined();
  });

  it("keeps the exact Base App and Binance invite URLs", () => {
    expect(AURA_BUY_BASE_APP_URL).toBe("https://base.app/invite/friends/KCFJ42BF");
    expect(AURA_BUY_BINANCE_URL).toBe("https://www.binance.com/register?ref=BXKGGJD6");
    expect(AURA_BUY_PATH).toBe("/get");
  });

  it("never invents a hardcoded CA before T-0", () => {
    // Constant stays null forever; live CA is env-only via auraTokenAddress().
    expect(AURA_TOKEN_CA).toBeNull();
    expect(AURA_BUY_COPY.lead).not.toMatch(/0x[a-fA-F0-9]{40}/);
    expect(AURA_BUY_COPY.leadDe).not.toMatch(/0x[a-fA-F0-9]{40}/);
  });

  it("surfaces the official CA from auraTokenAddress when published", () => {
    // Must not return the always-null AURA_TOKEN_CA constant after T-0 env is set.
    const ca = auraBuyOfficialCa();
    if (ca) {
      expect(ca).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(ca).not.toBe(AURA_TOKEN_CA);
    } else {
      expect(ca).toBeNull();
    }
  });

  it("says card checkout is fulfillment, not an on-chain swap", () => {
    expect(AURA_BUY_COPY.path1Body).toMatch(/fulfillment/i);
    expect(AURA_BUY_COPY.path1Body).toMatch(/not an on-chain swap/i);
    expect(AURA_BUY_COPY.path1Body).toMatch(/live official Uniswap v4/i);
    expect(AURA_BUY_COPY.path1Body).toMatch(/not a Stripe-implied token price/i);
    expect(AURA_BUY_COPY.path1Body).toMatch(/any USD amount/i);
    expect(AURA_BUY_COPY.path1Honest).toMatch(/after T-0/i);
    expect(AURA_BUY_COPY.packHint).toMatch(/any amount in range/i);
    expect(AURA_BUY_COPY.packHint).toMatch(/live tick/i);
    expect(AURA_BUY_COPY.packRefund).toMatch(/founders@aibusiness\.fun/);
    expect(AURA_BUY_COPY.packRefund).toMatch(/\/trust/);
    expect(AURA_BUY_COPY.disclaimer).toMatch(/not equity/i);
    expect(AURA_BUY_COPY.disclaimer).toMatch(/never by DM/i);
    expect(auraBuyPacksEnabled()).toBe(true);
  });

  it("does not require a founding seat for the investor desk", () => {
    expect(INVESTOR_DESK_REQUIRES_FOUNDING_SEAT).toBe(false);
    expect(investorHandleForUser("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe("inva1b2c3d4e5f6");
    expect(investorHandleForUser("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).not.toMatch(/seat/i);
  });
});
