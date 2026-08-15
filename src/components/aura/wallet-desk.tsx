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
  History,
  Loader2,
  Sparkles,
  Sprout,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/aura/primitives";
import { Counter } from "@/components/aura/counter";
import { DeskChainSwitcher } from "@/components/aura/desk-chain-switcher";
import {
  WalletActivityPanel,
  WalletExchangePanel,
  WalletReceivePanel,
  WalletSendPanel,
} from "@/components/aura/wallet-desk-panels";
import {
  SWAP_ROUTES,
  formatTokenAmount,
  parseUiAmountToWeiString,
  shortAddr,
  type ActivityFilter,
  type DeskTab,
  type SwapLeg,
} from "@/components/aura/wallet-desk-utils";
import { WalletExportPanel } from "@/components/aura/wallet-export";
import { WalletGrowPanel, WalletWorkingHint } from "@/components/aura/wallet-grow-panel";
import { useCompany } from "@/hooks/use-aura";
import { useFioReady } from "@/hooks/use-fio-ready";
import { useMyHandle } from "@/hooks/use-identity";
import { useProvisionSmartWallet, useSmartWallet } from "@/hooks/use-earn";
import { getGenesisStatus } from "@/lib/genesis.functions";
import { getYieldDeskState } from "@/lib/defi/yield.functions";
import {
  executeTreasurySwap,
  getOkxStatus,
  quoteOkxSwap,
  type TreasurySwapDirection,
} from "@/lib/okx.functions";
import {
  getTreasuryActivity,
  getTreasuryBalance,
  sendTreasury,
  type TreasurySendAsset,
} from "@/lib/treasury.functions";
import type { HolderPerks } from "@/lib/trading/holder-perks";
import { NATIVE_ETH, WETH_ADDRESSES } from "@/lib/trading/tokens";
import { currency } from "@/lib/format";
import { mediaPath } from "@/lib/site";
import { cn } from "@/lib/utils";

const GENESIS_ART = mediaPath("/genesis-passport.webp");
const GENESIS_ART_JPG = mediaPath("/genesis-passport.jpg");

