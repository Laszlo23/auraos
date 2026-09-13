/**
 * AURA T-0 operator — dedicated machine only. NEVER the public VPS.
 *
 *   npx tsx scripts/aura-t0-operator.ts treasury
 *   npx tsx scripts/aura-t0-operator.ts status
 *   npx tsx scripts/aura-t0-operator.ts compile
 *   npx tsx scripts/aura-t0-operator.ts venue
 *   npx tsx scripts/aura-t0-operator.ts wait
 *   npx tsx scripts/aura-t0-operator.ts broadcast --sepolia
 *   npx tsx scripts/aura-t0-operator.ts broadcast
 *   npx tsx scripts/aura-t0-operator.ts hood
 *   npx tsx scripts/aura-t0-operator.ts post-t0
 *
 * The private key is written to .aura-t0-treasury.json (gitignored, mode 0600).
 * It is never printed. Do not copy that file to the VPS next to the website.
 */
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createPublicClient,
  formatEther,
  formatUnits,
  getContractAddress,
  http,
  type Address,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

import {
  AURA_DEV_BUY_USDC,
  AURA_LP_BOOK_USDC,
  AURA_T0_GAS_ETH,
  AURA_T0_TREASURY_USDC,
} from "../src/lib/aura-curve";
import {
  TOKEN_LAUNCH_AT_ISO,
  TOKEN_LAUNCH_DISPLAY,
  padLaunchUnit,
  tokenLaunchAtMs,
  tokenLaunchIsLive,
  tokenLaunchRemain,
} from "../src/lib/aura-t0-clock";
import { AURA_T0_VENUE } from "../src/lib/aura-t0-clanker";
import {
  HOOD_GIFT_AURA,
  HOOD_PASSPORT_ABI,
  genesisPassportAddress,
  launchEscrowAddress,
  launchGiftLockAddress,
} from "../src/lib/aura-launch";
import { BASE_USDC } from "../src/lib/private-sale";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TREASURY_FILE = join(ROOT, ".aura-t0-treasury.json");
const SECOND_BUY_FILE = join(ROOT, ".aura-second-buy.json");
const PREDICTED_FILE = join(ROOT, ".aura-t0-predicted.json");
const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address;
const ERC20_BALANCE = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

type TreasuryFile = {
  address: Address;
  privateKey: `0x${string}`;
  createdAt: string;
  warning: string;
};

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

function help() {
  console.log(`AURA T-0 operator — ${TOKEN_LAUNCH_DISPLAY}
Dedicated machine only. Never the public VPS. Never print the key.

Commands:
  treasury              Create a new empty tokenAdmin wallet (gitignored)
  second-buy            Create a separate market-buy wallet (not tokenAdmin)
  status [--sepolia]    ETH + USDC + nonce on that wallet
  compile               solc AuraToken + sinks (no tx)
  venue                 Clanker wrap vs native Uni v4 fallback
  desk                  Print Sunday 10:45 → pin-CA sequence + attach clicks
  wait                  Sleep until ${TOKEN_LAUNCH_AT_ISO} then print GO
  broadcast --sepolia   Rehearsal deploy (allowed anytime)
  broadcast --go        Mainnet deploy — refuses before T-0, nonce 0, Base time
  predict-ca            Predict mainnet AuraToken CREATE address (no tx)
  hood                  Gift drop + 72h escrow + openRedeem checklist
  post-t0               Env / DexScreener / GoPlus after the CA exists
`);
}

function readTreasury(): TreasuryFile | null {
  if (!existsSync(TREASURY_FILE)) return null;
  return JSON.parse(readFileSync(TREASURY_FILE, "utf8")) as TreasuryFile;
}

function applyTreasuryKey() {
  if (process.env["AURA_T0_KEY"]) return;
  const file = readTreasury();
  if (file?.privateKey) process.env["AURA_T0_KEY"] = file.privateKey;
}

