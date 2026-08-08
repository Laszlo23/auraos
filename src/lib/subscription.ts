import { TOKEN_SYMBOL } from "@/lib/plans";

/** Off-chain phase: the ledger is the source of truth until on-chain AURA ships. */
export const CHAIN_PHASE = {
  current: "ledger",
  label: "Off-chain ledger · phase 1",
  next: "Wallet binding + smart accounts · phase 2",
} as const;

export const ROADMAP = [
  {
    phase: "01",
    title: `${TOKEN_SYMBOL} ledger`,
    body: "Every agent action is metered and burned against your monthly allowance. Live today.",
    state: "live" as const,
  },
  {
    phase: "02",
    title: "Wallet binding",
    body: "Embedded Alchemy Light Account plus optional verified external wallets. Locks founder conversion rate.",
    state: "live" as const,
  },
  {
    phase: "03",
    title: "On-chain settlement",
    body: `Cycles settle as ${TOKEN_SYMBOL} transfers. Your off-chain balance migrates 1:1 to the smart account — no manual claim for most members.`,
    state: "soon" as const,
  },
  {
    phase: "04",
    title: "Agent streaming",
    body: "Session-key sub-budgets stream between agents as work is delivered.",
    state: "soon" as const,
  },
];

/**
 * Conversion reserved for phase-03 migration. Do not change without a founder
 * announcement — Connect / Identity copy references this rate.
 */
export const FOUNDER_AURA_PER_USDC = 1000;

/** Maps ledger balance → future on-chain units (1:1 today). */
export function ledgerToOnchainAura(tokensRemaining: number): number {
  return Math.max(0, Math.floor(tokensRemaining));
}

export const CYCLE_DAYS = 30;

export function cycleWindow(from = new Date()) {
  const start = new Date(from);
  const end = new Date(from.getTime() + CYCLE_DAYS * 86_400_000);
  return { cycle_start: start.toISOString(), cycle_end: end.toISOString() };
}

export function daysLeft(cycleEnd?: string | null) {
  if (!cycleEnd) return 0;
  return Math.max(0, Math.ceil((new Date(cycleEnd).getTime() - Date.now()) / 86_400_000));
}

export function cycleProgress(start?: string | null, end?: string | null) {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (e <= s) return 0;
  return Math.min(100, Math.max(0, ((Date.now() - s) / (e - s)) * 100));
}

export const shortHash = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
