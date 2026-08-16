import { afterEach, describe, expect, it } from "vitest";

import {
  clearNachbarVisit,
  clearNachbarVisitAuto,
  explainNachbarError,
  friendStatusLabel,
  isSafeNachbarPath,
  nachbarHeatLabel,
  nachbarStatusLabel,
  normalizeNachbarCheckinSource,
  peekNachbarVisit,
  rememberNachbarVisit,
  safeHttpUrl,
} from "@/lib/nachbar-play";
import {
  NACHBAR_AUTOSUBMIT_KEY,
  NACHBAR_CHECKIN_STORAGE_KEY,
  NACHBAR_SHOP_STORAGE_KEY,
} from "@/lib/nachbar";

function memoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

function installBrowserStorage() {
  const local = memoryStorage();
  const session = memoryStorage();
  Object.defineProperty(globalThis, "window", { value: globalThis, configurable: true });
  Object.defineProperty(globalThis, "localStorage", { value: local, configurable: true });
  Object.defineProperty(globalThis, "sessionStorage", { value: session, configurable: true });
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
  Reflect.deleteProperty(globalThis, "localStorage");
  Reflect.deleteProperty(globalThis, "sessionStorage");
});

describe("safeHttpUrl", () => {
  it("accepts http(s) and adds https when missing", () => {
    expect(safeHttpUrl("https://koerperglanz.at")).toBe("https://koerperglanz.at/");
    expect(safeHttpUrl("http://example.com/path")).toBe("http://example.com/path");
    expect(safeHttpUrl("pion-professional.at")).toBe("https://pion-professional.at/");
  });

  it("blocks javascript, data, credentials, and CSS breakers", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,hi")).toBeNull();
    expect(safeHttpUrl("https://user:pass@evil.test")).toBeNull();
    expect(safeHttpUrl("https://ok.test/\")")).toBeNull();
    expect(safeHttpUrl("https://ok.test/<script>")).toBeNull();
    expect(safeHttpUrl("")).toBeNull();
    expect(safeHttpUrl("x".repeat(501))).toBeNull();
  });
});

describe("isSafeNachbarPath", () => {
  it("allows tab and deep-link paths", () => {
    expect(isSafeNachbarPath("/nachbar")).toBe(true);
    expect(isSafeNachbarPath("/nachbar/heute")).toBe(true);
    expect(isSafeNachbarPath("/nachbar/c/AB12CD34")).toBe(true);
    expect(isSafeNachbarPath("/nachbar/entdecken")).toBe(true);
  });

  it("rejects traversal, query, and off-app paths", () => {
    expect(isSafeNachbarPath("/nachbar/../console")).toBe(false);
    expect(isSafeNachbarPath("/nachbar/heute?next=/console")).toBe(false);
    expect(isSafeNachbarPath("https://evil.test/nachbar")).toBe(false);
    expect(isSafeNachbarPath("/console")).toBe(false);
    expect(isSafeNachbarPath("/nachbar//x")).toBe(false);
  });
});

describe("labels", () => {
  it("maps check-in and friend status", () => {
    expect(nachbarStatusLabel("pending")).toBe("Wartet auf den Laden");
    expect(nachbarStatusLabel("confirmed")).toBe("Bestätigt");
    expect(nachbarStatusLabel("rejected")).toBe("Abgelaufen");
    expect(nachbarStatusLabel("nope")).toBe("Unbekannt");
    expect(friendStatusLabel("activated")).toBe("Erster Check-in");
    expect(friendStatusLabel("joined")).toBe("Wartet auf Besuch");
    expect(friendStatusLabel("ghost")).toBe("Unbekannt");
  });

  it("maps city heat from confirmed visits", () => {
    expect(nachbarHeatLabel(0)).toBe("Neu");
    expect(nachbarHeatLabel(1)).toBe("Lebt");
    expect(nachbarHeatLabel(3)).toBe("Warm");
    expect(nachbarHeatLabel(8)).toBe("Heiß");
  });
});

describe("normalizeNachbarCheckinSource", () => {
  it("keeps analytics sources and never accepts ar", () => {
    expect(normalizeNachbarCheckinSource("shop")).toBe("shop");
    expect(normalizeNachbarCheckinSource("CODE")).toBe("code");
    expect(normalizeNachbarCheckinSource("qr")).toBe("qr");
    expect(normalizeNachbarCheckinSource("ar")).toBe("qr");
    expect(normalizeNachbarCheckinSource("javascript:alert(1)")).toBe("qr");
    expect(normalizeNachbarCheckinSource()).toBe("qr");
  });
});

describe("explainNachbarError", () => {
  it("never leaks raw SQL names to the guest", () => {
    expect(explainNachbarError("visit_required", "x")).toBe("Zuerst ein bestätigter Besuch.");
    expect(explainNachbarError("function gen_random_bytes(integer) does not exist", "x")).toBe(
      "Profil nicht bereit — bitte nochmal einloggen.",
    );
    expect(explainNachbarError("checkin_limit_day", "x")).toMatch(/Heute schon/);
    expect(explainNachbarError("totally unknown", "Profil nicht gespeichert.")).toBe(
      "Profil nicht gespeichert.",
    );
  });
});

describe("remember / peek visit", () => {
  it("sanitizes code and shop, then clears auto without dropping the shop", () => {
    installBrowserStorage();
    rememberNachbarVisit({ code: " ab-12cd34!! ", shop: "Koerperglanz-Shapeline", auto: true });
    const pending = peekNachbarVisit();
    expect(pending.code).toBe("AB12CD34");
    expect(pending.shop).toBe("koerperglanz-shapeline");
    expect(pending.auto).toBe(true);
    expect(localStorage.getItem(NACHBAR_CHECKIN_STORAGE_KEY)).toBe("AB12CD34");
    expect(localStorage.getItem(NACHBAR_SHOP_STORAGE_KEY)).toBe("koerperglanz-shapeline");
    expect(localStorage.getItem(NACHBAR_AUTOSUBMIT_KEY)).toBe("1");

    clearNachbarVisitAuto();
    expect(peekNachbarVisit().auto).toBe(false);
    expect(peekNachbarVisit().code).toBe("AB12CD34");

    clearNachbarVisit();
    expect(peekNachbarVisit()).toEqual({ code: "", shop: "", auto: false });
  });

  it("ignores short junk and does not set auto", () => {
    installBrowserStorage();
    rememberNachbarVisit({ code: "ab", shop: "x", auto: true });
    expect(peekNachbarVisit()).toEqual({ code: "", shop: "", auto: false });
  });
});
