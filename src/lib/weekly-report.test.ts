import { describe, expect, it } from "vitest";

import { weekWindow } from "@/lib/weekly-report.functions";

describe("weekWindow", () => {
  it("uses a rolling seven-day range ending at now", () => {
    const now = new Date("2026-09-01T12:00:00.000Z");
    const window = weekWindow(now);
    expect(window.rangeEnd).toBe(now.toISOString());
    expect(window.rangeStart).toBe(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString());
  });

  it("keys snapshots to the calendar week containing range end", () => {
    const window = weekWindow(new Date("2026-09-01T12:00:00.000Z"));
    expect(window.weekStart).toBe("2026-08-31");
    expect(window.weekEnd).toBe("2026-09-06");
  });

  it("labels the range in plain English", () => {
    const window = weekWindow(new Date("2026-09-01T12:00:00.000Z"));
    expect(window.rangeLabel).toMatch(/Aug 25.*Sep 1/);
  });
});
