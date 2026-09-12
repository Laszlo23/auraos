import { describe, expect, it } from "vitest";

import {
  GUIDE_DESK,
  GUIDE_HOUR,
  GUIDE_MORE,
  GUIDE_PATH,
  GUIDE_PROMPTS,
  GUIDE_RULES,
} from "./founder-guide";

describe("founder guide", () => {
  it("stays on the public /guide path", () => {
    expect(GUIDE_PATH).toBe("/guide");
  });

  it("keeps bilingual copy and real routes", () => {
    for (const step of GUIDE_HOUR) {
      expect(step.title.en.length).toBeGreaterThan(3);
      expect(step.title.de.length).toBeGreaterThan(3);
      expect(step.body.en.length).toBeGreaterThan(20);
      expect(step.body.de.length).toBeGreaterThan(20);
      if (step.href) expect(step.href.startsWith("/")).toBe(true);
    }
    for (const row of GUIDE_DESK) {
      expect(row.href.startsWith("/")).toBe(true);
      expect(row.body.en.length).toBeGreaterThan(20);
    }
    for (const row of GUIDE_MORE) {
      expect(row.href.startsWith("/")).toBe(true);
    }
  });

  it("does not sell sleep or invent a contract", () => {
    const blob = [
      ...GUIDE_HOUR.map((s) => `${s.body.en} ${s.body.de}`),
      ...GUIDE_RULES.map((r) => `${r.en} ${r.de}`),
      ...GUIDE_PROMPTS.map((p) => `${p.good.en} ${p.good.de}`),
    ].join(" ");
    expect(blob).not.toMatch(/work while you sleep/i);
    expect(blob).not.toMatch(/0x[a-fA-F0-9]{40}/);
  });
});
