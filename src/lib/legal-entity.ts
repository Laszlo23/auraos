/**
 * Legal entity, founders, and trust copy for Aura OS / Ninty LLC.
 * Keep street address accurate — do not invent lines.
 * Impressum-responsible person is Laszlo only. The Wien crew is public team, not legal officers.
 */

export type TeamPublic = {
  id: string;
  name: string;
  /** True when family name is withheld on purpose. */
  lastNamePending?: boolean;
  /** Public crew label — not a statutory title. */
  title: string;
  linkedin: string | null;
  blurb: string;
  blurbEn: string;
  avatar: string;
  /** Only the operator is listed as Impressum-responsible. */
  impressum: boolean;
  /** Public /b/$slug when the founder has a Lokal listing. */
  shopSlug?: string;
};

/** Named Gründungsteam Wien. Empty TBA slots are gone. */
export const FOUNDERS: TeamPublic[] = [
  {
    id: "laszlo-bihary",
    name: "Laszlo Bihary",
    title: "Operator · Aura OS",
    linkedin: "https://www.linkedin.com/in/laszlo-bihary/",
    blurb: "Product, Web3 & AI — Vision und Go-to-Market für Aura OS.",
    blurbEn: "Product, Web3 & AI — vision and go-to-market for Aura OS.",
    avatar: "/crew/laszlo.png",
    impressum: true,
  },
  {
    id: "martina-schulz",
    name: "Martina Schulz",
    title: "Gründungsteam Wien",
    linkedin: null,
    blurb: "Betriebe, Menschen — Körperglanz & Shape-Line am Rennweg.",
    blurbEn: "Shops, people — Körperglanz & Shape-Line on Rennweg.",
    avatar: "/crew/martina.png",
    impressum: false,
    shopSlug: "koerperglanz-shapeline",
  },
  {
    id: "darco",
    name: "Darko Tanackovic",
    title: "Gründungsteam Wien",
    linkedin: null,
    blurb: "Straße, Autos — Ankauf und Verkauf, ehrlich und ohne Druck.",
    blurbEn: "Street, cars — buy and sell, honest and without pressure.",
    avatar: "/crew/darco.png",
    impressum: false,
    shopSlug: "darko-auto-wien",
  },
  {
    id: "evreen",
    name: "Evren Demir",
    title: "Gründungsteam Wien",
    linkedin: null,
    blurb: "Vertrieb Pion Professional — Männerpflege, Showroom Seestadt.",
    blurbEn: "Pion Professional sales — men's care, Seestadt showroom.",
    avatar: "/crew/evreen.png",
    impressum: false,
    shopSlug: "pion-professional",
  },
  {
    id: "martin",
    name: "Mart Johann",
    title: "Gründungsteam Wien",
    linkedin: null,
    blurb: "Der der den Betrieb zusammenhält, wenn’s ernst wird.",
    blurbEn: "The one who holds the shop together when it gets serious.",
    avatar: "/crew/martin.png",
    impressum: false,
  },
];

/**
 * Statutory / Impressum address for Ninty LLC.
 * Replace `lines` with the registered office street address when confirmed.
 */
export const LEGAL_ADDRESS = {
  entity: "Ninty LLC",
  attention: "Laszlo Bihary",
  /** Registered office lines (street, city, postal, country). Empty until confirmed. */
  lines: [] as string[],
  email: "founders@aibusiness.fun",
  /** Public note while street address is being finalized for publication. */
  pendingNote:
    "Registered office address is on file with Ninty LLC. Email founders@aibusiness.fun for the current statutory address, or it will be published here once confirmed.",
} as const;

/** Clear separation: Aura OS product ≠ BCC (or any community meme) token. */
export const BCC_TOKEN_DISCLAIMER =
  "Aura OS does not run on, require, settle in, or depend on a BCC token. The product is subscription software (Stripe / USDC / in-app AURA metering for compute). Any BCC or other community token is separate from Aura OS operations and is not used as the operating currency of this product.";

export const TOKEN_PRODUCT_SEPARATION = [
  "Aura OS core revenue = software subscriptions and founding seats",
  "In-app AURA = company compute / rewards ledger inside the product (not a claim on BCC)",
  "Market / community tokens (including any BCC ticker) are not required to use Aura OS",
  "Fair-launch ecosystem messaging for Ninty is community/marketing — not the product runtime",
] as const;

export function legalAddressDisplay(): string[] {
  const out = [LEGAL_ADDRESS.entity, `Attn: ${LEGAL_ADDRESS.attention}`];
  if (LEGAL_ADDRESS.lines.length > 0) {
    out.push(...LEGAL_ADDRESS.lines);
  } else {
    out.push(LEGAL_ADDRESS.pendingNote);
  }
  out.push(LEGAL_ADDRESS.email);
  return out;
}

export function publishedFounders(): TeamPublic[] {
  return FOUNDERS.filter((f) => Boolean(f.name));
}

export function impressumContact(): TeamPublic {
  return FOUNDERS.find((f) => f.impressum) ?? FOUNDERS[0];
}
