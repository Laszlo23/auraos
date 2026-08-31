import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { LanguageToggle } from "@/components/aura/language-toggle";
import { PublicMobileMenu, publicPrimaryNav } from "@/components/aura/public-mobile-menu";
import { PulseOrbit } from "@/components/aura/pulse-orbit";
import { SiteFooter } from "@/components/aura/site-footer";
import { SITE_URL } from "@/lib/site";
import { useLocale } from "@/hooks/use-locale";

export function MarketingPage({
  children,
  shareText,
}: {
  children: ReactNode;
  shareText?: string;
}) {
  const { t } = useLocale();
  return (
    <main className="stage-atmosphere relative min-h-svh overflow-x-hidden text-foreground">
      <header className="sticky top-0 z-30 border-b border-white/[0.04] bg-background/35 backdrop-blur-2xl">
        <div className="austria-bar" aria-hidden />
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3 sm:px-6">
          <Link to="/" className="min-w-0 shrink-0 transition-opacity hover:opacity-90">
            <PulseOrbit size="sm" />
          </Link>
          <nav className="ml-auto hidden items-center gap-4 sm:flex">
            <Link
              to="/how-it-works"
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("landing.navHow")}
            </Link>
            <Link
              to="/try"
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("landing.navTry")}
            </Link>
            <Link
              to="/pricing"
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("landing.navPricing")}
            </Link>
            <Link
              to="/hood"
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold transition-colors hover:text-gold/80"
            >
              {t("landing.navHood")}
            </Link>
          </nav>
          <LanguageToggle className="ml-auto hidden border-white/15 bg-black/20 sm:inline-flex" />
          <Link
            to="/access"
            className="cta-liquid cta-magnetic shrink-0 rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-[0_0_32px_-8px_var(--glow)]"
          >
            $299
          </Link>
          <PublicMobileMenu items={publicPrimaryNav(t)} hideFrom="sm">
            <LanguageToggle className="self-start" />
            <Link
              to="/access"
              className="cta-liquid rounded-2xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground"
            >
              $299
            </Link>
          </PublicMobileMenu>
        </div>
        <div
          className="h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent"
          aria-hidden
        />
      </header>
      {children}
      <SiteFooter
        share={{
          url: SITE_URL,
          text: shareText ?? "Aura OS — own an AI company.",
          placement: "marketing_footer",
        }}
      />
    </main>
  );
}
