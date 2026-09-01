/**
 * Finish Desk v2 wiring after a partial deploy (setLaunchDesk / setDesk).
 * Usage:
 *   npx tsx scripts/finish-launch-desk.ts --sepolia
 *   npx tsx scripts/finish-launch-desk.ts
 *
 * Env overrides: HOOD_FINISH_PASSPORT, HOOD_FINISH_ESCROW
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadDotenv() {
  const path = join(ROOT, ".env");
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split("\n")) {
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
  const chain = sepolia ? baseSepolia : base;
  const key = (process.env["GENESIS_MINTER_KEY"] || process.env["PRIVATE_KEY"] || "").trim() as Hex;
  const account = privateKeyToAccount(key);
  const publicClient = createPublicClient({ chain, transport: http(rpcFor(sepolia)) });
  const wallet = createWalletClient({ account, chain, transport: http(rpcFor(sepolia)) });

  const defaults = sepolia
    ? {
        passport: "0xdc7c7b0f59181dfb60c27fea663a16348f749908",
        escrow: "0xf22382855266aafc8bf6df7b611282793c010765",
        usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      }
    : {
        passport: "0x28eab56b26d4020d0fe985aae96bc2a8dd98d99b",
        escrow: "0x09aab7435ebf3e4b3763a1462279ab093d1268f8",
        usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      };

  const passport = (process.env["HOOD_FINISH_PASSPORT"] || defaults.passport) as Hex;
  const escrow = (process.env["HOOD_FINISH_ESCROW"] || defaults.escrow) as Hex;

  const giftsAbi = [
    {
      type: "function",
      name: "GIFTS",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "address" }],
    },
    {
      type: "function",
      name: "OPS",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "address" }],
    },
  ] as const;
  const deskAbi = [
    {
      type: "function",
      name: "launchDesk",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "address" }],
    },
    {
      type: "function",
      name: "setLaunchDesk",
      stateMutability: "nonpayable",
      inputs: [{ name: "desk", type: "address" }],
      outputs: [],
    },
  ] as const;
  const dropAbi = [
    {
      type: "function",
      name: "desk",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "address" }],
    },
    {
      type: "function",
      name: "setDesk",
      stateMutability: "nonpayable",
      inputs: [{ name: "desk_", type: "address" }],
      outputs: [],
    },
    {
      type: "function",
      name: "LOCK_DAYS",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "uint256" }],
    },
  ] as const;

  const gifts = (await publicClient.readContract({
    address: escrow,
    abi: giftsAbi,
    functionName: "GIFTS",
  })) as Hex;
  const ops = (await publicClient.readContract({
    address: escrow,
    abi: giftsAbi,
    functionName: "OPS",
  })) as Hex;
  let launchDesk = (await publicClient.readContract({
    address: passport,
    abi: deskAbi,
    functionName: "launchDesk",
  })) as Hex;
  let giftDesk = (await publicClient.readContract({
    address: gifts,
    abi: dropAbi,
    functionName: "desk",
  })) as Hex;
  const lockDays = await publicClient.readContract({
    address: gifts,
    abi: dropAbi,
    functionName: "LOCK_DAYS",
  });
  console.log({ passport, escrow, gifts, launchDesk, giftDesk, lockDays: lockDays.toString() });

  const fees = await publicClient.estimateFeesPerGas();
  const fee = {
    maxFeePerGas: (fees.maxFeePerGas ?? 1_000_000n) * 40n,
    maxPriorityFeePerGas: (fees.maxPriorityFeePerGas ?? 100_000n) * 40n,
  };

  let setLaunchDesk: Hex | null = null;
  let setGiftDesk: Hex | null = null;
  const zero = "0x0000000000000000000000000000000000000000";
  if (launchDesk.toLowerCase() === zero) {
    setLaunchDesk = await wallet.writeContract({
      address: passport,
      abi: deskAbi,
      functionName: "setLaunchDesk",
      args: [escrow],
      ...fee,
    });
    await publicClient.waitForTransactionReceipt({ hash: setLaunchDesk });
    console.log("setLaunchDesk", setLaunchDesk);
    launchDesk = escrow;
  }
  if (giftDesk.toLowerCase() === zero) {
    // stagger if we just sent a tx
    if (setLaunchDesk) await new Promise((r) => setTimeout(r, 4000));
    setGiftDesk = await wallet.writeContract({
      address: gifts,
      abi: dropAbi,
      functionName: "setDesk",
      args: [escrow],
      ...fee,
    });
    await publicClient.waitForTransactionReceipt({ hash: setGiftDesk });
    console.log("setGiftDesk", setGiftDesk);
    giftDesk = escrow;
  }

  const explorer = sepolia ? "https://sepolia.basescan.org" : "https://basescan.org";
  const outFile = sepolia ? "AuraLaunch.sepolia.json" : "AuraLaunch.deployed.json";
  const out = {
    deskVersion: 2,
    giftContract: "AuraHoodGiftDrop",
    lockDays: 0,
    status: "deployed",
    chainId: chain.id,
    network: sepolia ? "base-sepolia" : "base",
    passport,
    escrow,
    gifts,
    usdc: defaults.usdc,
    ops,
    owner: account.address,
    verified: {
      launchDesk,
      giftDesk,
      lockDays: Number(lockDays),
    },
    txs: { setLaunchDesk, setGiftDesk },
    explorers: {
      passport: `${explorer}/address/${passport}`,
      escrow: `${explorer}/address/${escrow}`,
      gifts: `${explorer}/address/${gifts}`,
    },
    deployedAt: new Date().toISOString(),
    v1Superseded: sepolia
      ? "contracts/launch/AuraLaunch.sepolia.v1-superseded.json"
      : "contracts/launch/AuraLaunch.v1-superseded.json",
  };
  writeFileSync(join(ROOT, "contracts/launch", outFile), JSON.stringify(out, null, 2));
  console.log(`wrote contracts/launch/${outFile}`);
  console.log("Set env:");
  console.log(`GENESIS_NFT_CONTRACT=${passport}`);
  console.log(`VITE_GENESIS_NFT_CONTRACT=${passport}`);
  console.log(`LAUNCH_ESCROW_CONTRACT=${escrow}`);
  console.log(`VITE_LAUNCH_ESCROW_CONTRACT=${escrow}`);
  console.log(`LAUNCH_GIFT_LOCK_CONTRACT=${gifts}`);
  console.log(`VITE_LAUNCH_GIFT_LOCK_CONTRACT=${gifts}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
