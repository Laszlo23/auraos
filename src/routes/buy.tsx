import { createFileRoute, Link } from "@tanstack/react-router";

import { AuraBuyGuide } from "@/components/aura/aura-buy-guide";
import { AuraTokenIdentity } from "@/components/aura/aura-token-identity";
import { LanguageToggle } from "@/components/aura/language-toggle";
import { PulseOrbit } from "@/components/aura/pulse-orbit";
import {
  PublicMobileMenu,
  publicNavMore,
  publicNavPrimary,
} from "@/components/aura/public-site-header";
import { SiteFooter } from "@/components/aura/site-footer";
import { useLocale } from "@/hooks/use-locale";
import { AURA_BUY_COPY } from "@/lib/aura-buy-guide";
import { pageHead } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

const TITLE = "Buy AURA — card, Base Wallet, or browser";
const DESCRIPTION =
  "Three ways to get AURA after T-0: card plus Aura smart wallet, Base App on the phone, or a browser wallet plus Binance. Official CA only on this site. Never by DM.";

export const Route = createFileRoute("/buy")({
  validateSearch: (search: Record<string, unknown>): { checkout?: "success" | "cancel" } => ({
    ...(search["checkout"] === "success" || search["checkout"] === "cancel"
      ? { checkout: search["checkout"] as "success" | "cancel" }
      : {}),
  }),
  head: () =>
    pageHead({
      title: TITLE,
      description: DESCRIPTION,
      path: "/buy",
      jsonLd: {
        "@type": "WebPage",
        name: TITLE,
        description: DESCRIPTION,
        url: `${SITE_URL}/buy`,
      },
    }),
  component: BuyPage,
});

function BuyPage() {
  const { locale, t } = useLocale();
  const de = locale === "de";
  const search = Route.useSearch();

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <header className="relative border-b border-border/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <PulseOrbit size="sm" label={false} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Aura
            </span>
          </Link>
          <nav className="ml-auto hidden flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] md:flex">
            <Link to="/token" className="text-muted-foreground hover:text-foreground">
              Token
            </Link>
            <Link to="/swap" className="text-muted-foreground hover:text-foreground">
              Swap
            </Link>
            <Link to="/trust" className="text-muted-foreground hover:text-foreground">
              {de ? "Bund" : "Covenant"}
            </Link>
          </nav>
          <LanguageToggle />
          <PublicMobileMenu
            className="md:hidden"
            hideFrom="md"
            primary={publicNavPrimary(t)}
            more={publicNavMore(t)}
          />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          {de ? AURA_BUY_COPY.kickerDe : AURA_BUY_COPY.kicker}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
          {de ? AURA_BUY_COPY.titleDe : AURA_BUY_COPY.title}
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {de ? AURA_BUY_COPY.leadDe : AURA_BUY_COPY.lead}
        </p>
        {search.checkout === "success" ? (
          <p className="mt-4 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-[13px]">
            {de
              ? "Zahlung angekommen. AURA kommt nach T-0 in deine Aura-Wallet — wir mailen dir."
              : "Payment received. AURA lands in your Aura wallet after T-0 — we email you."}
          </p>
        ) : null}
        {search.checkout === "cancel" ? (
          <p className="mt-4 rounded-2xl border border-border/40 px-4 py-3 text-[13px] text-muted-foreground">
            {de ? "Checkout abgebrochen. Packs bleiben hier." : "Checkout canceled. Packs stay here."}
          </p>
        ) : null}
        <div className="mt-6">
          <AuraTokenIdentity de={de} compact />
        </div>
        <div className="mt-10">
          <AuraBuyGuide de={de} />
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
