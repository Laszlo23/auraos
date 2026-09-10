import { describe, expect, it } from "vitest";

import { covenantVerifyItems, COVENANT_OFFICIAL_DOMAINS } from "@/lib/community-covenant";
import { CCFF00 } from "@/lib/ccff00";
import { TICKPIX } from "@/lib/tickpix";

describe("covenant verify items", () => {
  it("exposes copyable Tickpix + CCFF00 NFT CAs, not the meme ERC-20", () => {
    const items = covenantVerifyItems();
    const ids = items.map((i) => i.id);
    expect(ids).toContain("tickpix");
    expect(ids).toContain("ccff00");
    expect(items.find((i) => i.id === "tickpix")?.ca.toLowerCase()).toBe(
      TICKPIX.defaultContract.toLowerCase(),
    );
    expect(items.find((i) => i.id === "ccff00")?.ca.toLowerCase()).toBe(
      CCFF00.defaultNftContract.toLowerCase(),
    );
    expect(items.some((i) => i.ca.toLowerCase() === CCFF00.defaultTokenContract.toLowerCase())).toBe(
      false,
    );
    expect(COVENANT_OFFICIAL_DOMAINS).toContain("aibusiness.fun");
    expect(COVENANT_OFFICIAL_DOMAINS).toContain("hookr.fun");
  });
});
