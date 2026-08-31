import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { parseUnits } from "viem";
import { base } from "viem/chains";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { LanguageToggle } from "@/components/aura/language-toggle";
import { PublicMobileMenu, publicPrimaryNav } from "@/components/aura/public-mobile-menu";
import { SaleWalletRoot } from "@/components/aura/sale-wallet";
import { useLocale } from "@/hooks/use-locale";
import { auraLaunchTreasuryAddress } from "@/lib/aura-token";
import { BUILDING_CULTURE_PRODUCTS } from "@/lib/building-culture";
import { num } from "@/lib/format";
import {
  BASE_USDC,
  ERC20_ABI,
  PAURA_SYMBOL,
  PRIVATE_SALE_ABI,
  PRIVATE_SALE_MIN_USDC,
  PRIVATE_SALE_TREASURY,
  pAuraToLaunchAura,
  privateSaleBasescan,
  privateSaleContractAddress,
  usdcToPAura,
} from "@/lib/private-sale";
import { getPrivateSaleLive } from "@/lib/private-sale.functions";
import { OG_CAMPAIGN, ogCampaignUrl } from "@/lib/og-campaign";
import { pageHead } from "@/lib/seo";

const TITLE = "AURA Private Sale — pAURA";
const DESCRIPTION =
  "Buy pAURA on Base before AURA launches. 1 pAURA becomes 1.11 AURA at Clanker T-0.";

export const Route = createFileRoute("/sale")({
  loader: async () => {
    const { withTimeout } = await import("@/lib/timeout-helper");
    return withTimeout(getPrivateSaleLive(), 8000, {
      configured: false,
      address: null,
      sold: 0,
      remaining: 0,
      cap: 0,
      usdcRaised: 0,
      saleClosed: false,
      paused: false,
    });
  },
  head: () =>
    pageHead({
      title: TITLE,
      description: DESCRIPTION,
      path: "/sale",
      image: ogCampaignUrl("token"),
      imageAlt: OG_CAMPAIGN.token.alt,
      noIndex: true,
    }),
  component: SaleRoute,
});

function SaleRoute() {
  return (
    <SaleWalletRoot>
      <SalePage />
    </SaleWalletRoot>
  );
}

