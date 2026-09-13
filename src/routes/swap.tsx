import { createFileRoute, Link } from "@tanstack/react-router";

import { AuraOfficialCas } from "@/components/aura/aura-official-cas";
import { AuraSwapDesk } from "@/components/aura/aura-swap-desk";
import { AuraTokenIdentity } from "@/components/aura/aura-token-identity";
import { LanguageToggle } from "@/components/aura/language-toggle";
import {
  PublicMobileMenu,
  publicNavMore,
  publicNavPrimary,
} from "@/components/aura/public-site-header";
import { SiteFooter } from "@/components/aura/site-footer";
import { useLocale } from "@/hooks/use-locale";
import { AURA_CURVE_COPY } from "@/lib/aura-curve";
import { pageHead } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

const TITLE = "AURA swap + stake — official pairs only";
const DESCRIPTION =
  "Quote AURA/USDC without a wallet. Settle on Base. Stake in AuraGauge. Tiny swap burn. No promised APY. Official CA only on this site.";

export const Route = createFileRoute("/swap")({
  head: () =>
    pageHead({
      title: TITLE,
      description: DESCRIPTION,
      path: "/swap",
      jsonLd: {
        "@type": "WebPage",
        name: TITLE,
        description: DESCRIPTION,
        url: `${SITE_URL}/swap`,
      },
    }),
  component: SwapPage,
});

function SwapPage() {
  const { locale, t } = useLocale();
  const de = locale === "de";

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <header className="relative border-b border-border/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-6 py-4">
          <Link
            to="/"
            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
          >
            ← Home
          </Link>
          <nav className="ml-auto hidden flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] md:flex">
            <Link to="/get" className="text-muted-foreground hover:text-foreground">
              {de ? "AURA kaufen" : "Buy AURA"}
            </Link>
            <Link to="/token" className="text-muted-foreground hover:text-foreground">
              Token
            </Link>
            <Link to="/trust" className="text-muted-foreground hover:text-foreground">
              {de ? "Bund" : "Trust"}
            </Link>
            <Link to="/sale" className="text-muted-foreground hover:text-foreground">
              pAURA
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
          AURA · {AURA_CURVE_COPY.venue}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
          {de ? "Swap und Stake" : "Swap and stake"}
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {de ? AURA_CURVE_COPY.fairLaunchDe : AURA_CURVE_COPY.fairLaunch}
        </p>
        <div className="mt-6">
          <AuraTokenIdentity de={de} compact />
        </div>
        <div className="mt-8">
          <AuraSwapDesk de={de} />
        </div>
        <section id="cas" className="mt-10">
          <AuraOfficialCas de={de} />
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
