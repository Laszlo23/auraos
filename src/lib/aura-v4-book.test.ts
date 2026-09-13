import { describe, expect, it } from "vitest";

import { BASE_USDC } from "@/lib/private-sale";
import {
  UNI_V4_COMMAND_V4_SWAP,
  UNI_V4_DYNAMIC_FEE,
  UNISWAP_V4_BASE,
  assertPublishedPoolId,
  auraV4PoolId,
  auraV4PoolKey,
  encodeV4ExactInSingleInput,
  sortAuraUsdcPair,
} from "@/lib/aura-v4-book";

const AURA = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
const HOOK = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;

describe("official v4 book encoding", () => {
  it("sorts USDC/AURA and never invents a CA", () => {
    const pair = sortAuraUsdcPair(AURA, BASE_USDC);
    expect(pair.currency0.toLowerCase() < pair.currency1.toLowerCase()).toBe(true);
    expect(UNISWAP_V4_BASE.universalRouter).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(UNI_V4_COMMAND_V4_SWAP).toBe(0x10);
    expect(UNI_V4_DYNAMIC_FEE).toBe(0x800000);
  });

  it("refuses a pool id that does not match the published key", () => {
    const key = auraV4PoolKey({ aura: AURA, hooks: HOOK });
    const id = auraV4PoolId(key);
    expect(id).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(assertPublishedPoolId(key, id)).toBe(id);
    expect(() => assertPublishedPoolId(key, `0x${"11".repeat(32)}`)).toThrow(/does not match/);
  });

  it("encodes an exact-in v4 swap input", () => {
    const key = auraV4PoolKey({ aura: AURA, hooks: HOOK });
    const encoded = encodeV4ExactInSingleInput({
      key,
      zeroForOne: true,
      amountIn: 29_000_000n,
      amountOutMinimum: 1n,
    });
    expect(encoded.startsWith("0x")).toBe(true);
    expect(encoded.length).toBeGreaterThan(200);
  });
});
