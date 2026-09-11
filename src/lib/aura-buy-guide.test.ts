import { describe, expect, it } from "vitest";

import {
  AURA_BUY_BASE_APP_URL,
  AURA_BUY_BINANCE_URL,
  AURA_BUY_COPY,
  AURA_BUY_PACKS,
  AURA_BUY_PATH,
  INVESTOR_DESK_REQUIRES_FOUNDING_SEAT,
  auraBuyOfficialCa,
  auraBuyPackById,
  investorHandleForUser,
  isAuraBuyPackId,
} from "@/lib/aura-buy-guide";
import { AURA_TOKEN_CA } from "@/lib/aura-token";

describe("AURA buy guide SSOT", () => {
  it("keeps pack amounts at $29 / $111 / $299", () => {
    expect(AURA_BUY_PACKS.map((p) => p.usd)).toEqual([29, 111, 299]);
    expect(AURA_BUY_PACKS.map((p) => p.id)).toEqual(["29", "111", "299"]);
    expect(isAuraBuyPackId("111")).toBe(true);
    expect(isAuraBuyPackId("30")).toBe(false);
    expect(auraBuyPackById("299")?.usd).toBe(299);
  });

  it("keeps the exact Base App and Binance invite URLs", () => {
    expect(AURA_BUY_BASE_APP_URL).toBe("https://base.app/invite/friends/KCFJ42BF");
    expect(AURA_BUY_BINANCE_URL).toBe("https://www.binance.com/register?ref=BXKGGJD6");
    expect(AURA_BUY_PATH).toBe("/buy");
  });

  it("never invents a CA before T-0", () => {
    expect(AURA_TOKEN_CA).toBeNull();
    expect(auraBuyOfficialCa()).toBeNull();
    expect(AURA_BUY_COPY.lead).not.toMatch(/0x[a-fA-F0-9]{40}/);
    expect(AURA_BUY_COPY.leadDe).not.toMatch(/0x[a-fA-F0-9]{40}/);
  });

  it("says card checkout is fulfillment, not an on-chain swap", () => {
    expect(AURA_BUY_COPY.path1Body).toMatch(/fulfillment/i);
    expect(AURA_BUY_COPY.path1Body).toMatch(/not an on-chain swap/i);
    expect(AURA_BUY_COPY.path1Honest).toMatch(/after T-0/i);
    expect(AURA_BUY_COPY.disclaimer).toMatch(/not equity/i);
    expect(AURA_BUY_COPY.disclaimer).toMatch(/never by DM/i);
  });

  it("does not require a founding seat for the investor desk", () => {
    expect(INVESTOR_DESK_REQUIRES_FOUNDING_SEAT).toBe(false);
    expect(investorHandleForUser("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe("inva1b2c3d4e5f6");
    expect(investorHandleForUser("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).not.toMatch(/seat/i);
  });
});
