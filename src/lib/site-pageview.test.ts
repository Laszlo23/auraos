import { describe, expect, it } from "vitest";

import {
  GA4_PROPERTY_ID,
  GA_MEASUREMENT_ID,
  gaPageViewParams,
  gtagBootstrapHtml,
  publicPagePath,
} from "@/lib/site-pageview";

describe("ga tag ids", () => {
  it("keeps the web stream id in the first-paint snippet", () => {
    expect(GA_MEASUREMENT_ID).toBe("G-PZMRS91Q88");
    expect(GA4_PROPERTY_ID).toBe("549148530");
    expect(gtagBootstrapHtml()).toContain(GA_MEASUREMENT_ID);
    expect(gtagBootstrapHtml()).toContain("send_page_view:false");
  });

  it("sends page_location so GA4 can attribute the view", () => {
    const params = gaPageViewParams("/sale");
    expect(params.page_path).toBe("/sale");
    expect(params.page_location).toContain("/sale");
    expect(params.send_to).toBe(GA_MEASUREMENT_ID);
  });
});

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
