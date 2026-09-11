/**
 * DexScreener / GoPlus expected surface for official AURA.
 * Token tax is always 0. Pool fees are labeled separately so nobody
 * “fixes” 10/10 by adding an ERC-20 transfer tax.
 * CAs stay null until announce. This file does not invent one.
 */

import {
  AURA_CURVE_ENGINE,
  AURA_SWAP_BURN_BPS,
} from "@/lib/aura-curve";

/** Function / import surfaces that would fail a 10/10 token scan. Comments may say “no X”. */
export const AURA_TOKEN_FORBIDDEN_SURFACE = [
  "is Ownable",
  "onlyOwner",
  "function owner(",
  "function mint(",
  "function pause(",
  "function unpause(",
  "function blacklist(",
  "function setTax(",
  "function excludeFromFee(",
  "function setFee(",
  "UUPSUpgradeable",
  "TransparentUpgradeableProxy",
] as const;

/** Sink / gauge must never let an admin pull user principal. */
export const AURA_SINK_FORBIDDEN_SURFACE = [
  "Ownable",
  "onlyOwner",
  "function withdraw(",
  "function rescue(",
  "function sweep(",
] as const;

export const AURA_GOPLUS_TOKEN_ZEROS = {
  is_honeypot: "0",
  is_mintable: "0",
  is_proxy: "0",
  can_take_back_ownership: "0",
  hidden_owner: "0",
  transfer_pausable: "0",
  is_blacklisted: "0",
  selfdestruct: "0",
  owner_change_balance: "0",
  buy_tax: "0",
  sell_tax: "0",
} as const;

export const AURA_TOKEN_TAX_BPS = 0;

export const AURA_POOL_FEE_BPS = {
  min: AURA_CURVE_ENGINE.feeMinBps,
  max: AURA_CURVE_ENGINE.feeMaxBps,
} as const;

export const AURA_SCANNER_COPY = {
  publicLine:
    "Token tax 0%. Trading fee 1–3% on the official AURA/USDC pool. 0.15% swap burn. You can sell.",
  publicLineDe:
    "Token-Steuer 0 %. Handelsgebühr 1–3 % auf dem offiziellen AURA/USDC-Pool. 0,15 % Swap-Burn. Du kannst verkaufen.",
  youCanSell: "You can sell. No blacklist. No transfer tax.",
  youCanSellDe: "Du kannst verkaufen. Keine Blacklist. Keine Transfer-Steuer.",
  ownership: "none",
  factoryTokenForbidden: "ClankerTokenV4",
  sniperNote:
    "Sniper fee decays in 15 seconds. Run scanners after decay. It is not a standing token tax.",
  sniperNoteDe:
    "Sniper-Fee klingt in 15 Sekunden ab. Scanner erst danach. Das ist keine dauerhafte Token-Steuer.",
  honestLimit:
    "DexScreener cannot score the pair until the official pool is live and indexed. $1,111 is a book seed, not deep LP. 10/10 is the contract + profile bar — not a volume promise.",
  honestLimitDe:
    "DexScreener kann das Paar erst bewerten, wenn der offizielle Pool live und indexiert ist. 1.111 $ ist ein Buch-Seed, keine tiefe LP. 10/10 ist die Contract- und Profil-Leiste — kein Volumenversprechen.",
} as const;

export function auraExpectedGoPlusZeros() {
  return { ...AURA_GOPLUS_TOKEN_ZEROS };
}

export function auraScannerPublicFacts() {
  return {
    tokenTaxBps: AURA_TOKEN_TAX_BPS,
    buyTax: AURA_GOPLUS_TOKEN_ZEROS.buy_tax,
    sellTax: AURA_GOPLUS_TOKEN_ZEROS.sell_tax,
    poolFeeBps: AURA_POOL_FEE_BPS,
    swapBurnBps: AURA_SWAP_BURN_BPS,
    ownership: AURA_SCANNER_COPY.ownership,
    createFactoryToken: false,
    publicLine: AURA_SCANNER_COPY.publicLine,
  };
}

export function sourceHasForbiddenSurface(source: string, forbidden: readonly string[]): string[] {
  const lower = source.toLowerCase();
  return forbidden.filter((needle) => lower.includes(needle.toLowerCase()));
}
