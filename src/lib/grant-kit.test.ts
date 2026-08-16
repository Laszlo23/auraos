import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { BRAND, BRAND_ASSETS } from "@/lib/brand";
import {
  assessGrantReady,
  grantAnswers,
  grantKitMarkdown,
  grantOutreachDrafts,
  GRANT_VIDEO_SCRIPT,
  priorityApplyOrder,
} from "@/lib/grant-kit";
import { PROGRAMS, PITCH, TEAM_SIZE } from "@/lib/grants";
import { LOCAL_PRODUCT_NAME, SITE_URL } from "@/lib/site";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("grant-ready kit", () => {
  const traction = {
    companies: 3,
    agents: 12,
    actions24h: 40,
    paidCalls: 2,
    usdcPaid: 0.12,
  };

  it("passes the machine grant-ready checklist", () => {
    const result = assessGrantReady(traction);
    expect(result.issues, JSON.stringify(result.issues, null, 2)).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("keeps every apply-now programme paste-ready", () => {
    const applyNow = PROGRAMS.filter((p) => p.status === "apply-now");
    expect(applyNow.length).toBeGreaterThanOrEqual(8);
    const drafts = grantOutreachDrafts(traction);
    expect(drafts.length).toBe(applyNow.length);
    for (const d of drafts) {
      expect(d.applyUrl.startsWith("https://")).toBe(true);
      expect(d.body).toContain(PITCH.oneLine.slice(0, 24));
      expect(d.body).toContain(SITE_URL);
    }
  });

  it("exports a complete markdown kit with honesty rules", () => {
    const md = grantKitMarkdown(traction);
    expect(md).toContain("# Aura OS — grant & credits application kit");
    expect(md).toContain("## Honesty rules");
    expect(md).toContain(grantAnswers(traction).tractionLine);
    expect(md.toLowerCase()).not.toMatch(/guaranteed returns|seed round closed/);
  });

  it("priority order only references known programme ids", () => {
    const ids = new Set(PROGRAMS.map((p) => p.id));
    for (const p of priorityApplyOrder()) {
      expect(ids.has(p.id)).toBe(true);
    }
  });

  it("ships a timed grant presentation video script", () => {
    expect(GRANT_VIDEO_SCRIPT).toMatch(/0:00/);
    expect(GRANT_VIDEO_SCRIPT).toMatch(/Aura OS/i);
    expect(GRANT_VIDEO_SCRIPT).toMatch(/Aura Local/i);
    expect(GRANT_VIDEO_SCRIPT).toMatch(/aibusiness\.fun\/grants/);
    expect(GRANT_VIDEO_SCRIPT).toMatch(/founders@aibusiness\.fun/);
    const path = join(ROOT, "docs/grants/video-script.md");
    const script = readFileSync(path, "utf8");
    expect(script).toMatch(/Aura Local/i);
    expect(script).toMatch(/0:00/);
  });

  it("uses the subdomain brand assets and Local product name", () => {
    expect(LOCAL_PRODUCT_NAME).toBe("Aura Local");
    expect(BRAND.local).toBe("Aura Local");
    expect(BRAND_ASSETS.logoPng).toBe("/brand/aura-logo.png");
    expect(TEAM_SIZE).toBeGreaterThanOrEqual(2);
  });
});
