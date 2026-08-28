/** Post-auth return paths that must survive Google OAuth (query string on /auth). */

const CLAIM_PATH = /^\/lokal\/claim\/[A-Za-z0-9_-]{12,80}$/;

export function pathOnly(next?: string | null): string {
  if (!next) return "";
  const raw = next.trim();
  if (!raw.startsWith("/")) return "";
  return raw.split("?")[0] || "";
}

export function isLokalClaimPath(next?: string | null): boolean {
  return CLAIM_PATH.test(pathOnly(next));
}

export function glueckAufNote(shop: {
  name: string;
  slug: string;
  district?: string | null;
}): string {
  const where = shop.district?.trim() ? ` · ${shop.district.trim()}` : "";
  const line = `Glück auf, Nachbar — ${shop.name}${where}. Bis bald: https://aibusiness.fun/b/${shop.slug}`;
  return line.slice(0, 400);
}
