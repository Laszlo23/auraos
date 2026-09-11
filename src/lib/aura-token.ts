import { tokenLaunchIsLive } from "@/lib/aura-t0-clock";

/** Canonical AURA market-token economics. Percentages match the whitepaper; units sum exactly. */

export const AURA_TOKEN_SYMBOL = "AURA";
export const AURA_TOKEN_NAME = "AURA Token";
export const AURA_MAX_SUPPLY = 777_777_777;
export const AURA_MAX_SUPPLY_DISPLAY = "777,777,777";
export const AURA_MAX_SUPPLY_DISPLAY_DE = "777.777.777";

/** Official Base CA — null until T-0. Prefer auraTokenAddress() after env is set. Never invent one. */
export const AURA_TOKEN_CA: `0x${string}` | null = null;
export const AURA_PAIR_URL: string | null = null;
export const AURA_OFFICIAL_CA_SOURCES = [
  "https://aibusiness.fun/token",
  "https://aibusiness.fun/buy",
  "https://aibusiness.fun/trust",
  "https://aibusiness.fun/tokenomics",
  "https://x.com/buildingcultu3",
] as const;

function envFlagTrue(...names: string[]): boolean {
  for (const name of names) {
    let raw = "";
    if (typeof process !== "undefined") raw = process.env[name] ?? "";
    if (
      !raw &&
      typeof import.meta !== "undefined" &&
      import.meta.env &&
      typeof import.meta.env[name] === "string"
    ) {
      raw = String(import.meta.env[name]);
    }
    const value = raw.trim().toLowerCase();
    if (value === "1" || value === "true" || value === "yes") return true;
  }
  return false;
}

/**
 * Predicted CREATE addresses in local `.env` must not become public.
 * Publish only after T-0 (or an explicit local preview) AND `AURA_CA_PUBLISH=1`.
 * Never set `AURA_ALLOW_PRE_T0_CA` on the VPS.
 */
export function auraCaPublishAllowed(nowMs: number = Date.now()): boolean {
  const publish = envFlagTrue("AURA_CA_PUBLISH", "VITE_AURA_CA_PUBLISH");
  if (!publish) return false;
  if (tokenLaunchIsLive(nowMs)) return true;
  return envFlagTrue("AURA_ALLOW_PRE_T0_CA", "VITE_AURA_ALLOW_PRE_T0_CA");
}

/** Hide T-0 addresses until publish is allowed — launch treasury stays separate. */
export function onlyIfAuraCaPublished<T>(value: T | null, nowMs: number = Date.now()): T | null {
  return auraCaPublishAllowed(nowMs) ? value : null;
}

function readAuraTokenCaFromEnv(): `0x${string}` | null {
  const fromProc =
    typeof process !== "undefined"
      ? process.env["AURA_TOKEN_CA"] || process.env["VITE_AURA_TOKEN_CA"] || ""
      : "";
  const fromVite =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    typeof import.meta.env["VITE_AURA_TOKEN_CA"] === "string"
      ? String(import.meta.env["VITE_AURA_TOKEN_CA"])
      : "";
  return readConfiguredBaseAddress(fromProc, fromVite);
}

/** Live official CA — null unless publish is allowed. Same SSOT as auraTokenAddress(). */
export function publishedAuraTokenAddress(nowMs: number = Date.now()): `0x${string}` | null {
  return onlyIfAuraCaPublished(readAuraTokenCaFromEnv(), nowMs);
}

export function auraCaLive(nowMs: number = Date.now()): boolean {
  return publishedAuraTokenAddress(nowMs) !== null;
}

export type AuraAllocation = {
  id: string;
  label: string;
  labelDe: string;
  pct: number;
  amount: number;
};

/**
 * Whole-token split of 777,777,777.
 * Private sale is still 33% after the +11% bonus (256,666,632):
 * 30% open buyers + 3% project take bought through the same pAURA sale.
 * Unsold pAURA is never minted — those lines are hard caps, not guarantees.
 */
