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
import { WalletGrowPanel, WalletWorkingHint } from "@/components/aura/wallet-grow-panel";
import { useCompany } from "@/hooks/use-aura";
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
  type TreasuryActivityItem,
  type TreasurySendAsset,
} from "@/lib/treasury.functions";
import type { HolderPerks } from "@/lib/trading/holder-perks";
import { NATIVE_ETH, WETH_ADDRESSES } from "@/lib/trading/tokens";
import { currency, timeAgo } from "@/lib/format";
import { mediaPath } from "@/lib/site";
import { cn } from "@/lib/utils";

const GENESIS_ART = mediaPath("/genesis-passport.webp");
const GENESIS_ART_JPG = mediaPath("/genesis-passport.jpg");

type DeskTab = "receive" | "send" | "exchange" | "activity" | "grow" | null;

type SwapLeg = "eth" | "usdc" | "weth";

const SWAP_ROUTES: { from: SwapLeg; to: SwapLeg; direction: TreasurySwapDirection }[] = [
  { from: "eth", to: "usdc", direction: "eth_to_usdc" },
  { from: "eth", to: "weth", direction: "eth_to_weth" },
  { from: "weth", to: "usdc", direction: "weth_to_usdc" },
  { from: "weth", to: "eth", direction: "weth_to_eth" },
  { from: "usdc", to: "eth", direction: "usdc_to_eth" },
  { from: "usdc", to: "weth", direction: "usdc_to_weth" },
];

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
  return <ArrowLeftRight className="h-3.5 w-3.5 text-primary" />;
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function parseUiAmountToWeiString(raw: string, decimals: number): string | null {
  const cleaned = raw.trim().replace(/,/g, "");
  if (!cleaned || cleaned.toLowerCase() === "max") return null;
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  const wei = BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(fracPadded || "0");
  return wei.toString();
}

function formatTokenAmount(raw: string, decimals: number, maxFrac = 6): string {
  try {
    const wei = BigInt(raw);
    const base = 10n ** BigInt(decimals);
    const whole = wei / base;
    const frac = wei % base;
    if (frac === 0n) return whole.toString();
    const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "").slice(0, maxFrac);
    return fracStr ? `${whole}.${fracStr}` : whole.toString();
  } catch {
    return raw;
  }
}

