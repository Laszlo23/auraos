export type CompanyTokenPresetId = "community_standard" | "growth_devbuy";

export type CompanyTokenPreset = {
  id: CompanyTokenPresetId;
  name: string;
  tagline: string;
  /** Vault % of supply (0–90). */
  vaultPct: number;
  lockupDays: number;
  vestingDays: number;
  /** Optional ETH spent in same deploy tx. */
  devBuyEth: number;
  vanity: boolean;
  feePreset: "DynamicBasic" | "StaticBasic";
  poolPositions: "Standard" | "Project";
};

/** Presets that work on Base Clanker v4 — keep simple. */
export const COMPANY_TOKEN_PRESETS: CompanyTokenPreset[] = [
  {
    id: "community_standard",
    name: "Community standard",
    tagline: "Full-range WETH pool, 10% vault (30d lock + 30d vest), no sniper theater.",
    vaultPct: 10,
    lockupDays: 30,
    vestingDays: 30,
    devBuyEth: 0,
    vanity: true,
    feePreset: "DynamicBasic",
    poolPositions: "Standard",
  },
  {
    id: "growth_devbuy",
    name: "Growth + starter buy",
    tagline: "Same vault, small ETH dev buy to seed the book (fund wallet first).",
    vaultPct: 10,
    lockupDays: 30,
    vestingDays: 30,
    devBuyEth: 0.01,
    vanity: true,
    feePreset: "DynamicBasic",
    poolPositions: "Standard",
  },
];

export function companyTokenPresetById(id: string): CompanyTokenPreset | undefined {
  return COMPANY_TOKEN_PRESETS.find((p) => p.id === id);
}

export function suggestTicker(companyName: string): { name: string; symbol: string } {
  const cleaned = companyName.replace(/[^a-zA-Z0-9\s]/g, " ").trim() || "Company";
  const words = cleaned.split(/\s+/).filter(Boolean);
  const name = cleaned.slice(0, 48);
  let symbol = words
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 6);
  if (symbol.length < 2) symbol = cleaned.replace(/\s+/g, "").toUpperCase().slice(0, 5) || "COIN";
  return { name, symbol };
}
