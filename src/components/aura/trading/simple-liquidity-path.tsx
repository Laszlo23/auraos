import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Droplets, Landmark, Loader2, PiggyBank } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/aura/primitives";
import { FioPayoutNudge } from "@/components/aura/fio-payout-nudge";
import { MoneyModeToggle } from "@/components/aura/trading/money-mode-toggle";
import { useLocale } from "@/hooks/use-locale";
import { YIELD_CATALOG, type YieldRiskTier } from "@/lib/defi/catalog";
import {
  allocateYield,
  closeYieldAllocation,
  ensureYieldDesk,
  getYieldDeskState,
  setYieldDeskArmed,
  setYieldPaperMode,
} from "@/lib/defi/yield.functions";
import { confirmFioOrContinue, useFioReady } from "@/hooks/use-fio-ready";
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

const BOOKS = [
  {
    id: "base_aave_usdc",
    title: "Earn interest",
    Icon: PiggyBank,
    plainHow: "Your USDC is lent out. Borrowers pay you. Slow and simple.",
    recommend: true,
  },
  {
    id: "base_aero_usdc_weth_lp",
    title: "Help a trading pool",
    Icon: Droplets,
    plainHow: "You add money to a pool. Traders pay fees. Value can move vs just holding.",
    recommend: false,
  },
  {
    id: "bsc_venus_usdc",
    title: "Earn interest (BNB)",
    Icon: Landmark,
    plainHow: "Same idea as lending, on BNB Chain.",
    recommend: false,
  },
] as const;

const CHIPS = [25, 50, 100] as const;

