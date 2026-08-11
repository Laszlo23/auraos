#!/usr/bin/env node
/**
 * TanStack Start + Nitro sometimes emits a stub
 * `.output/server/_tanstack-start-manifest_v.mjs` that still points at
 * `/@id/virtual:tanstack-start-dev-client-entry` (Vite dev only).
 * The real production manifest is the hashed sibling
 * `_tanstack-start-manifest_v-*.mjs`.
 *
 * Without this fix, browsers hang forever waiting for a 404 module.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const serverDir = path.resolve(process.cwd(), ".output/server");
const stubName = "_tanstack-start-manifest_v.mjs";

const files = await readdir(serverDir);
const hashed = files
  .filter((f) => /^_tanstack-start-manifest_v-.+\.mjs$/.test(f))
  .sort((a, b) => b.length - a.length);

if (hashed.length === 0) {
  console.error("[fix-start-manifest] no hashed manifest found in", serverDir);
  process.exit(1);
}

const real = hashed[0];
const stubPath = path.join(serverDir, stubName);
let stub = "";
try {
  stub = await readFile(stubPath, "utf8");
} catch {
  stub = "";
}

const needsFix =
  !stub ||
  stub.includes("virtual:tanstack-start-dev-client-entry") ||
  (!stub.includes("/assets/") && !/export\s*\{\s*tsrStartManifest\s*\}/.test(stub));

if (!needsFix) {
  console.log("[fix-start-manifest] stub already healthy");
  process.exit(0);
}

const next = `export { tsrStartManifest } from "./${real}";\n`;
await writeFile(stubPath, next, "utf8");
console.log(`[fix-start-manifest] rewrote ${stubName} → ${real}`);
