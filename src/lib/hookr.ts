/**
 * Hookr.fun — Uniswap v4 readable hooks on Robinhood Chain.
 * Infrastructure partner for RH launches/LP — not an airdrop portal, not Culture Coin sequel.
 * Optional wrapped-AURA Hookr pool is Phase 4 only (docs/AURA_RH_WRAPPER.md).
 * Never a second official AURA CA at T-0 — canonical token stays on Base.
 */

export const HOOKR = {
  name: "Hookr",
  tagline: "Readable Uniswap v4 hooks",
  siteUrl: "https://hookr.fun/",
  xUrl: "https://x.com/hookrfun",
  network: "robinhood" as const,
  chainId: 4663,
  /** Official $HOOKR project token (verify on Hookr — never by DM). */
  defaultTokenContract: "0x18E674231A58c239Dc7DaeDcffE15Ec3A24cff5c",
  rules: ["Anti-Snipe", "Surge Fees", "Auto Burn", "LP Rewards", "Nth-buy Pot"] as const,
} as const;

export const HOOKR_COPY = {
  blurb:
    "Modular Uniswap v4 hooks on Robinhood Chain. Rules are fixed at pool open — read them before you sign. Official links only: hookr.fun · @hookrfun. AURA’s official CA is on Base; a Hookr wrapper is optional and later.",
  blurbDe:
    "Modulare Uniswap-v4-Hooks auf Robinhood Chain. Regeln sind beim Pool-Open fix — lesen vor dem Signieren. Nur offizielle Links: hookr.fun · @hookrfun. Die offizielle AURA-CA liegt auf Base; ein Hookr-Wrapper ist optional und später.",
  security:
    "Hookr does not run airdrop/claim portals and does not initiate support DMs. A real contract address does not make a random URL legitimate.",
  securityDe:
    "Hookr betreibt keine Airdrop-/Claim-Portale und startet keine Support-DMs. Eine echte CA macht eine zufällige URL nicht legitim.",
} as const;

export function hookrExplorerTokenUrl(): string {
  return `https://robinhoodchain.blockscout.com/token/${HOOKR.defaultTokenContract}`;
}
