import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownUp, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { executeTreasurySwap, type TreasurySwapDirection } from "@/lib/okx.functions";
import { getTreasuryBalance } from "@/lib/treasury.functions";
import { cn } from "@/lib/utils";

type Side = "buy" | "sell";

const PRESETS = [25, 50, 100, 250] as const;

/**
 * Spot Buy/Sell ETH ticket next to the chart.
 * Not perps — swaps USDC ↔ WETH on Base via OKX + smart wallet.
 */
export function SpotTradeTicket({
  paper,
  markPrice,
  disabled,
}: {
  paper: boolean;
  markPrice: number | null;
  disabled?: boolean;
}) {
  const qc = useQueryClient();
  const [side, setSide] = useState<Side>("buy");
  const [amount, setAmount] = useState("50");
  const [confirm, setConfirm] = useState(false);

  const treasury = useQuery({
    queryKey: ["treasury-balance"],
    queryFn: () => getTreasuryBalance(),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const usdc = treasury.data?.usdc ?? 0;
  const weth = treasury.data?.weth ?? 0;
  const eth = treasury.data?.eth ?? 0;
  const sellableEth = weth + eth;

  const parsed = Number(amount);
  const amountOk = Number.isFinite(parsed) && parsed > 0;

  const estEth = useMemo(() => {
    if (!amountOk || !markPrice || markPrice <= 0 || side !== "buy") return null;
    return parsed / markPrice;
  }, [amountOk, markPrice, parsed, side]);

  const estUsdc = useMemo(() => {
    if (!amountOk || !markPrice || markPrice <= 0 || side !== "sell") return null;
    return parsed * markPrice;
  }, [amountOk, markPrice, parsed, side]);

  const balanceHint =
    side === "buy"
      ? `${usdc.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`
      : `${sellableEth.toLocaleString(undefined, { maximumFractionDigits: 5 })} ETH`;

  const overBalance =
    amountOk &&
    ((side === "buy" && parsed > usdc + 0.01) || (side === "sell" && parsed > sellableEth + 1e-8));

  const swap = useMutation({
    mutationFn: async () => {
      if (paper) throw new Error("Switch to Live to send a real spot swap.");
      if (!amountOk) throw new Error("Enter an amount.");
      if (overBalance) throw new Error("Amount exceeds wallet balance.");

      const direction: TreasurySwapDirection =
        side === "buy"
          ? "usdc_to_weth"
          : weth + 1e-9 >= parsed
            ? "weth_to_usdc"
            : "eth_to_usdc";

      // Sell path: ticket amount is ETH; buy path: USDC dollars.
      const human = side === "buy" ? parsed.toFixed(2) : parsed.toFixed(6);

      return executeTreasurySwap({
        data: { direction, amount: human, slippage: "0.5" },
      });
    },
    onSuccess: async (res) => {
      toast.success(
        side === "buy"
          ? `Bought ETH · ${res.fromLabel} → ${res.toLabel}`
          : `Sold ETH · ${res.fromLabel} → ${res.toLabel}`,
        {
          action: res.explorerTxUrl
            ? {
                label: "Explorer",
                onClick: () => window.open(res.explorerTxUrl!, "_blank", "noreferrer"),
              }
            : undefined,
        },
      );
      setConfirm(false);
      await qc.invalidateQueries({ queryKey: ["treasury-balance"] });
      await qc.invalidateQueries({ queryKey: ["trading-readiness"] });
      await qc.invalidateQueries({ queryKey: ["market-quote"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const liveBlocked = paper || Boolean(disabled);

  return (
    <div className="rounded-3xl border border-border/50 bg-foreground/[0.03] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Trade ETH
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Spot on Base · no leverage · you click, wallet swaps
          </p>
        </div>
        <ArrowDownUp className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-foreground/[0.04] p-1">
        <button
          type="button"
          onClick={() => {
            setSide("buy");
            setConfirm(false);
            if (!amount || Number(amount) < 1) setAmount("50");
          }}
          className={cn(
            "rounded-xl py-2.5 text-xs font-semibold transition-colors",
            side === "buy"
              ? "bg-gold/20 text-gold ring-1 ring-gold/35"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Buy ETH
        </button>
        <button
          type="button"
          onClick={() => {
            setSide("sell");
            setConfirm(false);
            setAmount((prev) => {
              const n = Number(prev);
              if (!Number.isFinite(n) || n >= 1) return "0.01";
              return prev;
            });
          }}
          className={cn(
            "rounded-xl py-2.5 text-xs font-semibold transition-colors",
            side === "sell"
              ? "bg-destructive/15 text-destructive ring-1 ring-destructive/30"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Sell ETH
        </button>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{side === "buy" ? "Pay (USDC)" : "Sell (ETH)"}</span>
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={() => {
              if (side === "buy") setAmount(Math.max(0, usdc).toFixed(2));
              else setAmount(Math.max(0, sellableEth * 0.98).toFixed(6));
              setConfirm(false);
            }}
          >
            Max · {balanceHint}
          </button>
        </div>
        <input
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value.replace(/[^0-9.]/g, ""));
            setConfirm(false);
          }}
          inputMode="decimal"
          className="mt-2 w-full rounded-2xl border border-border/50 bg-background/50 px-4 py-3 font-mono text-lg font-semibold outline-none ring-primary/30 focus:ring-2"
          placeholder={side === "buy" ? "50" : "0.01"}
        />
        {side === "buy" ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setAmount(String(p));
                  setConfirm(false);
                }}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  amount === String(p)
                    ? "bg-primary/20 text-primary"
                    : "bg-foreground/8 text-muted-foreground hover:text-foreground",
                )}
              >
                ${p}
              </button>
            ))}
          </div>
        ) : null}
        <p className="mt-2 text-[12px] text-muted-foreground">
          {side === "buy"
            ? estEth != null
              ? `≈ ${estEth.toLocaleString(undefined, { maximumFractionDigits: 5 })} ETH`
              : "Enter USDC to see ETH estimate"
            : estUsdc != null
              ? `≈ ${estUsdc.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`
              : "Enter ETH to see USDC estimate"}
          {markPrice
            ? ` · mark $${markPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
            : null}
        </p>
        {overBalance ? (
          <p className="mt-1 text-[11px] text-destructive">Above wallet balance.</p>
        ) : null}
      </div>

      {liveBlocked ? (
        <p className="mt-4 rounded-2xl border border-border/40 bg-background/40 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          {paper
            ? "Paper mode is for Quant autopilot practice. Flip the desk to Live to send a real spot swap from your smart wallet."
            : "Trading ticket unavailable until the wallet is ready."}
        </p>
      ) : null}

      {!confirm ? (
        <button
          type="button"
          disabled={liveBlocked || !amountOk || overBalance || swap.isPending}
          onClick={() => setConfirm(true)}
          className={cn(
            "mt-4 w-full rounded-2xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40",
            side === "buy" ? "bg-gold text-background" : "bg-destructive",
          )}
        >
          {side === "buy" ? "Review buy" : "Review sell"}
        </button>
      ) : (
        <div className="mt-4 space-y-2">
          <p className="text-[12px] text-muted-foreground">
            Confirm {side === "buy" ? `spend $${parsed.toFixed(2)} USDC → WETH` : `sell ${parsed} ETH → USDC`}{" "}
            via OKX DEX.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={swap.isPending}
              onClick={() => setConfirm(false)}
              className="rounded-2xl border border-border/50 py-2.5 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={swap.isPending || liveBlocked}
              onClick={() => swap.mutate()}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40",
                side === "buy" ? "bg-gold text-background" : "bg-destructive",
              )}
            >
              {swap.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Confirm swap
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
