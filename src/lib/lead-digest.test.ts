import { describe, expect, it } from "vitest";

import {
  buildLeadDigestEmail,
  digestSlotForHour,
  shouldSendDigestNow,
  zonedParts,
} from "./lead-digest";

describe("lead-digest scheduling", () => {
  it("builds stable slots", () => {
    expect(digestSlotForHour("2026-09-05", 8)).toBe("2026-09-05-08");
    expect(digestSlotForHour("2026-09-05", 16)).toBe("2026-09-05-16");
  });

  it("is due once per matching hour", () => {
    // 2026-09-05 08:15 Vienna = 06:15 UTC (CEST)
    const morning = new Date("2026-09-05T06:15:00.000Z");
    const parts = zonedParts(morning, "Europe/Vienna");
    expect(parts.h).toBe(8);

    const due = shouldSendDigestNow({
      now: morning,
      timezone: "Europe/Vienna",
      hours: [8, 16],
      lastSentSlot: null,
    });
    expect(due.due).toBe(true);
    expect(due.slot).toBe("2026-09-05-08");

    const again = shouldSendDigestNow({
      now: morning,
      timezone: "Europe/Vienna",
      hours: [8, 16],
      lastSentSlot: "2026-09-05-08",
    });
    expect(again.due).toBe(false);
  });

  it("skips hours that are not configured", () => {
    const noon = new Date("2026-09-05T10:00:00.000Z"); // 12:00 Vienna
    const r = shouldSendDigestNow({
      now: noon,
      timezone: "Europe/Vienna",
      hours: [8, 16],
      lastSentSlot: null,
    });
    expect(r.due).toBe(false);
  });
});

describe("lead-digest copy", () => {
  it("customizes German morning subject with new leads", () => {
    const copy = buildLeadDigestEmail({
      companyName: "Sonja Immobilien",
      language: "de",
      slotHour: 8,
      newLeads: [
        {
          id: "1",
          name: "Ada",
          org: "Ada GmbH",
          email: "ada@example.com",
          phone: null,
          source_url: "https://example.com",
          address: "Wien",
          snippet: "Makler in Wien",
          score: 80,
          created_at: new Date().toISOString(),
        },
      ],
      recentLeads: [],
    });
    expect(copy.subject).toContain("Sonja Immobilien");
    expect(copy.subject).toContain("1 neue Lead");
    expect(copy.text).toContain("Ada");
    expect(copy.html).toContain("Ada");
  });
});
