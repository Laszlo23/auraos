/**
 * Submit AuraPrivateSale to Sourcify (Basescan-compatible source).
 * Usage: npx tsx scripts/verify-private-sale-sourcify.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import solc from "solc";

import { PRIVATE_SALE_CONTRACT_LIVE } from "../src/lib/private-sale";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = "contracts/private-sale/AuraPrivateSale.sol";
const TX = "0x684b33ab72d4184676574a193eb82d871f650ee5a052f2f7b4d691da6c797106";

function collectSources() {
  const sources: Record<string, { content: string }> = {};
  const queue = [SOURCE];
  while (queue.length) {
    const path = queue.pop()!;
    if (sources[path]) continue;
    const abs = path.startsWith("contracts/") ? join(ROOT, path) : join(ROOT, "node_modules", path);
    if (!existsSync(abs)) throw new Error(`Missing ${path}`);
    const content = readFileSync(abs, "utf8");
    sources[path] = { content };
    const imports = [...content.matchAll(/import\s+(?:{[^}]+}\s+from\s+)?["']([^"']+)["']/g)];
    for (const match of imports) {
      const raw = match[1];
      if (!raw) continue;
      if (raw.startsWith("@")) {
        queue.push(raw);
        continue;
      }
      const next = join(dirname(path), raw).replace(/\\/g, "/");
      queue.push(next);
    }
  }
  return sources;
}

async function main() {
  const sources = collectSources();
  const stdJsonInput = {
    language: "Solidity",
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
    },
  };
  const res = await fetch(
    `https://sourcify.dev/server/v2/verify/8453/${PRIVATE_SALE_CONTRACT_LIVE}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stdJsonInput,
        compilerVersion: solc.version().replace(/\.Emscripten\.clang$/, ""),
        contractIdentifier: `${SOURCE}:AuraPrivateSale`,
        creationTransactionHash: TX,
      }),
    },
  );
  const text = await res.text();
  process.stdout.write(`${res.status} ${text}\n`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
