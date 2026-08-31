import { HOOD_AGENTS, HOOD_COURT, HOOD_LEGENDS } from "@/lib/hood";

export const HOOD_BACKGROUND_IDS = [
  "palace",
  "salon",
  "garden",
  "hall",
  "void",
  "neon",
  "forge",
  "mist",
] as const;
export const HOOD_NOGGLES_IDS = [
  "gold",
  "emerald",
  "rose",
  "ice",
  "obsidian",
  "violet",
  "amber",
  "chrome",
] as const;
export const HOOD_SEAL_IDS = ["crown", "rose", "ledger", "rail", "eye", "flame"] as const;
export const HOOD_MOOD_IDS = ["dawn", "noon", "dusk", "void", "neon", "gilded"] as const;
export const HOOD_FRAME_IDS = ["thin", "royal", "hex", "brutal"] as const;

export type HoodBackgroundId = (typeof HOOD_BACKGROUND_IDS)[number];
export type HoodNogglesId = (typeof HOOD_NOGGLES_IDS)[number];
export type HoodSealId = (typeof HOOD_SEAL_IDS)[number];
export type HoodMoodId = (typeof HOOD_MOOD_IDS)[number];
export type HoodFrameId = (typeof HOOD_FRAME_IDS)[number];

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

export type HoodMood = {
  id: HoodMoodId;
  label: string;
  /** CSS filter applied to the character layer. */
  filter: string;
  /** Soft color wash over the portrait. */
  wash: string;
};

export type HoodFrame = {
  id: HoodFrameId;
  label: string;
  borderClass: string;
  radiusClass: string;
};

export type HoodTraits = {
  tokenId: number;
  background: HoodBackground;
  character: HoodCharacter;
  noggles: HoodNoggles;
  seal: HoodSeal;
  mood: HoodMood;
  frame: HoodFrame;
  rarity: "Common" | "Uncommon" | "Rare" | "Legendary";
};

