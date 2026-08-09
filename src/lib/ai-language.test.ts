import { describe, expect, it } from "vitest";

import {
  detectAiLang,
  languageStyleBlock,
  normalizeAiLang,
  sanitizeBrandNames,
} from "./ai-language";

describe("ai-language", () => {
  it("keeps Discord untranslated after German mistranslation", () => {
    expect(sanitizeBrandNames("Komm in unsere Zwietracht-Community")).toContain("Discord");
    expect(sanitizeBrandNames("Tritt dem Zwist bei")).toContain("Discord");
    expect(sanitizeBrandNames("Join Discord today")).toBe("Join Discord today");
  });

  it("fixes Telegram product phrasing without killing the German word for a wire telegram blindly", () => {
    expect(sanitizeBrandNames("Schreib uns auf Telegramm")).toContain("Telegram");
    expect(sanitizeBrandNames("Unser Telegramm-Kanal")).toContain("Telegram");
  });

  it("detects German comments", () => {
    expect(detectAiLang("Hey, danke für den Post — kann ich bitte mehr erfahren?")).toBe("de");
    expect(detectAiLang("Thanks for sharing — can I learn more?")).toBe("en");
  });

  it("embeds never-translate brands in DE style block", () => {
    const block = languageStyleBlock("de");
    expect(block).toContain("Discord");
    expect(block).toContain("Zwietracht");
    expect(normalizeAiLang("deutsch")).toBe("de");
  });
});
