/**
 * Community covenant — how we show up after Culture Coin was rugged by a former partner.
 * Principles over theater. Verifiable surfaces over vibes.
 */

import { auraSquareAddress, auraSquareExplorerUrl, auraSquareMintUrl } from "@/lib/aura-square";
import { auraTokenAddress } from "@/lib/aura-self-launch";
import { CCFF00, ccff00ExplorerNftUrl, ccff00NftContractAddress } from "@/lib/ccff00";
import { HOOKR } from "@/lib/hookr";
import { privateSaleBasescan } from "@/lib/private-sale";
import {
  SITE_URL,
  SOCIAL_LINKS,
  TOKEN_LAUNCH_DISPLAY,
  TOKEN_LAUNCH_DISPLAY_DE,
  TOKEN_LAUNCH_TRUST,
  TOKEN_LAUNCH_TRUST_DE,
} from "@/lib/site";
import { TICKPIX, tickpixContractAddress, tickpixExplorerTokenUrl } from "@/lib/tickpix";

export const COVENANT_PATH = "/trust";

export type CovenantPromise = {
  id: string;
  title: string;
  titleDe: string;
  body: string;
  bodyDe: string;
};

/** Hard rules the community can hold us to. */
export const COVENANT_PROMISES: CovenantPromise[] = [
  {
    id: "verify",
    title: "Verify on-chain — never by DM",
    titleDe: "On-chain prüfen — nie per DM",
    body: "Official CAs and mint URLs live only on aibusiness.fun, nft.aibusiness.fun, hoodstreet.capital, and hookr.fun. If someone DMs you a “new CA,” it’s not us.",
    bodyDe:
      "Offizielle CAs und Mint-URLs nur auf aibusiness.fun, nft.aibusiness.fun, hoodstreet.capital und hookr.fun. Wer per DM eine „neue CA“ schickt, ist nicht wir.",
  },
  {
    id: "ship",
    title: "Ship in public",
    titleDe: "Öffentlich shippen",
    body: "Changelog, /proof, /live, and GitHub show what actually landed. Quiet weeks stay honest zeros — we don’t invent traction.",
    bodyDe:
      "Changelog, /proof, /live und GitHub zeigen, was wirklich landete. Ruhige Wochen bleiben ehrliche Nullen — wir erfinden keine Traction.",
  },
  {
    id: "keys",
    title: "NFTs are keys, not lottery tickets",
    titleDe: "NFTs sind Schlüssel, keine Lotterie",
    body: "Hood = OS founding passport on Base. Tickpix = culture seats on Robinhood Chain. CCFF00 = HoodStreet membership (ERC-6551). None of these are equity, funds, or “number go up because JPEG.” One software token: AURA. No TICKPIX ERC-20. AURA token tax is 0% — you can sell. Trading fee 1–3% lives on the official pool, not a blacklist.",
    bodyDe:
      "Hood = OS-Founding-Pass auf Base. Tickpix = Kultur-Seats auf Robinhood Chain. CCFF00 = HoodStreet-Membership (ERC-6551). Keines davon ist Equity, Fund oder „Zahl geht hoch wegen JPEG“. Ein Software-Token: AURA. Kein TICKPIX-ERC-20. AURA-Token-Steuer ist 0 % — du kannst verkaufen. Die 1–3 %-Handelsgebühr sitzt auf dem offiziellen Pool, nicht auf einer Blacklist.",
  },
  {
    id: "no-second-hood",
    title: "No second founding collection",
    titleDe: "Keine zweite Founding-Collection",
    body: "Tickpix and CCFF00 do not unlock founding seats or Hood rebates. Aura Square is a Base utility binder (ERC-6551 TBA) — not a second Hood, not on /sale or pAURA rails. Culture membership stays culture. Product membership stays product. Hookr is pool infrastructure — not a Culture Coin sequel.",
    bodyDe:
      "Tickpix und CCFF00 schalten keine Founding Seats und keine Hood-Rabatte frei. Aura Square ist ein Base-Utility-Binder (ERC-6551-TBA) — kein zweites Hood, nicht auf /sale oder pAURA-Schienen. Kultur bleibt Kultur. Produkt bleibt Produkt. Hookr ist Pool-Infrastruktur — keine Culture-Coin-Fortsetzung.",
  },
  {
    id: "fair",
    title: "Fair launch rules stay public",
    titleDe: "Fair-Launch-Regeln bleiben öffentlich",
    body: `${TOKEN_LAUNCH_TRUST} Announced T-0: ${TOKEN_LAUNCH_DISPLAY}. T-0 is Uniswap v4 on Base (locked AURA/USDC, published hooks). Official AURA CA only on /token and /trust — never DM.`,
    bodyDe: `${TOKEN_LAUNCH_TRUST_DE} Angekündigt: ${TOKEN_LAUNCH_DISPLAY_DE}. T-0 ist Uniswap v4 auf Base (gesperrtes AURA/USDC, veröffentlichte Hooks). Offizielle AURA-CA nur auf /token und /trust.`,
  },
  {
    id: "make-good",
    title: "Make it up by building",
    titleDe: "Wiedergutmachung durch Bauen",
    body: "Building Culture’s Culture Coin was rugged by a former partner. We can’t rewrite that chapter. We can show up every day with software, receipts, and seats you can verify — until the room trusts the work again.",
    bodyDe:
      "Building Cultures Culture Coin wurde von einem ehemaligen Partner gerugged. Wir können das Kapitel nicht umschreiben. Wir können jeden Tag Software, Belege und prüfbare Seats liefern — bis der Raum der Arbeit wieder vertraut.",
  },
];

