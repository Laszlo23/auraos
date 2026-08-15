import type { TreasurySwapDirection } from "@/lib/okx.functions";

export type DeskTab = "receive" | "send" | "exchange" | "activity" | "grow" | null;
export type SwapLeg = "eth" | "usdc" | "weth";
export type ActivityFilter = "all" | "in" | "out" | "trade";

export const SWAP_ROUTES: { from: SwapLeg; to: SwapLeg; direction: TreasurySwapDirection }[] = [
  { from: "eth", to: "usdc", direction: "eth_to_usdc" },
  { from: "eth", to: "weth", direction: "eth_to_weth" },
  { from: "weth", to: "usdc", direction: "weth_to_usdc" },
  { from: "weth", to: "eth", direction: "weth_to_eth" },
  { from: "usdc", to: "eth", direction: "usdc_to_eth" },
  { from: "usdc", to: "weth", direction: "usdc_to_weth" },
];

export function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function parseUiAmountToWeiString(raw: string, decimals: number): string | null {
  const cleaned = raw.trim().replace(/,/g, "");
  if (!cleaned || cleaned.toLowerCase() === "max") return null;
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  const wei = BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(fracPadded || "0");
  return wei.toString();
}

export function formatTokenAmount(raw: string, decimals: number, maxFrac = 6): string {
  try {
    const wei = BigInt(raw);
    const base = 10n ** BigInt(decimals);
    const whole = wei / base;
    const frac = wei % base;
    if (frac === 0n) return whole.toString();
    const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "").slice(0, maxFrac);
    return fracStr ? `${whole}.${fracStr}` : whole.toString();
  } catch {
    return raw;
  }
}
