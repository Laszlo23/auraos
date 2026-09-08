/**
 * Community covenant — how we show up after Culture Coin was rugged by a former partner.
 * Principles over theater. Verifiable surfaces over vibes.
 */

import { SITE_URL, SOCIAL_LINKS, TOKEN_LAUNCH_TRUST } from "@/lib/site";
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
    body: "Official CAs and mint URLs live only on aibusiness.fun and nft.aibusiness.fun. If someone DMs you a “new CA,” it’s not us.",
    bodyDe:
      "Offizielle CAs und Mint-URLs nur auf aibusiness.fun und nft.aibusiness.fun. Wer per DM eine „neue CA“ schickt, ist nicht wir.",
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
    body: "Hood = OS founding passport on Base. Tickpix = culture seats on Robinhood Chain. Neither is equity, neither is a fund, neither is “number go up because JPEG.”",
    bodyDe:
      "Hood = OS-Founding-Pass auf Base. Tickpix = Kultur-Seats auf Robinhood Chain. Beides kein Equity, kein Fund, kein „Zahl geht hoch wegen JPEG“.",
  },
  {
    id: "no-second-hood",
    title: "No second founding collection",
    titleDe: "Keine zweite Founding-Collection",
    body: "Tickpix does not unlock founding seats or Hood rebates. Culture membership stays culture. Product membership stays product.",
    bodyDe:
      "Tickpix schaltet keine Founding Seats und keine Hood-Rabatte frei. Kultur bleibt Kultur. Produkt bleibt Produkt.",
  },
  {
    id: "fair",
    title: "Fair launch rules stay public",
    titleDe: "Fair-Launch-Regeln bleiben öffentlich",
    body: TOKEN_LAUNCH_TRUST,
    bodyDe:
      "Wir wachsen offen. Den genauen Fair-Launch-Zeitpunkt kündigen wir 48 Stunden vorher auf unseren offiziellen Kanälen an — nie per DM, nie mit einer Überraschungs-CA.",
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
  { href: `${SITE_URL}/pit`, label: "TICKPIX pit" },
  { href: `${SITE_URL}/hood`, label: "The Hood" },
  { href: TICKPIX.mintUrl, label: "Mint site" },
  { href: tickpixExplorerTokenUrl(), label: "Tickpix on Blockscout" },
  { href: SOCIAL_LINKS.find((s) => s.id === "x")!.href, label: "X @buildingcultu3" },
  { href: SOCIAL_LINKS.find((s) => s.id === "discord")!.href, label: "Discord" },
] as const;

export function covenantTickpixCa(): string | null {
  return tickpixContractAddress();
}