export const HOOD_CHARACTERS: readonly HoodCharacter[] = [
  ...HOOD_COURT.map((row) => ({
    id: row.id,
    art: row.art,
    name: row.en,
    role: row.enRole,
  })),
  ...HOOD_LEGENDS.map((row) => ({
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
  {
    id: "void",
    label: "Deep Void",
    css: "radial-gradient(ellipse 70% 60% at 50% 40%, oklch(0.22 0.08 280 / 0.9), oklch(0.08 0.04 270) 55%, oklch(0.04 0.02 260))",
    svgFrom: "#1a1030",
    svgTo: "#040208",
    accent: "#a78bfa",
  },
  {
    id: "neon",
    label: "Neon Alley",
    css: "radial-gradient(ellipse 80% 70% at 20% 10%, oklch(0.55 0.22 200 / 0.7), transparent 50%), radial-gradient(ellipse 70% 60% at 90% 80%, oklch(0.5 0.25 330 / 0.55), oklch(0.08 0.05 300))",
    svgFrom: "#0e3a4a",
    svgTo: "#12081c",
    accent: "#22d3ee",
  },
  {
    id: "forge",
    label: "Forge Glow",
    css: "radial-gradient(ellipse 90% 70% at 50% 100%, oklch(0.55 0.2 40 / 0.85), oklch(0.2 0.08 30) 45%, oklch(0.07 0.03 20))",
    svgFrom: "#6b2a12",
    svgTo: "#0a0604",
    accent: "#fb923c",
  },
  {
    id: "mist",
    label: "Silver Mist",
    css: "radial-gradient(ellipse 85% 75% at 50% 20%, oklch(0.72 0.03 220 / 0.55), oklch(0.28 0.02 230) 50%, oklch(0.09 0.02 240))",
    svgFrom: "#3a4550",
    svgTo: "#0a0c10",
    accent: "#cbd5e1",
  },
];

export const HOOD_NOGGLES: readonly HoodNoggles[] = [
  { id: "gold", label: "Gold Noggles", fill: "#e8c36a", stem: "#c9a24a" },
  { id: "emerald", label: "Emerald Noggles", fill: "#3dcf8e", stem: "#24966a" },
  { id: "rose", label: "Rose Noggles", fill: "#e08aa4", stem: "#b45d78" },
  { id: "ice", label: "Ice Noggles", fill: "#9fd4ff", stem: "#6aa8d4" },
  { id: "obsidian", label: "Obsidian Noggles", fill: "#1f2937", stem: "#0f172a" },
  { id: "violet", label: "Violet Noggles", fill: "#c084fc", stem: "#7c3aed" },
  { id: "amber", label: "Amber Noggles", fill: "#fbbf24", stem: "#d97706" },
  { id: "chrome", label: "Chrome Noggles", fill: "#e2e8f0", stem: "#94a3b8" },
];

export const HOOD_SEALS: readonly HoodSeal[] = [
  { id: "crown", label: "Crown" },
  { id: "rose", label: "Rose" },
  { id: "ledger", label: "Ledger" },
  { id: "rail", label: "Gold Rail" },
  { id: "eye", label: "All-Seeing" },
  { id: "flame", label: "Forge Flame" },
];

export const HOOD_MOODS: readonly HoodMood[] = [
  {
    id: "dawn",
    label: "Dawn",
    filter: "saturate(1.05) contrast(1.02) brightness(1.04)",
    wash: "linear-gradient(180deg, oklch(0.85 0.08 80 / 0.18), transparent 42%)",
  },
  {
    id: "noon",
    label: "High Noon",
    filter: "saturate(1.12) contrast(1.08)",
    wash: "linear-gradient(160deg, oklch(0.9 0.05 95 / 0.12), transparent 50%)",
  },
  {
    id: "dusk",
    label: "Dusk",
    filter: "saturate(1.1) hue-rotate(-8deg) brightness(0.96)",
    wash: "linear-gradient(200deg, oklch(0.55 0.14 30 / 0.22), transparent 55%)",
  },
  {
    id: "void",
    label: "Void",
    filter: "saturate(0.75) contrast(1.15) brightness(0.92)",
    wash: "linear-gradient(180deg, oklch(0.35 0.12 280 / 0.28), transparent 50%)",
  },
  {
    id: "neon",
    label: "Neon",
    filter: "saturate(1.35) contrast(1.12) hue-rotate(12deg)",
    wash: "linear-gradient(135deg, oklch(0.7 0.2 200 / 0.2), oklch(0.6 0.22 330 / 0.18), transparent 60%)",
  },
  {
    id: "gilded",
    label: "Gilded",
    filter: "saturate(1.15) contrast(1.05) sepia(0.18)",
    wash: "linear-gradient(180deg, oklch(0.82 0.14 85 / 0.22), transparent 48%)",
  },
];

export const HOOD_FRAMES: readonly HoodFrame[] = [
  {
    id: "thin",
    label: "Thin Gold",
    borderClass: "border border-gold/30",
    radiusClass: "rounded-[1.35rem]",
  },
  {
    id: "royal",
    label: "Royal",
    borderClass: "border-2 border-gold/55",
    radiusClass: "rounded-[1.6rem]",
  },
  {
    id: "hex",
    label: "Hex Cut",
    borderClass: "border border-emerald-400/40",
    radiusClass: "rounded-[1.1rem]",
  },
  {
    id: "brutal",
    label: "Brutal",
    borderClass: "border-2 border-foreground/35",
    radiusClass: "rounded-md",
  },
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

function rarityFor(tokenId: number, h: number): HoodTraits["rarity"] {
  // Reserved bands + hash — keep Legendary scarce.
  if (tokenId <= 12 || tokenId === 777 || tokenId === 1000) return "Legendary";
  const roll = h % 100;
  if (roll < 8) return "Legendary";
  if (roll < 28) return "Rare";
  if (roll < 58) return "Uncommon";
  return "Common";
}

export function resolveHoodTraits(tokenId: number): HoodTraits {
  const id = Math.max(1, Math.floor(Number(tokenId) || 1));
  const h = mixTokenId(id);
  const h2 = mixTokenId(id * 0x9e3779b1);
  return {
    tokenId: id,
    background: pick(HOOD_BACKGROUNDS, h & 0xff),
    character: pick(HOOD_CHARACTERS, (h >>> 8) & 0xff),
    noggles: pick(HOOD_NOGGLES, (h >>> 16) & 0xff),
    seal: pick(HOOD_SEALS, (h >>> 24) & 0xff),
    mood: pick(HOOD_MOODS, h2 & 0xff),
    frame: pick(HOOD_FRAMES, (h2 >>> 8) & 0xff),
    rarity: rarityFor(id, h2 >>> 16),
  };
}

export function hoodTraitAttributes(traits: HoodTraits) {
  return [
    { trait_type: "Background", value: traits.background.label },
    { trait_type: "Character", value: traits.character.name },
    { trait_type: "Noggles", value: traits.noggles.label },
    { trait_type: "Seal", value: traits.seal.label },
    { trait_type: "Mood", value: traits.mood.label },
    { trait_type: "Frame", value: traits.frame.label },
    { trait_type: "Rarity", value: traits.rarity },
  ] as const;
}