export function WalletDesk({ seat, perks }: { seat?: number | null; perks?: HolderPerks | undefined }) {
  const qc = useQueryClient();
  const { data: handle } = useMyHandle();
  const handleId = handle?.id;
  const { data: wallet, isLoading: walletLoading } = useSmartWallet(handleId);
  const provision = useProvisionSmartWallet();
  const { data: company } = useCompany();
  const fio = useFioReady();

  const [tab, setTab] = useState<DeskTab>(null);
  const [copied, setCopied] = useState(false);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");

  const [sendAsset, setSendAsset] = useState<TreasurySendAsset>("usdc");
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendConfirm, setSendConfirm] = useState(false);

  const [swapFrom, setSwapFrom] = useState<SwapLeg>("eth");
  const [swapTo, setSwapTo] = useState<SwapLeg>("usdc");
  const [swapAmount, setSwapAmount] = useState("max");
  const [quotePreview, setQuotePreview] = useState<string | null>(null);
  const [swapConfirm, setSwapConfirm] = useState(false);

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
  const genesis = useQuery({
    queryKey: ["genesis-status"],
    queryFn: () => getGenesisStatus(),
    staleTime: 15_000,
  });
  const yieldQ = useQuery({
    queryKey: ["yield-desk", company?.id],
    enabled: Boolean(company?.id),
    queryFn: () =>
      getYieldDeskState({ data: { companyId: company!.id } }) as Promise<{
        openNotional?: number;
        openMark?: number;
      }>,
    staleTime: 20_000,
    refetchInterval: 45_000,
  });

  const invalidateTreasury = async () => {
    await qc.invalidateQueries({ queryKey: ["treasury-balance"] });
    await qc.invalidateQueries({ queryKey: ["treasury-activity"] });
    await qc.invalidateQueries({ queryKey: ["yield-desk"] });
    await qc.invalidateQueries({ queryKey: ["trading-readiness"] });
  };

  const send = useMutation({
    mutationFn: () =>
      sendTreasury({
        data: {
          asset: sendAsset,
          to: sendTo.trim(),
          amount: sendAmount.trim() || "max",
        },
      }),
    onSuccess: async (res) => {
      toast.success(`Sent ${res.humanAmount} ${res.assetLabel}`, {
        action: res.explorerTxUrl
          ? {
              label: "Explorer",
              onClick: () => window.open(res.explorerTxUrl!, "_blank", "noreferrer"),
            }
          : undefined,
      });
      setSendConfirm(false);
      setSendAmount("");
      setSendTo("");
      setTab("activity");
      await invalidateTreasury();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const swapRoute = SWAP_ROUTES.find((r) => r.from === swapFrom && r.to === swapTo);
  const swap = useMutation({
    mutationFn: (direction: TreasurySwapDirection) =>
      executeTreasurySwap({ data: { direction, amount: swapAmount || "max" } }),
    onSuccess: async (res) => {
      toast.success(`${res.fromLabel} → ${res.toLabel} submitted`, {
        action: res.explorerTxUrl
          ? {
              label: "Explorer",
              onClick: () => window.open(res.explorerTxUrl!, "_blank", "noreferrer"),
            }
          : undefined,
      });
      setQuotePreview(null);
      setSwapConfirm(false);
      setTab("activity");
      await invalidateTreasury();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const quote = useMutation({
    mutationFn: async () => {
      if (!swapRoute || !treasury.data) throw new Error("Pick a supported route.");
      const network = treasury.data.network;
      const fromToken =
        swapRoute.from === "eth"
          ? NATIVE_ETH
          : swapRoute.from === "usdc"
            ? treasury.data.usdcToken
            : WETH_ADDRESSES[network];
      const toToken =
        swapRoute.to === "eth"
          ? NATIVE_ETH
          : swapRoute.to === "usdc"
            ? treasury.data.usdcToken
            : WETH_ADDRESSES[network];
      const decimals = swapRoute.from === "usdc" ? 6 : 18;
      const toDecimals = swapRoute.to === "usdc" ? 6 : 18;
      let amountWei: string;
      if (swapAmount.trim().toLowerCase() === "max" || !swapAmount.trim()) {
        // Pass literal max to execute; for quote use fixed precision from balance.
        const bal =
          swapRoute.from === "eth"
            ? treasury.data.eth
            : swapRoute.from === "usdc"
              ? treasury.data.usdc
              : treasury.data.weth;
        const factor = swapRoute.from === "eth" ? 0.98 : 1;
        const human = Math.max(0, bal * factor).toFixed(decimals === 6 ? 6 : 8);
        amountWei = parseUiAmountToWeiString(human, decimals) ?? "0";
      } else {
        amountWei = parseUiAmountToWeiString(swapAmount, decimals) ?? "0";
      }
      if (amountWei === "0") throw new Error("Enter an amount to quote.");
      const res = await quoteOkxSwap({
        data: {
          fromTokenAddress: fromToken,
          toTokenAddress: toToken,
          amount: amountWei,
          slippage: "0.5",
        },
      });
      return { ...res, toDecimals, toLabel: swapRoute.to };
    },
    onSuccess: (res) => {
      const est = res.quote.estimatedAmount;
      if (!est) {
        setQuotePreview("Quote ready — estimate unavailable");
        return;
      }
      const human = formatTokenAmount(est, res.toDecimals);
      const label =
        res.toLabel === "eth" ? (treasury.data?.nativeSymbol ?? "ETH") : res.toLabel.toUpperCase();
      setQuotePreview(`≈ ${human} ${label}`);
      setSwapConfirm(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const address =
    treasury.data?.address ?? (wallet as { address?: string } | null)?.address ?? null;
  const deployed =
    treasury.data?.deployed ?? Boolean((wallet as { deployed?: boolean } | null)?.deployed);
  const networkLabel = treasury.data?.label ?? "Base";
  const nativeSym = treasury.data?.nativeSymbol ?? "ETH";
  const stableSym =
    (treasury.data as { stableSymbol?: string } | undefined)?.stableSymbol ?? "USDC";
  const usdc = treasury.data?.usdc ?? 0;
  const eth = treasury.data?.eth ?? 0;
  const weth = treasury.data?.weth ?? 0;
  // Rough USD: USDC 1:1, ETH/WETH left unlabeled if no price — show USDC as cash core.
  const totalCash = usdc;
  const genesisMinted =
    genesis.data?.status === "minted" ||
    Boolean(genesis.data?.ownsOnchain) ||
    Boolean(perks?.hasGenesisNft);

  const qrUrl = useMemo(() => {
    if (!address) return null;
    return `https://api.qrserver.com/v1/create-qr-code/?size=168x168&margin=8&data=${encodeURIComponent(address)}`;
  }, [address]);

  const filteredActivity = useMemo(() => {
    const items = activity.data?.items ?? [];
    if (activityFilter === "all") return items;
    if (activityFilter === "in") return items.filter((i) => i.kind === "transfer_in");
    if (activityFilter === "out")
      return items.filter((i) => i.kind === "transfer_out" || i.kind === "spend");
    return items.filter((i) => i.kind === "trade");
  }, [activity.data?.items, activityFilter]);

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success("Address copied.");
    window.setTimeout(() => setCopied(false), 1600);
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

  const openTab = (next: DeskTab) => {
    setTab((cur) => (cur === next ? null : next));
    setSendConfirm(false);
    setSwapConfirm(false);
    setQuotePreview(null);
  };

  const onSwapFromChange = (from: SwapLeg) => {
    setSwapFrom(from);
    const first = SWAP_ROUTES.find((r) => r.from === from);
    if (first) setSwapTo(first.to);
    setQuotePreview(null);
    setSwapConfirm(false);
  };

  if (!handleId && !walletLoading) {
    return (
      <Panel label="Wallet" glow>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Your smart wallet is bound to a founder @handle. Claim one on Identity — it takes a few
          seconds — then this desk can receive USDC.
        </p>
        <Link
          to="/identity"
          className="mt-4 inline-flex rounded-2xl bg-primary/14 px-4 py-2.5 text-xs font-semibold text-primary"
        >
            Open Identity — claim @handle
        </Link>
      </Panel>
    );
  }

  if (!address) {
    return (
      <Panel label="Wallet" glow>
        <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
          Provision your Alchemy Light Account to receive, send, and exchange on {networkLabel}.
          Owner key stays encrypted server-side — no browser extension.
        </p>
        <button
          type="button"
          onClick={() => void create()}
          disabled={provision.isPending}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-[13px] font-semibold text-primary-foreground disabled:opacity-50"
        >
          {provision.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Create my wallet
        </button>
      </Panel>
    );
  }

  const sendBalance = sendAsset === "usdc" ? usdc : sendAsset === "eth" ? eth : weth;
  const sendAssetLabel =
    sendAsset === "usdc" ? stableSym : sendAsset === "eth" ? nativeSym : "WETH";

  return (
    <div className="space-y-5">
      <DeskChainSwitcher
        invalidateKeys={[["treasury-activity"], ["trading-readiness"], ["yield-desk"]]}
      />
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          {
            k: "On-chain cash",
            v: `${currency(totalCash, 2)} USDC`,
            h: "Smart wallet — send, swap, fund Grow",
          },
          {
            k: "Working",
            v: `${currency(Number(yieldQ.data?.openMark ?? yieldQ.data?.openNotional ?? 0), 2)}`,
            h: "In trades / pools — still yours",
          },
          {
            k: "Pulse",
            v: `${currency(Number(company?.pulse_paper_usdc ?? 0), 2)}`,
            h: "Paper bankroll on Grow — not on-chain cash",
          },
        ].map((row) => (
          <div
            key={row.k}
            className="rounded-2xl border border-border/40 bg-foreground/[0.03] px-4 py-3"
          >
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{row.k}</p>
            <p className="mt-1 font-mono text-[14px] font-semibold">{row.v}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{row.h}</p>
          </div>
        ))}
      </div>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[1.75rem] border border-border/40 bg-gradient-to-br from-foreground/[0.06] via-background to-primary/[0.08] px-5 py-6 sm:px-7 sm:py-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gold/10 blur-3xl"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="gold">{networkLabel}</Chip>
              <Chip tone={deployed ? "primary" : "neutral"}>{deployed ? "On-chain" : "Ready"}</Chip>
              {okx.data?.configured ? <Chip tone="primary">Exchange live</Chip> : null}
              {treasury.data?.sponsored || okx.data?.gasSponsored ? (
                <Chip tone="primary">Gas sponsored</Chip>
              ) : (
                <Chip>Gas: keep {nativeSym}</Chip>
              )}
            </div>
            {(() => {
              const workingUsdc = Number(yieldQ.data?.openMark ?? yieldQ.data?.openNotional ?? 0);
              const totalPicture = totalCash + workingUsdc;
              const showTotal = workingUsdc >= 0.5;
              return (
                <>
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {showTotal ? "Total funds (USDC picture)" : `Cash (${stableSym})`}
                  </p>
                  <p className="num mt-1 text-4xl font-semibold tracking-tight text-gold sm:text-5xl">
                    <Counter
                      value={showTotal ? totalPicture : totalCash}
                      format={(n) => currency(n, n >= 100 ? 2 : 4)}
                    />
                  </p>
                  {showTotal ? (
                    <p className="mt-2 text-[12px] text-muted-foreground">
                      <span className="font-mono font-semibold text-foreground">
                        {currency(totalCash, 2)}
                      </span>{" "}
                      liquid in wallet ·{" "}
                      <span className="font-mono font-semibold text-primary">
                        {currency(workingUsdc, 2)}
                      </span>{" "}
                      earning / in pools
                    </p>
                  ) : null}
                  <WalletWorkingHint
                    cashUsdc={totalCash}
                    workingUsdc={workingUsdc}
                    onOpenGrow={() => openTab("grow")}
                  />
                </>
              );
            })()}
            <button
              type="button"
              onClick={() => void copyAddress()}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-foreground/6 px-3 py-1.5 font-mono text-[12px] text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
            >
              {shortAddr(address)}
              {copied ? (
                <Check className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <div className="text-right text-[12px] text-muted-foreground">
            <p>
              {nativeSym}{" "}
              <span className="num font-medium text-foreground">
                {eth.toLocaleString(undefined, { maximumFractionDigits: 6 })}
              </span>
            </p>
            <p className="mt-1">
              WETH{" "}
              <span className="num font-medium text-foreground">
                {weth.toLocaleString(undefined, { maximumFractionDigits: 6 })}
              </span>
            </p>
            {treasury.data?.explorerAddressUrl ? (
              <a
                href={treasury.data.explorerAddressUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary"
              >
                Explorer <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        </div>

        {/* Badges */}
        <div className="relative mt-5 flex flex-wrap items-center gap-2">
          {seat != null ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
              Seat #{seat}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-foreground/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Seat pending
            </span>
          )}
          {perks ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]",
                perks.tier === "none"
                  ? "border-border/50 bg-foreground/5 text-muted-foreground"
                  : "border-gold/35 bg-gold/12 text-gold",
              )}
            >
              <Sparkles className="h-3 w-3" />
              {perks.tierLabel}
              {perks.auraBalance > 0 ? (
                <span className="num font-normal opacity-80">
                  · {perks.auraBalance.toLocaleString()} {perks.symbol}
                </span>
              ) : null}
            </span>
          ) : null}
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]",
              genesisMinted
                ? "border-gold/40 bg-gold/15 text-gold"
                : "border-border/50 bg-foreground/5 text-muted-foreground",
            )}
          >
            <picture>
              <source srcSet={GENESIS_ART} type="image/webp" />
              <img
                src={GENESIS_ART_JPG}
                alt=""
                title="Aura Genesis Passport"
                width={22}
                height={22}
                decoding="async"
                className="h-[22px] w-[22px] rounded-full object-cover"
              />
            </picture>
            {genesisMinted ? "Genesis Passport" : "Genesis available"}
          </span>
          {perks?.perks
            .filter((p) => p.active)
            .slice(0, 3)
            .map((p) => (
              <span
                key={p.id}
                className="rounded-full border border-border/40 bg-foreground/[0.04] px-2.5 py-1 text-[10px] font-medium text-muted-foreground"
                title={p.description}
              >
                {p.label}
              </span>
            ))}
        </div>

        {/* Action bar */}
        <div className="relative mt-6 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {(
            [
              { id: "receive" as const, label: "Receive", icon: ArrowDownLeft },
              { id: "send" as const, label: "Send", icon: ArrowUpRight },
              { id: "exchange" as const, label: "Exchange", icon: ArrowLeftRight },
              { id: "grow" as const, label: "Grow", icon: Sprout },
              { id: "activity" as const, label: "Activity", icon: History },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => openTab(id)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl px-3 py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors",
                tab === id
                  ? "bg-primary text-primary-foreground"
                  : "bg-foreground/6 text-muted-foreground hover:bg-foreground/10 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Holdings */}
      <Panel label="Liquid holdings">
        <p className="mb-3 text-[12px] text-muted-foreground">
          Only cash sitting in the wallet. Money in Aave or pools lives under{" "}
          <button
            type="button"
            onClick={() => openTab("grow")}
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            Grow
          </button>
          .
        </p>
        <div className="divide-y divide-border/40">
          {(
            [
              {
                key: "usdc",
                label: "USDC",
                amount: usdc,
                hint:
                  Number(yieldQ.data?.openNotional ?? 0) >= 0.5
                    ? "Liquid only — more may be earning in Grow"
                    : "Trading desk cash",
              },
              { key: "eth", label: nativeSym, amount: eth, hint: "Native · gas + convert" },
              { key: "weth", label: "WETH", amount: weth, hint: "Desk inventory" },
            ] as const
          ).map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gold/12 text-gold">
                  <Wallet className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold">{row.label}</p>
                  <p className="text-[11px] text-muted-foreground">{row.hint}</p>
                </div>
              </div>
              <p className="num text-[15px] font-semibold">
                {row.amount.toLocaleString(undefined, {
                  minimumFractionDigits: row.key === "usdc" ? 2 : 0,
                  maximumFractionDigits: row.key === "usdc" ? 4 : 6,
                })}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      {tab === "grow" ? (
        <WalletGrowPanel cashUsdc={usdc} eth={eth} weth={weth} nativeSymbol={nativeSym} />
      ) : null}

      {tab === "receive" ? (
        <WalletReceivePanel
          address={address}
          networkLabel={networkLabel}
          nativeSym={nativeSym}
          qrUrl={qrUrl}
          copied={copied}
          depositHint={treasury.data?.depositHint}
          onCopy={() => void copyAddress()}
        />
      ) : null}

      {tab === "send" ? (
        <WalletSendPanel
          networkLabel={networkLabel}
          nativeSym={nativeSym}
          sendAsset={sendAsset}
          sendAssetLabel={sendAssetLabel}
          sendBalance={sendBalance}
          sendTo={sendTo}
          sendAmount={sendAmount}
          sendConfirm={sendConfirm}
          sendPending={send.isPending}
          fioReady={fio.ready}
          gasSponsored={Boolean(treasury.data?.sponsored || okx.data?.gasSponsored)}
          onAsset={(a) => {
            setSendAsset(a);
            setSendConfirm(false);
          }}
          onTo={(v) => {
            setSendTo(v);
            setSendConfirm(false);
          }}
          onAmount={(v) => {
            setSendAmount(v);
            setSendConfirm(false);
          }}
          onMax={() => {
            setSendAmount("max");
            setSendConfirm(false);
          }}
          onReview={() => setSendConfirm(true)}
          onConfirm={() => send.mutate()}
          onCancel={() => setSendConfirm(false)}
        />
      ) : null}

      {tab === "exchange" ? (
        <WalletExchangePanel
          networkLabel={networkLabel}
          nativeSym={nativeSym}
          configured={Boolean(okx.data?.configured)}
          gasSponsored={Boolean(okx.data?.gasSponsored)}
          gasHint={okx.data?.gasHint}
          swapFrom={swapFrom}
          swapTo={swapTo}
          swapAmount={swapAmount}
          quotePreview={quotePreview}
          swapConfirm={swapConfirm}
          quotePending={quote.isPending}
          swapPending={swap.isPending}
          eth={eth}
          usdc={usdc}
          weth={weth}
          onFrom={onSwapFromChange}
          onTo={(to) => {
            setSwapTo(to);
            setQuotePreview(null);
            setSwapConfirm(false);
          }}
          onAmount={(v) => {
            setSwapAmount(v);
            setQuotePreview(null);
            setSwapConfirm(false);
          }}
          onMax={() => {
            setSwapAmount("max");
            setQuotePreview(null);
            setSwapConfirm(false);
          }}
          onQuote={() => {
            setSwapConfirm(false);
            quote.mutate();
          }}
          onReview={() => setSwapConfirm(true)}
          onConfirm={(direction) => swap.mutate(direction)}
          onCancel={() => setSwapConfirm(false)}
        />
      ) : null}

      {tab === "activity" ? (
        <WalletActivityPanel
          filter={activityFilter}
          items={filteredActivity}
          loading={activity.isLoading}
          onFilter={setActivityFilter}
          onRefresh={() => {
            void treasury.refetch();
            void activity.refetch();
          }}
        />
      ) : null}

      {handleId ? (
        <WalletExportPanel
          handleId={handleId}
          smartWalletAddress={address}
          ownerAddress={(wallet as { owner_address?: string | null } | null)?.owner_address}
        />
      ) : null}
    </div>
  );
}
