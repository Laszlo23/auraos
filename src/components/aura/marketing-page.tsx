import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { LanguageToggle } from "@/components/aura/language-toggle";
import { SiteFooter } from "@/components/aura/site-footer";
import { SITE_NAME, SITE_URL } from "@/lib/site";
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
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <header className="border-b border-white/5 bg-background/40 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3.5 sm:px-6">
          <Link
            to="/"
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          >
            ◎ {SITE_NAME}
          </Link>
          <nav className="ml-auto hidden items-center gap-4 sm:flex">
            <Link
              to="/how-it-works"
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
            >
              {t("landing.navHow")}
            </Link>
            <Link
              to="/try"
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
            >
              {t("landing.navTry")}
            </Link>
            <Link
              to="/pricing"
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
            >
              {t("landing.navPricing")}
            </Link>
          </nav>
          <LanguageToggle className="ml-auto sm:ml-0" />
          <Link
            to="/access"
            className="rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            $99
          </Link>
        </div>
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
