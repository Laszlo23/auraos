import { describe, expect, it } from "vitest";

/**
 * Mirrors critical URL resolution from akquise.server fallbackSearch —
 * protocol-relative DuckDuckGo redirects must become absolute https URLs.
 */
function resolveDdgHref(rawHref: string): string | null {
  const decode = (s: string) =>
    s
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  try {
    const u = new URL(decode(rawHref), "https://duckduckgo.com");
    if ((u.pathname === "/l/" || u.pathname === "/l") && u.searchParams.get("uddg")) {
      return decodeURIComponent(u.searchParams.get("uddg")!);
    }
    return u.href;
  } catch {
    return null;
  }
}

describe("akquise duckduckgo href resolve", () => {
  it("unwraps protocol-relative /l/?uddg= redirects", () => {
    const raw =
      "//duckduckgo.com/l/?uddg=https%3A%2F%2Fossig.at%2F&amp;rut=abc";
    expect(resolveDdgHref(raw)).toBe("https://ossig.at/");
  });

  it("keeps absolute https results", () => {
    expect(resolveDdgHref("https://example.com/salon")).toBe("https://example.com/salon");
  });
});
