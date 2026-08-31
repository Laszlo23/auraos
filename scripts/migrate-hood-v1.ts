/**
 * Snapshot Launch Desk v1 (90-day gift lock) before cutting over to Desk v2.
 * Prints totalMinted + ownerOf for each token. Use this list to mint matching
 * v2 Hoods + fundPaid/allocate before promoting the new CAs publicly.
 *
 * Usage: npx tsx scripts/migrate-hood-v1.ts [--sepolia]
 * Reads v1 CAs from contracts/launch/AuraLaunch.v1-superseded.json (or env).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createPublicClient, http, type Hex } from "viem";
import { base, baseSepolia } from "viem/chains";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const PASSPORT_ABI = [
  {
    type: "function",
    name: "totalMinted",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

function loadDotenv() {
  const path = join(ROOT, ".env");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function rpcFor(sepolia: boolean): string {
  const alchemy = process.env["ALCHEMY_API_KEY"]?.trim();
  if (sepolia) {
    if (alchemy) return `https://base-sepolia.g.alchemy.com/v2/${alchemy}`;
    return "https://sepolia.base.org";
  }
  const explicit = process.env["ALCHEMY_BASE_URL"]?.trim();
  if (explicit) return explicit;
  if (alchemy) return `https://base-mainnet.g.alchemy.com/v2/${alchemy}`;
  return "https://mainnet.base.org";
}

async function main() {
  loadDotenv();
  const sepolia = process.argv.includes("--sepolia");
  const artifactPath = join(
    ROOT,
    "contracts/launch",
    sepolia ? "AuraLaunch.sepolia.v1-superseded.json" : "AuraLaunch.v1-superseded.json",
  );
  let passport =
    (process.env["HOOD_V1_PASSPORT"] || process.env["GENESIS_NFT_CONTRACT"] || "").trim() || null;
  if (existsSync(artifactPath)) {
    const art = JSON.parse(readFileSync(artifactPath, "utf8")) as { passport?: string };
    if (art.passport) passport = art.passport;
  }
  if (!passport || !/^0x[0-9a-fA-F]{40}$/.test(passport)) {
    throw new Error("Set HOOD_V1_PASSPORT or keep AuraLaunch.v1-superseded.json with passport CA");
  }

  const chain = sepolia ? baseSepolia : base;
  const publicClient = createPublicClient({ chain, transport: http(rpcFor(sepolia)) });
  const total = (await publicClient.readContract({
    address: passport as Hex,
    abi: PASSPORT_ABI,
    functionName: "totalMinted",
  })) as bigint;

  const holders: Array<{ tokenId: number; owner: string }> = [];
  for (let id = 1; id <= Number(total); id++) {
    try {
      const owner = (await publicClient.readContract({
        address: passport as Hex,
        abi: PASSPORT_ABI,
        functionName: "ownerOf",
        args: [BigInt(id)],
      })) as string;
      holders.push({ tokenId: id, owner });
    } catch {
      // token may not exist if ids are sparse
    }
  }

  const out = {
    deskVersion: 1,
    superseded: true,
    chainId: chain.id,
    passport,
    totalMinted: Number(total),
    holders,
    snapshottedAt: new Date().toISOString(),
    migrateNote:
      holders.length === 0
        ? "No v1 Hoods minted — cut over to Desk v2 with no holder migration."
        : "Mint matching tokenIds on v2 passport to these owners (fundPaid + mintFromDesk / mintGift) before public v2 push.",
  };

  const outFile = join(
    ROOT,
    "contracts/launch",
    sepolia ? "AuraLaunch.sepolia.v1-snapshot.json" : "AuraLaunch.v1-snapshot.json",
  );
  writeFileSync(outFile, JSON.stringify(out, null, 2));
  process.stdout.write(
    [
      `v1 passport ${passport} on ${chain.name}`,
      `totalMinted ${total}`,
      `holders snapshotted ${holders.length}`,
      `wrote ${outFile}`,
      out.migrateNote,
      "",
    ].join("\n"),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
