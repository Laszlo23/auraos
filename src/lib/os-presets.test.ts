import { describe, expect, it } from "vitest";

import { t } from "@/lib/i18n";
import {
  inferOsPreset,
  parseNavPrefs,
  presetDefaultNav,
  resolveVisibleNav,
  toggleNavPref,
} from "@/lib/os-presets";

describe("os-presets", () => {
  it("infers realty from immobilien copy", () => {
    expect(inferOsPreset("Ich bin Immobilienmaklerin in Wien")).toBe("realty");
  });

  it("realty defaults include akquise and channels, not trading", () => {
    const paths = presetDefaultNav("realty");
    expect(paths).toContain("/akquise");
    expect(paths).toContain("/channels");
    expect(paths).toContain("/wallet");
    expect(paths).toContain("/console");
    expect(paths).toContain("/settings");
    expect(paths).toContain("/profile");
    expect(paths).not.toContain("/trading");
    expect(paths).not.toContain("/business");
  });

  it("explicit nav_prefs are strict", () => {
    const nav = resolveVisibleNav({
      osPreset: "full",
      navPrefs: ["/console", "/channels"],
      funnelNavCore: [],
      simple: false,
    });
    const tos = nav.map((n) => n.to);
    expect(tos).toContain("/console");
    expect(tos).toContain("/channels");
    expect(tos).toContain("/settings");
    expect(tos).toContain("/profile");
    expect(tos).not.toContain("/trading");
  });

  it("parseNavPrefs normalizes and keeps pinned items", () => {
    const parsed = parseNavPrefs(["/akquise", "nope", "/channels"]);
    expect(parsed).toContain("/akquise");
    expect(parsed).toContain("/channels");
    expect(parsed).toContain("/settings");
    expect(parsed).toContain("/console");
    expect(parsed).toContain("/profile");
  });

  it("community preset stays inside OS (no Nachbar nav)", () => {
    const paths = presetDefaultNav("community");
    expect(paths).toContain("/community");
    expect(paths).toContain("/quest");
    expect(paths).not.toContain("/nachbar/heute");
  });

  it("toggleNavPref cannot hide pinned paths", () => {
    const next = toggleNavPref(["/console", "/channels", "/settings", "/profile"], "/profile");
    expect(next).toContain("/profile");
    expect(next).toContain("/console");
    const withoutChannels = toggleNavPref(next, "/channels");
    expect(withoutChannels).not.toContain("/channels");
    expect(withoutChannels).toContain("/profile");
  });

  it("exposes EN/DE settings and navOs strings", () => {
    expect(t("settings.workspace", "en")).toBe("Business OS");
    expect(t("settings.presetRealty", "de")).toBe("Immobilien");
    expect(t("navOs.akquise.label", "de")).toBe("Lead Hunter");
    expect(t("shell.showEverything", "en")).toBe("Show everything");
  });
});
