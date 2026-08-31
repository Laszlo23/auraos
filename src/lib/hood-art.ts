import { readFileSync } from "node:fs";
import { join } from "node:path";

import { HOOD } from "@/lib/hood";
import { resolveHoodTraits, type HoodSealId, type HoodTraits } from "@/lib/hood-traits";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sealMarkup(id: HoodSealId, accent: string): string {
  switch (id) {
    case "crown":
      return `<path d="M18 38 L18 20 L30 30 L40 12 L50 30 L62 20 L62 38 Z" fill="${accent}" />`;
    case "rose":
      return `<circle cx="40" cy="26" r="12" fill="${accent}" /><circle cx="32" cy="30" r="8" fill="${accent}" opacity="0.75" /><rect x="38" y="34" width="4" height="12" rx="2" fill="#3dcf8e" />`;
    case "ledger":
      return `<rect x="24" y="14" width="32" height="28" rx="3" fill="${accent}" /><rect x="28" y="20" width="24" height="2" fill="#07090e" opacity="0.45" /><rect x="28" y="26" width="18" height="2" fill="#07090e" opacity="0.45" />`;
    case "rail":
      return `<rect x="16" y="28" width="48" height="6" rx="2" fill="${accent}" /><rect x="20" y="16" width="4" height="20" fill="${accent}" /><rect x="38" y="16" width="4" height="20" fill="${accent}" /><rect x="56" y="16" width="4" height="20" fill="${accent}" />`;
    case "eye":
      return `<ellipse cx="40" cy="28" rx="20" ry="11" fill="${accent}" /><circle cx="40" cy="28" r="5" fill="#07090e" /><circle cx="42" cy="26" r="1.6" fill="#f6f1e4" />`;
    case "flame":
      return `<path d="M40 10 C52 22 54 30 54 38 C54 48 48 52 40 52 C32 52 26 48 26 38 C26 30 28 22 40 10 Z" fill="${accent}" />`;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

function nogglesMarkup(fill: string, stem: string): string {
  return `
  <g transform="translate(220 248)" opacity="0.95">
    <rect x="0" y="0" width="110" height="64" rx="14" fill="${fill}" />
    <rect x="150" y="0" width="110" height="64" rx="14" fill="${fill}" />
    <rect x="110" y="22" width="40" height="16" rx="4" fill="${stem}" />
    <rect x="-14" y="16" width="16" height="28" rx="4" fill="${stem}" />
    <rect x="258" y="16" width="16" height="28" rx="4" fill="${stem}" />
    <rect x="22" y="16" width="40" height="32" rx="8" fill="#07090e" opacity="0.35" />
    <rect x="172" y="16" width="40" height="32" rx="8" fill="#07090e" opacity="0.35" />
  </g>`;
}

function characterDataUri(artPath: string): string | null {
  try {
    const rel = artPath.replace(/^\//, "");
    if (!rel.startsWith("hood/") || rel.includes("..")) return null;
    const full = join(process.cwd(), "public", rel);
    const buf = readFileSync(full);
    const mime = rel.endsWith(".png") ? "image/png" : "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export function renderHoodPassportSvg(tokenId: number): string {
  const traits: HoodTraits = resolveHoodTraits(tokenId);
  const name = escapeXml(traits.character.name);
  const role = escapeXml(traits.character.role);
  const bg = escapeXml(traits.background.label);
  const seal = escapeXml(traits.seal.label);
  const noggles = escapeXml(traits.noggles.label);
  const mood = escapeXml(traits.mood.label);
  const rarity = escapeXml(traits.rarity);
  const number = `#${traits.tokenId}`;
  const portrait = characterDataUri(traits.character.art);

  const portraitBlock = portrait
    ? `<image href="${portrait}" x="180" y="150" width="440" height="440" preserveAspectRatio="xMidYMid slice" opacity="0.98" />
  <rect x="180" y="150" width="440" height="440" fill="url(#vignette)" />
  ${nogglesMarkup(traits.noggles.fill, traits.noggles.stem)}`
    : `<circle cx="400" cy="360" r="160" fill="${traits.background.accent}" opacity="0.18" />
  <text x="400" y="370" text-anchor="middle" fill="#f6f1e4" font-family="Georgia, serif" font-size="42">${name}</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 800 800" width="800" height="800" role="img" aria-label="${escapeXml(`${HOOD.name} ${number}`)}">
  <defs>
    <linearGradient id="hall" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${traits.background.svgFrom}" />
      <stop offset="100%" stop-color="${traits.background.svgTo}" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="18%" r="62%">
      <stop offset="0%" stop-color="${traits.background.accent}" stop-opacity="0.55" />
      <stop offset="100%" stop-color="${traits.background.accent}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="vignette" cx="50%" cy="42%" r="62%">
      <stop offset="40%" stop-color="#07090e" stop-opacity="0" />
      <stop offset="100%" stop-color="#07090e" stop-opacity="0.55" />
    </radialGradient>
    <clipPath id="face">
      <rect x="180" y="150" width="440" height="440" rx="36" />
    </clipPath>
  </defs>
  <rect width="800" height="800" fill="${traits.background.svgTo}" />
  <rect width="800" height="800" fill="url(#hall)" />
  <rect width="800" height="800" fill="url(#glow)" />
  <rect x="28" y="28" width="744" height="744" rx="44" fill="none" stroke="${traits.background.accent}" stroke-opacity="0.65" stroke-width="4" />
  <rect x="48" y="48" width="704" height="704" rx="34" fill="none" stroke="#e8c36a" stroke-opacity="0.28" stroke-width="1.5" />
  <g clip-path="url(#face)">
    ${portraitBlock}
  </g>
  <text x="80" y="100" fill="#e8c36a" font-family="Georgia, serif" font-size="18" letter-spacing="5" opacity="0.9">${escapeXml(HOOD.collection.toUpperCase())} · ${rarity.toUpperCase()}</text>
  <text x="80" y="640" fill="#f6f1e4" font-family="Georgia, serif" font-size="36" font-weight="600">${escapeXml(HOOD.name)} ${number}</text>
  <text x="80" y="678" fill="${traits.background.accent}" font-family="Georgia, serif" font-size="22">${name}</text>
  <text x="80" y="706" fill="#d8d2c4" font-family="Georgia, serif" font-size="15" opacity="0.85">${role} · ${mood}</text>
  <g transform="translate(80 730)">
    <text fill="#e8c36a" font-size="12" letter-spacing="2">${escapeXml("BG")} ${bg} · ${escapeXml("NOGGLES")} ${noggles} · ${escapeXml(seal.toUpperCase())}</text>
  </g>
  <g transform="translate(640 700)">
    <rect width="100" height="52" rx="12" fill="#07090e" fill-opacity="0.55" stroke="${traits.background.accent}" stroke-opacity="0.45" />
    <g transform="translate(10 -6)">${sealMarkup(traits.seal.id, traits.background.accent)}</g>
  </g>
</svg>`;
}