function cmdTreasury(force: boolean) {
  if (existsSync(TREASURY_FILE) && !force) {
    const existing = readTreasury();
    console.log("treasury already exists (pass --force to rotate — old key is lost if you have no backup)");
    console.log("address", existing?.address);
    console.log("fund", `$${AURA_T0_TREASURY_USDC} USDC ($${AURA_DEV_BUY_USDC} seed + $${AURA_LP_BOOK_USDC} book) + ${AURA_T0_GAS_ETH.min}–${AURA_T0_GAS_ETH.max} ETH gas on Base`);
    console.log("never the pAURA sale key. never 1,111 ETH.");
    return;
  }
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const payload: TreasuryFile = {
    address: account.address,
    privateKey,
    createdAt: new Date().toISOString(),
    warning:
      "Never commit. Never copy to the public VPS. Fund Base USDC + gas ETH. Not the sale key.",
  };
  writeFileSync(TREASURY_FILE, JSON.stringify(payload, null, 2) + "\n", { mode: 0o600 });
  chmodSync(TREASURY_FILE, 0o600);
  console.log("wrote", TREASURY_FILE, "(mode 0600, gitignored — key not printed)");
  console.log("tokenAdmin / launch treasury", account.address);
  console.log(
    "fund on Base before Saturday:",
    `$${AURA_T0_TREASURY_USDC} USDC ($${AURA_DEV_BUY_USDC} seed + $${AURA_LP_BOOK_USDC} book)`,
    `+ ${AURA_T0_GAS_ETH.min}–${AURA_T0_GAS_ETH.max} ETH gas`,
  );
  console.log("USDC", BASE_USDC);
  console.log("swap ETH → USDC into THIS wallet. Do not send 1,111 ETH. Do not use the sale key.");
}

function cmdSecondBuy(force: boolean) {
  if (existsSync(SECOND_BUY_FILE) && !force) {
    const existing = JSON.parse(readFileSync(SECOND_BUY_FILE, "utf8")) as TreasuryFile;
    console.log("second-buy wallet already exists (pass --force to rotate)");
    console.log("address", existing.address);
    console.log("role", "post–T-0 market buy on the live Uni v4 AURA/USDC book — not the deployer");
    return;
  }
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const payload: TreasuryFile = {
    address: account.address,
    privateKey,
    createdAt: new Date().toISOString(),
    warning:
      "Second-buy wallet only. Never commit. Never copy to the VPS. Never use as AURA_T0_KEY. Fund USDC + gas from a non-T-0 source. Buy on the published pair after the book is live.",
  };
  writeFileSync(SECOND_BUY_FILE, JSON.stringify(payload, null, 2) + "\n", { mode: 0o600 });
  chmodSync(SECOND_BUY_FILE, 0o600);
  console.log("wrote", SECOND_BUY_FILE, "(mode 0600, gitignored — key not printed)");
  console.log("second-buy wallet", account.address);
  console.log("fund after T-0 from a non-treasury source: USDC + ~0.01 ETH gas on Base");
  console.log("USDC", BASE_USDC);
}

