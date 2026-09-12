/**
 * Public /features SSOT — what the OS actually does, vs optional chain extras.
 */

import type { LocaleCopy } from "@/lib/product-story";

export const FEATURES_PATH = "/features" as const;

export const FEATURES_COPY = {
  kicker: { en: "Features", de: "Funktionen" } satisfies LocaleCopy,
  title: { en: "The company desk. Then the extras.", de: "Der Firmen-Desk. Dann die Extras." } satisfies LocaleCopy,
  lead: {
    en: "Aura OS is software. You describe a company, agents work, you approve spend and posts. Tokens and NFTs are optional — they do not run the desk.",
    de: "Aura OS ist Software. Du beschreibst eine Firma, Agenten arbeiten, du gibst Geld und Posts frei. Token und NFTs sind optional — sie betreiben den Desk nicht.",
  } satisfies LocaleCopy,
  deskTitle: { en: "Inside the app", de: "In der App" } satisfies LocaleCopy,
  extraTitle: { en: "Optional later — not the desk", de: "Später, optional — nicht der Desk" } satisfies LocaleCopy,
  extraLead: {
    en: "You can use Aura OS without a token or an NFT. These exist beside the software.",
    de: "Du kannst Aura OS ohne Token oder NFT nutzen. Die liegen neben der Software.",
  } satisfies LocaleCopy,
  payTitle: { en: "How you pay", de: "Wie du zahlst" } satisfies LocaleCopy,
  notTitle: { en: "Not this", de: "Nicht das" } satisfies LocaleCopy,
} as const;

export const FEATURE_DESK = [
  {
    id: "console",
    title: { en: "Company console", de: "Firmen-Konsole" } satisfies LocaleCopy,
    body: {
      en: "One home for today: roster, missions, and what needs you.",
      de: "Ein Zuhause für heute: Belegschaft, Missionen, was dich braucht.",
    } satisfies LocaleCopy,
  },
  {
    id: "missions",
    title: { en: "Missions", de: "Missionen" } satisfies LocaleCopy,
    body: {
      en: "Plain language. “Get 20 customers.” Atlas splits the work and waits.",
      de: "Normale Sprache. „Hol 20 Kunden.“ Atlas teilt die Arbeit und wartet.",
    } satisfies LocaleCopy,
  },
  {
    id: "approve",
    title: { en: "Approvals", de: "Freigaben" } satisfies LocaleCopy,
    body: {
      en: "Money and public posts do not leave without your yes.",
      de: "Geld und öffentliche Posts gehen nicht ohne dein Ja.",
    } satisfies LocaleCopy,
  },
  {
    id: "proof",
    title: { en: "Proof", de: "Proof" } satisfies LocaleCopy,
    body: {
      en: "Finished work you can see and share — not a vibe dashboard.",
      de: "Fertige Arbeit, die du sehen und teilen kannst — kein Vibe-Dashboard.",
    } satisfies LocaleCopy,
  },
  {
    id: "agents",
    title: { en: "Employees", de: "Mitarbeiter" } satisfies LocaleCopy,
    body: {
      en: "Named roles: CEO, growth, sales, customers, finance. Pause any of them.",
      de: "Echte Rollen: CEO, Growth, Sales, Kunden, Finance. Jeden pausieren.",
    } satisfies LocaleCopy,
  },
  {
    id: "channels",
    title: { en: "Channels", de: "Kanäle" } satisfies LocaleCopy,
    body: {
      en: "Connect X, Instagram, LinkedIn, Farcaster. Drafts wait for approve.",
      de: "X, Instagram, LinkedIn, Farcaster. Entwürfe warten auf Freigabe.",
    } satisfies LocaleCopy,
  },
  {
    id: "wallet",
    title: { en: "Wallet", de: "Wallet" } satisfies LocaleCopy,
    body: {
      en: "A Light Account on Base for the desk. Export the owner key if you leave.",
      de: "Eine Light Account auf Base für den Desk. Owner-Key exportieren, wenn du gehst.",
    } satisfies LocaleCopy,
  },
  {
    id: "local",
    title: { en: "Aura Local", de: "Aura Local" } satisfies LocaleCopy,
    body: {
      en: "Vienna shops, neighbors, reviews. A second door — same company.",
      de: "Wiener Betriebe, Nachbarn, Reviews. Eine zweite Tür — dieselbe Firma.",
    } satisfies LocaleCopy,
  },
] as const;

export const FEATURE_PAY = [
  {
    id: "os",
    title: { en: "Aura OS seat", de: "Aura-OS-Sitz" } satisfies LocaleCopy,
    body: {
      en: "$29 / month or $299 / year. This is the product. Card checkout.",
      de: "29 $ / Monat oder 299 $ / Jahr. Das ist das Produkt. Karte.",
    } satisfies LocaleCopy,
  },
  {
    id: "hood",
    title: { en: "The Hood", de: "The Hood" } satisfies LocaleCopy,
    body: {
      en: "$299 USDC on Base. Founding passport NFT. Optional. Not a software seat.",
      de: "299 $ USDC auf Base. Founding-Passport-NFT. Optional. Kein Software-Sitz.",
    } satisfies LocaleCopy,
  },
  {
    id: "aura",
    title: { en: "AURA", de: "AURA" } satisfies LocaleCopy,
    body: {
      en: "Software token on Base at T-0. Official CA only on aibusiness.fun. You can lose it.",
      de: "Software-Token auf Base ab T-0. Offizielle CA nur auf aibusiness.fun. Du kannst ihn verlieren.",
    } satisfies LocaleCopy,
  },
  {
    id: "square",
    title: { en: "Aura Square", de: "Aura Square" } satisfies LocaleCopy,
    body: {
      en: "Optional Base binder NFT. Contract not live yet. Planned mint: $11 USDC from a wallet — not $111, not Stripe.",
      de: "Optionales Base-Binder-NFT. Contract noch nicht live. Geplanter Mint: 11 $ USDC per Wallet — nicht 111 $, nicht Stripe.",
    } satisfies LocaleCopy,
  },
] as const;

export const FEATURE_NOT = [
  { en: "A chatbot you babysit.", de: "Ein Chatbot, den du hüten musst." },
  { en: "A token you must buy to use the OS.", de: "Ein Token, den du kaufen musst, um das OS zu nutzen." },
  { en: "A second Hood or Culture Coin sequel.", de: "Ein zweites Hood oder Culture-Coin-Fortsetzung." },
  { en: "AI that spends or posts without you.", de: "KI, die ohne dich ausgibt oder postet." },
] as const satisfies LocaleCopy[];
