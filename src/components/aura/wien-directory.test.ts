import { describe, expect, it } from "vitest";

import { isPublicShopListing, safeShopImageUrl } from "@/components/aura/wien-directory";
import { shopMediaUrl } from "@/lib/lokal-shops";
import type { PublicLokalListing } from "@/lib/reviews.public.functions";

function listing(
  partial: Partial<PublicLokalListing> & Pick<PublicLokalListing, "slug" | "name">,
): PublicLokalListing {
  return {
    tagline: null,
    city: "Wien",
    niche: null,
    homepage_url: null,
    google_review_url: null,
    local_cohort_number: null,
    emoji: "◎",
    street: null,
    postal_code: null,
    district: null,
    cover_url: null,
    featured: false,
    ...partial,
  };
}

describe("shopMediaUrl", () => {
  it("rewrites production shop hosts to same-origin paths", () => {
    expect(shopMediaUrl("https://aibusiness.fun/shops/gigerl/cover.jpg")).toBe(
      "/shops/gigerl/cover.jpg",
    );
    expect(shopMediaUrl("/shops/el-ey-x/cover.jpg")).toBe("/shops/el-ey-x/cover.jpg");
  });
});

describe("safeShopImageUrl", () => {
  it("allows same-origin shop paths and https", () => {
    expect(safeShopImageUrl("/shops/tante-liesl/cover.jpg")).toBe("/shops/tante-liesl/cover.jpg");
    expect(safeShopImageUrl("https://aibusiness.fun/shops/x/cover.jpg")).toContain("https://");
  });

  it("blocks javascript and odd paths", () => {
    expect(safeShopImageUrl("javascript:alert(1)")).toBeNull();
    expect(safeShopImageUrl("/etc/passwd")).toBeNull();
    expect(safeShopImageUrl("/shops/../secret")).toBeNull();
  });
});

describe("isPublicShopListing", () => {
  it("hides ops aura companies from the Wien directory", () => {
    expect(isPublicShopListing(listing({ slug: "aura-os", name: "Aura OS" }))).toBe(false);
    expect(isPublicShopListing(listing({ slug: "salon-mira-test", name: "Salon Mira" }))).toBe(
      false,
    );
    expect(isPublicShopListing(listing({ slug: "tante-liesl", name: "Tante Liesl" }))).toBe(true);
  });
});
