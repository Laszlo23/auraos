/**
 * Self-hosted AURA T-0: deploy token, vestings, redeem, Uni v2 LP → sink, fund gifts.
 *
 * Usage:
 *   npx tsx scripts/aura-t0.ts --compile-only
 *   npx tsx scripts/aura-t0.ts --sepolia --usdc-liquidity 50000000
 *   npx tsx scripts/aura-t0.ts --usdc-liquidity <amount_6_decimals> [--propose]
 *
 * Env: AURA_T0_KEY (preferred) or PRIVATE_KEY / GENESIS_MINTER_KEY
 * Recipients (optional, default deployer):
 *   AURA_WALLET_COMMUNITY, ECOSYSTEM, TREASURY, TEAM_BENEFICIARY, ADVISORS_BENEFICIARY,
 *   MARKETING, PRIVATE_RESERVE (unused if redeem funded), HOOD_GIFTS_OVERRIDE
 * Hood gifts: LAUNCH_GIFT_LOCK_CONTRACT = AuraHoodGiftDrop (Desk v2). Fund before executeMarket.
 * After executeMarket, holders claim unlocked AURA via GiftDrop.claim(tokenId).
 * Announce 48h before mainnet executeMarket (desk timelock is 72h).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import solc from "solc";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  type Abi,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

import { allocationById } from "../src/lib/aura-token";
import {
  AURA_ADVISOR_CLIFF_SECONDS,
  AURA_ADVISOR_DURATION_SECONDS,
  AURA_REDEEM_RESERVE_WHOLE,
  AURA_TEAM_CLIFF_SECONDS,
  AURA_TEAM_DURATION_SECONDS,
  BASE_UNI_V2_FACTORY,
  BASE_UNI_V2_ROUTER,
  UNI_V2_FACTORY_ABI,
  UNI_V2_ROUTER_ABI,
} from "../src/lib/aura-self-launch";
import { BASE_USDC, PRIVATE_SALE_CONTRACT_LIVE } from "../src/lib/private-sale";
import { launchEscrowAddress, launchGiftLockAddress } from "../src/lib/aura-launch";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
/** Base Sepolia has no official Uni v2 — skip LP on sepolia unless ROUTER set. */
const SEPOLIA_UNI_V2_ROUTER = (process.env["SEPOLIA_UNI_V2_ROUTER"] || "").trim();
const SEPOLIA_UNI_V2_FACTORY = (process.env["SEPOLIA_UNI_V2_FACTORY"] || "").trim();

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
    "contracts/aura/AuraToken.sol",
    "contracts/aura/AuraPauraRedeem.sol",
    "contracts/aura/AuraLpSink.sol",
    "contracts/aura/AuraCliffVesting.sol",
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
    process.env["AURA_T0_KEY"] ||
    process.env["PRIVATE_SALE_DEPLOYER_KEY"] ||
    process.env["GENESIS_MINTER_KEY"] ||
    process.env["PRIVATE_KEY"] ||
    ""
  ).trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error("AURA_T0_KEY / PRIVATE_KEY must be a 32-byte hex key");
  }
  return raw as Hex;
}

function addrEnv(name: string, fallback: `0x${string}`): `0x${string}` {
  const v = (process.env[name] || "").trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(v)) return v as `0x${string}`;
  return fallback;
}

function artifact(
  contracts: ReturnType<typeof compile>,
  file: string,
  name: string,
): { abi: Abi; bytecode: Hex } {
  const row = contracts[file]?.[name];
  if (!row?.evm?.bytecode?.object) throw new Error(`Missing bytecode ${file}:${name}`);
  return {
    abi: row.abi as Abi,
    bytecode: `0x${row.evm.bytecode.object}` as Hex,
  };
}

