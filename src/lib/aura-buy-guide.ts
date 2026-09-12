/**
 * Standalone /buy SSOT — three ways to get AURA after T-0.
 * Card checkout is fulfillment (cash-desk), not an on-chain swap.
 * Never invent a CA. Official book is locked Uni v4 AURA/USDC on Base.
 */

import { auraTokenAddress } from "@/lib/aura-self-launch";
import { auraCaLive } from "@/lib/aura-token";
import { TOKEN_LAUNCH_DISPLAY, TOKEN_LAUNCH_DISPLAY_DE } from "@/lib/aura-t0-clock";

export const AURA_BUY_PATH = "/buy" as const;

export const AURA_BUY_BASE_APP_URL = "https://base.app/invite/friends/KCFJ42BF";
export const AURA_BUY_BINANCE_URL = "https://www.binance.com/register?ref=BXKGGJD6";

export const AURA_BUY_PACKS = [
  { id: "29", usd: 29, envKey: "STRIPE_PRICE_AURA_BUY_29" },
  { id: "111", usd: 111, envKey: "STRIPE_PRICE_AURA_BUY_111" },
  { id: "299", usd: 299, envKey: "STRIPE_PRICE_AURA_BUY_299" },
] as const;

export type AuraBuyPackId = (typeof AURA_BUY_PACKS)[number]["id"];

export const AURA_BUY_PACK_IDS: readonly AuraBuyPackId[] = AURA_BUY_PACKS.map((p) => p.id);

export function isAuraBuyPackId(value: string | undefined): value is AuraBuyPackId {
  return AURA_BUY_PACK_IDS.includes(value as AuraBuyPackId);
}

export function auraBuyPackById(id: string): (typeof AURA_BUY_PACKS)[number] | undefined {
  return AURA_BUY_PACKS.find((p) => p.id === id);
}

export function stripePriceEnvForAuraBuyPack(id: AuraBuyPackId): string | undefined {
  const pack = auraBuyPackById(id);
  if (!pack) return undefined;
  const raw = process.env[pack.envKey]?.trim();
  return raw || undefined;
}

/** Investor desk is a free Light Account — no $29 OS seat, no business brief. */
export const INVESTOR_DESK_REQUIRES_FOUNDING_SEAT = false;
export const INVESTOR_COMPANY_NAME = "AURA wallet";
export const INVESTOR_HANDLE_PREFIX = "inv";

export function investorHandleForUser(userId: string): string {
  const compact = userId.replace(/-/g, "").toLowerCase().slice(0, 12);
  return `${INVESTOR_HANDLE_PREFIX}${compact}`;
}

export function auraBuyCaPublished(): boolean {
  return auraCaLive();
}

export function auraBuyOfficialCa(): `0x${string}` | null {
  return auraTokenAddress();
}

/** Kill switch for card packs. Default on. Set AURA_BUY_PACKS_ENABLED=0 on the VPS to pause charges. */
export function auraBuyPacksEnabled(): boolean {
  const raw =
    typeof process !== "undefined" ? process.env["AURA_BUY_PACKS_ENABLED"]?.trim().toLowerCase() : "";
  if (raw === "0" || raw === "false" || raw === "off") return false;
  return true;
}

