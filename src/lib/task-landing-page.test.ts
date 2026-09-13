import { describe, expect, it } from "vitest";

import { isLandingPageTask, pickLandingTemplate } from "@/lib/task-landing-page";

describe("landing page tasks", () => {
  it("detects Iris merchandising and explicit create-page briefs", () => {
    expect(isLandingPageTask("Draft landing page and product merchandising", null, "Iris")).toBe(
      true,
    );
    expect(isLandingPageTask("Create a landing page", "For the bakery", "Designer")).toBe(true);
    expect(isLandingPageTask("Launch my website", null, "Atlas")).toBe(true);
    expect(isLandingPageTask("Merchandise Ember Candle", "Write product page copy", "Iris")).toBe(
      true,
    );
    expect(isLandingPageTask("Research competitors", null, "Atlas")).toBe(false);
  });

  it("picks a template from the brief", () => {
    expect(pickLandingTemplate("Daily horoscope subscription", null)).toBe("subscription_daily");
    expect(pickLandingTemplate("Sell the ebook", null)).toBe("ebook_product");
    expect(pickLandingTemplate("Waitlist lead magnet", null)).toBe("lead_magnet");
    expect(pickLandingTemplate("Create a landing page", null)).toBe("service_offer");
  });
});