export const AURA_ALLOCATIONS: AuraAllocation[] = [
  {
    id: "community",
    label: "Community & contributor rewards",
    labelDe: "Gemeinschaft und Mitmachen",
    pct: 24,
    amount: 186_666_699,
  },
  {
    id: "ecosystem",
    label: "Ecosystem growth & partnerships",
    labelDe: "Wachstum und Partner",
    pct: 10,
    amount: 77_777_778,
  },
  {
    id: "treasury",
    label: "Treasury",
    labelDe: "Firmenreserve",
    pct: 10,
    amount: 77_777_778,
  },
  {
    id: "team",
    label: "Team & founders",
    labelDe: "Team und Gründer",
    pct: 12,
    amount: 93_333_333,
  },
  {
    id: "private",
    label: "Private sale (open buyers)",
    labelDe: "Private Sale (offene Käufer)",
    pct: 30,
    amount: 233_333_322,
  },
  {
    id: "project_sale",
    label: "Private sale (project, locked)",
    labelDe: "Private Sale (Projekt, gesperrt)",
    pct: 3,
    amount: 23_333_310,
  },
  {
    id: "liquidity",
    label: "Liquidity",
    labelDe: "Liquidität",
    pct: 6,
    amount: 46_666_667,
  },
  {
    id: "advisors",
    label: "Advisors",
    labelDe: "Berater",
    pct: 2,
    amount: 15_555_556,
  },
  {
    id: "marketing",
    label: "Marketing & acquisition",
    labelDe: "Werbung und Kundengewinnung",
    pct: 2,
    amount: 15_555_556,
  },
  {
    id: "public",
    label: "Hood launch gifts (claim at T-0)",
    labelDe: "Hood-Startgeschenke (Claim ab T-0)",
    pct: 1,
    amount: 7_777_778,
  },
];

export const AURA_ALLOCATION_TOTAL = AURA_ALLOCATIONS.reduce((s, a) => s + a.amount, 0);

if (AURA_ALLOCATION_TOTAL !== AURA_MAX_SUPPLY) {
  throw new Error(`AURA allocations sum to ${AURA_ALLOCATION_TOTAL}, expected ${AURA_MAX_SUPPLY}`);
}

export const AURA_TEAM_VESTING = {
  cliffMonths: 12,
  vestMonths: 36,
  note: "12-month cliff, then 36-month linear vesting. No unrestricted team unlock at T-0.",
  noteDe:
    "12 Monate Sperrfrist, danach 36 Monate schrittweise Freigabe. Beim Start bekommt das Team nichts frei.",
} as const;

/** Project buys this pAURA slice after the sale has been live ~2 days, then locks the AURA. */
export const AURA_PROJECT_SALE_LOCK = {
  buyAfterHours: 48,
  lockDaysAfterT0: 90,
  note: "Project buys its 3% private-sale slice through the same pAURA contract, earliest 48 hours after the sale opened. Those AURA lock for 90 days after T-0. Publicly verifiable. Not free team tokens.",
  noteDe:
    "Das Projekt kauft seinen 3%-Anteil über denselben pAURA-Contract, frühestens 48 Stunden nach Sale-Start. Diese AURA sind 90 Tage nach T-0 gesperrt. Öffentlich prüfbar. Keine freien Team-Token.",
} as const;

export const AURA_LOCKS = [
  {
    id: "team",
    label: "Team & founders",
    labelDe: "Team und Gründer",
    lock: AURA_TEAM_VESTING.note,
    lockDe: AURA_TEAM_VESTING.noteDe,
  },
  {
    id: "project_sale",
    label: "Project private-sale take",
    labelDe: "Projekt-Anteil aus dem Private Sale",
    lock: AURA_PROJECT_SALE_LOCK.note,
    lockDe: AURA_PROJECT_SALE_LOCK.noteDe,
  },
  {
    id: "liquidity",
    label: "Launch liquidity",
    labelDe: "Start-Liquidität",
    lock: "Launch LP is a locked Uniswap v4 AURA/USDC FlatStart book at T-0 — $6,000 USDC at ~$0.001, 18M AURA near the first ticks. No team withdraw, not a team wallet.",
    lockDe:
      "Die Start-LP ist bei T-0 ein gesperrtes Uniswap-v4-AURA/USDC-FlatStart-Buch — 6.000 $ USDC bei ~0,001 $, 18 Mio. AURA an den ersten Ticks. Kein Team-Withdraw, keine Team-Wallet.",
  },
  {
    id: "hood_gifts",
    label: "Hood launch gifts",
    labelDe: "Hood-Startgeschenke",
    lock: "Each Hood is owed 7,777 unlocked AURA plus any AURA the Hood USDC book buys on the official pair. Claim into your wallet at T-0. No admin clawback. 70% of each $299 mint is trapped in AuraLaunchEscrow until that buy.",
    lockDe:
      "Jeder Hood bekommt 7.777 freigeschaltete AURA plus AURA, die das Hood-USDC-Buch auf dem offiziellen Paar kauft. Claim in die Wallet ab T-0. Kein Admin-Clawback. 70% jedes 299-$-Mints bleiben im AuraLaunchEscrow bis zu diesem Kauf.",
  },
] as const;

