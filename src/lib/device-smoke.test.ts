import { describe, expect, it } from "vitest";

import { localeFromBrowser } from "@/lib/i18n";
import { SITE_URL, VIEWPORT_CONTENT } from "@/lib/site";
import {
  COUNTRY_ACCEPT_LANGUAGE,
  htmlWorksOnPhone,
  PHONE_USER_AGENTS,
  PUBLIC_SMOKE_PATHS,
  publicUrl,
} from "@/lib/device-smoke";

describe("device-smoke contract", () => {
  it("covers Android, iPhone, iPad, and desktop engines", () => {
    const ids = PHONE_USER_AGENTS.map((d) => d.id);
    expect(ids).toContain("android-chrome-pixel");
    expect(ids).toContain("android-samsung");
    expect(ids).toContain("iphone-safari");
    expect(ids).toContain("ipad-safari");
    expect(ids).toContain("desktop-chrome");
    expect(PHONE_USER_AGENTS.every((d) => d.ua.length > 20)).toBe(true);
  });

  it("samples languages from every region we sell into", () => {
    const countries = COUNTRY_ACCEPT_LANGUAGE.map((c) => c.country);
    expect(countries).toEqual(
      expect.arrayContaining(["US", "DE", "AT", "BR", "JP", "EG", "IN", "KE", "CN", "MX"]),
    );
  });

  it("keeps public paths rooted on aibusiness.fun", () => {
    expect(PUBLIC_SMOKE_PATHS[0]).toBe("/");
    expect(publicUrl("/live")).toBe(`${SITE_URL}/live`);
    expect(VIEWPORT_CONTENT).toContain("width=device-width");
    expect(VIEWPORT_CONTENT).toContain("viewport-fit=cover");
  });

  it("flags broken HTML and accepts a healthy landing document", () => {
    expect(
      htmlWorksOnPhone(
        `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="${VIEWPORT_CONTENT}"><title>Aura OS</title></head><body>Aura OS</body></html>`,
      ),
    ).toEqual([]);
    expect(htmlWorksOnPhone("<html><body>This page didn't load</body></html>")).toEqual(
      expect.arrayContaining([
        "missing viewport meta",
        "root error boundary rendered",
        "Aura OS title/copy missing",
      ]),
    );
  });
});

describe("locale from any country", () => {
  it("maps German-speaking countries to de and everyone else to en", () => {
    expect(localeFromBrowser("de-DE")).toBe("de");
    expect(localeFromBrowser("de-AT")).toBe("de");
    expect(localeFromBrowser("de-CH")).toBe("de");
    expect(localeFromBrowser("en-US")).toBe("en");
    expect(localeFromBrowser("pt-BR")).toBe("en");
    expect(localeFromBrowser("ja-JP")).toBe("en");
    expect(localeFromBrowser("ar-EG")).toBe("en");
    expect(localeFromBrowser("zh-CN")).toBe("en");
    expect(localeFromBrowser("sw-KE")).toBe("en");
    expect(localeFromBrowser(null)).toBe("en");
  });
});
