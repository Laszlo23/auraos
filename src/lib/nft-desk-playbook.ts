/**
 * Transparent NFT + Quant playbook for OS companies and the community.
 *
 * Hard rules (SSOT with robinhood-momentum + holder-perks):
 * - Hood / creator NFTs are utility + primary-sale / royalties — not equity.
 * - TSLA basket is a treasury reference peg — not share custody, not RWA redemption.
 * - Passive income = real product fees after audit (hold-to-earn) or creator royalties — never invented APY.
 * - OpenSea hooks = marketplace compatibility, not a flip bot.
 */

import type { LocaleCopy } from "@/lib/robinhood-momentum";
import { HOOD_GIFT_AURA, HOOD_MAX_SUPPLY } from "@/lib/aura-launch";

export type NftDeskStrategyId =
  | "hood-membership"
  | "tickpix-pit"
  | "ccff00-hoodstreet"
  | "hookr-readable-hooks"
  | "hold-to-earn-fees"
  | "creator-primary"
  | "quant-history"
  | "opensea-compat"
  | "peg-transparency";

export type NftDeskStrategy = {
  id: NftDeskStrategyId;
  status: "live" | "after-audit" | "compat" | "horizon";
  title: LocaleCopy;
  who: LocaleCopy;
  how: LocaleCopy;
  not: LocaleCopy;
  osAdvantage: LocaleCopy;
  communityAdvantage: LocaleCopy;
  trainHint: LocaleCopy;
};

export const NFT_DESK_HARD_NO: LocaleCopy = {
  en: "We do not sell Tesla-share NFTs, wrapped stock, or OpenSea “passive income” promises. Share custody stays roadmap horizon. Agents train on Base spot history and product fees — not equity theater.",
  de: "Wir verkaufen keine Tesla-Aktien-NFTs, kein Wrapped Stock und keine OpenSea-„Passiv-Einkommen“-Versprechen. Share-Custody bleibt Roadmap-Horizont. Agenten trainieren auf Base-Spot-Historie und Produkt-Fees — kein Equity-Theater.",
};

