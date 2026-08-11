import type { StrategySpec } from "@/lib/trading/backtest.server";

export type TradingPresetId =
  | "steady_eth"
  | "dip_buyer"
  | "whale_follow"
  | "scalp_15m"
  | "breakout_5m";

export type TradingPreset = {
  id: TradingPresetId;
  name: string;
  tagline: string;
  riskLabel: "Low" | "Medium" | "High";
  prompt: string;
  spec: StrategySpec;
};

/** One-tap set-and-forget + intraday velocity strategies. */
export const TRADING_PRESETS: TradingPreset[] = [
  {
    id: "steady_eth",
    name: "Steady ETH",
    tagline: "Classic trend follow — slow, capped, sleep-friendly.",
    riskLabel: "Low",
    prompt:
      "Steady ETH: buy WETH/USDC on a 12/26 MA cross, 0.4% risk, 2% stop, 4% take profit. Set and forget.",
    spec: {
      timeframe: "1h",
      symbols: ["WETH/USDC"],
      entry: { type: "ma_cross", params: { fast: 12, slow: 26 } },
      exit: { stop_pct: 2, take_profit_pct: 4, trailing_pct: 1.5, max_hold_hours: 72 },
      sizing: { risk_pct_equity: 0.4, max_notional_usdc: 80 },
    },
  },
  {
    id: "dip_buyer",
    name: "Dip buyer",
    tagline: "Enter strength after a breakout — medium pace.",
    riskLabel: "Medium",
    prompt:
      "Dip buyer: breakout entries on WETH/USDC with 20-bar lookback, 0.6% risk, 2.5% stop, 5% take profit.",
    spec: {
      timeframe: "1h",
      symbols: ["WETH/USDC"],
      entry: { type: "breakout", params: { lookback: 20 } },
      exit: { stop_pct: 2.5, take_profit_pct: 5, trailing_pct: 2, max_hold_hours: 48 },
      sizing: { risk_pct_equity: 0.6, max_notional_usdc: 120 },
    },
  },
  {
    id: "whale_follow",
    name: "Whale follow",
    tagline: "Mirror large smart-money inflows on Base — hands-off.",
    riskLabel: "Medium",
    prompt:
      "Whale follow: copy large Base smart-money ETH inflows, 0.5% risk, 3% stop, 6% take profit.",
    spec: {
      timeframe: "1h",
      symbols: ["WETH/USDC"],
      entry: { type: "smart_money_follow", params: {} },
      exit: { stop_pct: 3, take_profit_pct: 6, trailing_pct: 2.5, max_hold_hours: 96 },
      sizing: { risk_pct_equity: 0.5, max_notional_usdc: 75 },
    },
  },
  {
    id: "scalp_15m",
    name: "15m scalp",
    tagline: "Intraday velocity — tight stops, capital turns, pairs with Yield parking.",
    riskLabel: "High",
    prompt:
      "15m scalp: MA cross 8/21 on WETH/USDC, 0.35% risk, 1.2% stop, 2.2% take, max hold 6h. Day-trade book.",
    spec: {
      timeframe: "15m",
      symbols: ["WETH/USDC"],
      entry: { type: "ma_cross", params: { fast: 8, slow: 21 } },
      exit: { stop_pct: 1.2, take_profit_pct: 2.2, trailing_pct: 0.8, max_hold_hours: 6 },
      sizing: { risk_pct_equity: 0.35, max_notional_usdc: 60 },
    },
  },
  {
    id: "breakout_5m",
    name: "5m breakout",
    tagline: "High-frequency breakout — only with Yield Autopilot parking residual.",
    riskLabel: "High",
    prompt:
      "5m breakout: 12-bar lookback on WETH/USDC, 0.3% risk, 0.9% stop, 1.6% take, max hold 3h.",
    spec: {
      timeframe: "5m",
      symbols: ["WETH/USDC"],
      entry: { type: "breakout", params: { lookback: 12 } },
      exit: { stop_pct: 0.9, take_profit_pct: 1.6, trailing_pct: 0.5, max_hold_hours: 3 },
      sizing: { risk_pct_equity: 0.3, max_notional_usdc: 50 },
    },
  },
];

export function presetById(id: string): TradingPreset | undefined {
  return TRADING_PRESETS.find((p) => p.id === id);
}
