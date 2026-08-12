import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Chip, DataRow, Panel, Pulse } from "@/components/aura/primitives";
import { Counter } from "@/components/aura/counter";
import { useMyHandle } from "@/hooks/use-identity";
import { useProvisionSmartWallet, useSmartWallet } from "@/hooks/use-earn";
import { executeTreasurySwap, getOkxStatus, type TreasurySwapDirection } from "@/lib/okx.functions";
import {
  getTreasuryActivity,
  getTreasuryBalance,
  type TreasuryActivityItem,
} from "@/lib/treasury.functions";
import { currency, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

function kindTone(kind: TreasuryActivityItem["kind"]) {
  switch (kind) {
    case "transfer_in":
      return "text-gold";
    case "transfer_out":
    case "spend":
      return "text-muted-foreground";
    case "trade":
      return "text-primary";
    default:
      return "text-foreground";
  }
}

function KindIcon({ kind }: { kind: TreasuryActivityItem["kind"] }) {
  if (kind === "transfer_in") return <ArrowDownLeft className="h-3.5 w-3.5 text-gold" />;
  if (kind === "transfer_out" || kind === "spend")
    return <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />;
  return <Pulse tone="primary" />;
}

/**
 * Trust-first treasury overview: deposit address, live balances, recent activity.
 */
export function TreasuryOverview({ compact = false }: { compact?: boolean }) {
  const qc = useQueryClient();
  const { data: handle } = useMyHandle();
  const handleId = handle?.id;
  const { data: wallet, isLoading: walletLoading } = useSmartWallet(handleId);
  const provision = useProvisionSmartWallet();
  const [copied, setCopied] = useState<"addr" | "usdc" | null>(null);
  const [swapAmount, setSwapAmount] = useState("max");

  const treasury = useQuery({
    queryKey: ["treasury-balance"],
    queryFn: () => getTreasuryBalance(),
    refetchInterval: 20_000,
  });
  const activity = useQuery({
    queryKey: ["treasury-activity"],
    queryFn: () => getTreasuryActivity(),
    refetchInterval: 30_000,
    enabled: Boolean(treasury.data?.address),
  });
  const okx = useQuery({
    queryKey: ["okx-status"],
    queryFn: () => getOkxStatus(),
    staleTime: 60_000,
  });

  const swap = useMutation({
    mutationFn: (direction: TreasurySwapDirection) =>
      executeTreasurySwap({ data: { direction, amount: swapAmount || "max" } }),
    onSuccess: async (res) => {
      toast.success(`${res.fromLabel} → ${res.toLabel} submitted`);
      await qc.invalidateQueries({ queryKey: ["treasury-balance"] });
      await qc.invalidateQueries({ queryKey: ["treasury-activity"] });
      await qc.invalidateQueries({ queryKey: ["trading-readiness"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const address =
    treasury.data?.address ?? (wallet as { address?: string } | null)?.address ?? null;
  const deployed =
    treasury.data?.deployed ?? Boolean((wallet as { deployed?: boolean } | null)?.deployed);
  const networkLabel = treasury.data?.label ?? "Base";
  const usdc = treasury.data?.usdc ?? 0;
  const eth = treasury.data?.eth ?? 0;
  const weth = treasury.data?.weth ?? 0;

  const qrUrl = useMemo(() => {
    if (!address) return null;
    return `https://api.qrserver.com/v1/create-qr-code/?size=168x168&margin=8&data=${encodeURIComponent(address)}`;
  }, [address]);

  const copy = async (value: string, which: "addr" | "usdc") => {
    await navigator.clipboard.writeText(value);
    setCopied(which);
    toast.success(which === "addr" ? "Deposit address copied." : "USDC contract copied.");
    window.setTimeout(() => setCopied(null), 1600);
  };

  const create = async () => {
    if (!handleId) {
      toast.error("Claim your @handle on Identity first.");
      return;
    }
    try {
      const res = await provision.mutateAsync(handleId);
      toast.success(res.created ? "Smart wallet ready." : "Smart wallet refreshed.");
      void treasury.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not provision wallet.");
    }
  };

  if (!handleId && !walletLoading) {
    return (
      <Panel label="Treasury" glow>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Claim your founder handle first — your smart wallet is bound to that identity.
        </p>
        <Link
          to="/identity"
          className="mt-4 inline-flex rounded-2xl bg-primary/14 px-4 py-2.5 text-xs font-semibold text-primary"
        >
          Open Identity
        </Link>
      </Panel>
    );
  }

  if (!address) {
    return (
      <Panel label="Treasury" glow>
        <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
          Provision your Alchemy Light Account to receive USDC on {networkLabel}. No browser
          extension — the owner key is encrypted server-side. Agents only spend under caps you
          approve.
        </p>
        <button
          type="button"
          onClick={() => void create()}
          disabled={provision.isPending}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary/14 px-5 py-3 text-[13px] font-semibold text-primary disabled:opacity-50"
        >
          {provision.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Create my smart wallet
        </button>
      </Panel>
    );
  }

  return (
    <div className={cn("space-y-5", compact && "space-y-4")}>
      <Panel label="Deposit address" glow motif={false}>
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Chip tone="gold">{networkLabel}</Chip>
            <Chip tone={deployed ? "primary" : "neutral"}>
              {deployed ? "Deployed onchain" : "Ready to receive"}
            </Chip>
            {treasury.data?.sponsored ? <Chip tone="primary">Gas sponsored</Chip> : null}
          </div>

          {qrUrl && !compact ? (
            <div className="mt-5 rounded-2xl bg-white p-2.5 shadow-[inset_0_0_0_1px_oklch(0_0_0/0.06)]">
              <img
                src={qrUrl}
                alt="QR code for treasury deposit address"
                title="Treasury deposit QR code"
                width={168}
                height={168}
                className="rounded-xl"
              />
            </div>
          ) : null}

          <div className="mt-4 flex w-full items-start gap-2 rounded-2xl bg-foreground/[0.04] px-3 py-2.5 text-left">
            <p className="min-w-0 flex-1 break-all font-mono text-[12px] leading-relaxed tracking-wide text-foreground sm:text-[13px]">
              {address}
            </p>
            <button
              type="button"
              onClick={() => void copy(address, "addr")}
              aria-label={copied === "addr" ? "Copied" : "Copy deposit address"}
              title="Copy"
              className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-foreground/8 text-muted-foreground transition-colors hover:bg-primary/14 hover:text-primary"
            >
              {copied === "addr" ? (
                <Check className="h-3.5 w-3.5" strokeWidth={2.25} />
              ) : (
                <Copy className="h-3.5 w-3.5" strokeWidth={2} />
              )}
            </button>
          </div>

          {treasury.data?.depositHint ? (
            <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
              {treasury.data.depositHint}
            </p>
          ) : null}

          {treasury.data?.explorerAddressUrl ? (
            <a
              href={treasury.data.explorerAddressUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary"
            >
              View on explorer <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl bg-foreground/4 p-4 sm:grid-cols-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Network</p>
            <p className="mt-1 text-[13px] font-medium">{networkLabel}</p>
            <p className="text-[11px] text-muted-foreground">
              Chain ID {treasury.data?.chainId ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Accepted assets
            </p>
            <p className="mt-1 text-[13px] font-medium">USDC · ETH · WETH</p>
            <p className="text-[11px] text-muted-foreground">Convert ETH in-app via OKX</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Custody</p>
            <p className="mt-1 text-[13px] font-medium">Alchemy Light Account</p>
            <p className="text-[11px] text-muted-foreground">
              Encrypted owner key · export from Wallet
            </p>
          </div>
        </div>
      </Panel>

      {!compact ? (
        <Panel label="Convert for Grow funds" glow>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Trading strategies buy with <span className="font-semibold text-foreground">USDC</span>{" "}
            and hold <span className="font-semibold text-foreground">WETH</span>. Deposit ETH, then
            convert in-app via OKX DEX — no external wallet needed. A small ETH buffer is kept for
            gas.
          </p>
          {!okx.data?.configured ? (
            <p className="mt-3 text-[12px] text-muted-foreground">
              OKX rails are not configured on this server yet — deposit USDC directly for now.
            </p>
          ) : (
            <>
              <label className="mt-4 block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Amount (ETH / WETH)
                <input
                  value={swapAmount}
                  onChange={(e) => setSwapAmount(e.target.value)}
                  placeholder="max"
                  className="mt-2 w-full rounded-2xl border border-border/50 bg-background/60 px-4 py-3 font-mono text-sm outline-none focus:border-primary/50"
                />
              </label>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Use <span className="font-mono">max</span> to convert almost all (minus gas buffer).
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={swap.isPending || eth < 0.0005}
                  onClick={() => swap.mutate("eth_to_usdc")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-45"
                >
                  {swap.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowLeftRight className="h-4 w-4" />
                  )}
                  ETH → USDC
                </button>
                <button
                  type="button"
                  disabled={swap.isPending || eth < 0.0005}
                  onClick={() => swap.mutate("eth_to_weth")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-foreground/8 px-4 py-3 text-sm font-semibold disabled:opacity-45"
                >
                  ETH → WETH
                </button>
                <button
                  type="button"
                  disabled={swap.isPending || weth < 0.0001}
                  onClick={() => swap.mutate("weth_to_usdc")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-foreground/8 px-4 py-3 text-sm font-semibold disabled:opacity-45"
                >
                  WETH → USDC
                </button>
              </div>
            </>
          )}
          <div className="mt-4">
            <Link to="/trading" className="text-[12px] font-semibold text-primary hover:underline">
              Open Grow funds →
            </Link>
          </div>
        </Panel>
      ) : null}

      <div className={cn("grid gap-5", compact ? "sm:grid-cols-2" : "md:grid-cols-2")}>
        <Panel label="Balances">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gold/14">
              <Wallet className="h-5 w-5 text-gold" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">USDC</p>
              <p className="num text-2xl font-semibold text-gold">
                <Counter
                  value={usdc}
                  format={(n) =>
                    n.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })
                  }
                />
              </p>
            </div>
          </div>
          <div className="mt-5">
            <DataRow
              label="ETH (native)"
              value={eth.toLocaleString(undefined, { maximumFractionDigits: 6 })}
            />
            <DataRow
              label="WETH (desk inventory)"
              value={weth.toLocaleString(undefined, { maximumFractionDigits: 6 })}
            />
            <DataRow
              label="Grow funds"
              value={usdc >= 5 ? "Funded" : eth > 0.002 ? "Convert ETH → USDC" : "Awaiting deposit"}
              tone={usdc >= 5 ? "gold" : "default"}
            />
          </div>
          {treasury.data?.usdcToken ? (
            <button
              type="button"
              onClick={() => void copy(treasury.data!.usdcToken, "usdc")}
              className="mt-4 flex w-full items-center justify-between rounded-xl bg-foreground/6 px-3 py-2 text-left text-[11px] text-muted-foreground hover:text-foreground"
            >
              <span className="truncate">
                USDC contract · {treasury.data.usdcToken.slice(0, 10)}…
              </span>
              {copied === "usdc" ? (
                <Check className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Copy className="h-3.5 w-3.5 shrink-0" />
              )}
            </button>
          ) : null}
          {treasury.data?.explorerTokenUrl ? (
            <a
              href={treasury.data.explorerTokenUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary"
            >
              Verify USDC on explorer <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </Panel>

        <Panel label="Why you can trust this">
          <ul className="space-y-3 text-[13px] leading-relaxed text-muted-foreground">
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Address is your Light Account on {networkLabel}. Funds stay onchain — Aura never
                asks for a seed phrase in the browser.
              </span>
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Agents spend only through session keys with hard caps you set. Revoke anytime on
                Identity.
              </span>
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Every swap and transfer can be opened on the block explorer. No invented balances.
              </span>
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/identity"
              className="rounded-xl bg-foreground/8 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
            >
              Session keys
            </Link>
            <Link
              to="/trading"
              className="rounded-xl bg-gold/14 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold"
            >
              Grow funds
            </Link>
          </div>
        </Panel>
      </div>

      {!compact ? (
        <Panel
          label="Latest activity"
          action={
            <button
              type="button"
              onClick={() => {
                void treasury.refetch();
                void activity.refetch();
              }}
              className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-primary"
            >
              Refresh
            </button>
          }
        >
          {activity.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading activity…</p>
          ) : (activity.data?.items.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No activity yet. Deposit USDC to this address — the first transfer will show here.
            </p>
          ) : (
            <div className="space-y-3">
              {activity.data!.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 border-b border-border/40 pb-3 last:border-0 last:pb-0"
                >
                  <span className="mt-1 grid h-7 w-7 place-items-center rounded-xl bg-foreground/6">
                    <KindIcon kind={item.kind} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-[13px] font-medium", kindTone(item.kind))}>
                      {item.title}
                    </p>
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
      ) : null}
    </div>
  );
}
