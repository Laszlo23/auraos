import { describe, expect, it } from "vitest";

import { covenantVerifyItems, COVENANT_OFFICIAL_DOMAINS, COVENANT_PROMISES } from "@/lib/community-covenant";
import { CCFF00 } from "@/lib/ccff00";
import { TICKPIX } from "@/lib/tickpix";

describe("covenant verify items", () => {
  it("exposes copyable Tickpix + CCFF00 NFT CAs, not the meme ERC-20", () => {
    const items = covenantVerifyItems();
    const ids = items.map((i) => i.id);
    expect(ids).toContain("tickpix");
    expect(ids).toContain("ccff00");
    expect(ids).toContain("square");
    expect(items.find((i) => i.id === "square")?.ca).toBeNull();
    expect(items.find((i) => i.id === "square")?.note).toMatch(/not Hood/i);
    expect(items.find((i) => i.id === "tickpix")?.ca?.toLowerCase()).toBe(
      TICKPIX.defaultContract.toLowerCase(),
    );
    expect(items.find((i) => i.id === "ccff00")?.ca?.toLowerCase()).toBe(
      CCFF00.defaultNftContract.toLowerCase(),
    );
    expect(
      items.some((i) => i.ca?.toLowerCase() === CCFF00.defaultTokenContract.toLowerCase()),
    ).toBe(false);
    expect(COVENANT_OFFICIAL_DOMAINS).toContain("aibusiness.fun");
    expect(COVENANT_OFFICIAL_DOMAINS).toContain("hookr.fun");
  });

  it("promises grow-not-extract: 25% protocol fees → locked LP", () => {
    const grow = COVENANT_PROMISES.find((p) => p.id === "grow-lp");
    expect(grow).toBeTruthy();
    expect(grow?.body).toMatch(/25%/);
    expect(grow?.body).toMatch(/locked/i);
    expect(grow?.body).toMatch(/AURA_LP_AND_MINT/);
  });
});
