/**
 * Legal entity, founders, and trust copy for Aura OS / Building Culture LLC.
 * Keep street address accurate — do not invent lines.
 */

export type FounderPublic = {
  id: string;
  /** Display name; null = placeholder until published. */
  name: string | null;
  role: "Founder";
  linkedin: string | null;
  /** Short public blurb. */
  blurb: string;
};

/** Five-founder roster. Names/links fill in as founders consent to publish. */
export const FOUNDERS: FounderPublic[] = [
  {
    id: "laszlo-bihary",
    name: "Laszlo Bihary",
    role: "Founder",
    linkedin: "https://www.linkedin.com/in/laszlo-bihary/",
    blurb: "Product, Web3 & AI — vision and go-to-market for Aura OS.",
  },
  {
    id: "founder-2",
    name: null,
    role: "Founder",
    linkedin: null,
    blurb: "Founding team member — name to be published.",
  },
  {
    id: "founder-3",
    name: null,
    role: "Founder",
    linkedin: null,
    blurb: "Founding team member — name to be published.",
  },
  {
    id: "founder-4",
    name: null,
    role: "Founder",
    linkedin: null,
    blurb: "Founding team member — name to be published.",
  },
  {
    id: "founder-5",
    name: null,
    role: "Founder",
    linkedin: null,
    blurb: "Founding team member — name to be published.",
  },
];

/**
 * Statutory / Impressum address for Building Culture LLC.
 * Replace `lines` with the registered office street address when confirmed.
 */
export const LEGAL_ADDRESS = {
  entity: "Building Culture LLC",
  attention: "Laszlo Bihary",
  /** Registered office lines (street, city, postal, country). Empty until confirmed. */
  lines: [] as string[],
  email: "founders@aibusiness.fun",
  /** Public note while street address is being finalized for publication. */
  pendingNote:
    "Registered office address is on file with Building Culture LLC. Email founders@aibusiness.fun for the current statutory address, or it will be published here once confirmed.",
} as const;

/** Clear separation: Aura OS product ≠ BCC (or any community meme) token. */
export const BCC_TOKEN_DISCLAIMER =
  "Aura OS does not run on, require, settle in, or depend on a BCC token. The product is subscription software (Stripe / USDC / in-app AURA metering for compute). Any BCC or other community token is separate from Aura OS operations and is not used as the operating currency of this product.";

export const TOKEN_PRODUCT_SEPARATION = [
  "Aura OS core revenue = software subscriptions and founding seats",
  "In-app AURA = company compute / rewards ledger inside the product (not a claim on BCC)",
  "Market / community tokens (including any BCC ticker) are not required to use Aura OS",
  "Fair-launch ecosystem messaging for Building Culture is community/marketing — not the product runtime",
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

export function publishedFounders(): FounderPublic[] {
  return FOUNDERS.filter((f) => Boolean(f.name));
}
