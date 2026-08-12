import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Droplets, Landmark, Loader2, PiggyBank } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/aura/primitives";
import { YIELD_CATALOG, type YieldRiskTier } from "@/lib/defi/catalog";
import {
  allocateYield,
  closeYieldAllocation,
  ensureYieldDesk,
  getYieldDeskState,
  setYieldDeskArmed,
  setYieldPaperMode,
  updateYieldRisk,
} from "@/lib/defi/yield.functions";
import { cn } from "@/lib/utils";

type YieldDeskSnapshot = {
  yieldArmed?: boolean;
  yieldPaper?: boolean;
  maxRiskTier?: YieldRiskTier | string;
  openNotional?: number;
  paperPnl?: number;
  allowedCatalogIds?: string[];
  positions?: Array<{
    id: string;
    status: string;
    catalog_id?: string;
    principal_usdc?: number;
    mark_usdc?: number;
    accrued_usdc?: number;
  }>;
};

const SIMPLE_BOOKS = [
  {
    id: "base_aave_usdc",
    title: "Earn interest",
    Icon: PiggyBank,
    plainHow: "Your USDC is lent out. Borrowers pay interest — that is your return.",
    recommend: true,
  },
  {
    id: "base_aero_usdc_weth_lp",
    title: "Provide pool liquidity",
    Icon: Droplets,
    plainHow:
      "You add capital to a trading pool. Traders pay fees; you earn a share. Value can move vs holding (impermanent loss).",
    recommend: false,
  },
  {
    id: "bsc_venus_usdc",
    title: "Earn interest (BNB)",
    Icon: Landmark,
    plainHow: "Same as lending on Base — park USDC on BNB Chain for borrow interest.",
    recommend: false,
  },
] as const;

