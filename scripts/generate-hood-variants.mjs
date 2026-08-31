#!/usr/bin/env node
/**
 * Generate diverse Aura Hood character stills via Gemini image models.
 *
 * Usage:
 *   set -a && source .env && set +a
 *   node scripts/generate-hood-variants.mjs
 *
 * Writes JPG (800×800) into public/hood/ and prints a JSON roster snippet.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = join(ROOT, "public/hood");
mkdirSync(OUT, { recursive: true });

const key =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
  process.env.GOOGLE_API_KEY;
if (!key) {
  console.error("GEMINI_API_KEY missing");
  process.exit(1);
}

const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

const BASE =
  "Square 1:1 character portrait, 800px feel, premium collectible NFT art for Aura Hood. " +
  "Stylized voxel-meets-cinematic figure wearing a dramatic hooded cloak. " +
  "NO red glasses baked in — leave the eye area clear or softly shaded so colored noggles can overlay later. " +
  "Distinct silhouette, rich materials, sharp lighting, no text, no watermark, no logo.";

/** Deliberately different axes so the collection does not look cloned. */
const VARIANTS = [
  {
    id: "phantom",
    name: "The Phantom",
    role: "Moves unseen",
    prompt: `${BASE} Midnight charcoal velvet hood with silver thread. Pale cool skin, indigo rim light, empty opera house void background. Moody noir, almost monochrome blue-black.`,
  },
  {
    id: "muse",
    name: "The Muse",
    role: "Sets the tone",
    prompt: `${BASE} Soft pearl-white silk hood with rose-gold trim. Warm peach skin, daylight marble salon with blush flowers. Elegant, feminine, airy pastel gold.`,
  },
  {
    id: "warden",
    name: "The Warden",
    role: "Holds the gate",
    prompt: `${BASE} Heavy crimson leather hood with brass rivets. Strong jaw, torchlit stone gatehouse. Harsh side light, medieval-meets-cyber.`,
  },
  {
    id: "courier",
    name: "The Courier",
    role: "Runs the rails",
    prompt: `${BASE} Neon teal tech-hood with mesh panels. Motion-blur night city rain, cyan reflections. Street energy, kinetic angle, three-quarter turn.`,
  },
  {
    id: "herald",
    name: "The Herald",
    role: "Calls the room",
    prompt: `${BASE} Royal purple velvet hood with gold embroidery. Bronze skin, grand gold hall columns. Confident frontal pose, ceremonial.`,
  },
  {
    id: "spymaster",
    name: "The Spymaster",
    role: "Knows the ledger",
    prompt: `${BASE} Matte black hood with emerald lining peek. Olive skin, candlelit map room with green glass. Close crop, conspiratorial.`,
  },
  {
    id: "cartographer",
    name: "The Cartographer",
    role: "Charts the next",
    prompt: `${BASE} Sand-colored linen hood with brass sextant pin. Sunlit desert observatory, amber haze. Weathered, explorer vibe.`,
  },
  {
    id: "gardener",
    name: "The Gardener",
    role: "Grows the yield",
    prompt: `${BASE} Living moss-green hood woven with vines and tiny blooms. Bioluminescent night garden. Soft glow, organic textures.`,
  },
  {
    id: "raider",
    name: "The Raider",
    role: "Breaks the quiet",
    prompt: `${BASE} Scorched orange utility hood with soot marks. Industrial furnace glow, sparks. Aggressive low angle, raw.`,
  },
  {
    id: "sibyl",
    name: "The Sibyl",
    role: "Reads the fog",
    prompt: `${BASE} Translucent ice-blue hood like frosted glass. Misty shoreline dawn, cool lavender light. Ethereal, distant gaze.`,
  },
  {
    id: "broker",
    name: "The Broker",
    role: "Closes the book",
    prompt: `${BASE} Charcoal pinstripe hood with gold cufflinks vibe. Trading floor bokeh screens, teal and gold. Sharp, modern, corporate cool.`,
  },
  {
    id: "fool",
    name: "The Fool",
    role: "Flips the table",
    prompt: `${BASE} Harlequin split hood — hot magenta and electric yellow. Carnival chaos lights, playful smirk. Maximal color, asymmetric.`,
  },
];

async function generate(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
  });
  if (!res.ok) {
    throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = await res.json();
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return {
        bytes: Buffer.from(part.inlineData.data, "base64"),
        mime: part.inlineData.mimeType || "image/png",
      };
    }
  }
  throw new Error("No image in response");
}

function toJpg(srcPath, destPath) {
  // macOS sips → JPEG 800×800
  execFileSync("sips", ["-s", "format", "jpeg", "-Z", "800", srcPath, "--out", destPath], {
    stdio: "ignore",
  });
}

const roster = [];
for (const v of VARIANTS) {
  const jpg = join(OUT, `${v.id}.jpg`);
  if (existsSync(jpg) && process.env.FORCE !== "1") {
    console.log("skip existing", v.id);
    roster.push(v);
    continue;
  }
  process.stdout.write(`gen ${v.id}… `);
  try {
    const { bytes, mime } = await generate(v.prompt);
    const tmp = join(OUT, `${v.id}.raw`);
    writeFileSync(tmp, bytes);
    const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "bin";
    const staged = join(OUT, `${v.id}.${ext}`);
    writeFileSync(staged, bytes);
    toJpg(staged, jpg);
    console.log("ok", jpg);
    roster.push(v);
  } catch (e) {
    console.log("FAIL", e instanceof Error ? e.message : e);
  }
}

console.log("\nRoster ready:", roster.length);
console.log(
  JSON.stringify(
    roster.map((r) => ({ id: r.id, art: `/hood/${r.id}.jpg`, name: r.name, role: r.role })),
    null,
    2,
  ),
);
