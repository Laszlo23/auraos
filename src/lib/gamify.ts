import type { Quest } from "@/components/aura/quests";

/** Company-building rite of passage — the first hour of owning an AI company. */
export const COMPANY_QUESTS: Quest[] = [
  {
    key: "onboard:name",
    label: "Name it",
    hint: "Give the organism an identity",
    glyph: "◎",
    xp: 100,
  },
  {
    key: "onboard:product",
    label: "Pick a product",
    hint: "Choose what your agents monetise",
    glyph: "❖",
    xp: 160,
  },
  {
    key: "onboard:channels",
    label: "Open a channel",
    hint: "Connect X, Meta or LinkedIn",
    glyph: "⌁",
    xp: 140,
  },
  {
    key: "company:spin",
    label: "First spin",
    hint: "Claim your daily reserve drop",
    glyph: "◍",
    xp: 80,
  },
  {
    key: "mission:created",
    label: "Plan a mission",
    hint: "Turn a revenue goal into a strategy",
    glyph: "◎",
    xp: 40,
  },
  {
    key: "mission:started",
    label: "Start a mission",
    hint: "Activate employees on a planned mission",
    glyph: "▲",
    xp: 60,
  },
  {
    key: "mission:complete",
    label: "Complete a mission",
    hint: "Close the loop with honest actuals",
    glyph: "✓",
    xp: 120,
  },
  {
    key: "mission:first_settlement",
    label: "First settlement",
    hint: "A ledger row settles against a mission",
    glyph: "◈",
    xp: 80,
  },
];

/** Money-making loop — the trading desk is the first product that pays. */
export const TRADING_QUESTS: Quest[] = [
  {
    key: "trading:fund",
    label: "Fund the wallet",
    hint: "Deposit USDC on Base to your smart wallet",
    glyph: "◈",
    xp: 80,
  },
  {
    key: "trading:session",
    label: "Issue Trade key",
    hint: "Session key so Quant can swap inside caps",
    glyph: "⌁",
    xp: 100,
  },
  {
    key: "trading:strategy",
    label: "Pick a preset",
    hint: "One-tap Steady ETH, Dip buyer, or Whale follow",
    glyph: "✎",
    xp: 80,
  },
  {
    key: "trading:backtest",
    label: "Review the backtest",
    hint: "Plain-language results on real candles",
    glyph: "❐",
    xp: 100,
  },
  {
    key: "trading:approve",
    label: "Approve a strategy",
    hint: "Let it into the live book",
    glyph: "✓",
    xp: 120,
  },
  {
    key: "trading:arm",
    label: "Arm the desk",
    hint: "Caps on — Quant works while you sleep",
    glyph: "▲",
    xp: 120,
  },
];

export type PrizeKind = "tokens" | "xp" | "perk";

export type Prize = {
  kind: PrizeKind;
  label: string;
  short: string;
  amount: number;
  weight: number;
  tone: "primary" | "gold";
  rare?: boolean;
};

/** The daily wheel. Mostly small, occasionally a real perk — that is the loop. */
export const WHEEL_PRIZES: Prize[] = [
  { kind: "tokens", label: "250 AURA", short: "250", amount: 250, weight: 26, tone: "primary" },
  { kind: "xp", label: "80 XP", short: "80 XP", amount: 80, weight: 22, tone: "primary" },
  { kind: "tokens", label: "600 AURA", short: "600", amount: 600, weight: 16, tone: "primary" },
  { kind: "xp", label: "220 XP", short: "220 XP", amount: 220, weight: 14, tone: "primary" },
  { kind: "tokens", label: "1,500 AURA", short: "1.5K", amount: 1500, weight: 9, tone: "gold" },
  {
    kind: "perk",
    label: "Agent slot",
    short: "SLOT",
    amount: 300,
    weight: 6,
    tone: "gold",
    rare: true,
  },
  {
    kind: "perk",
    label: "Quant boost",
    short: "BOOST",
    amount: 400,
    weight: 5,
    tone: "gold",
    rare: true,
  },
  {
    kind: "tokens",
    label: "5,000 AURA",
    short: "5K",
    amount: 5000,
    weight: 2,
    tone: "gold",
    rare: true,
  },
];

export function drawPrize(): Prize {
  const total = WHEEL_PRIZES.reduce((s, p) => s + p.weight, 0);
  let roll = Math.random() * total;
  for (const prize of WHEEL_PRIZES) {
    roll -= prize.weight;
    if (roll <= 0) return prize;
  }
  return WHEEL_PRIZES[0] as Prize;
}

export const utcDay = () => new Date().toISOString().slice(0, 10);
