import {
  NACHBAR_AUTOSUBMIT_KEY,
  NACHBAR_CHECKIN_STORAGE_KEY,
  NACHBAR_SHOP_STORAGE_KEY,
} from "@/lib/nachbar";

export type NachbarCheckinStatus = "pending" | "confirmed" | "rejected";
export type NachbarFriendStatus = "activated" | "joined";
export type NachbarCheckinSource = "qr" | "shop" | "code";

/** Analytics only. Never "ar" — that mission is granted by nachbar_mark_ar. */
export function normalizeNachbarCheckinSource(raw?: string): NachbarCheckinSource {
  switch (
    String(raw || "")
      .trim()
      .toLowerCase()
  ) {
    case "shop":
      return "shop";
    case "code":
      return "code";
    case "qr":
      return "qr";
    default:
      return "qr";
  }
}

/** Same-origin Nachbar return path. No `..`, query, or host. */
export function isSafeNachbarPath(next?: string): next is `/nachbar${string}` {
  return Boolean(next && /^\/nachbar(\/[a-z0-9][\w-]*)*$/i.test(next));
}

export function explainNachbarError(message: string, fallback: string): string {
  const msg = message || "";
  if (/shop_not_found/i.test(msg)) return "Laden nicht gefunden.";
  if (/invalid_code/i.test(msg)) return "Code ungültig.";
  if (/checkin_limit_day/i.test(msg)) {
    return "Heute schon eingecheckt — bitte morgen erneut oder Bestätigung abwarten.";
  }
  if (/not_authorized/i.test(msg)) return "Nicht erlaubt.";
  if (/checkin_not_pending/i.test(msg)) return "Schon erledigt.";
  if (/visit_required/i.test(msg)) return "Zuerst ein bestätigter Besuch.";
  if (/note_invalid/i.test(msg)) return "Schreib mindestens einen kurzen Satz.";
  if (/score_invalid/i.test(msg)) return "Note muss 1 bis 5 sein.";
  if (/ar_not_ready/i.test(msg)) return "AR-Blick gibt’s hier noch nicht.";
  if (/gen_random_bytes|not_authenticated/i.test(msg)) {
    return "Profil nicht bereit — bitte nochmal einloggen.";
  }
  return fallback;
}

export function rememberNachbarVisit(input: { code?: string; shop?: string; auto?: boolean }) {
  if (typeof window === "undefined") return;
  const code = String(input.code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 16);
  const shop = String(input.shop || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 64);
  if (code.length >= 6) {
    localStorage.setItem(NACHBAR_CHECKIN_STORAGE_KEY, code);
    sessionStorage.setItem(NACHBAR_CHECKIN_STORAGE_KEY, code);
  }
  if (shop.length >= 2) {
    localStorage.setItem(NACHBAR_SHOP_STORAGE_KEY, shop);
  }
  if (input.auto !== false && (code.length >= 6 || shop.length >= 2)) {
    localStorage.setItem(NACHBAR_AUTOSUBMIT_KEY, "1");
    sessionStorage.setItem(NACHBAR_AUTOSUBMIT_KEY, "1");
  }
}

export function peekNachbarVisit() {
  if (typeof window === "undefined") {
    return { code: "", shop: "", auto: false };
  }
  const code =
    sessionStorage.getItem(NACHBAR_CHECKIN_STORAGE_KEY) ||
    localStorage.getItem(NACHBAR_CHECKIN_STORAGE_KEY) ||
    "";
  const shop = localStorage.getItem(NACHBAR_SHOP_STORAGE_KEY) || "";
  const auto =
    sessionStorage.getItem(NACHBAR_AUTOSUBMIT_KEY) === "1" ||
    localStorage.getItem(NACHBAR_AUTOSUBMIT_KEY) === "1";
  return { code, shop, auto };
}

export function clearNachbarVisit() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(NACHBAR_CHECKIN_STORAGE_KEY);
  sessionStorage.removeItem(NACHBAR_AUTOSUBMIT_KEY);
  localStorage.removeItem(NACHBAR_CHECKIN_STORAGE_KEY);
  localStorage.removeItem(NACHBAR_AUTOSUBMIT_KEY);
  localStorage.removeItem(NACHBAR_SHOP_STORAGE_KEY);
}

export function clearNachbarVisitAuto() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(NACHBAR_AUTOSUBMIT_KEY);
  localStorage.removeItem(NACHBAR_AUTOSUBMIT_KEY);
}

export function nachbarStatusLabel(status: NachbarCheckinStatus | string): string {
  switch (status) {
    case "pending":
      return "Wartet auf den Laden";
    case "confirmed":
      return "Bestätigt";
    case "rejected":
      return "Abgelaufen";
    default:
      return "Unbekannt";
  }
}

export function nachbarHeatLabel(visits: number): string {
  if (visits >= 8) return "Heiß";
  if (visits >= 3) return "Warm";
  if (visits >= 1) return "Lebt";
  return "Neu";
}

/** Only http(s). Blocks javascript:/data: and CSS-breaking characters.
 * Also allows same-origin media paths used on shop profiles (/shops, /og, …).
 */
export function safeHttpUrl(raw: string | null | undefined): string | null {
  const t = String(raw || "").trim();
  if (!t || t.length > 500) return null;
  if (t.startsWith("/")) {
    if (!/^\/(shops|og|funnels|crew|brand|share)\/[\w./-]+$/i.test(t)) return null;
    if (/[)('"\\<>]/.test(t) || t.includes("..")) return null;
    return t;
  }
  try {
    const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (u.username || u.password) return null;
    const href = u.toString();
    let decoded = href;
    try {
      decoded = decodeURIComponent(href);
    } catch {
      return null;
    }
    if (/[)('"\\<>]/.test(href) || /[)('"\\<>]/.test(decoded)) return null;
    return href;
  } catch {
    return null;
  }
}

export function friendStatusLabel(status: NachbarFriendStatus | string): string {
  switch (status) {
    case "activated":
      return "Erster Check-in";
    case "joined":
      return "Wartet auf Besuch";
    default:
      return "Unbekannt";
  }
}
