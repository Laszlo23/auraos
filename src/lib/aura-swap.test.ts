import { describe, expect, it } from "vitest";

import { AURA_SWAP_BURN_BPS } from "@/lib/aura-curve";
import {
  officialPairForRoute,
  quoteAuraOfficialSwap,
} from "@/lib/aura-swap.server";

describe("Aura swap desk quotes", () => {
  it("quotes AURA/USDC as the official book and stays offline until T-0", () => {
    const q = quoteAuraOfficialSwap({ from: "USDC", to: "AURA", amount: "100" });
    expect(q.pairId).toBe("aura-usdc");
    expect(q.live).toBe(false);
    expect(q.swapBurnBps).toBe(AURA_SWAP_BURN_BPS);
    expect(q.amountOut).toBeNull();
    expect(q.reason).toMatch(/48h/i);
  });

  it("marks AURA/WETH as the later pair, not a new coin", () => {
    const q = quoteAuraOfficialSwap({ from: "ETH", to: "AURA", amount: "1" });
    expect(q.pairId).toBe("aura-weth");
    expect(q.live).toBe(false);
    expect(q.reason).toMatch(/Phase 3/i);
    expect(officialPairForRoute("AURA", "WETH")?.officialBook).toBe(false);
  });

  it("refuses unofficial hops", () => {
    const q = quoteAuraOfficialSwap({ from: "USDC", to: "ETH", amount: "10" });
    expect(q.pairId).toBeNull();
    expect(q.reason).toMatch(/Not a DEX/i);
  });
});
