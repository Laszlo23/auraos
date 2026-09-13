import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("AURA T-0 attach paper", () => {
  const paper = readFileSync(join(ROOT, "docs/AURA_T0_ATTACH.md"), "utf8");
  const publicCopy = readFileSync(join(ROOT, "public/docs/AURA_T0_ATTACH.md"), "utf8");

  it("keeps Path A wrap, Path B native lock, and the slip rule", () => {
    expect(paper).toContain("existingToken: true");
    expect(paper).toContain("Position Manager");
    expect(paper).toContain("ClankerTokenV4");
    expect(paper).toContain("pair: null");
    expect(paper).toContain("broadcast --go");
    expect(paper).toContain("6,000");
    expect(paper).toContain("1,111");
    expect(publicCopy).toBe(paper);
  });
});