export function SimpleLiquidityPath({
  companyId,
  availableUsdc = 0,
}: {
  companyId: string;
  availableUsdc?: number;
}) {
  const qc = useQueryClient();
  const [amountById, setAmountById] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  const deskQ = useQuery({
    queryKey: ["yield-desk", companyId],
    queryFn: async (): Promise<YieldDeskSnapshot> => {
      await ensureYieldDesk({ data: { companyId } });
      return getYieldDeskState({ data: { companyId } }) as Promise<YieldDeskSnapshot>;
    },
    enabled: Boolean(companyId),
    refetchInterval: 45_000,
  });

  const state: YieldDeskSnapshot | undefined = deskQ.data;
  const allowed = useMemo(
    () => new Set(state?.allowedCatalogIds ?? YIELD_CATALOG.map((c) => c.id)),
    [state?.allowedCatalogIds],
  );

  const books = useMemo(() => {
    return SIMPLE_BOOKS.flatMap((b) => {
      const cat = YIELD_CATALOG.find((c) => c.id === b.id);
      if (!cat || !allowed.has(b.id)) return [];
      return [{ ...b, cat }];
    });
  }, [allowed]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["yield-desk", companyId] });
    void qc.invalidateQueries({ queryKey: ["treasury"] });
  };

  const paperMut = useMutation({
    mutationFn: (paper: boolean) => setYieldPaperMode({ data: { companyId, paper } }),
    onSuccess: (_d, paper) => {
      toast.success(paper ? "Practice mode on" : "Real money mode");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function setTier(maxRiskTier: YieldRiskTier) {
    try {
      await updateYieldRisk({ data: { companyId, maxRiskTier } });
      toast.success(maxRiskTier === "conservative" ? "Safer ceiling" : "Balanced ceiling");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update risk");
    }
  }

  async function onPutToWork(catalogId: string) {
    const raw = amountById[catalogId] ?? "50";
    const amountUsdc = Number(raw);
    if (!Number.isFinite(amountUsdc) || amountUsdc <= 0) {
      toast.error("Enter an amount in USDC");
      return;
    }
    setBusy(catalogId);
    try {
      if (!state?.yieldArmed) {
        await setYieldDeskArmed({ data: { companyId, armed: true } });
      }
      await allocateYield({ data: { companyId, catalogId, amountUsdc } });
      toast.success("Money is at work");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not put money to work");
    } finally {
      setBusy(null);
    }
  }

  async function onPullOut(positionId: string) {
    setBusy(positionId);
    try {
      await closeYieldAllocation({ data: { companyId, positionId } });
      toast.success("Pulled out");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not pull out");
    } finally {
      setBusy(null);
    }
  }

  if (deskQ.isLoading && !state) {
    return (
      <Panel label="Provide liquidity">
        <p className="text-[13px] text-muted-foreground">Loading…</p>
      </Panel>
    );
  }

  const openPositions = (state?.positions ?? []).filter((p) => p.status === "open");
  const tier = (state?.maxRiskTier as YieldRiskTier) ?? "balanced";
  const needsFund = availableUsdc < 1 && openPositions.length === 0;

  return (
    <div className="space-y-5">
      {openPositions.length > 0 ? (
        <Panel label="Money is earning" glow>
          <ul className="space-y-3">
            {openPositions.map((p) => {
              const book = SIMPLE_BOOKS.find((b) => b.id === p.catalog_id);
              const cat = YIELD_CATALOG.find((c) => c.id === p.catalog_id);
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-foreground/[0.04] px-4 py-3"
                >
                  <div>
                    <p className="text-[13px] font-semibold">
                      {book?.title ?? cat?.name ?? p.catalog_id}
                    </p>
                    <p className="mt-0.5 font-mono text-[12px] text-muted-foreground">
                      ${(p.principal_usdc ?? 0).toFixed(2)} in · mark $
                      {(p.mark_usdc ?? p.principal_usdc ?? 0).toFixed(2)}
                      {typeof p.accrued_usdc === "number"
                        ? ` · earned $${p.accrued_usdc.toFixed(4)}`
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy === p.id}
                    onClick={() => void onPullOut(p.id)}
                    className="rounded-2xl bg-foreground/8 px-3.5 py-2 text-[11px] font-semibold disabled:opacity-50"
                  >
                    {busy === p.id ? "…" : "Pull out"}
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : null}

      <Panel label="How this grows your money" glow>
        <p className="text-[14px] leading-relaxed text-muted-foreground">
          Enter an amount and put it to work. You earn interest (lending) or fees (pools). Returns
          vary — not a promise.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={paperMut.isPending || Boolean(state?.yieldPaper)}
            onClick={() => paperMut.mutate(true)}
            className={cn(
              "rounded-2xl px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50",
              state?.yieldPaper ? "bg-gold/16 text-gold" : "bg-foreground/6 text-muted-foreground",
            )}
          >
            Practice
          </button>
          <button
            type="button"
            disabled={paperMut.isPending || !state?.yieldPaper}
            onClick={() => paperMut.mutate(false)}
            className={cn(
              "rounded-2xl px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50",
              !state?.yieldPaper
                ? "bg-primary/14 text-primary"
                : "bg-foreground/6 text-muted-foreground",
            )}
          >
            Real money
          </button>
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="rounded-2xl px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            {showMore ? "Hide risk" : "Risk settings"}
          </button>
        </div>
        {showMore ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void setTier("conservative")}
              className={cn(
                "rounded-2xl px-3.5 py-2 text-[12px] font-semibold",
                tier === "conservative"
                  ? "bg-gold/16 text-gold"
                  : "bg-foreground/6 text-muted-foreground",
              )}
            >
              Safer
            </button>
            <button
              type="button"
              onClick={() => void setTier("balanced")}
              className={cn(
                "rounded-2xl px-3.5 py-2 text-[12px] font-semibold",
                tier !== "conservative"
                  ? "bg-primary/14 text-primary"
                  : "bg-foreground/6 text-muted-foreground",
              )}
            >
              Balanced
            </button>
          </div>
        ) : null}
        {needsFund ? (
          <p className="mt-4 text-[13px] text-gold">
            No USDC yet —{" "}
            <Link to="/wallet" className="font-semibold underline-offset-2 hover:underline">
              fund your wallet
            </Link>{" "}
            first.
          </p>
        ) : (
          <p className="mt-4 text-[12px] text-muted-foreground">
            Available to deploy:{" "}
            <span className="font-mono text-foreground">${availableUsdc.toFixed(2)}</span>
          </p>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        {books.map((b) => {
          const [lo, hi] = b.cat.apyBand;
          const defaultAmt = Math.min(
            Math.max(b.cat.minUsdc, 50),
            availableUsdc > 0 ? Math.floor(availableUsdc) : 50,
          );
          const amt = amountById[b.id] ?? String(defaultAmt);
          const isBusy = busy === b.id;
          return (
            <Panel key={b.id} label={b.title} glow={b.recommend || b.cat.liveReady}>
              <div className="flex items-start justify-between gap-2">
                <b.Icon className="h-5 w-5 text-primary" />
                <div className="flex flex-wrap gap-1">
                  {b.recommend ? <Chip tone="gold">Start here</Chip> : null}
                  <Chip tone={b.cat.liveReady ? "primary" : "neutral"}>
                    {b.cat.liveReady ? "Live" : "Practice"}
                  </Chip>
                </div>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{b.plainHow}</p>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Typical{" "}
                <span className="font-mono text-foreground">
                  {lo}–{hi}%
                </span>{" "}
                / year (illustrative)
              </p>
              <label className="mt-4 block text-[11px] text-muted-foreground">
                Amount (USDC)
                <input
                  type="number"
                  min={b.cat.minUsdc}
                  value={amt}
                  onChange={(e) =>
                    setAmountById((prev) => ({ ...prev, [b.id]: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-2xl bg-foreground/6 px-3.5 py-2.5 text-sm outline-none"
                />
              </label>
              <button
                type="button"
                disabled={isBusy || needsFund}
                onClick={() => void onPutToWork(b.id)}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {isBusy ? "Working…" : "Put money to work"}
              </button>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
