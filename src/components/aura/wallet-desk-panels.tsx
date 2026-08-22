import { Link } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  Copy,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Panel } from "@/components/aura/primitives";
import { FioPayoutNudge } from "@/components/aura/fio-payout-nudge";
import { confirmFioOrContinue } from "@/hooks/use-fio-ready";
import type { TreasurySwapDirection } from "@/lib/okx.functions";
import type { TreasuryActivityItem, TreasurySendAsset } from "@/lib/treasury.functions";
import { currency, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  SWAP_ROUTES,
  shortAddr,
  type ActivityFilter,
  type SwapLeg,
} from "@/components/aura/wallet-desk-utils";

function kindTone(kind: TreasuryActivityItem["kind"]) {
  switch (kind) {
    case "transfer_in":
      return "text-gold";
    case "transfer_out":
    case "spend":
      return "text-muted-foreground";
    case "trade":
      return "text-primary";
    case "system":
      return "text-foreground";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function KindIcon({ kind }: { kind: TreasuryActivityItem["kind"] }) {
  if (kind === "transfer_in") return <ArrowDownLeft className="h-3.5 w-3.5 text-gold" />;
  if (kind === "transfer_out" || kind === "spend")
    return <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />;
  return <ArrowLeftRight className="h-3.5 w-3.5 text-primary" />;
}

export function WalletReceivePanel({
  address,
  networkLabel,
  nativeSym,
  qrUrl,
  copied,
  depositHint,
  onCopy,
}: {
  address: string;
  networkLabel: string;
  nativeSym: string;
  qrUrl: string | null;
  copied: boolean;
  depositHint?: string | null | undefined;
  onCopy: () => void;
}) {
  return (
    <Panel label="Receive" glow>
      <p className="text-[13px] text-muted-foreground">
        Send {nativeSym}, USDC, or WETH on{" "}
        <span className="font-semibold text-foreground">{networkLabel}</span> only. Wrong network =
        lost funds.
      </p>
      {qrUrl ? (
        <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-2.5">
          <img
            src={qrUrl}
            alt="QR code to deposit crypto to your Aura smart wallet"
            title="Deposit address QR code"
            width={168}
            height={168}
            className="rounded-xl"
          />
        </div>
      ) : null}
      <div className="mt-4 flex items-start gap-2 rounded-2xl bg-foreground/[0.04] px-3 py-2.5">
        <p className="min-w-0 flex-1 break-all font-mono text-[12px] leading-relaxed">{address}</p>
        <button
          type="button"
          onClick={() => void onCopy()}
          className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-foreground/8 text-muted-foreground hover:text-primary"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      {depositHint ? <p className="mt-3 text-[12px] text-muted-foreground">{depositHint}</p> : null}
    </Panel>
  );
}

export function WalletSendPanel({
  networkLabel,
  nativeSym,
  sendAsset,
  sendAssetLabel,
  sendBalance,
  sendTo,
  sendAmount,
  sendConfirm,
  sendPending,
  fioReady,
  gasSponsored,
  onAsset,
  onTo,
  onAmount,
  onMax,
  onReview,
  onConfirm,
  onCancel,
}: {
  networkLabel: string;
  nativeSym: string;
  sendAsset: TreasurySendAsset;
  sendAssetLabel: string;
  sendBalance: number;
  sendTo: string;
  sendAmount: string;
  sendConfirm: boolean;
  sendPending: boolean;
  fioReady: boolean;
  gasSponsored: boolean;
  onAsset: (asset: TreasurySendAsset) => void;
  onTo: (value: string) => void;
  onAmount: (value: string) => void;
  onMax: () => void;
  onReview: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Panel label="Send / withdraw" glow>
      <p className="text-[13px] text-muted-foreground">
        Withdraw to any {networkLabel} address. Irreversible — double-check the destination.
      </p>
      <FioPayoutNudge context="sending USDC" className="mt-3" />
      {!gasSponsored ? (
        <p className="mt-3 rounded-2xl bg-gold/10 px-3 py-2 text-[12px] text-gold">
          Keep a little {nativeSym} for gas — token sends need ~0.001 {nativeSym} when sponsorship
          is off.
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {(["usdc", "eth", "weth"] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onAsset(a)}
            className={cn(
              "rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em]",
              sendAsset === a
                ? "bg-primary text-primary-foreground"
                : "bg-foreground/8 text-muted-foreground",
            )}
          >
            {a === "eth" ? nativeSym : a.toUpperCase()}
          </button>
        ))}
      </div>
      <label className="mt-4 block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        To address
        <input
          value={sendTo}
          onChange={(e) => onTo(e.target.value)}
          placeholder="0x…"
          spellCheck={false}
          className="mt-2 w-full rounded-2xl border border-border/50 bg-background/60 px-4 py-3 font-mono text-sm outline-none focus:border-primary/50"
        />
      </label>
      <label className="mt-3 block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        Amount ({sendAssetLabel}) · balance{" "}
        {sendBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })}
        <div className="mt-2 flex gap-2">
          <input
            value={sendAmount}
            onChange={(e) => onAmount(e.target.value)}
            placeholder="0.0 or max"
            className="min-w-0 flex-1 rounded-2xl border border-border/50 bg-background/60 px-4 py-3 font-mono text-sm outline-none focus:border-primary/50"
          />
          <button
            type="button"
            onClick={onMax}
            className="rounded-2xl bg-foreground/8 px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
          >
            Max
          </button>
        </div>
      </label>
      {!sendConfirm ? (
        <button
          type="button"
          disabled={!sendTo.trim() || !sendAmount.trim() || sendBalance <= 0}
          onClick={() => {
            if (!/^0x[a-fA-F0-9]{40}$/.test(sendTo.trim())) {
              toast.error("Enter a valid 0x address.");
              return;
            }
            if (
              sendAsset === "usdc" &&
              !confirmFioOrContinue(
                fioReady,
                "usdc-send",
                "Attest a FIO handle on Identity so people can send you USDC by name@domain — and so Aura can show a verified receive rail.",
              )
            ) {
              toast.message("Set up FIO on Identity", {
                action: {
                  label: "Open",
                  onClick: () => {
                    window.location.href = "/identity";
                  },
                },
              });
              return;
            }
            onReview();
          }}
          className="mt-5 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-45"
        >
          Review send
        </button>
      ) : (
        <div className="mt-5 space-y-3 rounded-2xl border border-gold/30 bg-gold/8 p-4">
          <p className="text-[13px] font-medium text-foreground">
            Send {sendAmount === "max" ? "MAX" : sendAmount} {sendAssetLabel} to{" "}
            <span className="font-mono">{shortAddr(sendTo.trim())}</span> on {networkLabel}?
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={sendPending}
              onClick={onConfirm}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {sendPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm & broadcast
            </button>
            <button
              type="button"
              disabled={sendPending}
              onClick={onCancel}
              className="rounded-2xl bg-foreground/8 px-4 py-3 text-sm font-semibold text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Panel>
  );
}

export function WalletExchangePanel({
  networkLabel,
  nativeSym,
  configured,
  gasSponsored,
  gasHint,
  swapFrom,
  swapTo,
  swapAmount,
  quotePreview,
  swapConfirm,
  quotePending,
  swapPending,
  eth,
  usdc,
  weth,
  onFrom,
  onTo,
  onAmount,
  onMax,
  onQuote,
  onReview,
  onConfirm,
  onCancel,
}: {
  networkLabel: string;
  nativeSym: string;
  configured: boolean;
  gasSponsored: boolean;
  gasHint?: string | null | undefined;
  swapFrom: SwapLeg;
  swapTo: SwapLeg;
  swapAmount: string;
  quotePreview: string | null;
  swapConfirm: boolean;
  quotePending: boolean;
  swapPending: boolean;
  eth: number;
  usdc: number;
  weth: number;
  onFrom: (from: SwapLeg) => void;
  onTo: (to: SwapLeg) => void;
  onAmount: (value: string) => void;
  onMax: () => void;
  onQuote: () => void;
  onReview: () => void;
  onConfirm: (direction: TreasurySwapDirection) => void;
  onCancel: () => void;
}) {
  const swapRoute = SWAP_ROUTES.find((r) => r.from === swapFrom && r.to === swapTo);
  return (
    <Panel label="Exchange" glow>
      <p className="text-[13px] text-muted-foreground">
        Convert via OKX DEX from your Light Account. Desk uses USDC / WETH — convert {nativeSym}{" "}
        before trading.
      </p>
      {!configured ? (
        <p className="mt-3 text-[12px] text-muted-foreground">
          OKX rails are not configured — deposit USDC directly for now.
        </p>
      ) : (
        <>
          {!gasSponsored ? (
            <p className="mt-3 rounded-2xl bg-gold/10 px-3 py-2 text-[12px] leading-relaxed text-gold">
              Not a hidden exchange fee: Alchemy gas sponsorship is off, so we leave a tiny{" "}
              {nativeSym} cushion (~$0.20–0.30) when you convert max — Base gas itself is usually
              cents. Set <span className="font-mono text-[11px]">ALCHEMY_GAS_POLICY_ID_BASE</span>{" "}
              on the server for gasless swaps.
              {gasHint ? <> ({gasHint})</> : null}
            </p>
          ) : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              From
              <select
                value={swapFrom}
                onChange={(e) => onFrom(e.target.value as SwapLeg)}
                className="mt-2 w-full rounded-2xl border border-border/50 bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary/50"
              >
                <option value="eth">{nativeSym}</option>
                <option value="usdc">USDC</option>
                <option value="weth">WETH</option>
              </select>
            </label>
            <label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              To
              <select
                value={swapTo}
                onChange={(e) => onTo(e.target.value as SwapLeg)}
                className="mt-2 w-full rounded-2xl border border-border/50 bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary/50"
              >
                {SWAP_ROUTES.filter((r) => r.from === swapFrom).map((r) => (
                  <option key={r.to} value={r.to}>
                    {r.to === "eth" ? nativeSym : r.to.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-3 block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Amount
            <div className="mt-2 flex gap-2">
              <input
                value={swapAmount}
                onChange={(e) => onAmount(e.target.value)}
                placeholder="max"
                className="min-w-0 flex-1 rounded-2xl border border-border/50 bg-background/60 px-4 py-3 font-mono text-sm outline-none focus:border-primary/50"
              />
              <button
                type="button"
                onClick={onMax}
                className="rounded-2xl bg-foreground/8 px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                Max
              </button>
            </div>
          </label>
          {quotePreview ? (
            <p className="mt-3 text-[12px] font-medium text-gold">{quotePreview}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={quotePending || !swapRoute}
              onClick={onQuote}
              className="inline-flex items-center gap-2 rounded-2xl bg-foreground/8 px-4 py-3 text-sm font-semibold disabled:opacity-45"
            >
              {quotePending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Quote
            </button>
            {!swapConfirm ? (
              <button
                type="button"
                disabled={
                  swapPending ||
                  !swapRoute ||
                  (swapFrom === "eth" && eth < 0.0005) ||
                  (swapFrom === "weth" && weth < 0.0001) ||
                  (swapFrom === "usdc" && usdc < 0.05)
                }
                onClick={() => {
                  if (!swapRoute) {
                    toast.error("Unsupported pair.");
                    return;
                  }
                  onReview();
                }}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-45"
              >
                <ArrowLeftRight className="h-4 w-4" />
                Review exchange
              </button>
            ) : null}
          </div>
          {swapConfirm && swapRoute ? (
            <div className="mt-4 space-y-3 rounded-2xl border border-gold/30 bg-gold/8 p-4">
              <p className="text-[13px] font-medium text-foreground">
                Exchange {swapAmount === "max" || !swapAmount.trim() ? "MAX" : swapAmount}{" "}
                {swapFrom === "eth" ? nativeSym : swapFrom.toUpperCase()} →{" "}
                {swapTo === "eth" ? nativeSym : swapTo.toUpperCase()}
                {quotePreview ? ` (${quotePreview})` : ""} on {networkLabel}?
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={swapPending}
                  onClick={() => onConfirm(swapRoute.direction)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {swapPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Confirm & broadcast
                </button>
                <button
                  type="button"
                  disabled={swapPending}
                  onClick={onCancel}
                  className="rounded-2xl bg-foreground/8 px-4 py-3 text-sm font-semibold text-muted-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
          <Link
            to="/trading"
            className="mt-4 inline-block text-[12px] font-semibold text-primary hover:underline"
          >
            Open trading desk →
          </Link>
        </>
      )}
    </Panel>
  );
}

export function WalletActivityPanel({
  filter,
  items,
  loading,
  onFilter,
  onRefresh,
}: {
  filter: ActivityFilter;
  items: TreasuryActivityItem[];
  loading: boolean;
  onFilter: (filter: ActivityFilter) => void;
  onRefresh: () => void;
}) {
  return (
    <Panel
      label="Activity"
      action={
        <button
          type="button"
          onClick={onRefresh}
          className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-primary"
        >
          Refresh
        </button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            { id: "all" as const, label: "All" },
            { id: "in" as const, label: "In" },
            { id: "out" as const, label: "Out" },
            { id: "trade" as const, label: "Trade" },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFilter(f.id)}
            className={cn(
              "rounded-xl px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
              filter === f.id
                ? "bg-primary/14 text-primary"
                : "bg-foreground/6 text-muted-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No activity yet. Receive funds or run an exchange — it shows here.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 border-b border-border/40 pb-3 last:border-0 last:pb-0"
            >
              <span className="mt-1 grid h-7 w-7 place-items-center rounded-xl bg-foreground/6">
                <KindIcon kind={item.kind} />
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-[13px] font-medium", kindTone(item.kind))}>{item.title}</p>
                {item.detail ? (
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                    {item.detail}
                  </p>
                ) : null}
                <p className="mt-1 text-[10px] text-muted-foreground">{timeAgo(item.at)}</p>
              </div>
              <div className="shrink-0 text-right">
                {item.amount != null && item.asset === "USDC" ? (
                  <p className="num text-[12px] text-gold">{currency(item.amount)}</p>
                ) : item.amount != null ? (
                  <p className="num text-[12px]">{item.amount}</p>
                ) : null}
                {item.explorerUrl ? (
                  <a
                    href={item.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary"
                  >
                    Explorer <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