export const AURA_BUY_COPY = {
  kicker: "AURA · Base · official book only",
  kickerDe: "AURA · Base · nur das offizielle Buch",
  title: "Buy AURA",
  titleDe: "AURA kaufen",
  lead: "Three short paths. Official pair is locked Uniswap v4 AURA/USDC on Base. No contract address until T-0. Never a CA by DM.",
  leadDe:
    "Drei kurze Wege. Offizielles Paar: gesperrtes Uniswap v4 AURA/USDC auf Base. Keine Contract-Adresse vor T-0. Nie eine CA per DM.",
  clockWait: `We publish the official CA on this page at ${TOKEN_LAUNCH_DISPLAY}. We email you when it is here.`,
  clockWaitDe: `Die offizielle CA steht hier ab ${TOKEN_LAUNCH_DISPLAY_DE}. Wir mailen dir, sobald sie da ist.`,
  path1Title: "Easiest — no crypto yet",
  path1TitleDe: "Am einfachsten — noch kein Crypto",
  path1Body:
    "Create a free Aura account. We open a smart wallet on Base. Pay with a card. We send AURA into that wallet after T-0. This is fulfillment — like the cash desk — not an on-chain swap at checkout.",
  path1BodyDe:
    "Kostenloses Aura-Konto. Wir öffnen eine Smart Wallet auf Base. Du zahlst mit Karte. AURA kommt nach T-0 in diese Wallet. Das ist Erfüllung — wie der Cash-Desk — kein On-Chain-Swap an der Kasse.",
  path1Honest: "Card now. AURA in your Aura wallet after T-0 — we email you.",
  path1HonestDe: "Karte jetzt. AURA nach T-0 in deiner Aura-Wallet — wir mailen dir.",
  path1CtaSignup: "Create a free account",
  path1CtaSignupDe: "Kostenloses Konto",
  path1CtaWallet: "Open my Aura wallet",
  path1CtaWalletDe: "Aura-Wallet öffnen",
  path2Title: "Phone — Base Wallet",
  path2TitleDe: "Handy — Base Wallet",
  path2Steps: [
    "Install Base App with our invite.",
    "Buy ETH in the app.",
    "Swap ETH → USDC on Base.",
    "Buy AURA on the official AURA/USDC pair — or open /swap once the CA is live.",
  ],
  path2StepsDe: [
    "Base App mit unserem Invite installieren.",
    "ETH in der App kaufen.",
    "ETH → USDC auf Base tauschen.",
    "AURA auf dem offiziellen AURA/USDC-Paar kaufen — oder /swap öffnen, sobald die CA live ist.",
  ],
  path2Cta: "Open Base App invite",
  path2CtaDe: "Base-App-Invite öffnen",
  path3Title: "Browser — extension + Binance",
  path3TitleDe: "Browser — Extension + Binance",
  path3Steps: [
    "Install MetaMask or Rabby.",
    "Buy ETH on Binance.",
    "Withdraw ETH to Base.",
    "Swap ETH → USDC, then buy on the official AURA/USDC pair. WalletConnect on this page after T-0.",
  ],
  path3StepsDe: [
    "MetaMask oder Rabby installieren.",
    "ETH auf Binance kaufen.",
    "ETH auf Base abheben.",
    "ETH → USDC, dann auf dem offiziellen AURA/USDC-Paar kaufen. WalletConnect hier nach T-0.",
  ],
  path3Cta: "Open Binance",
  path3CtaDe: "Binance öffnen",
  settleSoon: "Quote and settle unlock when the official CA is on this page.",
  settleSoonDe: "Quote und Settlement gehen, sobald die offizielle CA hier steht.",
  disclaimer:
    "AURA is software, not equity. You can lose the tokens. Official CA only on aibusiness.fun and X @bihary41418 — never by DM.",
  disclaimerDe:
    "AURA ist Software, keine Beteiligung. Du kannst die Token verlieren. Offizielle CA nur auf aibusiness.fun und X @bihary41418 — nie per DM.",
  packHint: "One-time card charge in USD. Not a subscription. Not an on-chain swap.",
  packHintDe: "Einmalige Kartenzahlung in USD. Kein Abo. Kein On-Chain-Swap.",
  packRefund:
    "Refund before we send AURA: email founders@aibusiness.fun with the Stripe receipt. After T-0 we fulfill from the paid queue on /buy.",
  packRefundDe:
    "Rückerstattung bevor wir AURA senden: founders@aibusiness.fun mit Stripe-Beleg. Nach T-0 erfüllen wir die bezahlte Queue auf /buy.",
} as const;

export function auraBuySignupHref(): string {
  return `/auth?mode=signup&next=${AURA_BUY_PATH}`;
}
