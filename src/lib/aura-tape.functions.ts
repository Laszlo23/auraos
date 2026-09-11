import { createServerFn } from "@tanstack/react-start";

import { auraPairLive } from "@/lib/aura-curve";
import { auraTokenAddress } from "@/lib/aura-self-launch";
import type { Candle, ChartInterval } from "@/lib/trading/market-data.server";

export type AuraOfficialTape = {
  live: boolean;
  symbol: "AURA/USDC";
  candles: Candle[];
  interval: ChartInterval;
  reason: string | null;
};

const ALLOWED: ChartInterval[] = ["5m", "15m", "1h", "4h", "1d"];

/**
 * Public AURA/USDC tape. Never proxies ETHUSDT as AURA.
 * Candles only when the official pool is published *and* a dedicated source exists.
 */
export const getAuraOfficialTape = createServerFn({ method: "GET" })
  .validator((input?: { interval?: string }) => {
    const interval = String(input?.interval ?? "1h");
    if (!ALLOWED.includes(interval as ChartInterval)) {
      throw new Error("Invalid chart interval");
    }
    return { interval: interval as ChartInterval };
  })
  .handler(async ({ data }): Promise<AuraOfficialTape> => {
    const token = auraTokenAddress();
    const live = Boolean(token && auraPairLive("aura-usdc"));
    if (!live) {
      return {
        live: false,
        symbol: "AURA/USDC",
        candles: [],
        interval: data.interval,
        reason:
          "Tape publishes when the official AURA/USDC pool is live. pAURA is a receipt, not a chart.",
      };
    }

    const source = (process.env["AURA_CANDLE_SOURCE"] || "").trim();
    if (!source) {
      return {
        live: true,
        symbol: "AURA/USDC",
        candles: [],
        interval: data.interval,
        reason:
          "Pool is published. Candle indexer is not wired yet — we will not draw ETH as AURA.",
      };
    }

    return {
      live: true,
      symbol: "AURA/USDC",
      candles: [],
      interval: data.interval,
      reason: "Official pair is live. Dedicated AURA candle source is configured but unused until T-0.",
    };
  });
