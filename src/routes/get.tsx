import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AuraFairlaunchStore, type FairlaunchWay } from "@/components/aura/aura-fairlaunch-store";
import { AuraTokenIdentity } from "@/components/aura/aura-token-identity";
import { LanguageToggle } from "@/components/aura/language-toggle";
import { LaunchCountdown } from "@/components/aura/launch-countdown";
import { PulseOrbit } from "@/components/aura/pulse-orbit";
import { SiteFooter } from "@/components/aura/site-footer";
import { useLocale } from "@/hooks/use-locale";
import { AURA_GET_COPY } from "@/lib/aura-fairlaunch";
import { pageHead } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

const TITLE = "Get AURA — smart wallet or your wallet";
const DESCRIPTION =
  "Two ways to buy AURA on the official Base book: a free Aura smart wallet plus card, or the wallet you already have. Official CA only on this site. Never by DM.";

function isWay(value: unknown): value is FairlaunchWay {
  return value === "smart" || value === "wallet";
}

export const Route = createFileRoute("/get")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { checkout?: "success" | "cancel"; way?: FairlaunchWay } => ({
    ...(search["checkout"] === "success" || search["checkout"] === "cancel"
      ? { checkout: search["checkout"] as "success" | "cancel" }
      : {}),
    ...(isWay(search["way"]) ? { way: search["way"] } : {}),
  }),
  head: () =>
    pageHead({
      title: TITLE,
      description: DESCRIPTION,
      path: "/get",
      jsonLd: {
        "@type": "WebPage",
        name: TITLE,
        description: DESCRIPTION,
        url: `${SITE_URL}/get`,
      },
    }),
  component: GetAuraPage,
});

function GetAuraPage() {
  const { locale } = useLocale();
  const de = locale === "de";
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/get" });
  const [way, setWay] = useState<FairlaunchWay>(search.way ?? "smart");

  useEffect(() => {
    if (isWay(search.way) && search.way !== way) setWay(search.way);
  }, [search.way, way]);

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <header className="relative border-b border-border/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <PulseOrbit size="sm" label={false} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              AURA
            </span>
          </Link>
          <nav className="ml-auto hidden flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] md:flex">
            <Link to="/token" className="text-muted-foreground hover:text-foreground">
              Token
            </Link>
            <Link to="/trust" className="text-muted-foreground hover:text-foreground">
              {de ? "Bund" : "Covenant"}
            </Link>
          </nav>
          <LanguageToggle />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          {de ? AURA_GET_COPY.kickerDe : AURA_GET_COPY.kicker}
        </p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight">
          {de ? AURA_GET_COPY.titleDe : AURA_GET_COPY.title}
        </h1>
        <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-muted-foreground">
          {de ? AURA_GET_COPY.leadDe : AURA_GET_COPY.lead}
        </p>

        <div className="mt-8">
          <LaunchCountdown variant="compact" showSocials={false} placement="get" />
        </div>

        {search.checkout === "success" ? (
          <p className="mt-6 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-[13px]">
            {de ? AURA_GET_COPY.paidDe : AURA_GET_COPY.paid}
          </p>
        ) : null}
        {search.checkout === "cancel" ? (
          <p className="mt-6 rounded-2xl border border-border/40 px-4 py-3 text-[13px] text-muted-foreground">
            {de ? AURA_GET_COPY.canceledDe : AURA_GET_COPY.canceled}
          </p>
        ) : null}

        <div className="mt-10">
          <AuraFairlaunchStore
            de={de}
            way={way}
            onWay={(next) => {
              setWay(next);
              void navigate({
                search: (prev) => ({ ...prev, way: next }),
                replace: true,
              });
            }}
          />
        </div>

        <div className="mt-12">
          <AuraTokenIdentity de={de} compact />
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