export function WalletDesk({
  seat,
  perks,
}: {
  seat?: number | null;
  perks?: HolderPerks;
}) {
  const qc = useQueryClient();
  const { data: handle } = useMyHandle();
  const handleId = handle?.id;
  const { data: wallet, isLoading: walletLoading } = useSmartWallet(handleId);
  const provision = useProvisionSmartWallet();
  const { data: company } = useCompany();

  const [tab, setTab] = useState<DeskTab>(null);
  const [copied, setCopied] = useState(false);
  const [activityFilter, setActivityFilter] = useState<"all" | "in" | "out" | "trade">("all");

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
        res.toLabel === "eth"
          ? (treasury.data?.nativeSymbol ?? "ETH")
          : res.toLabel.toUpperCase();
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

  const sendBalance =
    sendAsset === "usdc" ? usdc : sendAsset === "eth" ? eth : weth;
  const sendAssetLabel =
    sendAsset === "usdc" ? stableSym : sendAsset === "eth" ? nativeSym : "WETH";

  return (
    <div className="space-y-5">
      <DeskChainSwitcher
        invalidateKeys={[["treasury-activity"], ["trading-readiness"], ["yield-desk"]]}
      />
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
              <Chip tone={deployed ? "primary" : "neutral"}>
                {deployed ? "On-chain" : "Ready"}
              </Chip>
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
              {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
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
            <div key={row.key} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
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

      {/* Receive */}
      {tab === "receive" ? (
        <Panel label="Receive" glow>
          <p className="text-[13px] text-muted-foreground">
            Send {nativeSym}, USDC, or WETH on <span className="font-semibold text-foreground">{networkLabel}</span> only.
            Wrong network = lost funds.
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
              onClick={() => void copyAddress()}
              className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-foreground/8 text-muted-foreground hover:text-primary"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          {treasury.data?.depositHint ? (
            <p className="mt-3 text-[12px] text-muted-foreground">{treasury.data.depositHint}</p>
          ) : null}
        </Panel>
      ) : null}

      {/* Send */}
      {tab === "send" ? (
        <Panel label="Send / withdraw" glow>
          <p className="text-[13px] text-muted-foreground">
            Withdraw to any {networkLabel} address. Irreversible — double-check the destination.
          </p>
          {!treasury.data?.sponsored && !okx.data?.gasSponsored ? (
            <p className="mt-3 rounded-2xl bg-gold/10 px-3 py-2 text-[12px] text-gold">
              Keep a little {nativeSym} for gas — token sends need ~0.001 {nativeSym} when
              sponsorship is off.
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {(["usdc", "eth", "weth"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => {
                  setSendAsset(a);
                  setSendConfirm(false);
                }}
                className={cn(
                  "rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em]",
                  sendAsset === a ? "bg-primary text-primary-foreground" : "bg-foreground/8 text-muted-foreground",
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
              onChange={(e) => {
                setSendTo(e.target.value);
                setSendConfirm(false);
              }}
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
                onChange={(e) => {
                  setSendAmount(e.target.value);
                  setSendConfirm(false);
                }}
                placeholder="0.0 or max"
                className="min-w-0 flex-1 rounded-2xl border border-border/50 bg-background/60 px-4 py-3 font-mono text-sm outline-none focus:border-primary/50"
              />
              <button
                type="button"
                onClick={() => {
                  setSendAmount("max");
                  setSendConfirm(false);
                }}
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
                setSendConfirm(true);
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
                  disabled={send.isPending}
                  onClick={() => send.mutate()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Confirm & broadcast
                </button>
                <button
                  type="button"
                  disabled={send.isPending}
                  onClick={() => setSendConfirm(false)}
                  className="rounded-2xl bg-foreground/8 px-4 py-3 text-sm font-semibold text-muted-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Panel>
      ) : null}

      {/* Exchange */}
      {tab === "exchange" ? (
        <Panel label="Exchange" glow>
          <p className="text-[13px] text-muted-foreground">
            Convert via OKX DEX from your Light Account. Desk uses USDC / WETH — convert {nativeSym}{" "}
            before trading.
          </p>
          {!okx.data?.configured ? (
            <p className="mt-3 text-[12px] text-muted-foreground">
              OKX rails are not configured — deposit USDC directly for now.
            </p>
          ) : (
            <>
              {!okx.data.gasSponsored ? (
                <p className="mt-3 rounded-2xl bg-gold/10 px-3 py-2 text-[12px] leading-relaxed text-gold">
                  Not a hidden exchange fee: Alchemy gas sponsorship is off, so we leave a tiny{" "}
                  {nativeSym} cushion (~$0.20–0.30) when you convert max — Base gas itself is
                  usually cents. Set{" "}
                  <span className="font-mono text-[11px]">ALCHEMY_GAS_POLICY_ID_BASE</span> on
                  the server for gasless swaps.
                  {okx.data.gasHint ? (
                    <>
                      {" "}
                      ({okx.data.gasHint})
                    </>
                  ) : null}
                </p>
              ) : null}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  From
                  <select
                    value={swapFrom}
                    onChange={(e) => onSwapFromChange(e.target.value as SwapLeg)}
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
                    onChange={(e) => {
                      setSwapTo(e.target.value as SwapLeg);
                      setQuotePreview(null);
                      setSwapConfirm(false);
                    }}
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
                    onChange={(e) => {
                      setSwapAmount(e.target.value);
                      setQuotePreview(null);
                      setSwapConfirm(false);
                    }}
                    placeholder="max"
                    className="min-w-0 flex-1 rounded-2xl border border-border/50 bg-background/60 px-4 py-3 font-mono text-sm outline-none focus:border-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSwapAmount("max");
                      setQuotePreview(null);
                      setSwapConfirm(false);
                    }}
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
                  disabled={quote.isPending || !swapRoute}
                  onClick={() => {
                    setSwapConfirm(false);
                    quote.mutate();
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-foreground/8 px-4 py-3 text-sm font-semibold disabled:opacity-45"
                >
                  {quote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Quote
                </button>
                {!swapConfirm ? (
                  <button
                    type="button"
                    disabled={
                      swap.isPending ||
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
                      setSwapConfirm(true);
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
                      disabled={swap.isPending}
                      onClick={() => swap.mutate(swapRoute.direction)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {swap.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Confirm & broadcast
                    </button>
                    <button
                      type="button"
                      disabled={swap.isPending}
                      onClick={() => setSwapConfirm(false)}
                      className="rounded-2xl bg-foreground/8 px-4 py-3 text-sm font-semibold text-muted-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
              <Link to="/trading" className="mt-4 inline-block text-[12px] font-semibold text-primary hover:underline">
                Open trading desk →
              </Link>
            </>
          )}
        </Panel>
      ) : null}

      {/* Activity */}
      {tab === "activity" ? (
        <Panel
          label="Activity"
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
                onClick={() => setActivityFilter(f.id)}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                  activityFilter === f.id
                    ? "bg-primary/14 text-primary"
                    : "bg-foreground/6 text-muted-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          {activity.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filteredActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No activity yet. Receive funds or run an exchange — it shows here.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredActivity.map((item) => (
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
      ) : null}
    </div>
  );
}
