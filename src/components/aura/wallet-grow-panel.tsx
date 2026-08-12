import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Droplets, Landmark, LineChart, Loader2, PiggyBank, Sparkles, Wallet } from "lucide-react";

import { Panel } from "@/components/aura/primitives";
import { useCompany, useCompanyTable } from "@/hooks/use-aura";
import { yieldCatalogById } from "@/lib/defi/catalog";
import { getYieldDeskState } from "@/lib/defi/yield.functions";
import { currency } from "@/lib/format";
import { cn } from "@/lib/utils";

type YieldPos = {
  id: string;
  catalog_id: string;
  protocol: string;
  kind: string;
  status: string;
  paper: boolean | null;
  principal_usdc: number;
  mark_usdc: number;
  accrued_usdc: number;
  target_apy_pct: number | null;
  metadata?: { name?: string } | null;
};

type TradeRow = {
  id: string;
  symbol: string;
  side: string;
  size: number;
  status: string;
  pnl: number;
  paper?: boolean | null;
};

function kindIcon(kind: string) {
  switch (kind) {
    case "lending":
      return Landmark;
    case "lp":
    case "farm":
      return Droplets;
    default:
      return PiggyBank;
  }
}

function kindLabel(kind: string) {
  switch (kind) {
    case "lending":
      return "Earning interest";
    case "lp":
      return "In liquidity pool";
    case "farm":
      return "Farming rewards";
    default:
      return "Working";
  }
}

/**
 * Full-picture capital view for Wallet → Grow.
 * Makes Aave / LP / open trades visible so liquid USDC drop doesn't look like a loss.
 */
