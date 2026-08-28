import { describe, expect, it } from "vitest";

import { publicPagePath } from "@/lib/site-pageview";

describe("publicPagePath", () => {
  it("keeps public shop and directory paths", () => {
    expect(publicPagePath("/wien")).toBe("/wien");
    expect(publicPagePath("/b/zeitwende-antiquitaeten")).toBe("/b/zeitwende-antiquitaeten");
    expect(publicPagePath("/sale")).toBe("/sale");
  });

  it("redacts claim tokens and skips internal surfaces", () => {
    expect(publicPagePath("/lokal/claim/61a18UZRyl7O7Zj0tAj9B0pk")).toBe("/lokal/claim");
    expect(publicPagePath("/desk")).toBeNull();
    expect(publicPagePath("/api/workers/tick")).toBeNull();
    expect(publicPagePath("/cover.jpg")).toBeNull();
  });
});
