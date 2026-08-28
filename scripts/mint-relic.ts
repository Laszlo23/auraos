/**
 * Operator mint for Aura Relic. Does not print keys or the hunt phrase.
 * Usage: npx tsx scripts/mint-relic.ts --to 0x… --id 1 [--sepolia]
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ABI = parseAbi([
  "function mint(address to, uint256 tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function totalMinted() view returns (uint256)",
]);

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

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  if (i < 0) return null;
  return process.argv[i + 1] ?? null;
}

function deployerKey(): Hex {
  const raw = (
    process.env["RELIC_MINTER_KEY"] ||
    process.env["PRIVATE_SALE_DEPLOYER_KEY"] ||
    process.env["PRIVATE_KEY"] ||
    ""
  ).trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error("RELIC_MINTER_KEY / PRIVATE_KEY must be a 32-byte hex key");
  }
  return raw as Hex;
}

function contractAddress(sepolia: boolean): Address {
  const fromEnv = (
    process.env["RELIC_NFT_CONTRACT"] ||
    process.env["VITE_RELIC_NFT_CONTRACT"] ||
    ""
  ).trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(fromEnv) && !sepolia) return fromEnv as Address;
  const file = sepolia
    ? join(ROOT, "contracts/relic/AuraRelic.sepolia.json")
    : join(ROOT, "contracts/relic/AuraRelic.deployed.json");
  if (!existsSync(file)) throw new Error(`Missing ${file} and RELIC_NFT_CONTRACT`);
  const json = JSON.parse(readFileSync(file, "utf8")) as { address?: string };
  if (!json.address || !/^0x[a-fA-F0-9]{40}$/.test(json.address)) {
    throw new Error("Deployed JSON has no address");
  }
  return json.address as Address;
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
  const toRaw = arg("--to");
  const idRaw = arg("--id") || "1";
  if (!toRaw || !/^0x[a-fA-F0-9]{40}$/.test(toRaw)) {
    throw new Error("Pass --to 0x…");
  }
  const tokenId = Number.parseInt(idRaw, 10);
  if (!Number.isFinite(tokenId) || tokenId < 1 || tokenId > 7) {
    throw new Error("--id must be 1..7");
  }

  const chain = sepolia ? baseSepolia : base;
  const account = privateKeyToAccount(deployerKey());
  const contract = contractAddress(sepolia);
  const transport = http(rpcFor(sepolia));
  const publicClient = createPublicClient({ chain, transport });
  const wallet = createWalletClient({ account, chain, transport });

  const hash = await wallet.writeContract({
    address: contract,
    abi: ABI,
    functionName: "mint",
    args: [toRaw as Address, BigInt(tokenId)],
    chain,
    account,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`mint tx reverted: ${hash}`);
  }
  let owner: Address | null = null;
  for (let i = 0; i < 8; i += 1) {
    try {
      owner = await publicClient.readContract({
        address: contract,
        abi: ABI,
        functionName: "ownerOf",
        args: [BigInt(tokenId)],
      });
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  if (!owner) throw new Error(`mint mined but ownerOf(${tokenId}) not readable yet: ${hash}`);
  const minted = await publicClient.readContract({
    address: contract,
    abi: ABI,
    functionName: "totalMinted",
  });
  process.stdout.write(
    [
      `minted Relic #${tokenId} / 7 on ${chain.name}`,
      `contract ${contract}`,
      `to ${owner}`,
      `tx ${hash}`,
      `totalMinted ${minted.toString()}`,
      "",
    ].join("\n"),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