async function cmdStatus(sepolia: boolean) {
  const file = readTreasury();
  const fromEnv = (process.env["AURA_LAUNCH_TREASURY"] || "").trim();
  const address = (file?.address ||
    (/^0x[a-fA-F0-9]{40}$/.test(fromEnv) ? fromEnv : "")) as Address | "";
  if (!address) {
    throw new Error("No treasury address. Run: npx tsx scripts/aura-t0-operator.ts treasury");
  }
  const chain = sepolia ? baseSepolia : base;
  const rpc =
    (sepolia ? process.env["BASE_SEPOLIA_RPC_URL"] : process.env["BASE_RPC_URL"]) ||
    (sepolia ? "https://sepolia.base.org" : "https://mainnet.base.org");
  const usdc = (sepolia ? BASE_SEPOLIA_USDC : BASE_USDC) as Address;
  const client = createPublicClient({ chain, transport: http(rpc) });
  const [eth, usdcRaw, nonce] = await Promise.all([
    client.getBalance({ address }),
    client.readContract({
      address: usdc,
      abi: ERC20_BALANCE,
      functionName: "balanceOf",
      args: [address],
    }),
    client.getTransactionCount({ address }),
  ]);
  const usdcHuman = Number(formatUnits(usdcRaw, 6));
  console.log("network", sepolia ? "base-sepolia" : "base");
  console.log("tokenAdmin", address);
  console.log("ETH", formatEther(eth));
  console.log("USDC", usdcHuman);
  console.log("nonce", nonce, nonce === 0 ? "OK" : "DEAD — predicted CA invalid");
  console.log("need USDC", AURA_T0_TREASURY_USDC, usdcHuman >= AURA_T0_TREASURY_USDC ? "OK" : "SHORT");
  console.log(
    "need ETH",
    `${AURA_T0_GAS_ETH.min}–${AURA_T0_GAS_ETH.max}`,
    Number(formatEther(eth)) >= AURA_T0_GAS_ETH.min ? "OK" : "SHORT",
  );
  const team = (process.env["AURA_WALLET_TEAM_BENEFICIARY"] || "").trim();
  const teamOk =
    /^0x[a-fA-F0-9]{40}$/.test(team) && team.toLowerCase() !== address.toLowerCase();
  console.log(
    "team beneficiary",
    teamOk ? team : team || "(missing)",
    teamOk ? "OK" : "SET the Safe — not the deployer",
  );
  if (existsSync(SECOND_BUY_FILE) && !sepolia) {
    const second = JSON.parse(readFileSync(SECOND_BUY_FILE, "utf8")) as TreasuryFile;
    const [secondEth, secondUsdc] = await Promise.all([
      client.getBalance({ address: second.address }),
      client.readContract({
        address: usdc,
        abi: ERC20_BALANCE,
        functionName: "balanceOf",
        args: [second.address],
      }),
    ]);
    const secondUsdcHuman = Number(formatUnits(secondUsdc, 6));
    console.log("second-buy", second.address);
    console.log("second-buy ETH", formatEther(secondEth));
    console.log(
      "second-buy USDC",
      secondUsdcHuman,
      secondUsdcHuman > 0 ? "OK" : "SHORT — need Base USDC to buy the live book",
    );
  }
}

function cmdDesk() {
  console.log(`AURA Sunday desk — ${TOKEN_LAUNCH_DISPLAY}`);
  console.log("Paper: docs/AURA_T0_ATTACH.md. Human in the loop. Key stays off the VPS.");
  console.log("");
  console.log("10:45 Vienna");
  console.log("  1. This machine only. RPC warm. export AURA_WALLET_TEAM_BENEFICIARY=0x96E85b3560C6959783c158B39672206afB6365ac");
  console.log("  2. npx tsx scripts/aura-t0-operator.ts status");
  console.log("     Need: USDC ≥ 7111 OK · ETH ≥ 0.02 OK · nonce 0 OK");
  console.log("  3. If any SHORT or nonce ≠ 0 → stop. Do not broadcast.");
  console.log("");
  console.log("11:10");
  console.log("  npx tsx scripts/aura-t0-operator.ts wait");
  console.log("");
  console.log("11:11 GO");
  console.log("  npx tsx scripts/aura-t0-operator.ts broadcast --go");
  console.log("  If it refuses → stop. Do not send a manual tx.");
  console.log("  Copy AuraToken from the receipt. Predicted file is a check only.");
  console.log("");
  console.log("Attach locked book BEFORE any public CA  (docs/AURA_T0_ATTACH.md)");
  console.log("  Path A — Clanker wrap existingToken: true on the NEW AuraToken.");
  console.log("  Path B — native Uni v4 Position Manager + published lock.");
  console.log("  Same numbers: $6,000 book · $1,111 seed · Standard · Dynamic3 · 50/25/15/10 · 15 bps burn.");
  console.log("  Never ClankerTokenV4. Never create a second AURA.");
  console.log("  Slip mechanical T-0 if the UI wants to mint a factory token.");
  console.log("");
  console.log("Verify");
  console.log("  Pool exists on Base. LP cannot be withdrawn by the team.");
  console.log("  Seed $1,111 USDC hit the book. Bought AURA sits on 0x7894… (treasury), not a new mint.");
  console.log("");
  console.log("Then post-t0");
  console.log("  npx tsx scripts/aura-t0-operator.ts post-t0");
  console.log("  VPS env + bash scripts/deploy-app.sh");
  console.log("  curl -sS https://aibusiness.fun/api/token/aura  → address = confirmed CA");
  console.log("  Pin that same CA on X @bihary41418. Never DM.");
}

