import { describe, expect, it } from "vitest";

import { scoreReputationAudit } from "@/lib/reputation-audit";

describe("scoreReputationAudit", () => {
  it("scores a complete shop higher than an empty one", () => {
    const empty = scoreReputationAudit({ businessName: "", city: "" });
    const full = scoreReputationAudit({
      businessName: "Salon Mira",
      city: "Wien",
      niche: "beauty",
      googleUrl: "https://g.page/r/demo",
      websiteUrl: "https://salon-mira.example",
    });
    expect(full.score).toBeGreaterThan(empty.score);
    expect(full.grade).toMatch(/^[A-D]$/);
    expect(full.recommendations.length).toBeGreaterThan(0);
  });

  it("recognizes Google review links", () => {
    const res = scoreReputationAudit({
      businessName: "Café Nord",
      city: "Berlin",
      googleUrl: "https://maps.app.goo.gl/abc",
    });
    const google = res.findings.find((f) => f.id === "google");
    expect(google?.ok).toBe(true);
  });
});
