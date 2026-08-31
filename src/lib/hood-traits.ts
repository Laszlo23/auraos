import { HOOD_AGENTS, HOOD_COURT } from "@/lib/hood";

export const HOOD_BACKGROUND_IDS = ["palace", "salon", "garden", "hall"] as const;
export const HOOD_NOGGLES_IDS = ["gold", "emerald", "rose", "ice"] as const;
export const HOOD_SEAL_IDS = ["crown", "rose", "ledger", "rail"] as const;

export type HoodBackgroundId = (typeof HOOD_BACKGROUND_IDS)[number];
export type HoodNogglesId = (typeof HOOD_NOGGLES_IDS)[number];
export type HoodSealId = (typeof HOOD_SEAL_IDS)[number];

export type HoodCharacter = {
  id: string;
  art: string;
  name: string;
  role: string;
};

export type HoodBackground = {
  id: HoodBackgroundId;
  label: string;
  css: string;
  svgFrom: string;
  svgTo: string;
  accent: string;
};

export type HoodNoggles = {
  id: HoodNogglesId;
  label: string;
  fill: string;
  stem: string;
};

export type HoodSeal = {
  id: HoodSealId;
  label: string;
};

export type HoodTraits = {
  tokenId: number;
  background: HoodBackground;
  character: HoodCharacter;
  noggles: HoodNoggles;
  seal: HoodSeal;
};

export const HOOD_CHARACTERS: readonly HoodCharacter[] = [
  ...HOOD_COURT.map((row) => ({
    id: row.id,
    art: row.art,
    name: row.en,
    role: row.enRole,
  })),
  ...HOOD_AGENTS.map((row) => ({
    id: row.id,
    art: row.art,
    name: row.name,
    role: row.enRole,
  })),
];

export const HOOD_BACKGROUNDS: readonly HoodBackground[] = [
  {
    id: "palace",
    label: "Emerald Palace",
    css: "radial-gradient(ellipse 85% 70% at 50% 0%, oklch(0.46 0.13 155 / 0.95), oklch(0.16 0.05 150) 52%, oklch(0.07 0.02 140))",
    svgFrom: "#1f5a42",
    svgTo: "#07090e",
    accent: "#3dcf8e",
  },
  {
    id: "salon",
    label: "Marble Salon",
    css: "radial-gradient(ellipse 80% 65% at 48% 8%, oklch(0.78 0.06 85 / 0.55), oklch(0.28 0.03 70) 50%, oklch(0.09 0.02 60))",
    svgFrom: "#5a4a32",
    svgTo: "#0c0a08",
    accent: "#e8c36a",
  },
  {
    id: "garden",
    label: "Night Garden",
    css: "radial-gradient(ellipse 75% 70% at 60% 10%, oklch(0.42 0.1 200 / 0.7), oklch(0.16 0.06 170) 48%, oklch(0.06 0.03 200))",
    svgFrom: "#163a44",
    svgTo: "#06080d",
    accent: "#e08aa4",
  },
  {
    id: "hall",
    label: "Gold Hall",
    css: "radial-gradient(ellipse 90% 60% at 50% -4%, oklch(0.82 0.16 85 / 0.55), oklch(0.22 0.06 80) 46%, oklch(0.07 0.02 70))",
    svgFrom: "#4a3814",
    svgTo: "#08070a",
    accent: "#f0d48a",
  },
];

export const HOOD_NOGGLES: readonly HoodNoggles[] = [
  { id: "gold", label: "Gold Noggles", fill: "#e8c36a", stem: "#c9a24a" },
  { id: "emerald", label: "Emerald Noggles", fill: "#3dcf8e", stem: "#24966a" },
  { id: "rose", label: "Rose Noggles", fill: "#e08aa4", stem: "#b45d78" },
  { id: "ice", label: "Ice Noggles", fill: "#9fd4ff", stem: "#6aa8d4" },
];

export const HOOD_SEALS: readonly HoodSeal[] = [
  { id: "crown", label: "Crown" },
  { id: "rose", label: "Rose" },
  { id: "ledger", label: "Ledger" },
  { id: "rail", label: "Gold Rail" },
];

/** Stable 32-bit mix so the same tokenId always yields the same layers. */
export function mixTokenId(tokenId: number): number {
  let x = Math.imul(tokenId | 0, 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

function pick<T>(list: readonly T[], index: number): T {
  const item = list[index % list.length];
  if (!item) throw new Error("Hood trait list is empty");
  return item;
}

export function resolveHoodTraits(tokenId: number): HoodTraits {
  const id = Math.max(1, Math.floor(Number(tokenId) || 1));
  const h = mixTokenId(id);
  return {
    tokenId: id,
    background: pick(HOOD_BACKGROUNDS, h & 0xff),
    character: pick(HOOD_CHARACTERS, (h >>> 8) & 0xff),
    noggles: pick(HOOD_NOGGLES, (h >>> 16) & 0xff),
    seal: pick(HOOD_SEALS, (h >>> 24) & 0xff),
  };
}

export function hoodTraitAttributes(traits: HoodTraits) {
  return [
    { trait_type: "Background", value: traits.background.label },
    { trait_type: "Character", value: traits.character.name },
    { trait_type: "Noggles", value: traits.noggles.label },
    { trait_type: "Seal", value: traits.seal.label },
  ] as const;
}
