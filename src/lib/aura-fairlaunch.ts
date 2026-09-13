/**
 * Standalone /get storefront — two doors to AURA.
 * Never invent a CA. Official book is locked Uni v4 AURA/USDC on Base.
 */

import { auraBuyOfficialCa, auraBuyCaPublished } from "@/lib/aura-buy-guide";
import { BASE_USDC } from "@/lib/private-sale";
import { TOKEN_LAUNCH_DISPLAY, TOKEN_LAUNCH_DISPLAY_DE } from "@/lib/aura-t0-clock";

export const AURA_GET_PATH = "/get" as const;

export function auraGetCaLive(): boolean {
  return auraBuyCaPublished();
}

export function auraGetOfficialCa(): `0x${string}` | null {
  return auraBuyOfficialCa();
}

/** Uniswap swap URL only after the official CA is published. */
export function officialAuraUniswapUrl(ca: `0x${string}` | null = auraGetOfficialCa()): string | null {
  if (!ca) return null;
  const params = new URLSearchParams({
    chain: "base",
    inputCurrency: BASE_USDC,
    outputCurrency: ca,
  });
  return `https://app.uniswap.org/swap?${params.toString()}`;
}

export function officialAuraBasescanUrl(ca: `0x${string}` | null = auraGetOfficialCa()): string | null {
  if (!ca) return null;
  return `https://basescan.org/token/${ca}`;
}

export const AURA_GET_COPY = {
  kicker: "Fair launch · AURA · Base",
  kickerDe: "Fair Launch · AURA · Base",
  title: "Get AURA",
  titleDe: "AURA holen",
  lead: "Two ways. Official book only — locked Uniswap v4 AURA/USDC. No contract address until T-0. Never a CA by DM.",
  leadDe:
    "Zwei Wege. Nur das offizielle Buch — gesperrtes Uniswap v4 AURA/USDC. Keine Contract-Adresse vor T-0. Nie eine CA per DM.",
  clockWait: `Official CA lands here at ${TOKEN_LAUNCH_DISPLAY}. We email you when it is live.`,
  clockWaitDe: `Die offizielle CA steht hier ab ${TOKEN_LAUNCH_DISPLAY_DE}. Wir mailen dir, sobald sie live ist.`,
  smartTitle: "Smart wallet",
  smartTitleDe: "Smart Wallet",
  smartTag: "No crypto yet",
  smartTagDe: "Noch kein Crypto",
  smartBody:
    "Create a free Aura account. We open a smart wallet on Base. Pay with a card. AURA lands in that wallet after T-0. This is fulfillment — not an on-chain swap at checkout.",
  smartBodyDe:
    "Kostenloses Aura-Konto. Wir öffnen eine Smart Wallet auf Base. Du zahlst mit Karte. AURA kommt nach T-0 in diese Wallet. Das ist Erfüllung — kein On-Chain-Swap an der Kasse.",
  smartCta: "Start with a smart wallet",
  smartCtaDe: "Mit Smart Wallet starten",
  walletTitle: "Your wallet",
  walletTitleDe: "Deine Wallet",
  walletTag: "MetaMask, Rabby, WalletConnect",
  walletTagDe: "MetaMask, Rabby, WalletConnect",
  walletBody:
    "Connect the wallet you already have. When the official CA is live, buy AURA/USDC on Uniswap v4 on Base. Copy the CA only from this page.",
  walletBodyDe:
    "Verbinde die Wallet, die du schon hast. Wenn die offizielle CA live ist, kaufst du AURA/USDC auf Uniswap v4 auf Base. CA nur von dieser Seite kopieren.",
  walletCta: "Use my wallet",
  walletCtaDe: "Meine Wallet nutzen",
  connectInjected: "Browser wallet",
  connectInjectedDe: "Browser-Wallet",
  connectWc: "WalletConnect",
  connectWcDe: "WalletConnect",
  connecting: "Connecting…",
  connectingDe: "Verbinden…",
  connected: "Connected",
  connectedDe: "Verbunden",
  disconnect: "Disconnect",
  disconnectDe: "Trennen",
  switchBase: "Switch to Base",
  switchBaseDe: "Auf Base wechseln",
  copyCa: "Copy official CA",
  copyCaDe: "Offizielle CA kopieren",
  copied: "Copied",
  copiedDe: "Kopiert",
  buyUni: "Buy on Uniswap",
  buyUniDe: "Auf Uniswap kaufen",
  viewToken: "View on Basescan",
  viewTokenDe: "Auf Basescan",
  quoteHint: "Quote is the official book. Settlement is on Uniswap v4 on Base — not a surprise pair.",
  quoteHintDe:
    "Quote ist das offizielle Buch. Settlement auf Uniswap v4 auf Base — kein Überraschungspaar.",
  notLive:
    "Connect now so you are ready. The buy button unlocks when the official CA is on this page.",
  notLiveDe:
    "Jetzt verbinden, dann bist du bereit. Der Kauf-Button geht, sobald die offizielle CA hier steht.",
  paid: "Payment received. AURA lands in your Aura wallet after T-0 — we email you.",
  paidDe: "Zahlung angekommen. AURA kommt nach T-0 in deine Aura-Wallet — wir mailen dir.",
  canceled: "Checkout canceled. Packs stay here.",
  canceledDe: "Checkout abgebrochen. Packs bleiben hier.",
  disclaimer:
    "AURA is software, not equity. You can lose the tokens. Official CA only on aibusiness.fun and X @bihary41418 — never by DM.",
  disclaimerDe:
    "AURA ist Software, keine Beteiligung. Du kannst die Token verlieren. Offizielle CA nur auf aibusiness.fun und X @bihary41418 — nie per DM.",
} as const;