function SalePage() {
  const { t, locale } = useLocale();
  const live = Route.useLoaderData();
  const [copied, setCopied] = useState(false);

  const liveQ = useQuery({
    queryKey: ["private-sale-live"],
    queryFn: () => getPrivateSaleLive(),
    initialData: live,
    refetchInterval: 20_000,
  });
  const stats = liveQ.data ?? live;
  const contract = privateSaleContractAddress();

  const copyTreasury = async () => {
    try {
      await navigator.clipboard.writeText(PRIVATE_SALE_TREASURY);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 10% -10%, oklch(0.55 0.1 200 / 0.2), transparent 55%), radial-gradient(ellipse 50% 40% at 95% 5%, oklch(0.75 0.12 85 / 0.12), transparent 50%)",
        }}
      />
      <header className="relative border-b border-border/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-5 py-4">
          <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("sale.kicker")}
          </p>
          <LanguageToggle className="ml-auto" />
          <Link
            to="/tokenomics"
            className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:inline"
          >
            {t("sale.tokenomics")}
          </Link>
          <PublicMobileMenu items={publicPrimaryNav(t)} hideFrom="sm" />
        </div>
      </header>

      <div className="relative mx-auto w-full max-w-lg space-y-8 px-5 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <header>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
            {t("sale.notAura")}
          </p>
          <h1 className="mt-3 font-display text-[clamp(2rem,8vw,3.2rem)] font-semibold leading-[0.98] tracking-tight">
            {t("sale.title")}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{t("sale.lead")}</p>
        </header>

        <ol className="space-y-4">
          {[
            { n: "01", title: t("sale.step1Title"), body: t("sale.step1Body") },
            { n: "02", title: t("sale.step2Title"), body: t("sale.step2Body") },
            { n: "03", title: t("sale.step3Title"), body: t("sale.step3Body") },
          ].map((step) => (
            <li
              key={step.n}
              className="rounded-2xl border border-border/40 bg-foreground/[0.03] p-4"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                {step.n} · {step.title}
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>

        <section className="rounded-3xl border border-gold/35 bg-gold/[0.07] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
            {t("sale.trustKicker")}
          </p>
          <h2 className="mt-2 font-display text-[clamp(1.45rem,6vw,2rem)] font-semibold leading-[1.05] tracking-tight">
            {t("sale.trustTitle")}
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-foreground/85">
            {t("sale.trustLead")}
          </p>
          <ul className="mt-5 space-y-4">
            {[
              { title: t("sale.trustFairTitle"), body: t("sale.trustFairBody") },
              { title: t("sale.trustLockTitle"), body: t("sale.trustLockBody") },
              { title: t("sale.trustSupplyTitle"), body: t("sale.trustSupplyBody") },
              { title: t("sale.trustHonestTitle"), body: t("sale.trustHonestBody") },
            ].map((item) => (
              <li
                key={item.title}
                className="rounded-2xl border border-gold/20 bg-background/40 p-4"
              >
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-gold">
                  {item.title}
                </p>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-primary/25 bg-foreground/[0.03] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
            {t("sale.buildersKicker")}
          </p>
          <h2 className="mt-2 font-display text-[clamp(1.45rem,6vw,2rem)] font-semibold leading-[1.05] tracking-tight">
            {t("sale.buildersTitle")}
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
            {t("sale.buildersLead")}
          </p>
          <ul className="mt-5 space-y-3">
            {BUILDING_CULTURE_PRODUCTS.map((product) => (
              <li key={product.id}>
                <a
                  href={product.href}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-2xl border border-border/40 bg-background/50 p-4 transition-colors hover:border-primary/40"
                >
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-primary">
                    {locale === "de" ? product.titleDe : product.title}
                  </p>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                    {locale === "de" ? product.blurbDe : product.blurb}
                  </p>
                  <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">
                    {t("sale.buildersOpen")} · {product.href.replace(/^https?:\/\//, "")}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid grid-cols-3 gap-2">
          <Stat label={t("sale.statsSold")} value={num(Math.floor(stats.sold))} />
          <Stat label={t("sale.statsLeft")} value={num(Math.floor(stats.remaining || stats.cap))} />
          <Stat label={t("sale.statsRaised")} value={`$${num(Math.floor(stats.usdcRaised))}`} />
        </div>

        {stats.saleClosed ? (
          <p className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm">
            {t("sale.closed")}
          </p>
        ) : null}
        {stats.paused ? (
          <p className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm">
            {t("sale.paused")}
          </p>
        ) : null}
        {!contract ? (
          <p className="rounded-2xl border border-border/40 px-4 py-3 text-sm text-muted-foreground">
            {t("sale.notConfigured")}
          </p>
        ) : (
          <BuyCard disabled={stats.saleClosed || stats.paused} />
        )}

        <section className="rounded-2xl border border-border/40 p-4">
          <h2 className="font-display text-lg font-semibold">{t("sale.cashTitle")}</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            {t("sale.cashBody")}
          </p>
        </section>

        <section className="rounded-2xl border border-gold/30 bg-gold/[0.06] p-4">
          <h2 className="font-display text-lg font-semibold">{t("sale.projectLockTitle")}</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            {t("sale.projectLockBody")}
          </p>
        </section>

        <section className="rounded-2xl border border-border/40 p-4">
          <h2 className="font-display text-lg font-semibold">{t("sale.treasuryTitle")}</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            {t("sale.treasuryBody")}
          </p>
          <a
            href={privateSaleBasescan(`/address/${PRIVATE_SALE_TREASURY}`)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block break-all font-mono text-[12px] text-primary"
          >
            {PRIVATE_SALE_TREASURY}
          </a>
          <button
            type="button"
            onClick={() => void copyTreasury()}
            className="mt-3 rounded-2xl border border-border/50 px-4 py-2 text-xs font-semibold"
          >
            {copied ? t("sale.copied") : t("sale.copy")}
          </button>
        </section>

        <section className="rounded-2xl border border-border/40 p-4">
          <h2 className="font-display text-lg font-semibold">{t("sale.launchTreasuryTitle")}</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            {t("sale.launchTreasuryBody")}
          </p>
          {auraLaunchTreasuryAddress() ? (
            <a
              href={privateSaleBasescan(`/address/${auraLaunchTreasuryAddress()}`)}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block break-all font-mono text-[12px] text-primary"
            >
              {auraLaunchTreasuryAddress()}
            </a>
          ) : (
            <p className="mt-3 font-mono text-[12px] text-muted-foreground">
              {t("sale.launchTreasuryPending")}
            </p>
          )}
        </section>

        <p className="text-[12px] leading-relaxed text-muted-foreground">{t("sale.disclaimer")}</p>
        {contract ? (
          <a
            href={privateSaleBasescan(`/token/${contract}`)}
            target="_blank"
            rel="noreferrer"
            className="block font-mono text-[11px] text-muted-foreground"
          >
            {PAURA_SYMBOL} · {contract}
          </a>
        ) : null}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/40 px-3 py-3">
      <p className="num text-lg font-semibold">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    </div>
  );
}

function BuyCard({ disabled }: { disabled: boolean }) {
  const { t } = useLocale();
  const contract = privateSaleContractAddress();
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const [amount, setAmount] = useState(String(PRIVATE_SALE_MIN_USDC));
  const usdc = Number(amount);
  const preview = useMemo(() => usdcToPAura(usdc), [usdc]);
  const launch = useMemo(() => pAuraToLaunchAura(preview), [preview]);
  const usdcRaw = Number.isFinite(usdc) && usdc > 0 ? parseUnits(String(usdc), 6) : 0n;

  const allowance = useReadContract({
    address: BASE_USDC,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && contract ? [address, contract] : undefined,
    query: { enabled: Boolean(address && contract) },
  });
  const usdcBal = useReadContract({
    address: BASE_USDC,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const approve = useWriteContract();
  const buy = useWriteContract();
  const pendingHash = approve.data ?? buy.data;
  const wait = useWaitForTransactionReceipt({ hash: pendingHash });

  const needsApprove = Boolean(contract && usdcRaw > 0n && (allowance.data ?? 0n) < usdcRaw);
  const onBase = chainId === base.id;
  const busy = connecting || switching || approve.isPending || buy.isPending || wait.isLoading;

  const run = useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error("Contract missing");
      if (!onBase) {
        switchChain({ chainId: base.id });
        return;
      }
      if (needsApprove) {
        return approve.writeContractAsync({
          address: BASE_USDC,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [contract, usdcRaw],
        });
      }
      return buy.writeContractAsync({
        address: contract,
        abi: PRIVATE_SALE_ABI,
        functionName: "buy",
        args: [usdcRaw],
      });
    },
  });

  return (
    <section className="rounded-3xl border border-primary/25 bg-foreground/[0.03] p-5">
      <h2 className="font-display text-xl font-semibold">{t("sale.buyTitle")}</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{t("sale.buyHint")}</p>
      <p className="mt-2 text-[12px] text-muted-foreground">{t("sale.needUsdc")}</p>

      <label className="mt-5 block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {t("sale.amount")}
      </label>
      <input
        type="number"
        min={PRIVATE_SALE_MIN_USDC}
        step="1"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="mt-2 w-full rounded-2xl border border-border/50 bg-background px-4 py-3 text-base"
      />
      {preview > 0 ? (
        <p className="mt-2 text-[13px] text-muted-foreground">
          {t("sale.youGet", { paura: num(Math.round(preview)), launch: num(Math.round(launch)) })}
        </p>
      ) : null}
      {usdcBal.data != null ? (
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          USDC {Number(usdcBal.data) / 1e6}
        </p>
      ) : null}

      {!isConnected ? (
        <div className="mt-5">
          <button
            type="button"
            disabled={connecting}
            onClick={() => connect({ connector: connectors[0] })}
            className="w-full rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {connecting ? t("sale.connecting") : t("sale.connect")}
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          <p className="break-all font-mono text-[11px] text-muted-foreground">{address}</p>
          {!onBase ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => switchChain({ chainId: base.id })}
              className="w-full rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              {t("sale.switchBase")}
            </button>
          ) : (
            <button
              type="button"
              disabled={disabled || busy || usdc < PRIVATE_SALE_MIN_USDC}
              onClick={() => run.mutate()}
              className="w-full rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? t("sale.buying") : needsApprove ? t("sale.approve") : t("sale.buy")}
            </button>
          )}
          <button
            type="button"
            onClick={() => disconnect()}
            className="w-full rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
          >
            {t("sale.disconnect")}
          </button>
        </div>
      )}
      {run.error ? (
        <p className="mt-3 text-[13px] text-red-400">
          {run.error instanceof Error ? run.error.message : "Error"}
        </p>
      ) : null}
    </section>
  );
}
