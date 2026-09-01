import { describe, expect, it } from "vitest";

import { CHANGELOG_ENTRIES, changelogByMonth } from "@/lib/changelog";

describe("changelog", () => {
  it("keeps entries sorted newest-first within months", () => {
    const map = changelogByMonth();
    for (const [, entries] of map) {
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i - 1]!.date >= entries[i]!.date).toBe(true);
      }
    }
  });

  it("has unique entry ids", () => {
    const ids = CHANGELOG_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
