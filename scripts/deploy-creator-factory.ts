/**
 * Compile + deploy AuraCollectionFactory on Robinhood Chain.
 *
 * Usage:
 *   npx tsx scripts/deploy-creator-factory.ts [--testnet] [--compile-only]
 *
 * Env: CREATOR_OPS_WALLET_RH, CREATOR_PLATFORM_FEE_BPS (default 1000),
 *      GENESIS_MINTER_KEY / PRIVATE_KEY, ALCHEMY_API_KEY
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import solc from "solc";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { robinhood, robinhoodTestnet } from "viem/chains";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const RH_USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as Hex;

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
  if (importPath.startsWith("@")) {
    const abs = join(ROOT, "node_modules", importPath);
    if (!existsSync(abs)) return { error: `Missing ${importPath}` };
    return { contents: readFileSync(abs, "utf8") };
  }
  const local = join(ROOT, importPath);
  if (existsSync(local)) return { contents: readFileSync(local, "utf8") };
  return { error: `Missing ${importPath}` };
}

function compile() {
  const files = [
    "contracts/creator/ICreator.sol",
    "contracts/creator/AuraCreatorCollection.sol",
    "contracts/creator/AuraCreatorMintDesk.sol",
    "contracts/creator/AuraCollectionFactory.sol",
  ];
  const sources: Record<string, { content: string }> = {};
  for (const file of files) {
    sources[file] = { content: readFileSync(join(ROOT, file), "utf8") };
  }
  const input = {
    language: "Solidity",
    sources,
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
  return out.contracts ?? {};
}

function deployerKey(): Hex {
  const raw = (
    process.env["GENESIS_MINTER_KEY"] ||
    process.env["PRIVATE_SALE_DEPLOYER_KEY"] ||
    process.env["PRIVATE_KEY"] ||
    ""
  ).trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error("GENESIS_MINTER_KEY / PRIVATE_KEY must be a 32-byte hex key");
  }
  return raw as Hex;
}

function rpcFor(testnet: boolean): string {
  const alchemy = process.env["ALCHEMY_API_KEY"]?.trim();
  if (testnet) {
    if (alchemy) return `https://robinhood-testnet.g.alchemy.com/v2/${alchemy}`;
    return "https://testnet-rpc.robinhoodchain.com";
  }
  if (alchemy) return `https://robinhood-mainnet.g.alchemy.com/v2/${alchemy}`;
  return "https://rpc.robinhoodchain.com";
}

function artifact(
  contracts: Record<string, Record<string, { abi: unknown; evm: { bytecode: { object: string } } }>>,
  file: string,
  name: string,
) {
  const row = contracts[file]?.[name];
  if (!row?.evm.bytecode.object) throw new Error(`Compile produced no bytecode for ${name}`);
  return row;
}

async function main() {
  loadDotenv();
  const compileOnly = process.argv.includes("--compile-only");
  const testnet = process.argv.includes("--testnet");
  const contracts = compile();
  const factoryArt = artifact(
    contracts,
    "contracts/creator/AuraCollectionFactory.sol",
    "AuraCollectionFactory",
  );

  if (compileOnly) {
    process.stdout.write(
      [
        "Creator factory contracts compiled",
        `AuraCollectionFactory ${factoryArt.evm.bytecode.object.length / 2} bytes`,
        "",
      ].join("\n"),
    );
    return;
  }

  const chain = testnet ? robinhoodTestnet : robinhood;
  const account = privateKeyToAccount(deployerKey());
  const transport = http(rpcFor(testnet));
  const publicClient = createPublicClient({ chain, transport });
  const wallet = createWalletClient({ account, chain, transport });

  const stable = (process.env["CREATOR_STABLE_RH"]?.trim() || RH_USDG) as Hex;
  const platform = (process.env["CREATOR_OPS_WALLET_RH"]?.trim() || account.address) as Hex;
  const platformBps = BigInt(process.env["CREATOR_PLATFORM_FEE_BPS"]?.trim() || "1000");

  const fees = await publicClient.estimateFeesPerGas();
  const fee = {
    maxFeePerGas: (fees.maxFeePerGas ?? 1_000_000n) * 15n,
    maxPriorityFeePerGas: (fees.maxPriorityFeePerGas ?? 100_000n) * 15n,
  };

  const hash = await wallet.deployContract({
    abi: factoryArt.abi as never,
    bytecode: `0x${factoryArt.evm.bytecode.object}` as Hex,
    args: [stable, platform, platformBps, account.address],
    ...fee,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const factory = receipt.contractAddress;
  if (!factory) throw new Error("Factory deploy produced no address");

  process.stdout.write(
    [
      `AuraCollectionFactory deployed on ${chain.name} (${chain.id})`,
      `Factory: ${factory}`,
      `Stable (USDG): ${stable}`,
      `Platform: ${platform}`,
      `Platform fee bps: ${platformBps}`,
      "",
      "Add to .env:",
      testnet
        ? `CREATOR_FACTORY_RH_TESTNET=${factory}`
        : `CREATOR_FACTORY_RH=${factory}`,
      "",
    ].join("\n"),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
