/**
 * Aura OS corporate identity — single source for colors, type, and logo files.
 * Live UI still uses CSS variables in styles.css; this file is the named CI.
 */

export const BRAND = {
  name: "Aura OS",
  short: "Aura",
  tagline: "Own a company. Let AI make money.",
  descriptor: "The AI company operating system",
  url: "https://aibusiness.fun",
  studio: "Ninty",
} as const;

/** Screen / print hex. CSS source of truth stays oklch in styles.css. */
export const BRAND_COLORS = {
  stage: { name: "Stage", hex: "#07090E", oklch: "oklch(0.125 0.022 268)", role: "Background" },
  ink: { name: "Ink", hex: "#F4F7FF", oklch: "oklch(0.985 0.006 250)", role: "Foreground" },
  cyan: { name: "Aura cyan", hex: "#4DE8F7", oklch: "oklch(0.86 0.155 196)", role: "Primary / intelligence" },
  gold: { name: "Aura gold", hex: "#F4C04A", oklch: "oklch(0.86 0.165 76)", role: "Accent / revenue" },
  austria: { name: "Austria red", hex: "#C4453A", oklch: "oklch(0.52 0.195 25)", role: "Origin bar only" },
} as const;

export const BRAND_TYPE = {
  display: { family: "Sora", use: "Headlines, wordmark, hero" },
  sans: { family: "Manrope", use: "Body, UI, buttons" },
  mono: { family: "JetBrains Mono", use: "Numbers, codes, logs" },
} as const;

export const BRAND_ASSETS = {
  mark: "/brand/aura-mark.svg",
  markPng: "/brand/aura-mark.png",
  markMono: "/brand/aura-mark-mono.svg",
  lockup: "/brand/aura-lockup.svg",
  lockupPng: "/brand/aura-lockup.png",
  logoPng: "/brand/aura-logo.png",
  logoSvg: "/brand/aura-logo.svg",
  appIcon: "/brand/aura-app-icon.svg",
  appIconPng: "/brand/aura-app-icon.png",
  favicon: "/favicon.svg",
} as const;

export const BRAND_RULES = {
  clearSpace: "Keep clear space equal to the core diameter on every side.",
  minMark: "Mark no smaller than 24px on screen, 12mm in print.",
  do: [
    "Use the living PulseOrbit in product chrome (header, hero).",
    "Use the static mark on favicons, social, press, and slides.",
    "Put cyan on intelligence / live / approve. Gold on money / seats / scarcity.",
    "Keep the gold tick — it is the human approval break in the ring.",
  ],
  dont: [
    "Do not recolor the mark to rainbow, invert cyan/gold, or drop the tick.",
    "Do not outline, rotate, or add a drop shadow to the lockup.",
    "Do not set the wordmark in any face except Sora.",
    "Do not use Austria red except as the 3px origin bar.",
  ],
} as const;