export function SimpleLiquidityPath({
  companyId,
  availableUsdc = 0,
}: {
  companyId: string;
  availableUsdc?: number;
}) {
  const qc = useQueryClient();
  const { t } = useLocale();
  const fio = useFioReady();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [picked, setPicked] = useState<string>("base_aave_usdc");

  const deskQ = useQuery({
    queryKey: ["yield-desk", companyId],
    queryFn: async (): Promise<YieldDeskSnapshot> => {
      await ensureYieldDesk({ data: { companyId } });
      return getYieldDeskState({ data: { companyId } }) as unknown as Promise<YieldDeskSnapshot>;
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
    return BOOKS.flatMap((b) => {
      const cat = YIELD_CATALOG.find((c) => c.id === b.id);
      if (!cat || !allowed.has(b.id)) return [];
      return [{ ...b, cat }];
    });
  }, [allowed]);

  const featured = books.find((b) => b.id === picked) ?? books[0];
  const extra = books.filter((b) => b.id !== featured?.id);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["yield-desk", companyId] });
    void qc.invalidateQueries({ queryKey: ["treasury-balance"] });
  };

  const paperMut = useMutation({
    mutationFn: (paper: boolean) => setYieldPaperMode({ data: { companyId, paper } }),
    onSuccess: (_d, paper) => {
      toast.success(paper ? "Practice on — no real USDC moves" : "Real money on");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const goRealMoney = () => {
    if (
      !confirmFioOrContinue(
        fio.ready,
        "yield-live",
        "Real money moves USDC on-chain. Set a FIO name on Identity first so people can send to you by name.",
      )
    ) {
      toast.message("Set up FIO on Identity first", {
        action: { label: "Open", onClick: () => (window.location.href = "/identity") },
      });
      return;
    }
    paperMut.mutate(false);
  };

  async function onPutToWork() {
    if (!featured) return;
    const raw = amount || String(Math.min(50, Math.max(featured.cat.minUsdc, 25)));
    const amountUsdc = Number(raw);
    if (!Number.isFinite(amountUsdc) || amountUsdc <= 0) {
      toast.error("Enter an amount in USDC");
      return;
    }
    setBusy(featured.id);
    try {
      if (!state?.yieldArmed) {
        await setYieldDeskArmed({ data: { companyId, armed: true } });
      }
      await allocateYield({ data: { companyId, catalogId: featured.id, amountUsdc } });
      toast.success("Money is earning");
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
      <Panel label={t("moneyHub.pathEarn")}>
        <p className="text-[13px] text-muted-foreground">…</p>
      </Panel>
    );
  }

  const openPositions = (state?.positions ?? []).filter((p) => p.status === "open");
  const needsFund = availableUsdc < 1 && openPositions.length === 0;
  const defaultAmt = featured
    ? Math.min(
        Math.max(featured.cat.minUsdc, 50),
        availableUsdc > 0 ? Math.floor(availableUsdc) : 50,
      )
    : 50;
  const amt = amount || String(defaultAmt);
  const [lo, hi] = featured?.cat.apyBand ?? [0, 0];

  return (
    <div className="space-y-5">
      <Panel label={t("moneyHub.earnHowTitle")}>
        <ol className="space-y-2 text-[13px] leading-relaxed text-muted-foreground">
          {[t("moneyHub.earnHow1"), t("moneyHub.earnHow2"), t("moneyHub.earnHow3")].map(
            (line, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-mono text-[11px] font-semibold text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{line}</span>
              </li>
            ),
          )}
        </ol>
        <p className="mt-3 text-[12px] text-gold">{t("moneyHub.earnRisk")}</p>
      </Panel>

      {openPositions.length > 0 ? (
        <Panel label={t("moneyHub.earnOpen")} glow>
          <ul className="space-y-3">
            {openPositions.map((p) => {
              const book = BOOKS.find((b) => b.id === p.catalog_id);
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
                      ${(p.principal_usdc ?? 0).toFixed(2)} in · now $
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
                    {busy === p.id ? "…" : t("moneyHub.earnPull")}
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : null}

      {featured ? (
        <Panel label={t("moneyHub.earnPanel")} glow>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-xl">
              <div className="flex items-center gap-2">
                <featured.Icon className="h-5 w-5 text-primary" />
                <p className="text-[15px] font-semibold tracking-tight">{featured.title}</p>
                {featured.recommend ? <Chip tone="gold">Start here</Chip> : null}
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                {featured.plainHow} Typical{" "}
                <span className="font-mono text-foreground">
                  {lo}–{hi}%
                </span>{" "}
                / year — not a promise.
              </p>
            </div>
            <MoneyModeToggle
              practice={Boolean(state?.yieldPaper)}
              busy={paperMut.isPending}
              onPractice={() => paperMut.mutate(true)}
              onReal={goRealMoney}
            />
          </div>
          <FioPayoutNudge context="turning on real money earning" className="mt-3" />

          {needsFund ? (
            <p className="mt-4 text-[13px] text-gold">
              No USDC yet —{" "}
              <Link to="/wallet" className="font-semibold underline-offset-2 hover:underline">
                add some on Wallet
              </Link>{" "}
              first.
            </p>
          ) : (
            <p className="mt-4 text-[12px] text-muted-foreground">
              Available:{" "}
              <span className="font-mono text-foreground">${availableUsdc.toFixed(2)}</span>
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {CHIPS.map((n) => (
              <button
                key={n}
                type="button"
                disabled={needsFund || (availableUsdc > 0 && n > availableUsdc)}
                onClick={() => setAmount(String(n))}
                className={cn(
                  "rounded-2xl px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40",
                  amt === String(n)
                    ? "bg-primary/14 text-primary"
                    : "bg-foreground/6 text-muted-foreground",
                )}
              >
                ${n}
              </button>
            ))}
            {availableUsdc >= 1 ? (
              <button
                type="button"
                onClick={() => setAmount(String(Math.floor(availableUsdc)))}
                className={cn(
                  "rounded-2xl px-3 py-1.5 text-[12px] font-semibold",
                  Number(amt) === Math.floor(availableUsdc)
                    ? "bg-primary/14 text-primary"
                    : "bg-foreground/6 text-muted-foreground",
                )}
              >
                All
              </button>
            ) : null}
          </div>

          <label className="mt-3 block text-[11px] text-muted-foreground">
            Amount (USDC)
            <input
              type="number"
              min={featured.cat.minUsdc}
              value={amt}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1.5 w-full max-w-xs rounded-2xl bg-foreground/6 px-3.5 py-2.5 text-sm outline-none"
            />
          </label>

          <button
            type="button"
            disabled={busy === featured.id || needsFund}
            onClick={() => void onPutToWork()}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy === featured.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {busy === featured.id ? "…" : t("moneyHub.earnCta")}
          </button>
        </Panel>
      ) : null}

      {extra.length ? (
        <div>
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="text-[12px] font-medium text-muted-foreground hover:text-foreground"
          >
            {showMore ? t("moneyHub.earnLess") : t("moneyHub.earnMore")}
          </button>
          {showMore ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {extra.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setPicked(b.id);
                    setShowMore(false);
                  }}
                  className="rounded-3xl border border-border/50 bg-foreground/[0.03] p-4 text-left hover:border-primary/30"
                >
                  <b.Icon className="h-5 w-5 text-primary" />
                  <p className="mt-2 text-[14px] font-semibold">{b.title}</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">{b.plainHow}</p>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
