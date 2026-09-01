import { describe, expect, it } from "vitest";

import {
  CHANGELOG_ENTRIES,
  CHANGELOG_TAGS,
  changelogByMonth,
  formatChangelogDate,
  formatChangelogMonth,
  isValidChangelogEntry,
  latestChangelogEntry,
} from "@/lib/changelog";

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

  it("validates every shipped entry", () => {
    for (const entry of CHANGELOG_ENTRIES) {
      expect(isValidChangelogEntry(entry)).toBe(true);
    }
  });

  it("lists entries globally newest-first", () => {
    for (let i = 1; i < CHANGELOG_ENTRIES.length; i++) {
      expect(CHANGELOG_ENTRIES[i - 1]!.date >= CHANGELOG_ENTRIES[i]!.date).toBe(true);
    }
  });

  it("resolves latest entry as the first row", () => {
    expect(latestChangelogEntry()?.id).toBe(CHANGELOG_ENTRIES[0]?.id);
  });

  it("groups months in descending order", () => {
    const months = [...changelogByMonth().keys()];
    const sorted = [...months].sort((a, b) => b.localeCompare(a));
    expect(months).toEqual(sorted);
  });

  it("formats dates for en and de locales", () => {
    expect(formatChangelogDate("2026-09-01", "en")).toMatch(/Sep/);
    expect(formatChangelogDate("2026-09-01", "de")).toMatch(/Sept|Sep/);
    expect(formatChangelogMonth("2026-09", "en")).toMatch(/September 2026/);
  });

  it("rejects malformed entries", () => {
    const base = CHANGELOG_ENTRIES[0]!;
    expect(isValidChangelogEntry({ ...base, date: "09-01-2026" })).toBe(false);
    expect(isValidChangelogEntry({ ...base, items: [] })).toBe(false);
    expect(isValidChangelogEntry({ ...base, tags: ["feature", "bogus" as never] })).toBe(false);
  });

  it("uses only known tag labels", () => {
    for (const entry of CHANGELOG_ENTRIES) {
      for (const tag of entry.tags) {
        expect(CHANGELOG_TAGS).toContain(tag);
      }
    }
  });
});