/**
 * T-0 ops. Do not invent a CA, deployer, or treasury address.
 * Set AURA_LAUNCH_TREASURY / VITE_AURA_LAUNCH_TREASURY on the VPS when the new wallet exists.
 */
export const AURA_LAUNCH_OPS = {
  deployer:
    "AURA is created at T-0 from a new empty wallet — not the private-sale admin wallet and not the live sale treasury. Official CA only on aibusiness.fun and X @buildingcultu3.",
  deployerDe:
    "AURA entsteht bei T-0 aus einer neuen, leeren Wallet — nicht die Private-Sale-Admin-Wallet und nicht die laufende Sale-Treasury. Offizielle CA nur auf aibusiness.fun und X @buildingcultu3.",
  treasury:
    "Launch treasury is a new wallet, published when set. Today's pAURA USDC still goes to the live sale contract treasury (immutable on that contract). Changing the sale destination requires a new sale contract.",
  treasuryDe:
    "Die Launch-Treasury ist eine neue Wallet, veröffentlicht sobald sie gesetzt ist. Heutige pAURA-USDC gehen weiter an die laufende Sale-Contract-Treasury (dort unveränderlich). Ein anderes Sale-Ziel braucht einen neuen Sale-Contract.",
} as const;

export function readConfiguredBaseAddress(
  ...candidates: Array<string | undefined>
): `0x${string}` | null {
  for (const raw of candidates) {
    const value = raw?.trim() ?? "";
    if (/^0x[a-fA-F0-9]{40}$/.test(value)) return value as `0x${string}`;
  }
  return null;
}

/** New AURA launch treasury. Null until set on the VPS — never invent one. */
export function auraLaunchTreasuryAddress(): `0x${string}` | null {
  const fromProc =
    typeof process !== "undefined"
      ? process.env["AURA_LAUNCH_TREASURY"] || process.env["VITE_AURA_LAUNCH_TREASURY"] || ""
      : "";
  const fromVite =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    typeof import.meta.env["VITE_AURA_LAUNCH_TREASURY"] === "string"
      ? String(import.meta.env["VITE_AURA_LAUNCH_TREASURY"])
      : "";
  return readConfiguredBaseAddress(fromProc, fromVite);
}

export function allocationById(id: string): AuraAllocation {
  const row = AURA_ALLOCATIONS.find((a) => a.id === id);
  if (!row) throw new Error(`Unknown AURA allocation: ${id}`);
  return row;
}

export const AURA_BUY_PLAN = {
  headline: "No contract address until T-0. Buy only on the published Base pair.",
  steps: [
    {
      t: "Before launch",
      d: "Read the whitepaper. Join the whitelist tasks. Do not send funds to any unofficial CA.",
    },
    {
      t: "T-0 on Base",
      d: "We deploy AURA from a new empty wallet and seed a locked Uniswap v4 AURA/USDC FlatStart book ($6,000 USDC at ~$0.001, Dynamic3 fees). Official CA + pool id are published on aibusiness.fun and X @buildingcultu3 only.",
    },
    {
      t: "First official buy",
      d: "€3,000 strategic acquisition + €3,000 across 30 capped market-ops agents. No wash, no self-trade, no circular volume.",
    },
    {
      t: "Community buy",
      d: "Same Base pair, same CA. Prefer the in-app Wallet / Grow swap once the pair is live. Never buy from a DM or a cloned ticker.",
    },
  ],
} as const;

export function formatAuraAmount(n: number, locale: "en" | "de" = "en"): string {
  return n.toLocaleString(locale === "de" ? "de-AT" : "en-US");
}
