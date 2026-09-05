import { describe, expect, it } from "vitest";

import { buildShareText, shareIntentHref } from "@/components/aura/share";

describe("share intents", () => {
  it("builds readable multi-line share text with URL", () => {
    const text = buildShareText({
      headline: "Proof on Aura OS",
      detail: "Lead research finished.",
      url: "https://aibusiness.fun/proofs",
      embedUrl: true,
    });
    expect(text).toContain("Proof on Aura OS");
    expect(text).toContain("Lead research finished.");
    expect(text).toContain("https://aibusiness.fun/proofs");
  });

  it("opens X with text filled", () => {
    const href = shareIntentHref("x", {
      url: "https://aibusiness.fun/proofs",
      text: "Hello\n\nhttps://aibusiness.fun/proofs",
    });
    expect(href.startsWith("https://x.com/intent/tweet?text=")).toBe(true);
    expect(href).toContain(encodeURIComponent("Hello"));
  });

  it("opens Facebook with url + quote", () => {
    const href = shareIntentHref("facebook", {
      url: "https://aibusiness.fun/proofs",
      text: "Proof filed",
    });
    expect(href).toContain("facebook.com/sharer/sharer.php");
    expect(href).toContain("quote=");
    expect(href).toContain(encodeURIComponent("https://aibusiness.fun/proofs"));
  });

  it("opens LinkedIn feed composer with text", () => {
    const href = shareIntentHref("linkedin", {
      url: "https://aibusiness.fun/proofs",
      text: "Proof filed\n\nhttps://aibusiness.fun/proofs",
    });
    expect(href.startsWith("https://www.linkedin.com/feed/?shareActive=true&text=")).toBe(true);
  });
});
