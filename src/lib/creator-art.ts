/** Procedural cover art for creator collections (slug-based SVG). */

function hashSlug(slug: string): number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hueFromHash(h: number): number {
  return h % 360;
}

export function renderCreatorCollectionSvg(slug: string, name?: string): string {
  const h = hashSlug(slug.toLowerCase());
  const hue = hueFromHash(h);
  const hue2 = (hue + 47 + (h % 80)) % 360;
  const label = (name || slug).trim().slice(0, 24).toUpperCase();
  const initial = label.charAt(0) || "◈";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="hsl(${hue} 68% 8%)"/>
      <stop offset="45%" stop-color="hsl(${hue2} 55% 14%)"/>
      <stop offset="100%" stop-color="hsl(${(hue + 140) % 360} 60% 6%)"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="35%" r="58%">
      <stop offset="0%" stop-color="hsl(${hue} 95% 58% / 0.55)"/>
      <stop offset="100%" stop-color="hsl(${hue} 95% 58% / 0)"/>
    </radialGradient>
    <linearGradient id="holo" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="hsl(${hue} 90% 72% / 0.9)"/>
      <stop offset="50%" stop-color="hsl(${(hue + 60) % 360} 85% 68% / 0.85)"/>
      <stop offset="100%" stop-color="hsl(${hue2} 88% 75% / 0.9)"/>
    </linearGradient>
    <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="22"/>
    </filter>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(${hue} 50% 50% / 0.08)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <rect width="800" height="800" fill="url(#grid)"/>
  <circle cx="400" cy="280" r="300" fill="url(#glow)" filter="url(#blur)"/>
  <g opacity="0.15" fill="none" stroke="url(#holo)" stroke-width="1.5">
    ${Array.from({ length: 8 }, (_, i) => {
      const r = 100 + i * 32;
      return `<circle cx="400" cy="400" r="${r}"/>`;
    }).join("")}
  </g>
  <polygon points="400,120 460,200 540,200 480,260 500,340 400,300 300,340 320,260 260,200 340,200" fill="none" stroke="url(#holo)" stroke-width="2" opacity="0.35"/>
  <text x="400" y="430" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" font-size="200" font-weight="800" fill="url(#holo)">${initial}</text>
  <text x="400" y="555" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" font-size="26" font-weight="700" letter-spacing="0.32em" fill="hsl(${hue} 35% 82% / 0.92)">${label}</text>
  <text x="400" y="600" text-anchor="middle" font-family="ui-monospace,monospace" font-size="14" letter-spacing="0.24em" fill="hsl(${hue} 40% 62% / 0.75)">ROBINHOOD · AURA CREATOR</text>
  <rect x="40" y="40" width="720" height="720" rx="36" fill="none" stroke="url(#holo)" stroke-width="2" opacity="0.45"/>
  <rect x="56" y="56" width="688" height="688" rx="28" fill="none" stroke="hsl(${hue} 60% 70% / 0.12)" stroke-width="1"/>
</svg>`;
}
