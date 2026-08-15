import type { BacktestSnapshot } from "@/components/aura/trading/backtest-results-dialog";

export type Trade = {
  id: string;
  symbol: string;
  side: string;
  size: number;
  entry: number;
  exit: number | null;
  pnl: number;
  confidence: number;
  status: string;
  rationale: string | null;
  opened_at: string;
  tx_hash?: string | null;
  mark_price?: number | null;
  paper?: boolean | null;
};

export type Strategy = {
  id: string;
  name: string;
  prompt: string;
  summary: string | null;
  status: string;
  backtest: BacktestSnapshot | null;
  spec?: {
    timeframe?: string;
    exit?: { stop_pct?: number; take_profit_pct?: number };
    sizing?: { risk_pct_equity?: number; max_notional_usdc?: number };
  } | null;
};

export type Signal = {
  id: string;
  symbol: string;
  side: string;
  confidence: number;
  notional_usdc: number;
  source: string;
  status: string;
  rationale: string | null;
  created_at: string;
};

export type Whale = {
  id: string;
  label: string;
  address: string;
  follow: boolean;
  tags: string[];
};

export type WhaleEvent = {
  id: string;
  summary: string | null;
  amount: number;
  asset: string;
  direction: string;
  created_at: string;
  tx_hash: string | null;
};
