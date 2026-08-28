/**
 * Compile + deploy AuraRelic on Base (or Base Sepolia with --sepolia).
 * Usage: npx tsx scripts/deploy-relic.ts [--sepolia]
 * Key: RELIC_MINTER_KEY or PRIVATE_SALE_DEPLOYER_KEY or PRIVATE_KEY (never printed).
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import solc from "solc";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE_URI = "https://aibusiness.fun/api/relic/meta/";

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

function findImports(importPath: string) {
  const abs = join(ROOT, "node_modules", importPath);
  if (!existsSync(abs)) return { error: `Missing ${importPath}` };
  return { contents: readFileSync(abs, "utf8") };
}

function compile() {
  const sourcePath = "contracts/relic/AuraRelic.sol";
  const input = {
    language: "Solidity",
    sources: {
      [sourcePath]: { content: readFileSync(join(ROOT, sourcePath), "utf8") },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
      outputSelection: {
        "*": { "*": ["abi", "evm.bytecode.object"] },
      },
    },
  };
  const raw = solc.compile(JSON.stringify(input), { import: findImports });
  const out = JSON.parse(raw) as {
    errors?: Array<{ severity: string; formattedMessage: string }>;
    contracts?: Record<
      string,
      Record<string, { abi: unknown; evm: { bytecode: { object: string } } }>
    >;
  };
  const errors = (out.errors ?? []).filter((e) => e.severity === "error");
  if (errors.length) {
    throw new Error(errors.map((e) => e.formattedMessage).join("\n"));
  }
  const artifact = out.contracts?.[sourcePath]?.["AuraRelic"];
  if (!artifact?.evm.bytecode.object) throw new Error("Compile produced no bytecode");
  return artifact;
}

function deployerKey(): Hex {
  const raw = (
    process.env["RELIC_MINTER_KEY"] ||
    process.env["PRIVATE_SALE_DEPLOYER_KEY"] ||
    process.env["GENESIS_MINTER_KEY"] ||
    process.env["PRIVATE_KEY"] ||
    ""
  ).trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error("RELIC_MINTER_KEY / PRIVATE_KEY must be a 32-byte hex key");
  }
  return raw as Hex;
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
  const chain = sepolia ? baseSepolia : base;
  const artifact = compile();
  const account = privateKeyToAccount(deployerKey());
  const transport = http(rpcFor(sepolia));
  const publicClient = createPublicClient({ chain, transport });
  const wallet = createWalletClient({ account, chain, transport });

  const bytecode = `0x${artifact.evm.bytecode.object}` as Hex;
  const hash = await wallet.deployContract({
    abi: artifact.abi as never,
    bytecode,
    args: [account.address, BASE_URI],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const address = receipt.contractAddress;
  if (!address) throw new Error(`Deploy tx ${hash} produced no contract address`);

  const outDir = join(ROOT, "contracts/relic");
  mkdirSync(outDir, { recursive: true });
  const fingerprint = createHash("sha256").update(bytecode).digest("hex").slice(0, 12);
  const outFile = sepolia ? "AuraRelic.sepolia.json" : "AuraRelic.deployed.json";
  writeFileSync(
    join(outDir, outFile),
    JSON.stringify(
      {
        chainId: chain.id,
        address,
        txHash: hash,
        owner: account.address,
        baseURI: BASE_URI,
        maxSupply: 7,
        bytecodeFingerprint: fingerprint,
        deployedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  process.stdout.write(
    [
      `Aura Relic deployed on ${chain.name}`,
      `address ${address}`,
      `tx ${hash}`,
      `admin ${account.address}`,
      "",
    ].join("\n"),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
