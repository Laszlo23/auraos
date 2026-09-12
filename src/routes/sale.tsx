import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";

import { AuraOfficialTape } from "@/components/aura/aura-official-tape";
import { AuraTokenIdentity } from "@/components/aura/aura-token-identity";
import { LanguageToggle } from "@/components/aura/language-toggle";
import { LaunchCountdown } from "@/components/aura/launch-countdown";
import {
  PublicMobileMenu,
  publicNavMore,
  publicNavPrimary,
} from "@/components/aura/public-site-header";
import { useLocale } from "@/hooks/use-locale";
import { auraLaunchTreasuryAddress } from "@/lib/aura-token";
import { BUILDING_CULTURE_PRODUCTS } from "@/lib/building-culture";
import { num } from "@/lib/format";
import {
  PAURA_SYMBOL,
  PLATFORM_RAILS_TREASURY,
  privateSaleBasescan,
  privateSaleContractAddress,
} from "@/lib/private-sale";
import { getPrivateSaleLive } from "@/lib/private-sale.functions";
import { OG_CAMPAIGN, ogCampaignUrl } from "@/lib/og-campaign";
import { pageHead } from "@/lib/seo";
import { visibleRefetchInterval } from "@/hooks/use-aura";

const TITLE = "AURA Private Sale — pAURA";
const DESCRIPTION =
  "Buy pAURA on Base before AURA launches. 1 pAURA becomes 1.11 AURA at Uniswap v4 T-0.";

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
    }),
  component: SaleRoute,
});

const SaleWalletIsland = lazy(() =>
  import("@/components/aura/sale-wallet-island").then((m) => ({ default: m.SaleWalletIsland })),
);

function SaleRoute() {
  return <SalePage />;
}

function SalePage() {
  const { t, locale } = useLocale();
  const live = Route.useLoaderData();
  const [copied, setCopied] = useState<"official" | "rails" | null>(null);
  const officialTreasury = auraLaunchTreasuryAddress();

  const liveQ = useQuery({
    queryKey: ["private-sale-live"],
    queryFn: () => getPrivateSaleLive(),
    initialData: live,
    refetchInterval: visibleRefetchInterval(20_000),
  });
  const stats = liveQ.data ?? live;
  const contract = privateSaleContractAddress();

  const copyAddress = async (which: "official" | "rails") => {
    try {
      await navigator.clipboard.writeText(
        which === "official" ? officialTreasury : PLATFORM_RAILS_TREASURY,
      );
      setCopied(which);
      window.setTimeout(() => setCopied(null), 1600);
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
          <PublicMobileMenu primary={publicNavPrimary(t)} more={publicNavMore(t)} hideFrom="sm" />
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
          <div className="mt-5">
            <LaunchCountdown variant="compact" showSocials={false} placement="sale" />
          </div>
          <div className="mt-5">
            <AuraTokenIdentity de={locale === "de"} compact />
          </div>
        </header>

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
          <Suspense
            fallback={
              <section className="rounded-3xl border border-border/40 p-5 text-[13px] text-muted-foreground">
                {t("sale.loadingWallet")}
              </section>
            }
          >
            <SaleWalletIsland
              disabled={stats.saleClosed || stats.paused}
              locale={locale === "de" ? "de" : "en"}
            />
          </Suspense>
        )}

        <section className="rounded-2xl border border-border/40 p-4">
          <h2 className="font-display text-lg font-semibold">{t("sale.cashTitle")}</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            {t("sale.cashBody")}
          </p>
        </section>

        <details className="rounded-3xl border border-gold/35 bg-gold/[0.07] p-5">
          <summary className="cursor-pointer font-display text-lg font-semibold">
            {t("sale.moreTruth")}
          </summary>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
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
        </details>

        <details className="rounded-3xl border border-primary/25 bg-foreground/[0.03] p-5">
          <summary className="cursor-pointer font-display text-lg font-semibold">
            {t("sale.moreProducts")}
          </summary>
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
        </details>

        <details className="rounded-3xl border border-gold/30 bg-gold/[0.06] p-5">
          <summary className="cursor-pointer font-display text-lg font-semibold">
            {t("sale.moreMoney")}
          </summary>
          <section className="mt-4">
            <h2 className="font-display text-lg font-semibold">{t("sale.projectLockTitle")}</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              {t("sale.projectLockBody")}
            </p>
          </section>
        <section className="mt-5 rounded-2xl border border-gold/30 bg-gold/[0.06] p-4">
          <h2 className="font-display text-lg font-semibold">{t("sale.treasuryTitle")}</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            {t("sale.treasuryBody")}
          </p>
          <a
            href={privateSaleBasescan(`/address/${officialTreasury}`)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block break-all font-mono text-[12px] text-primary"
          >
            {officialTreasury}
          </a>
          <button
            type="button"
            onClick={() => void copyAddress("official")}
            className="mt-3 rounded-2xl border border-border/50 px-4 py-2 text-xs font-semibold"
          >
            {copied === "official" ? t("sale.copied") : t("sale.copy")}
          </button>
        </section>

        <section className="rounded-2xl border border-border/40 p-4">
          <h2 className="font-display text-lg font-semibold">{t("sale.railsTitle")}</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            {t("sale.railsBody")}
          </p>
          <a
            href={privateSaleBasescan(`/address/${PLATFORM_RAILS_TREASURY}`)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block break-all font-mono text-[12px] text-primary"
          >
            {PLATFORM_RAILS_TREASURY}
          </a>
          <button
            type="button"
            onClick={() => void copyAddress("rails")}
            className="mt-3 rounded-2xl border border-border/50 px-4 py-2 text-xs font-semibold"
          >
            {copied === "rails" ? t("sale.copied") : t("sale.copyRails")}
          </button>
        </section>
        </details>

        <AuraOfficialTape de={locale === "de"} />

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