function cmdCompile() {
  const r = spawnSync("npx", ["tsx", "scripts/aura-t0.ts", "--compile-only"], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function cmdVenue() {
  console.log(JSON.stringify(AURA_T0_VENUE, null, 2));
  console.log("confirm Saturday: Clanker can attach a pool to an existing ERC-20.");
  console.log("if not, native v4 Position Manager + published lock. Same split. Never ClankerTokenV4.");
}

async function cmdPredictCa() {
  applyTreasuryKey();
  const file = readTreasury();
  const from = (file?.address || process.env["AURA_LAUNCH_TREASURY"]?.trim()) as Address | undefined;
  if (!from || !/^0x[a-fA-F0-9]{40}$/.test(from)) {
    throw new Error("No treasury address. Run: npx tsx scripts/aura-t0-operator.ts treasury");
  }
  const rpc = process.env["BASE_RPC_URL"] || "https://mainnet.base.org";
  const client = createPublicClient({ chain: base, transport: http(rpc) });
  const nonce = await client.getTransactionCount({ address: from });
  const aura = getContractAddress({ from, nonce: BigInt(nonce) });
  const burn = getContractAddress({ from, nonce: BigInt(nonce + 1) });
  const gauge = getContractAddress({ from, nonce: BigInt(nonce + 2) });
  const payload = {
    chainId: 8453,
    network: "base",
    deployer: from,
    mainnetNonce: nonce,
    predicted: {
      AuraToken: aura,
      AuraBurnSink: burn,
      AuraGauge: gauge,
    },
    note:
      "CREATE address = f(deployer, nonce) only — same as Sepolia when nonce matches. Valid only if AuraToken remains the next CREATE on Base and nonce does not change.",
    doNot: [
      "Do not publish this CA on /token, X, or DexScreener before locked book + T-0",
      "Do not set AURA_TOKEN_CA or AURA_CA_PUBLISH on the VPS until post-t0",
      "Local preview only: ALLOW_PRE_T0_CA + CA_PUBLISH + AURA_TOKEN_CA on this machine",
      "Never copy .env or .aura-t0-treasury.json to the VPS",
      "DexScreener Update Token Info needs the live Base pair — submit after attach",
    ],
    localPreviewEnv: [
      "AURA_ALLOW_PRE_T0_CA=1",
      "AURA_CA_PUBLISH=1",
      "VITE_AURA_ALLOW_PRE_T0_CA=1",
      "VITE_AURA_CA_PUBLISH=1",
      `AURA_TOKEN_CA=${aura}`,
      `VITE_AURA_TOKEN_CA=${aura}`,
    ],
    writtenAt: new Date().toISOString(),
  };
  writeFileSync(PREDICTED_FILE, JSON.stringify(payload, null, 2) + "\n", { mode: 0o600 });
  chmodSync(PREDICTED_FILE, 0o600);
  console.log("Predicted mainnet CAs (no transaction sent):");
  console.log("  deployer", from);
  console.log("  mainnetNonce", nonce);
  console.log("  AuraToken", aura);
  console.log("  AuraBurnSink (2nd CREATE)", burn);
  console.log("  AuraGauge (3rd CREATE)", gauge);
  if (nonce !== 0) {
    console.warn("WARNING: mainnet nonce is not 0 — prediction is for the *next* CREATE only.");
  }
  console.log("wrote", PREDICTED_FILE, "(gitignored — do not publish)");
  console.log("Local token-page preview: set the two env lines above on THIS machine only. Never VPS before T-0.");
  console.log("DexScreener: draft metadata now; submit Update Token Info only after the locked pool is live.");
}

async function cmdWait() {
  if (tokenLaunchIsLive()) {
    console.log("T-0 is live. Run: npx tsx scripts/aura-t0-operator.ts broadcast --go");
    return;
  }
  console.log("waiting until", TOKEN_LAUNCH_AT_ISO, TOKEN_LAUNCH_DISPLAY);
  while (!tokenLaunchIsLive()) {
    const r = tokenLaunchRemain();
    process.stdout.write(
      `\rT-${r.days}d ${padLaunchUnit(r.hours)}:${padLaunchUnit(r.minutes)}:${padLaunchUnit(r.seconds)}   `,
    );
    const slice = Math.min(1000, Math.max(50, tokenLaunchAtMs() - Date.now()));
    await new Promise((resolve) => setTimeout(resolve, slice));
  }
  console.log("\nGO — run: npx tsx scripts/aura-t0-operator.ts broadcast --go");
  console.log("Human in the loop. Key stays off the VPS.");
}

async function cmdBroadcast(extra: string[]) {
  applyTreasuryKey();
  const sepolia = extra.includes("--sepolia");
  if (!sepolia && !extra.includes("--go")) {
    throw new Error(
      "Mainnet broadcast requires --go. Example: npx tsx scripts/aura-t0-operator.ts broadcast --go",
    );
  }
  if (!sepolia && !tokenLaunchIsLive()) {
    const r = tokenLaunchRemain();
    throw new Error(
      `Refusing mainnet broadcast before T-0 (${TOKEN_LAUNCH_AT_ISO}). ${r.days}d ${r.hours}h ${r.minutes}m left. Rehearse with --sepolia.`,
    );
  }
  if (!process.env["AURA_T0_KEY"]) {
    throw new Error("AURA_T0_KEY missing. Run treasury on this machine, or export the key locally — never on the VPS.");
  }
  if (!sepolia) {
    const t0Key = process.env["AURA_T0_KEY"].trim();
    const privateKey = (process.env["PRIVATE_KEY"] || "").trim();
    if (
      privateKey &&
      t0Key.toLowerCase().replace(/^0x/, "") === privateKey.toLowerCase().replace(/^0x/, "")
    ) {
      throw new Error("AURA_T0_KEY equals PRIVATE_KEY — wrong wallet. Aborting.");
    }
    const account = privateKeyToAccount(t0Key as `0x${string}`);
    const file = readTreasury();
    if (file && account.address.toLowerCase() !== file.address.toLowerCase()) {
      throw new Error("AURA_T0_KEY is not the launch treasury in .aura-t0-treasury.json.");
    }
    const rpc = process.env["BASE_RPC_URL"] || "https://mainnet.base.org";
    const client = createPublicClient({ chain: base, transport: http(rpc) });
    const [nonce, block] = await Promise.all([
      client.getTransactionCount({ address: account.address }),
      client.getBlock({ blockTag: "latest" }),
    ]);
    if (nonce !== 0) {
      throw new Error(
        `Refusing: tokenAdmin nonce is ${nonce}. Predicted CA requires nonce 0.`,
      );
    }
    if (Number(block.timestamp) * 1000 < tokenLaunchAtMs()) {
      throw new Error(
        `Refusing: Base block time is before T-0 (${TOKEN_LAUNCH_AT_ISO}). Local clock is not enough.`,
      );
    }
    const team = (process.env["AURA_WALLET_TEAM_BENEFICIARY"] || "").trim();
    if (
      !/^0x[a-fA-F0-9]{40}$/.test(team) ||
      team.toLowerCase() === account.address.toLowerCase()
    ) {
      throw new Error(
        "Set AURA_WALLET_TEAM_BENEFICIARY to the team Safe 0x96E85b3560C6959783c158B39672206afB6365ac — not the deployer.",
      );
    }
    console.log("mainnet preflight ok — nonce 0, Base time ≥ T-0, treasury key matches file, team Safe set");
  }
  const args = ["tsx", "scripts/aura-t0.ts", ...extra];
  console.log("running", "npx", args.join(" "));
  const r = spawnSync("npx", args, { cwd: ROOT, stdio: "inherit", env: process.env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

async function cmdHood(sepolia: boolean) {
  const chain = sepolia ? baseSepolia : base;
  const rpc =
    (sepolia ? process.env["BASE_SEPOLIA_RPC_URL"] : process.env["BASE_RPC_URL"]) ||
    (sepolia ? "https://sepolia.base.org" : "https://mainnet.base.org");
  const client = createPublicClient({ chain, transport: http(rpc) });
  const passport = genesisPassportAddress();
  const escrow = launchEscrowAddress();
  const gifts = launchGiftLockAddress();
  let minted = 0n;
  if (passport) {
    try {
      minted = (await client.readContract({
        address: passport,
        abi: HOOD_PASSPORT_ABI,
        functionName: "totalMinted",
      })) as bigint;
    } catch (e) {
      console.warn("totalMinted unread", e instanceof Error ? e.message : e);
    }
  }
  const need = minted * BigInt(HOOD_GIFT_AURA);
  console.log("Hood follow-through (second clock — not the $1,111 seed)");
  console.log("passport", passport ?? "(set GENESIS_NFT_CONTRACT)");
  console.log("escrow", escrow ?? "(set LAUNCH_ESCROW_CONTRACT)");
  console.log("gift drop", gifts ?? "(set LAUNCH_GIFT_LOCK_CONTRACT)");
  console.log("minted Hoods", minted.toString());
  console.log("prefund gift drop", need.toString(), `AURA  (${HOOD_GIFT_AURA} × minted)`);
  console.log("1. At T-0 after CA is public: guardian proposeV2Market(aura, pair) or proposeAdapter(aura, adapter)");
  console.log("2. Wait 72 hours. Anyone executeMarket(). Escrowed USDC buys AURA into the gift drop.");
  console.log("3. Owner openRedeem() on AuraPauraRedeem ONLY after the CA is on /token + X.");
  console.log("4. Hood holders claim(tokenId) — unlocked AURA in wallet.");
}

function cmdPostT0() {
  console.log(`Post T-0 (${TOKEN_LAUNCH_DISPLAY}) — after AuraToken + book are live:`);
  console.log("1. Set on VPS (public env, not the private key) AFTER the locked book is live:");
  console.log("   AURA_CA_PUBLISH=1");
  console.log("   VITE_AURA_CA_PUBLISH=1");
  console.log("   AURA_TOKEN_CA / VITE_AURA_TOKEN_CA   (mainnet AuraToken — never Sepolia, never predicted-only)");
  console.log("   AURA_POOL_USDC / VITE_AURA_POOL_USDC");
  console.log("   AURA_GAUGE / AURA_BURN_SINK / AURA_PAURA_REDEEM");
  console.log("   AURA_PROTOCOL_SINK / VITE_AURA_PROTOCOL_SINK  (25% → locked LP / POL — not ops extract)");
  console.log("   AURA_QUEST_BONUS / VITE_AURA_QUEST_BONUS");
  console.log("   AURA_LAUNCH_TREASURY / VITE_AURA_LAUNCH_TREASURY  (public address only — not the CA)");
  console.log("   Never set AURA_ALLOW_PRE_T0_CA on the VPS.");
  console.log("2. Deploy the app so /token and /trust show the CA.");
  console.log("3. Pin the CA on X @bihary41418 in the same minute. Never by DM.");
  console.log("4. DexScreener token info from https://aibusiness.fun/api/token/aura");
  console.log("5. GoPlus AFTER the 15s sniper fee has decayed — standing token tax stays 0%.");
  console.log("6. Then hood propose + openRedeem (see: npx tsx scripts/aura-t0-operator.ts hood)");
  console.log("7. Week-1: sweep protocol sink ≥3×/week into the same locked book — docs/AURA_LP_AND_MINT.md §6");
  console.log("Do NOT copy AURA_T0_KEY onto the VPS.");
}

async function main() {
  loadDotenv();
  const args = process.argv.slice(2);
  const cmd = args[0] || "help";
  const rest = args.slice(1);
  const sepolia = rest.includes("--sepolia");
  const force = rest.includes("--force");

  switch (cmd) {
    case "help":
    case "-h":
    case "--help":
      help();
      return;
    case "treasury":
      cmdTreasury(force);
      return;
    case "second-buy":
      cmdSecondBuy(force);
      return;
    case "status":
      await cmdStatus(sepolia);
      return;
    case "compile":
      cmdCompile();
      return;
    case "venue":
      cmdVenue();
      return;
    case "desk":
      cmdDesk();
      return;
    case "predict-ca":
      await cmdPredictCa();
      return;
    case "wait":
      await cmdWait();
      return;
      case "broadcast":
      await cmdBroadcast(rest);
      return;
    case "hood":
      await cmdHood(sepolia);
      return;
    case "post-t0":
      cmdPostT0();
      return;
    default:
      help();
      throw new Error(`unknown command ${cmd}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
