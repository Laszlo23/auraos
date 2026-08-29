import { describe, expect, it } from "vitest";

import { absoluteAsset } from "@/lib/seo";
import { OG_IMAGE, SITE_URL } from "@/lib/site";

describe("absoluteAsset", () => {
  it("keeps https URLs", () => {
    expect(absoluteAsset("https://cdn.example/cover.jpg")).toBe("https://cdn.example/cover.jpg");
  });

  it("prefixes site-relative shop covers for OG", () => {
    expect(absoluteAsset("/shops/gigerl/cover.jpg")).toBe(`${SITE_URL}/shops/gigerl/cover.jpg`);
  });

  it("does not leave the default OG image relative", () => {
    expect(OG_IMAGE.startsWith("https://")).toBe(true);
    expect(absoluteAsset(OG_IMAGE)).toBe(OG_IMAGE);
  });
});
