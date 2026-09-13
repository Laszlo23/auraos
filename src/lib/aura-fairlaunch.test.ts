import { describe, expect, it } from "vitest";

import {
  AURA_GET_COPY,
  AURA_GET_PATH,
  officialAuraBasescanUrl,
  officialAuraUniswapUrl,
} from "@/lib/aura-fairlaunch";
import { BASE_USDC } from "@/lib/private-sale";

describe("AURA fair-launch storefront", () => {
  it("lives on /get and never invents a CA in copy", () => {
    expect(AURA_GET_PATH).toBe("/get");
    expect(AURA_GET_COPY.lead).not.toMatch(/0x[a-fA-F0-9]{40}/);
    expect(AURA_GET_COPY.leadDe).not.toMatch(/0x[a-fA-F0-9]{40}/);
    expect(AURA_GET_COPY.disclaimer).toMatch(/never by DM/i);
  });

  it("builds Uniswap and Basescan URLs only with a real CA", () => {
    expect(officialAuraUniswapUrl(null)).toBeNull();
    expect(officialAuraBasescanUrl(null)).toBeNull();
    const ca = "0x1111111111111111111111111111111111111111" as const;
    const uni = officialAuraUniswapUrl(ca);
    expect(uni).toContain("app.uniswap.org/swap");
    expect(uni).toContain("chain=base");
    expect(uni).toContain(encodeURIComponent(BASE_USDC));
    expect(uni).toContain(ca);
    expect(officialAuraBasescanUrl(ca)).toBe(`https://basescan.org/token/${ca}`);
  });
});
