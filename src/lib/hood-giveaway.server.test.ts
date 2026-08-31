import { describe, expect, it } from "vitest";

import {
  HOOD_GIVEAWAY_BATCH_MAX,
  clampGiveawayBatch,
  hoodRedeemMessage,
  looksLikeHoodCode,
  normalizeHoodCode,
  randomHoodCode,
} from "./hood-giveaway.server";

describe("Hood giveaway codes", () => {
  it("formats HOOD-XXXXXXXX from 8 random bytes", () => {
    const code = randomHoodCode(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]));
    expect(looksLikeHoodCode(code)).toBe(true);
    expect(normalizeHoodCode(code.toLowerCase())).toBe(code);
  });

  it("rejects junk codes", () => {
    expect(looksLikeHoodCode("")).toBe(false);
    expect(looksLikeHoodCode("HOOD-SHORT")).toBe(false);
    expect(looksLikeHoodCode("GIFT-ABCDEFGH")).toBe(false);
    expect(normalizeHoodCode("not-a-code")).toBeNull();
  });

  it("clamps a batch to 1–6", () => {
    expect(clampGiveawayBatch(6)).toBe(6);
    expect(clampGiveawayBatch(99)).toBe(HOOD_GIVEAWAY_BATCH_MAX);
    expect(clampGiveawayBatch(0)).toBe(1);
    expect(clampGiveawayBatch("nope")).toBe(6);
  });

  it("builds a redeem message that includes code, address, and nonce", () => {
    const msg = hoodRedeemMessage("HOOD-ABCD2345", "0xabc", "nonce-1");
    expect(msg).toContain("Code: HOOD-ABCD2345");
    expect(msg).toContain("Address: 0xabc");
    expect(msg).toContain("Nonce: nonce-1");
    expect(msg).toContain("costs no gas");
  });
});
