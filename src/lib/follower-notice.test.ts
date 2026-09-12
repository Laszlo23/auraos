import { describe, expect, it } from "vitest";

import { parseFollowerNoticeCsv, normalizeFollowerWallet } from "./follower-notice";

describe("follower-notice csv", () => {
  it("reads a headered CSV and lowercases checksums", () => {
    const parsed = parseFollowerNoticeCsv(
      [
        "wallet,note",
        "0x7894a4f43cec1E97CBAa9Cd6676Ac07ABF34dD49,friend",
        "0xAC55a8674398BF050F21940EE0bB2d18BC393114",
      ].join("\n"),
    );
    expect(parsed.wallets).toEqual([
      "0x7894a4f43cec1e97cbaa9cd6676ac07abf34dd49",
      "0xac55a8674398bf050f21940ee0bb2d18bc393114",
    ]);
    expect(parsed.invalidCount).toBe(0);
    expect(parsed.duplicates).toBe(0);
  });

  it("dedupes and skips comments", () => {
    const addr = "0x7894a4f43cec1E97CBAa9Cd6676Ac07ABF34dD49";
    const parsed = parseFollowerNoticeCsv(`# friends\n${addr}\n${addr}\nnot-an-address`);
    expect(parsed.wallets).toHaveLength(1);
    expect(parsed.duplicates).toBe(1);
    expect(parsed.invalidCount).toBe(1);
  });

  it("rejects junk", () => {
    expect(normalizeFollowerWallet("hello")).toBeNull();
    expect(normalizeFollowerWallet("0x123")).toBeNull();
  });
});