export function WalletGrowPanel({
  cashUsdc,
  eth,
  weth,
  nativeSymbol = "ETH",
}: {
  cashUsdc: number;
  eth: number;
  weth: number;
  nativeSymbol?: string;
}) {
  const { data: company } = useCompany();
  const companyId = company?.id ?? null;

  const yieldQ = useQuery({
    queryKey: ["yield-desk", company?.id],
    enabled: Boolean(company?.id),
    queryFn: () =>
      getYieldDeskState({ data: { companyId: company!.id } }) as Promise<{
        openNotional?: number;
        openMark?: number;
        paperPnl?: number;
        positions?: YieldPos[];
      }>,
    staleTime: 20_000,
    refetchInterval: 45_000,
  });

  const { data: trades = [] } = useCompanyTable<TradeRow>("trades", {
    orderBy: "opened_at",
    ascending: false,
    limit: 40,
  });

  const openYield = (yieldQ.data?.positions ?? []).filter((p) => p.status === "open");
  const liquidityUsdc = Number(yieldQ.data?.openMark ?? yieldQ.data?.openNotional ?? 0);
  const yieldPnl = Number(yieldQ.data?.paperPnl ?? 0);

  const openTrades = trades.filter((t) => t.status === "open");
  const tradeUsdc = openTrades.reduce((s, t) => s + Number(t.size), 0);
  const tradePnl = openTrades.reduce((s, t) => s + Number(t.pnl), 0);

  const working = liquidityUsdc + tradeUsdc;
  const totalUsdcPicture = cashUsdc + working;
  const loading = Boolean(companyId) && yieldQ.isLoading;

  return (
    <div className="space-y-5">
      <Panel label="Where your money is" glow>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Money in Aave or a pool is{" "}
          <span className="font-semibold text-foreground">still yours</span> — it left the liquid
          USDC line so it can earn. This tab is the full picture.
        </p>

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-[12px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading positions…
          </div>
        ) : (
          <>
            <div className="mt-5 rounded-2xl border border-primary/25 bg-primary/[0.06] px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                Total in Aura (USDC picture)
              </p>
              <p className="num mt-1 text-3xl font-semibold tracking-tight">
                {currency(totalUsdcPicture, 2)}
              </p>
              <p className="mt-2 text-[12px] text-muted-foreground">
                {currency(cashUsdc, 2)} cash · {currency(working, 2)} working
                {yieldPnl + tradePnl !== 0 ? (
                  <>
                    {" "}
                    · result{" "}
                    <span
                      className={cn(
                        "font-mono font-semibold",
                        yieldPnl + tradePnl >= 0 ? "text-primary" : "text-destructive",
                      )}
                    >
                      {yieldPnl + tradePnl >= 0 ? "+" : ""}
                      {currency(yieldPnl + tradePnl, 2)}
                    </span>
                  </>
                ) : null}
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                {
                  k: "Cash in wallet",
                  v: cashUsdc,
                  hint: "Ready to send / swap / deploy",
                  icon: Wallet,
                  hot: cashUsdc > 0,
                },
                {
                  k: "In liquidity",
                  v: liquidityUsdc,
                  hint:
                    openYield.length > 0
                      ? `${openYield.length} open · Aave / pools`
                      : "Nothing earning yet",
                  icon: Droplets,
                  hot: liquidityUsdc > 0,
                },
                {
                  k: "In trading",
                  v: tradeUsdc,
                  hint:
                    openTrades.length > 0
                      ? `${openTrades.length} open trade${openTrades.length > 1 ? "s" : ""}`
                      : "No open trades",
                  icon: LineChart,
                  hot: tradeUsdc > 0,
                },
              ].map((row) => {
                const Icon = row.icon;
                return (
                  <div
                    key={row.k}
                    className={cn(
                      "rounded-2xl border px-4 py-3",
                      row.hot
                        ? "border-primary/30 bg-primary/[0.06]"
                        : "border-border/40 bg-foreground/[0.03]",
                    )}
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                      <p className="text-[10px] uppercase tracking-[0.16em]">{row.k}</p>
                    </div>
                    <p className="num mt-1 text-xl font-semibold">{currency(row.v, 2)}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{row.hint}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Panel>

      <Panel label="Also in this wallet">
        <div className="divide-y divide-border/40 text-[13px]">
          <div className="flex justify-between gap-3 py-2.5 first:pt-0">
            <span className="text-muted-foreground">{nativeSymbol} (gas + convert)</span>
            <span className="num font-semibold">
              {eth.toLocaleString(undefined, { maximumFractionDigits: 6 })}
            </span>
          </div>
          <div className="flex justify-between gap-3 py-2.5 last:pb-0">
            <span className="text-muted-foreground">WETH (desk inventory)</span>
            <span className="num font-semibold">
              {weth.toLocaleString(undefined, { maximumFractionDigits: 6 })}
            </span>
          </div>
        </div>
      </Panel>

      {openYield.length > 0 ? (
        <Panel label="Liquidity & lending">
          <ul className="space-y-3">
            {openYield.map((p) => {
              const cat = yieldCatalogById(p.catalog_id);
              const Icon = kindIcon(p.kind);
              const name = p.metadata?.name || cat?.name || `${p.protocol} · ${p.catalog_id}`;
              const mark = Number(p.mark_usdc) || Number(p.principal_usdc);
              const accrued = Number(p.accrued_usdc) || 0;
              return (
                <li
                  key={p.id}
                  className="flex items-start gap-3 rounded-2xl border border-border/40 bg-foreground/[0.03] px-4 py-3"
                >
                  <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-semibold">{name}</p>
                      {p.paper ? (
                        <span className="rounded-full bg-foreground/8 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Paper
                        </span>
                      ) : (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
                          Live
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {kindLabel(p.kind)} · {p.protocol}
                      {p.target_apy_pct != null
                        ? ` · ~${Number(p.target_apy_pct).toFixed(1)}% target APY`
                        : null}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Not gone — withdraw anytime from Grow funds → Liquidity.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="num text-[14px] font-semibold">{currency(mark, 2)}</p>
                    {accrued !== 0 ? (
                      <p
                        className={cn(
                          "num text-[11px] font-semibold",
                          accrued >= 0 ? "text-primary" : "text-destructive",
                        )}
                      >
                        {accrued >= 0 ? "+" : ""}
                        {currency(accrued, 2)}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : null}

      {openTrades.length > 0 ? (
        <Panel label="Open trades">
          <ul className="space-y-3">
            {openTrades.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-foreground/[0.03] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gold/12 text-gold">
                    <LineChart className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold">
                      {t.side.toUpperCase()} {t.symbol}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {t.paper ? "Paper" : "Live"} · size in desk
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="num text-[14px] font-semibold">{currency(Number(t.size), 2)}</p>
                  <p
                    className={cn(
                      "num text-[11px] font-semibold",
                      Number(t.pnl) >= 0 ? "text-primary" : "text-destructive",
                    )}
                  >
                    {Number(t.pnl) >= 0 ? "+" : ""}
                    {currency(Number(t.pnl), 2)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {working < 1 && cashUsdc >= 0 && !loading ? (
        <Panel label="Nothing earning yet">
          <p className="text-[13px] text-muted-foreground">
            Park USDC in Aave interest or a liquidity pool — it will show here so you always know
            where it went.
          </p>
          <Link
            to="/trading"
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Open Grow funds
          </Link>
        </Panel>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Link
            to="/trading"
            className="inline-flex items-center gap-2 rounded-2xl bg-primary/14 px-4 py-2.5 text-xs font-semibold text-primary"
          >
            Manage on Grow funds
          </Link>
        </div>
      )}
    </div>
  );
}

/** Compact strip for wallet hero when capital is deployed. */
export function WalletWorkingHint({
  cashUsdc,
  workingUsdc,
  onOpenGrow,
}: {
  cashUsdc: number;
  workingUsdc: number;
  onOpenGrow: () => void;
}) {
  if (workingUsdc < 0.5) return null;
  return (
    <button
      type="button"
      onClick={onOpenGrow}
      className="mt-4 w-full rounded-2xl border border-primary/30 bg-primary/[0.08] px-4 py-3 text-left transition-colors hover:bg-primary/[0.12]"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
        Funds are working — not gone
      </p>
      <p className="mt-1 text-[13px] text-foreground">
        <span className="font-mono font-semibold">{currency(workingUsdc, 2)}</span> in liquidity /
        trading · <span className="font-mono font-semibold">{currency(cashUsdc, 2)}</span> still
        liquid
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">Tap Grow for the full breakdown →</p>
    </button>
  );
}