async function main() {
  loadDotenv();
  const args = process.argv.slice(2);
  const compileOnly = args.includes("--compile-only");
  const sepolia = args.includes("--sepolia");
  const doPropose = args.includes("--propose");
  const usdcIdx = args.indexOf("--usdc-liquidity");
  const usdcLiquidity =
    usdcIdx >= 0 && args[usdcIdx + 1] ? BigInt(args[usdcIdx + 1]!) : 0n;

  const compiled = compile();
  console.log("compiled AuraToken, AuraPauraRedeem, AuraLpSink, AuraCliffVesting");
  if (compileOnly) return;

  const chain = sepolia ? baseSepolia : base;
  const rpc =
    (sepolia ? process.env["BASE_SEPOLIA_RPC_URL"] : process.env["BASE_RPC_URL"]) ||
    (sepolia ? "https://sepolia.base.org" : "https://mainnet.base.org");
  const account = privateKeyToAccount(deployerKey());
  const publicClient = createPublicClient({ chain, transport: http(rpc) });
  const wallet = createWalletClient({ account, chain, transport: http(rpc) });

  const usdc = (sepolia ? BASE_SEPOLIA_USDC : BASE_USDC) as `0x${string}`;
  const paura = addrEnv(
    "PAURA_CONTRACT",
    sepolia
      ? (process.env["PAURA_SEPOLIA"] as `0x${string}`) || PRIVATE_SALE_CONTRACT_LIVE
      : PRIVATE_SALE_CONTRACT_LIVE,
  );
  const router = (
    sepolia ? SEPOLIA_UNI_V2_ROUTER || BASE_UNI_V2_ROUTER : BASE_UNI_V2_ROUTER
  ) as `0x${string}`;
  const factory = (
    sepolia ? SEPOLIA_UNI_V2_FACTORY || BASE_UNI_V2_FACTORY : BASE_UNI_V2_FACTORY
  ) as `0x${string}`;

  const tokenArt = artifact(compiled, "contracts/aura/AuraToken.sol", "AuraToken");
  const sinkArt = artifact(compiled, "contracts/aura/AuraLpSink.sol", "AuraLpSink");
  const redeemArt = artifact(compiled, "contracts/aura/AuraPauraRedeem.sol", "AuraPauraRedeem");
  const vestArt = artifact(compiled, "contracts/aura/AuraCliffVesting.sol", "AuraCliffVesting");

  console.log("deployer", account.address);

  const tokenHash = await wallet.deployContract({
    abi: tokenArt.abi,
    bytecode: tokenArt.bytecode,
    args: [],
  });
  const tokenRcpt = await publicClient.waitForTransactionReceipt({ hash: tokenHash });
  const aura = tokenRcpt.contractAddress as `0x${string}`;
  console.log("AuraToken", aura);

  const sinkHash = await wallet.deployContract({
    abi: sinkArt.abi,
    bytecode: sinkArt.bytecode,
    args: [],
  });
  const sinkRcpt = await publicClient.waitForTransactionReceipt({ hash: sinkHash });
  const sink = sinkRcpt.contractAddress as `0x${string}`;
  console.log("AuraLpSink", sink);

  const now = BigInt(Math.floor(Date.now() / 1000));
  const teamBeneficiary = addrEnv("AURA_WALLET_TEAM_BENEFICIARY", account.address);
  const advisorsBeneficiary = addrEnv("AURA_WALLET_ADVISORS_BENEFICIARY", account.address);

  const teamHash = await wallet.deployContract({
    abi: vestArt.abi,
    bytecode: vestArt.bytecode,
    args: [
      teamBeneficiary,
      now,
      BigInt(AURA_TEAM_DURATION_SECONDS),
      BigInt(AURA_TEAM_CLIFF_SECONDS),
    ],
  });
  const teamRcpt = await publicClient.waitForTransactionReceipt({ hash: teamHash });
  const teamVesting = teamRcpt.contractAddress as `0x${string}`;
  console.log("team vesting", teamVesting);

  const advHash = await wallet.deployContract({
    abi: vestArt.abi,
    bytecode: vestArt.bytecode,
    args: [
      advisorsBeneficiary,
      now,
      BigInt(AURA_ADVISOR_DURATION_SECONDS),
      BigInt(AURA_ADVISOR_CLIFF_SECONDS),
    ],
  });
  const advRcpt = await publicClient.waitForTransactionReceipt({ hash: advHash });
  const advisorsVesting = advRcpt.contractAddress as `0x${string}`;
  console.log("advisors vesting", advisorsVesting);

  const redeemHash = await wallet.deployContract({
    abi: redeemArt.abi,
    bytecode: redeemArt.bytecode,
    args: [paura, aura, account.address],
  });
  const redeemRcpt = await publicClient.waitForTransactionReceipt({ hash: redeemHash });
  const redeem = redeemRcpt.contractAddress as `0x${string}`;
  console.log("AuraPauraRedeem", redeem);

  const erc20Transfer = {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  } as const;
  const erc20Approve = {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  } as const;

  async function sendAura(to: `0x${string}`, whole: number, label: string) {
    const value = parseEther(String(whole));
    const hash = await wallet.writeContract({
      address: aura,
      abi: [erc20Transfer],
      functionName: "transfer",
      args: [to, value],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`transfer ${label}`, whole, "→", to);
  }

  const community = addrEnv("AURA_WALLET_COMMUNITY", account.address);
  const ecosystem = addrEnv("AURA_WALLET_ECOSYSTEM", account.address);
  const treasury = addrEnv("AURA_WALLET_TREASURY", account.address);
  const marketing = addrEnv("AURA_WALLET_MARKETING", account.address);
  const giftsTarget =
    (launchGiftLockAddress() as `0x${string}` | null) ||
    addrEnv("AURA_WALLET_HOOD_GIFTS", account.address);

  await sendAura(community, allocationById("community").amount, "community");
  await sendAura(ecosystem, allocationById("ecosystem").amount, "ecosystem");
  await sendAura(treasury, allocationById("treasury").amount, "treasury");
  await sendAura(teamVesting, allocationById("team").amount, "team vesting");
  await sendAura(advisorsVesting, allocationById("advisors").amount, "advisors vesting");
  await sendAura(marketing, allocationById("marketing").amount, "marketing");
  await sendAura(redeem, AURA_REDEEM_RESERVE_WHOLE, "pAURA redeem reserve");
  await sendAura(giftsTarget, allocationById("public").amount, "hood gifts (GiftDrop)");
  // liquidity stays on deployer for addLiquidity; private/project already in redeem

  let pair: `0x${string}` | null = null;
  let lpLocked = false;

  if (!sepolia || SEPOLIA_UNI_V2_ROUTER) {
    if (usdcLiquidity <= 0n) {
      throw new Error("Pass --usdc-liquidity <USDC 6-decimals> to seed the Uni v2 pair");
    }
    const liqAura = parseEther(String(allocationById("liquidity").amount));

    const approveUsdc = await wallet.writeContract({
      address: usdc,
      abi: [erc20Approve],
      functionName: "approve",
      args: [router, usdcLiquidity],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveUsdc });
    const approveAura = await wallet.writeContract({
      address: aura,
      abi: [erc20Approve],
      functionName: "approve",
      args: [router, liqAura],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveAura });

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const addHash = await wallet.writeContract({
      address: router,
      abi: UNI_V2_ROUTER_ABI,
      functionName: "addLiquidity",
      args: [aura, usdc, liqAura, usdcLiquidity, 0n, 0n, sink, deadline],
    });
    await publicClient.waitForTransactionReceipt({ hash: addHash });
    console.log("addLiquidity → AuraLpSink", sink);

    pair = (await publicClient.readContract({
      address: factory,
      abi: UNI_V2_FACTORY_ABI,
      functionName: "getPair",
      args: [aura, usdc],
    })) as `0x${string}`;
    console.log("pair", pair);
    lpLocked = true;
  } else {
    console.log("skip LP on Sepolia (set SEPOLIA_UNI_V2_ROUTER to enable)");
  }

  let proposeTx: Hex | null = null;
  if (doPropose && pair && pair !== "0x0000000000000000000000000000000000000000") {
    const escrow = launchEscrowAddress();
    if (!escrow) throw new Error("LAUNCH_ESCROW_CONTRACT not set");
    const proposeAbi = [
      {
        type: "function",
        name: "proposeV2Market",
        stateMutability: "nonpayable",
        inputs: [
          { name: "aura_", type: "address" },
          { name: "pair_", type: "address" },
        ],
        outputs: [],
      },
    ] as const;
    proposeTx = await wallet.writeContract({
      address: escrow,
      abi: proposeAbi,
      functionName: "proposeV2Market",
      args: [aura, pair],
    });
    await publicClient.waitForTransactionReceipt({ hash: proposeTx });
    console.log("proposeV2Market", proposeTx);
  }

  const outDir = join(ROOT, "contracts/aura");
  mkdirSync(outDir, { recursive: true });
  const artifactPath = join(
    outDir,
    sepolia ? "Aura.sepolia.json" : "Aura.deployed.json",
  );
  const payload = {
    chainId: chain.id,
    network: sepolia ? "base-sepolia" : "base",
    aura,
    lpSink: sink,
    redeem,
    teamVesting,
    advisorsVesting,
    pair,
    usdc,
    paura,
    router,
    factory,
    lpLocked,
    giftsTarget,
    redeemReserveWhole: AURA_REDEEM_RESERVE_WHOLE,
    liquidityWhole: allocationById("liquidity").amount,
    usdcLiquidity: usdcLiquidity.toString(),
    proposeTx,
    deployer: account.address,
    deployedAt: new Date().toISOString(),
    next: [
      "Publish CA on aibusiness.fun + X @buildingcultu3",
      "Set AURA_TOKEN_CA / VITE_AURA_TOKEN_CA / AURA_PAIR_CA / AURA_LP_SINK / AURA_PAURA_REDEEM on VPS",
      "Wait 72h after proposeV2Market then executeMarket()",
      "Owner openRedeem() on AuraPauraRedeem",
    ],
  };
  writeFileSync(artifactPath, JSON.stringify(payload, null, 2) + "\n");
  console.log("wrote", artifactPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