export const COVENANT_LINKS = [
  { href: `${SITE_URL}/changelog`, label: "Changelog" },
  { href: `${SITE_URL}/proof`, label: "Proof" },
  { href: `${SITE_URL}/token`, label: "AURA token" },
  { href: `${SITE_URL}/buy`, label: "Buy AURA" },
  { href: `${SITE_URL}/swap`, label: "AURA swap desk" },
  { href: `${SITE_URL}/square`, label: "Aura Square" },
  { href: `${SITE_URL}/pit`, label: "TICKPIX pit" },
  { href: `${SITE_URL}/hood`, label: "The Hood" },
  { href: TICKPIX.mintUrl, label: "Mint site" },
  { href: tickpixExplorerTokenUrl(), label: "Tickpix on Blockscout" },
  { href: CCFF00.mintUrl, label: "CCFF00 mint" },
  { href: ccff00ExplorerNftUrl(), label: "CCFF00 NFT on Blockscout" },
  { href: HOOKR.siteUrl, label: "Hookr.fun" },
  { href: SOCIAL_LINKS.find((s) => s.id === "x")!.href, label: "X @buildingcultu3" },
  { href: SOCIAL_LINKS.find((s) => s.id === "discord")!.href, label: "Discord" },
] as const;

export function covenantTickpixCa(): string | null {
  return tickpixContractAddress();
}

export function covenantCcff00Ca(): string | null {
  return ccff00NftContractAddress();
}

export const COVENANT_OFFICIAL_DOMAINS =
  "aibusiness.fun · nft.aibusiness.fun · hoodstreet.capital · hookr.fun";

export type CovenantVerifyItem = {
  id: string;
  label: string;
  /** Null until the official CA is published — never invent one. */
  ca: string | null;
  explorerUrl: string;
  mintUrl: string;
  note: string;
};

/** Official CAs people should copy — never a DM, never the CCFF00 meme ERC-20. */
export function covenantVerifyItems(): CovenantVerifyItem[] {
  const items: CovenantVerifyItem[] = [];
  const aura = auraTokenAddress();
  if (aura) {
    items.push({
      id: "aura",
      label: "AURA (Base)",
      ca: aura,
      explorerUrl: privateSaleBasescan(`/token/${aura}`),
      mintUrl: `${SITE_URL}/token`,
      note: "One software token. Official CA only here — never a DM. TICKPIX stays an NFT.",
    });
  }
  const square = auraSquareAddress();
  items.push({
    id: "square",
    label: "Aura Square (Base)",
    ca: square,
    explorerUrl: auraSquareExplorerUrl(square) ?? `${SITE_URL}/square`,
    mintUrl: auraSquareMintUrl(),
    note: "Utility binder + ERC-6551 TBA — not Hood, not pAURA, not founding seats.",
  });
  const tickpix = covenantTickpixCa();
  if (tickpix) {
    items.push({
      id: "tickpix",
      label: "TICKPIX NFT",
      ca: tickpix,
      explorerUrl: tickpixExplorerTokenUrl(),
      mintUrl: TICKPIX.mintUrl,
      note: "Culture seats on Robinhood Chain — not a second Hood.",
    });
  }
  const ccff00 = covenantCcff00Ca();
  if (ccff00) {
    items.push({
      id: "ccff00",
      label: "CCFF00 NFT",
      ca: ccff00,
      explorerUrl: ccff00ExplorerNftUrl(),
      mintUrl: CCFF00.mintUrl,
      note: "HoodStreet membership NFT — verify this CA, never the meme ERC-20.",
    });
  }
  return items;
}
