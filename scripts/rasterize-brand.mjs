#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { Resvg } = await import("@resvg/resvg-js");

async function png(svgRel, outRel, width) {
  const svg = await readFile(join(root, svgRel));
  const renderer = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    background: "rgba(0,0,0,0)",
    font: { loadSystemFonts: true },
  });
  const img = renderer.render();
  const dest = join(root, outRel);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, img.asPng());
  console.log(outRel, width);
}

await png("public/brand/aura-mark.svg", "public/brand/aura-mark.png", 512);
await png("public/brand/aura-app-icon.svg", "public/brand/aura-app-icon.png", 512);
await png("public/brand/aura-app-icon.svg", "public/icons/icon-512.png", 512);
await png("public/brand/aura-app-icon.svg", "public/icons/icon-192.png", 192);
await png("public/brand/aura-app-icon.svg", "public/icons/apple-touch-icon.png", 180);
await png("public/brand/aura-app-icon.svg", "public/icons/maskable-512.png", 512);
await png("public/brand/aura-app-icon.svg", "public/favicon.png", 48);
await png("public/brand/aura-lockup.svg", "public/brand/aura-lockup.png", 1840);
await png("public/brand/aura-logo.svg", "public/brand/aura-logo.png", 1600);
console.log("ok");
