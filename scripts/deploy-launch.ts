/**
 * Compile + deploy Hood Launch Desk v2 (passport + AuraHoodGiftDrop + escrow).
 * Instant AURA claim at T-0 — replaces the superseded 90-day gift lock desk.
 *
 * Usage: npx tsx scripts/deploy-launch.ts [--sepolia] [--compile-only]
 * Key: GENESIS_MINTER_KEY or PRIVATE_SALE_DEPLOYER_KEY or PRIVATE_KEY (never printed).
 *
 * After deploy: point GENESIS_NFT_CONTRACT / LAUNCH_ESCROW_CONTRACT /
 * LAUNCH_GIFT_LOCK_CONTRACT (and VITE_ mirrors) at the new addresses.
 * If v1 passport minted any Hoods, run scripts/migrate-hood-v1.ts first.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import solc from "solc";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

import { PRIVATE_SALE_TREASURY, BASE_USDC } from "../src/lib/private-sale";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE_URI = "https://aibusiness.fun/api/genesis/meta/";
const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

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
  return { error: `Missing ${importPath}` };
}

function compile() {
  const files = [
    "contracts/launch/IAuraLaunch.sol",
    "contracts/launch/AuraHoodGiftDrop.sol",
    "contracts/launch/AuraLaunchEscrow.sol",
    "contracts/genesis/GenesisPassport.sol",
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
  const sepolia = process.argv.includes("--sepolia");
  const contracts = compile();
  const passportArt = artifact(contracts, "contracts/genesis/GenesisPassport.sol", "GenesisPassport");
  const dropArt = artifact(contracts, "contracts/launch/AuraHoodGiftDrop.sol", "AuraHoodGiftDrop");
  const deskArt = artifact(contracts, "contracts/launch/AuraLaunchEscrow.sol", "AuraLaunchEscrow");

  if (compileOnly) {
    process.stdout.write(
      [
        "Launch Desk v2 contracts compiled",
        `GenesisPassport ${passportArt.evm.bytecode.object.length / 2} bytes`,
        `AuraHoodGiftDrop ${dropArt.evm.bytecode.object.length / 2} bytes`,
        `AuraLaunchEscrow ${deskArt.evm.bytecode.object.length / 2} bytes`,
        "",
      ].join("\n"),
    );
    return;
  }

  const chain = sepolia ? baseSepolia : base;
  const account = privateKeyToAccount(deployerKey());
  const transport = http(rpcFor(sepolia));
  const publicClient = createPublicClient({ chain, transport });
  const wallet = createWalletClient({ account, chain, transport });
  const usdc = (
    sepolia
      ? process.env["LAUNCH_USDC"]?.trim() || BASE_SEPOLIA_USDC
      : process.env["LAUNCH_USDC_MAINNET"]?.trim() || BASE_USDC
  ) as Hex;
  const ops = (process.env["LAUNCH_OPS"]?.trim() || PRIVATE_SALE_TREASURY) as Hex;

  const fees = await publicClient.estimateFeesPerGas();
  const maxFeePerGas = (fees.maxFeePerGas ?? 1_000_000n) * 15n;
  const maxPriorityFeePerGas = (fees.maxPriorityFeePerGas ?? 100_000n) * 15n;
  const fee = { maxFeePerGas, maxPriorityFeePerGas };

  const passportHash = await wallet.deployContract({
    abi: passportArt.abi as never,
    bytecode: `0x${passportArt.evm.bytecode.object}` as Hex,
    args: [account.address, "0x0000000000000000000000000000000000000000", BASE_URI],
    ...fee,
  });
  const passportReceipt = await publicClient.waitForTransactionReceipt({ hash: passportHash });
  const passport = passportReceipt.contractAddress;
  if (!passport) throw new Error("Passport deploy produced no address");

  const dropHash = await wallet.deployContract({
    abi: dropArt.abi as never,
    bytecode: `0x${dropArt.evm.bytecode.object}` as Hex,
    args: [passport],
    ...fee,
  });
  const dropReceipt = await publicClient.waitForTransactionReceipt({ hash: dropHash });
  const gifts = dropReceipt.contractAddress;
  if (!gifts) throw new Error("Gift drop deploy produced no address");

  const deskHash = await wallet.deployContract({
    abi: deskArt.abi as never,
    bytecode: `0x${deskArt.evm.bytecode.object}` as Hex,
    args: [usdc, ops, passport, gifts, account.address],
    ...fee,
  });
  const deskReceipt = await publicClient.waitForTransactionReceipt({ hash: deskHash });
  const escrow = deskReceipt.contractAddress;
  if (!escrow) throw new Error("Escrow deploy produced no address");

  const setDeskHash = await wallet.writeContract({
    address: passport,
    abi: passportArt.abi as never,
    functionName: "setLaunchDesk",
    args: [escrow],
    ...fee,
  });
  await publicClient.waitForTransactionReceipt({ hash: setDeskHash });

  const setGiftDeskHash = await wallet.writeContract({
    address: gifts,
    abi: dropArt.abi as never,
    functionName: "setDesk",
    args: [escrow],
    ...fee,
  });
  await publicClient.waitForTransactionReceipt({ hash: setGiftDeskHash });

  const outDir = join(ROOT, "contracts/launch");
  mkdirSync(outDir, { recursive: true });
  const fingerprint = createHash("sha256")
    .update(deskArt.evm.bytecode.object)
    .digest("hex")
    .slice(0, 12);
  const outFile = sepolia ? "AuraLaunch.sepolia.json" : "AuraLaunch.deployed.json";
  writeFileSync(
    join(outDir, outFile),
    JSON.stringify(
      {
        deskVersion: 2,
        giftContract: "AuraHoodGiftDrop",
        lockDays: 0,
        chainId: chain.id,
        network: sepolia ? "base-sepolia" : "base",
        passport,
        escrow,
        gifts,
        usdc,
        ops,
        txs: {
          passport: passportHash,
          gifts: dropHash,
          escrow: deskHash,
          setLaunchDesk: setDeskHash,
          setGiftDesk: setGiftDeskHash,
        },
        owner: account.address,
        bytecodeFingerprint: fingerprint,
        explorers: {
          passport: sepolia
            ? `https://sepolia.basescan.org/address/${passport}`
            : `https://basescan.org/address/${passport}`,
          escrow: sepolia
            ? `https://sepolia.basescan.org/address/${escrow}`
            : `https://basescan.org/address/${escrow}`,
          gifts: sepolia
            ? `https://sepolia.basescan.org/address/${gifts}`
            : `https://basescan.org/address/${gifts}`,
        },
        deployedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  process.stdout.write(
    [
      `Aura Launch Desk v2 (instant AURA) deployed on ${chain.name}`,
      `passport ${passport}`,
      `escrow   ${escrow}`,
      `gifts    ${gifts} (AuraHoodGiftDrop)`,
      `usdc     ${usdc}`,
      `ops      ${ops}`,
      "",
      "Set GENESIS_NFT_CONTRACT, LAUNCH_ESCROW_CONTRACT, LAUNCH_GIFT_LOCK_CONTRACT",
      "(env name kept; value is GiftDrop) and the VITE_ mirrors.",
      "Fund the minter with USDC before minting. See contracts/launch/README.md.",
      "",
    ].join("\n"),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
