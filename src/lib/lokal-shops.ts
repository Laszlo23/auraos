/** Editorial extras for known shops. Never invent reviews or star counts. */

export type LokalServiceSpotlight = {
  title: string;
  blurb: string;
};

export type LokalShopEditorial = {
  story: string;
  services: string[];
  serviceDetails: LokalServiceSpotlight[];
  secondStudioNote?: string;
  googleFindCopy?: string;
  ownerAvatar?: string;
};

export const LOKAL_SHOP_EDITORIAL: Record<string, LokalShopEditorial> = {
  "koerperglanz-shapeline": {
    story:
      "Körperglanz & Shape-Line ist deine Wohlfühloase mitten in Wien oder Mödling. Wir verbinden straffende Behandlungen mit exklusiven Beauty-Treatments, um dir ein einzigartiges Erlebnis zu bieten.",
    services: [
      "BodyShapen",
      "The Shape-Line Slimmer",
      "EMF Styler",
      "Beckenboden Trainer",
      "Körperbehandlungen",
      "Anti Cellulite",
      "Kosmetik",
    ],
    serviceDetails: [
      { title: "BodyShapen", blurb: "Bring Bewegung in dein Leben." },
      { title: "The Shape-Line Slimmer", blurb: "Die ultimative Behandlung für den Zentimeterverlust." },
      { title: "EMF Styler", blurb: "Muskelaufbau trifft auf Tiefenwirkung." },
      { title: "Beckenboden Trainer", blurb: "Ein starker Beckenboden verbessert Lebensqualität und Gesundheit." },
      { title: "Körperbehandlungen", blurb: "Körperbehandlungen für dein Wohlgefühl." },
      { title: "Anti Cellulite", blurb: "Gezielte Straffung für feste Haut." },
      { title: "Kosmetik", blurb: "Bringe deine Haut zum Strahlen." },
    ],
    secondStudioNote: "Zweites Studio in Mödling: Neudorfer Straße 2, 2340 — kein zweites Listing.",
    googleFindCopy: "Gäste finden uns auf Google",
    ownerAvatar: "/crew/martina.png",
  },
};

export function editorialForSlug(slug: string | null | undefined): LokalShopEditorial | null {
  if (!slug) return null;
  return LOKAL_SHOP_EDITORIAL[slug] ?? null;
}

export function defaultShopStory(parts: {
  name: string;
  city?: string | null;
  niche?: string | null;
}): string {
  const where = parts.city?.trim() ? ` in ${parts.city.trim()}` : "";
  const niche = parts.niche?.trim() ? ` · ${parts.niche.trim()}` : "";
  return `${parts.name} ist ein lokaler Betrieb${where}${niche}. Hier checkst du als Nachbar ein und findest uns auf Google — echte Besuche, keine erfundenen Sterne.`;
}

export function formatShopAddress(parts: {
  street?: string | null;
  postal_code?: string | null;
  city?: string | null;
  district?: string | null;
}): string | null {
  const line = [parts.street, [parts.postal_code, parts.city].filter(Boolean).join(" ")]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(", ");
  return line || null;
}

export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("0") && !digits.startsWith("00")) {
    return `tel:+43${digits.slice(1)}`;
  }
  return `tel:${digits}`;
}

export function mapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function mapsEmbedUrl(query: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

export function checkinQrUrl(deepLink: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(deepLink)}`;
}
