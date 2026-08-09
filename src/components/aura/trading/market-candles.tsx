import { useMemo, useState } from "react";

import { Chip } from "@/components/aura/primitives";
import type { Candle, ChartInterval } from "@/lib/trading/market-data.server";
import { cn } from "@/lib/utils";

const INTERVALS: ChartInterval[] = ["5m", "15m", "1h", "4h", "1d"];

function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i]!;
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    if (prev == null) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += values[j]!;
      prev = sum / period;
    } else {
      prev = v * k + prev * (1 - k);
    }
    out.push(prev);
  }
  return out;
}

export function MarketCandles({
  candles,
  loading,
  interval,
  onIntervalChange,
  levels,
}: {
  candles: Candle[];
  loading?: boolean;
  interval: ChartInterval;
  onIntervalChange: (i: ChartInterval) => void;
  levels?: { entry?: number; stop?: number; target?: number } | null;
}) {
  const [showEma, setShowEma] = useState(true);
  const [showVol, setShowVol] = useState(true);

  const chart = useMemo(() => {
    if (candles.length < 2) return null;
    const w = 640;
    const h = 280;
    const volH = showVol ? 56 : 0;
    const padL = 8;
    const padR = 56;
    const padT = 12;
    const padB = 8;
    const plotH = h - padT - padB - volH;
    const plotW = w - padL - padR;
    const highs = candles.map((c) => c.h);
    const lows = candles.map((c) => c.l);
    const extras = [levels?.entry, levels?.stop, levels?.target].filter(
      (n): n is number => typeof n === "number" && Number.isFinite(n),
    );
    const maxP = Math.max(...highs, ...extras);
    const minP = Math.min(...lows, ...extras);
    const range = maxP - minP || 1;
    const y = (p: number) => padT + (1 - (p - minP) / range) * plotH;
    const slot = plotW / candles.length;
    const closes = candles.map((c) => c.c);
    const emaVals = ema(closes, 20);
    const maxV = Math.max(...candles.map((c) => c.v), 1);

    const bodies = candles.map((c, i) => {
      const x = padL + i * slot + slot * 0.15;
      const bw = Math.max(1.5, slot * 0.7);
      const openY = y(c.o);
      const closeY = y(c.c);
      const highY = y(c.h);
      const lowY = y(c.l);
      const up = c.c >= c.o;
      return { x, bw, openY, closeY, highY, lowY, up, v: c.v };
    });

    const emaPath = emaVals
      .map((v, i) => {
        if (v == null) return null;
        const x = padL + i * slot + slot / 2;
        return `${x},${y(v)}`;
      })
      .filter(Boolean)
      .join(" ");

    const levelLines = (
      [
        { key: "ENTRY", value: levels?.entry, color: "var(--primary)" },
        { key: "STOP", value: levels?.stop, color: "var(--destructive)" },
        { key: "TARGET", value: levels?.target, color: "var(--gold)" },
      ] as const
    ).filter((l) => l.value != null && Number.isFinite(l.value));

    return { w, h, volH, padL, padT, plotH, plotW, bodies, emaPath, maxV, y, levelLines, slot };
  }, [candles, levels, showVol]);

  return (
    <div className="rounded-3xl border border-border/50 bg-foreground/[0.03] p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Market chart
        </p>
        <div className="flex flex-wrap gap-1.5">
          {INTERVALS.map((iv) => (
            <button
              key={iv}
              type="button"
              onClick={() => onIntervalChange(iv)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase",
                interval === iv ? "bg-primary/16 text-primary" : "bg-foreground/6 text-muted-foreground",
              )}
            >
              {iv}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowEma((v) => !v)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-semibold",
              showEma ? "bg-gold/16 text-gold" : "bg-foreground/6 text-muted-foreground",
            )}
          >
            EMA
          </button>
          <button
            type="button"
            onClick={() => setShowVol((v) => !v)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-semibold",
              showVol ? "bg-primary/16 text-primary" : "bg-foreground/6 text-muted-foreground",
            )}
          >
            Vol
          </button>
        </div>
      </div>

      {levels && (levels.entry || levels.stop || levels.target) ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {levels.entry != null ? <Chip tone="primary">ENTRY ${levels.entry.toFixed(2)}</Chip> : null}
          {levels.stop != null ? <Chip tone="danger">STOP ${levels.stop.toFixed(2)}</Chip> : null}
          {levels.target != null ? <Chip tone="gold">TARGET ${levels.target.toFixed(2)}</Chip> : null}
        </div>
      ) : null}

      <div className="relative h-[280px] w-full overflow-hidden rounded-2xl bg-background/40">
        {loading && candles.length === 0 ? (
          <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
            Loading candles…
          </p>
        ) : !chart ? (
          <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
            No chart data
          </p>
        ) : (
          <svg viewBox={`0 0 ${chart.w} ${chart.h}`} className="h-full w-full" preserveAspectRatio="none">
            {chart.bodies.map((b, i) => (
              <g key={i}>
                <line
                  x1={b.x + b.bw / 2}
                  x2={b.x + b.bw / 2}
                  y1={b.highY}
                  y2={b.lowY}
                  stroke={b.up ? "var(--gold)" : "var(--destructive)"}
                  strokeWidth={1}
                  opacity={0.85}
                />
                <rect
                  x={b.x}
                  y={Math.min(b.openY, b.closeY)}
                  width={b.bw}
                  height={Math.max(1.5, Math.abs(b.closeY - b.openY))}
                  fill={b.up ? "var(--gold)" : "var(--destructive)"}
                  opacity={0.9}
                />
                {showVol ? (
                  <rect
                    x={b.x}
                    y={chart.h - (b.v / chart.maxV) * (chart.volH - 4)}
                    width={b.bw}
                    height={(b.v / chart.maxV) * (chart.volH - 4)}
                    fill={b.up ? "var(--gold)" : "var(--destructive)"}
                    opacity={0.25}
                  />
                ) : null}
              </g>
            ))}
            {showEma && chart.emaPath ? (
              <polyline
                points={chart.emaPath}
                fill="none"
                stroke="var(--primary)"
                strokeWidth={1.4}
                opacity={0.85}
              />
            ) : null}
            {chart.levelLines.map((l) => {
              const yy = chart.y(l.value!);
              return (
                <g key={l.key}>
                  <line
                    x1={chart.padL}
                    x2={chart.padL + chart.plotW}
                    y1={yy}
                    y2={yy}
                    stroke={l.color}
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    opacity={0.9}
                  />
                  <text
                    x={chart.padL + chart.plotW + 4}
                    y={yy + 3}
                    fill={l.color}
                    fontSize={9}
                    fontFamily="ui-monospace, monospace"
                  >
                    {l.key}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
