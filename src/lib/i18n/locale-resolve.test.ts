import { describe, expect, it } from "vitest";

import { isLokalSurfacePath, resolveLocaleFromContext, t } from "./index";

describe("locale resolve", () => {
  it("honors ?lang over stored and path defaults", () => {
    expect(
      resolveLocaleFromContext({
        path: "/lokal",
        langParam: "en",
        stored: "de",
        browser: "de",
      }),
    ).toBe("en");
    expect(
      resolveLocaleFromContext({
        path: "/sale",
        langParam: "de",
        stored: "en",
        browser: "en",
      }),
    ).toBe("de");
  });

  it("keeps a stored English choice on /sale", () => {
    expect(
      resolveLocaleFromContext({
        path: "/sale",
        langParam: null,
        stored: "en",
        browser: "de",
      }),
    ).toBe("en");
  });

  it("defaults Lokal surfaces to German only when nothing is stored", () => {
    expect(isLokalSurfacePath("/sale")).toBe(false);
    expect(isLokalSurfacePath("/lokal")).toBe(true);
    expect(
      resolveLocaleFromContext({
        path: "/lokal",
        langParam: null,
        stored: null,
        browser: "en",
      }),
    ).toBe("de");
  });

  it("has sale and kyc keys in both catalogs", () => {
    expect(t("sale.connecting", "en")).toBe("Connecting…");
    expect(t("sale.connecting", "de")).toBe("Verbinde…");
    expect(t("kyc.signIn", "de")).toBe("Anmelden");
    expect(t("sale.playTitle", "en")).not.toBe("sale.playTitle");
  });

  it("has a self-explaining DeFi money hub in both catalogs", () => {
    expect(t("moneyHub.eyebrow", "en")).toMatch(/DeFi/);
    expect(t("moneyHub.step1", "de")).toMatch(/USDC/);
    expect(t("moneyHub.earnRisk", "en")).toMatch(/Not a bank/);
    expect(t("moneyHub.pathEarn", "en")).toBe("Earn on USDC");
  });

  it("has T-0 hero clock copy in both catalogs", () => {
    expect(t("landing.heroClockKicker", "en")).toMatch(/T-0/);
    expect(t("landing.heroClockKicker", "de")).toMatch(/T-0/);
    expect(t("landing.act6Title", "en")).toBe("The bell is today");
    expect(t("landing.act6Title", "de")).toBe("Heute ist T-0");
    expect(t("landing.heroClockLine", "en")).not.toMatch(/0x[a-fA-F0-9]{40}/);
    expect(t("landing.heroClockLiveLine", "de")).toMatch(/\/token/);
  });
});
