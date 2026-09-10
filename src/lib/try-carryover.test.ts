import { describe, expect, it } from "vitest";

import { decodeTryCarryover, encodeTryCarryover } from "@/lib/try-carryover";

describe("try carryover", () => {
  it("encodes a trimmed prompt and round-trips", () => {
    const raw = encodeTryCarryover("  I sell apartments in Vienna.  ", 1_700_000_000_000);
    expect(raw).toContain("I sell apartments in Vienna.");
    expect(decodeTryCarryover(raw)).toBe("I sell apartments in Vienna.");
  });

  it("rejects empty and garbage", () => {
    expect(encodeTryCarryover("   ")).toBeNull();
    expect(decodeTryCarryover(null)).toBeNull();
    expect(decodeTryCarryover("{not-json")).toBeNull();
    expect(decodeTryCarryover("{}")).toBeNull();
  });
});
