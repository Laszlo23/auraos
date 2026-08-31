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
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function renderHoodPassportSvg(tokenId: number): string {
  const traits: HoodTraits = resolveHoodTraits(tokenId);
  const name = escapeXml(traits.character.name);
  const role = escapeXml(traits.character.role);
  const bg = escapeXml(traits.background.label);
  const seal = escapeXml(traits.seal.label);
  const noggles = escapeXml(traits.noggles.label);
  const number = `#${traits.tokenId}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800" role="img" aria-label="${escapeXml(`${HOOD.name} ${number}`)}">
  <defs>
    <linearGradient id="hall" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${traits.background.svgFrom}" />
      <stop offset="100%" stop-color="${traits.background.svgTo}" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="18%" r="62%">
      <stop offset="0%" stop-color="${traits.background.accent}" stop-opacity="0.55" />
      <stop offset="100%" stop-color="${traits.background.accent}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="800" height="800" fill="${traits.background.svgTo}" />
  <rect width="800" height="800" fill="url(#hall)" />
  <rect width="800" height="800" fill="url(#glow)" />
  <rect x="36" y="36" width="728" height="728" rx="48" fill="none" stroke="${traits.background.accent}" stroke-opacity="0.55" stroke-width="3" />
  <rect x="52" y="52" width="696" height="696" rx="38" fill="none" stroke="#e8c36a" stroke-opacity="0.22" stroke-width="1" />
  <text x="80" y="118" fill="#e8c36a" font-family="Georgia, serif" font-size="22" letter-spacing="6" opacity="0.85">${escapeXml(HOOD.collection.toUpperCase())}</text>
  <text x="80" y="186" fill="#f6f1e4" font-family="Georgia, serif" font-size="54" font-weight="600">${escapeXml(HOOD.name)} ${number}</text>
  <text x="80" y="232" fill="${traits.background.accent}" font-family="Georgia, serif" font-size="26">${name}</text>
  <text x="80" y="268" fill="#d8d2c4" font-family="Georgia, serif" font-size="18" opacity="0.8">${role}</text>
  <g transform="translate(80 520)">
    <rect width="280" height="88" rx="18" fill="#07090e" fill-opacity="0.42" stroke="${traits.background.accent}" stroke-opacity="0.35" />
    <text x="22" y="36" fill="#e8c36a" font-size="13" letter-spacing="3">${escapeXml("BACKGROUND")}</text>
    <text x="22" y="64" fill="#f6f1e4" font-size="20">${bg}</text>
  </g>
  <g transform="translate(380 520)">
    <rect width="340" height="88" rx="18" fill="#07090e" fill-opacity="0.42" stroke="${traits.background.accent}" stroke-opacity="0.35" />
    <text x="22" y="36" fill="#e8c36a" font-size="13" letter-spacing="3">${escapeXml("NOGGLES")}</text>
    <text x="22" y="64" fill="#f6f1e4" font-size="20">${noggles}</text>
  </g>
  <g transform="translate(620 640)">
    <rect width="100" height="72" rx="16" fill="#07090e" fill-opacity="0.5" stroke="${traits.background.accent}" stroke-opacity="0.4" />
    ${sealMarkup(traits.seal.id, traits.background.accent)}
  </g>
  <text x="80" y="700" fill="#e8c36a" font-size="16" letter-spacing="3">${escapeXml(seal.toUpperCase())} SEAL</text>
  <text x="80" y="736" fill="#d8d2c4" font-size="14" opacity="0.7">70% launch LP · 30% developer ops · founding circle</text>
</svg>`;
}