export const NFT_DESK_STRATEGIES: NftDeskStrategy[] = [
  {
    id: "hood-membership",
    status: "live",
    title: {
      en: `Hood membership (cap ${HOOD_MAX_SUPPLY.toLocaleString("en-US")})`,
      de: `Hood-Mitgliedschaft (Cap ${HOOD_MAX_SUPPLY.toLocaleString("de-AT")})`,
    },
    who: {
      en: "Founders who want desk extras + founding circle — not a lottery ticket.",
      de: "Founder, die Desk-Extras + Founding Circle wollen — kein Lotterieticket.",
    },
    how: {
      en: `Mint on /hood. Desk perks (strategy slot, season score, x402 rebate). ${HOOD_GIFT_AURA.toLocaleString("en-US")} AURA gift claimable at T-0.`,
      de: `Mint auf /hood. Desk-Perks (Strategy-Slot, Season-Score, x402-Rabatt). ${HOOD_GIFT_AURA.toLocaleString("de-AT")} AURA-Gift claimbar ab T-0.`,
    },
    not: {
      en: "Not equity. Not a share of Tesla. Not unlimited supply.",
      de: "Kein Equity. Kein Tesla-Anteil. Keine unbegrenzte Supply.",
    },
    osAdvantage: {
      en: "Quant / Arena / x402 run hotter for Hood wallets — same strategies, better desk ceilings.",
      de: "Quant / Arena / x402 laufen für Hood-Wallets heißer — gleiche Strategien, bessere Desk-Deckel.",
    },
    communityAdvantage: {
      en: "Capped circle stays scarce; Scouts and Squads recruit into product seats, not a second Hood.",
      de: "Der Cap bleibt knapp; Scouts und Squads werben Produkt-Seats, kein zweites Hood.",
    },
    trainHint: {
      en: "No ML on floor prices — utility is deterministic perks from holder-perks.ts.",
      de: "Kein ML auf Floor-Preise — Utility sind deterministische Perks aus holder-perks.ts.",
    },
  },
  {
    id: "tickpix-pit",
    status: "live",
    title: {
      en: "TICKPIX pit (Robinhood Chain culture)",
      de: "TICKPIX Pit (Robinhood-Chain-Kultur)",
    },
    who: {
      en: "RH Chain traders and CCFF00 crew who want a seat on the tape — not a fundraising NFT.",
      de: "RH-Chain-Trader und CCFF00-Crew, die einen Seat auf dem Tape wollen — kein Fundraising-NFT.",
    },
    how: {
      en: "Mint at nft.aibusiness.fun (CCFF00 free / public 0.0001 ETH). Link wallet in Aura → Pit badge + Quest XP. Clock-in and tape cards stay on the mint site.",
      de: "Mint auf nft.aibusiness.fun (CCFF00 gratis / Public 0.0001 ETH). Wallet in Aura linken → Pit-Badge + Quest-XP. Clock-in und Tape-Cards bleiben auf dem Mint-Site.",
    },
    not: {
      en: "Not a second Hood. Not equity. Not a fund. Not x402 rebates or founding-seat unlock.",
      de: "Kein zweites Hood. Kein Equity. Kein Fund. Keine x402-Rabatte und kein Founding-Seat-Unlock.",
    },
    osAdvantage: {
      en: "Culture membership feeds Community + Quest without diluting OS passport economics.",
      de: "Kultur-Membership speist Community + Quest, ohne OS-Pass-Ökonomie zu verwässern.",
    },
    communityAdvantage: {
      en: "Shared pit identity — show up daily, print tape cards, later Pit League from royalties — not APY stories.",
      de: "Geteilte Pit-Identität — täglich zeigen, Tape-Cards drucken, später Pit League aus Royalties — keine APY-Stories.",
    },
    trainHint: {
      en: "Train Growth agents on tape-card share loops — never floor speculation.",
      de: "Growth-Agenten auf Tape-Card-Share-Loops trainieren — nie Floor-Spekulation.",
    },
  },
  {
    id: "ccff00-hoodstreet",
    status: "live",
    title: {
      en: "CCFF00 · HoodStreet Proof of Neon",
      de: "CCFF00 · HoodStreet Proof of Neon",
    },
    who: {
      en: "HoodStreet members — ERC-6551 NFT wallets on Robinhood Chain.",
      de: "HoodStreet-Members — ERC-6551-NFT-Wallets auf Robinhood Chain.",
    },
    how: {
      en: "Hold CCFF00 NFT (CA on /trust + Blockscout). Link wallet in Aura → badge + soft Quest XP. Tickpix free raid used the CCFF00 snapshot — mint still at nft.aibusiness.fun.",
      de: "CCFF00-NFT halten (CA auf /trust + Blockscout). Wallet in Aura linken → Badge + soft Quest-XP. Tickpix Free Raid nutzte den CCFF00-Snapshot — Mint weiter auf nft.aibusiness.fun.",
    },
    not: {
      en: "Not Aura founding seats. Not verification via meme ERC-20 ticker alone. Not Hood rebates.",
      de: "Keine Aura-Founding-Seats. Keine Verifikation nur über Meme-ERC-20-Ticker. Keine Hood-Rabatte.",
    },
    osAdvantage: {
      en: "RH culture density without diluting Base Hood economics.",
      de: "RH-Kultur-Dichte ohne Base-Hood-Ökonomie zu verwässern.",
    },
    communityAdvantage: {
      en: "Reciprocal membership narrative with HoodStreet — verify on-chain, never by DM.",
      de: "Gegenseitige Membership-Narrative mit HoodStreet — on-chain prüfen, nie per DM.",
    },
    trainHint: {
      en: "balanceOf on NFT contract only — see ccff00.server.ts.",
      de: "Nur balanceOf auf dem NFT-Contract — siehe ccff00.server.ts.",
    },
  },
  {
    id: "hookr-readable-hooks",
    status: "live",
    title: {
      en: "Hookr — readable Uniswap v4 hooks",
      de: "Hookr — lesbare Uniswap-v4-Hooks",
    },
    who: {
      en: "Creators and desks who want pool rules fixed at open on Robinhood Chain.",
      de: "Creators und Desks, die Pool-Regeln beim Open auf Robinhood Chain fix wollen.",
    },
    how: {
      en: "Use hookr.fun to compose Anti-Snipe / Surge / Burn / LP Rewards / Nth-buy Pot. Aura links officially — rules before you sign. No pool deploy from Aura this sprint.",
      de: "hookr.fun nutzen für Anti-Snipe / Surge / Burn / LP Rewards / Nth-buy Pot. Aura verlinkt offiziell — Regeln vor dem Signieren. Kein Pool-Deploy aus Aura in diesem Sprint.",
    },
    not: {
      en: "Not an airdrop portal. Not a Culture Coin sequel. Not surprise CAs by DM.",
      de: "Kein Airdrop-Portal. Keine Culture-Coin-Fortsetzung. Keine Überraschungs-CAs per DM.",
    },
    osAdvantage: {
      en: "Future RH creator launches can inherit readable hooks while Aura stays the desk.",
      de: "Zukünftige RH-Creator-Launches können lesbare Hooks erben, während Aura der Desk bleibt.",
    },
    communityAdvantage: {
      en: "Same trust language as our covenant — verify @hookrfun / hookr.fun only.",
      de: "Dieselbe Trust-Sprache wie unser Bund — nur @hookrfun / hookr.fun prüfen.",
    },
    trainHint: {
      en: "Partner surface only this sprint — see docs/HOOKR.md.",
      de: "Nur Partner-Surface in diesem Sprint — siehe docs/HOOKR.md.",
    },
  },
  {
    id: "hold-to-earn-fees",
    status: "after-audit",
    title: {
      en: "Hold-to-earn from real fees",
      de: "Hold-to-earn aus echten Fees",
    },
    who: {
      en: "Current Hood owners after fee-split contract + external audit.",
      de: "Aktuelle Hood-Owner nach Fee-Split-Contract + externem Audit.",
    },
    how: {
      en: "Claim a cut of desk, catalog, and x402 fees while the Hood sits in the wallet. Sell — the stream walks.",
      de: "Anteil an Desk-, Katalog- und x402-Fees claimen, solange der Hood in der Wallet liegt. Verkaufen — der Stream wandert mit.",
    },
    not: {
      en: "Not live. Not a fixed APY. Not a securities yield.",
      de: "Nicht live. Kein fixer APY. Keine Wertpapier-Rendite.",
    },
    osAdvantage: {
      en: "Companies pay for real work; founding circle shares usage, not vapor.",
      de: "Firmen zahlen für echte Arbeit; der Founding Circle teilt Usage, keinen Dampf.",
    },
    communityAdvantage: {
      en: "Transparent fee sources listed on /token — community can audit the story.",
      de: "Transparente Fee-Quellen auf /token — die Community kann die Story prüfen.",
    },
    trainHint: {
      en: "Mechanism ships after audit; until then UI stays active:false in holder-perks.",
      de: "Mechanismus nach Audit; bis dahin UI active:false in holder-perks.",
    },
  },
  {
    id: "creator-primary",
    status: "live",
    title: {
      en: "Creator primary sales (Robinhood Chain)",
      de: "Creator-Primärverkäufe (Robinhood Chain)",
    },
    who: {
      en: "Builders launching /c/$slug collections — Growth agents promote the mint, not floor dumps.",
      de: "Builder mit /c/$slug-Collections — Growth-Agenten pushen den Mint, keine Floor-Dumps.",
    },
    how: {
      en: "Deploy + mint on Robinhood Chain; on-chain royalties; 90/10 split. Agents draft drop copy and channels posts.",
      de: "Deploy + Mint auf Robinhood Chain; On-chain-Royalties; 90/10-Split. Agenten schreiben Drop-Copy und Channel-Posts.",
    },
    not: {
      en: "Not an OpenSea sniper. Not “invest in random blue-chips for the treasury.”",
      de: "Kein OpenSea-Sniper. Kein „zufällige Blue-Chips für die Treasury kaufen“.",
    },
    osAdvantage: {
      en: "Company catalog + x402 can sell access around the drop; revenue is product, not speculation.",
      de: "Firmenkatalog + x402 verkaufen Zugang um den Drop; Revenue ist Produkt, keine Spekulation.",
    },
    communityAdvantage: {
      en: "Artists keep royalties; community buys primary utility, not a fake share wrapper.",
      de: "Artists behalten Royalties; Community kauft Primär-Utility, keinen Fake-Share-Wrapper.",
    },
    trainHint: {
      en: "Train Growth / Marketing agents on past drop copy + conversion — not NFT price charts.",
      de: "Growth-/Marketing-Agenten auf Drop-Copy + Conversion trainieren — nicht auf NFT-Charts.",
    },
  },
  {
    id: "quant-history",
    status: "live",
    title: {
      en: "Quant: train on spot history",
      de: "Quant: auf Spot-Historie trainieren",
    },
    who: {
      en: "OS companies with Trading Desk — especially Hood-gated strategy slots.",
      de: "OS-Firmen mit Trading Desk — besonders Hood-Strategy-Slots.",
    },
    how: {
      en: "Backtest Lab + walk-forward on Base WETH/USDC. Presets include Peg momentum (conservative MA) for desk ops toward the published reference tape.",
      de: "Backtest Lab + Walk-Forward auf Base WETH/USDC. Presets inkl. Peg-Momentum (konservative MA) für Desk-Ops Richtung veröffentlichtem Referenz-Tape.",
    },
    not: {
      en: "Does not buy Tesla stock or stock-NFTs. Peg is a sizing narrative, not custody.",
      de: "Kauft keine Tesla-Aktien und keine Aktien-NFTs. Peg ist Sizing-Narrativ, keine Custody.",
    },
    osAdvantage: {
      en: "Walk-forward separates train vs test bars — strategies earn approval on evidence.",
      de: "Walk-Forward trennt Train- vs Test-Bars — Strategien verdienen Freigabe durch Evidenz.",
    },
    communityAdvantage: {
      en: "Shareable backtests + Arena score (Hood multiplier) — public learning, not secret alpha DMs.",
      de: "Teilbare Backtests + Arena-Score (Hood-Multiplikator) — öffentliches Lernen, keine geheimen Alpha-DMs.",
    },
    trainHint: {
      en: "Use runWalkForward (≈70% train) before arming. Prefer Peg momentum / Steady ETH for founding desks.",
      de: "runWalkForward (≈70% Train) vor dem Armieren. Peg-Momentum / Steady ETH für Founding Desks.",
    },
  },
  {
    id: "opensea-compat",
    status: "compat",
    title: {
      en: "OpenSea compatibility hooks",
      de: "OpenSea-Kompatibilitäts-Hooks",
    },
    who: {
      en: "Anyone verifying Hood or creator NFTs on marketplaces.",
      de: "Alle, die Hood- oder Creator-NFTs auf Marketplaces prüfen.",
    },
    how: {
      en: "Self-hosted metadata + collection JSON; optional verified collection URL env. Link only official pages.",
      de: "Self-hosted Metadaten + Collection-JSON; optionale verifizierte Collection-URL per Env. Nur offizielle Seiten verlinken.",
    },
    not: {
      en: "No OpenSea trading agent. No automated bids/listings from Aura.",
      de: "Kein OpenSea-Trading-Agent. Keine automatischen Bids/Listings von Aura.",
    },
    osAdvantage: {
      en: "Correct metadata means fewer support tickets and fewer scam clones.",
      de: "Korrekte Metadaten = weniger Support und weniger Scam-Clones.",
    },
    communityAdvantage: {
      en: "Checklist on /token — community can see what is ready vs still pending verification.",
      de: "Checkliste auf /token — Community sieht Ready vs. noch ausstehende Verifikation.",
    },
    trainHint: {
      en: "No price training — compatibility is deterministic endpoints under /api/genesis/*.",
      de: "Kein Preis-Training — Kompatibilität sind deterministische Endpunkte unter /api/genesis/*.",
    },
  },
  {
    id: "peg-transparency",
    status: "live",
    title: {
      en: "TSLA reference peg (transparency tape)",
      de: "TSLA-Referenz-Peg (Transparenz-Tape)",
    },
    who: {
      en: "Token holders and Quant operators reading treasury policy after T-0.",
      de: "Token-Holder und Quant-Operatoren, die die Treasury-Policy nach T-0 lesen.",
    },
    how: {
      en: "Published basket weights (TSLA 70% + Musk-orbit 30%). Weekly tape after T-0. Quant sizes toward the story — we show numbers, not redemption rights.",
      de: "Veröffentlichte Korb-Gewichte (TSLA 70% + Musk-Orbit 30%). Wochen-Tape nach T-0. Quant sized zur Story — Zahlen, keine Rücknahmerechte.",
    },
    not: {
      en: "Not wrapped TSLA. Not an NFT that “owns shares.” Share custody = horizon only.",
      de: "Kein Wrapped TSLA. Kein NFT, das „Aktien besitzt“. Share-Custody = nur Horizont.",
    },
    osAdvantage: {
      en: "One honest narrative across /token, tokenomics, and Quant presets — less confusion for agents.",
      de: "Eine ehrliche Narrative über /token, Tokenomics und Quant-Presets — weniger Agenten-Verwirrung.",
    },
    communityAdvantage: {
      en: "Anyone can compare live desk behavior to the published basket without trusting a screenshot.",
      de: "Jeder kann Live-Desk-Verhalten mit dem veröffentlichten Korb vergleichen — ohne Screenshot-Glauben.",
    },
    trainHint: {
      en: "History training stays on Base spot candles; peg informs risk narrative and reporting, not RWA fills.",
      de: "Historien-Training bleibt auf Base-Spot-Candles; Peg informiert Risiko-Narrativ und Reporting, keine RWA-Fills.",
    },
  },
];

export function nftDeskStrategiesByStatus(status: NftDeskStrategy["status"]) {
  return NFT_DESK_STRATEGIES.filter((s) => s.status === status);
}
