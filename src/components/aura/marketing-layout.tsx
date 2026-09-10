import type { ReactNode } from "react";

import { PublicSiteHeader } from "@/components/aura/public-site-header";
import { SiteFooter } from "@/components/aura/site-footer";
import { useLocale } from "@/hooks/use-locale";
import { SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

export function MarketingEyebrow({
  children,
  variant = "primary",
  className,
}: {
  children: ReactNode;
  variant?: "primary" | "gold" | "muted";
  className?: string;
}) {
  return (
    <p
      className={cn(
        variant === "gold"
          ? "label-luxury-gold"
          : variant === "muted"
            ? "label-luxury text-muted-foreground"
            : "label-luxury",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function MarketingSection({
  children,
  className,
  id,
  spacious = false,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  spacious?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative z-10 mx-auto max-w-6xl px-5 sm:px-6",
        spacious ? "py-24 sm:py-32" : "py-16 sm:py-20",
        className,
      )}
    >
      {children}
    </section>
  );
}

type MarketingLayoutProps = {
  children: ReactNode;
  shareText?: string;
  sharePlacement?: string;
  cta?: { to: string; label: string; search?: Record<string, string> };
  showSignIn?: boolean;
  fixedHeader?: boolean;
  hero?: ReactNode;
};

export function MarketingLayout({
  children,
  shareText,
  sharePlacement = "marketing_footer",
  cta,
  showSignIn = true,
  fixedHeader = false,
  hero,
}: MarketingLayoutProps) {
  const { t } = useLocale();
  const resolvedCta = cta ?? {
    to: "/auth",
    label: t("landing.navStart"),
    search: { mode: "signup" as const },
  };

  return (
    <main className="stage-atmosphere relative min-h-svh overflow-x-hidden text-foreground">
      <PublicSiteHeader cta={resolvedCta} showSignIn={showSignIn} fixed={fixedHeader} />
      {hero}
      {children}
      <SiteFooter
        share={{
          url: SITE_URL,
          text: shareText ?? "Aura OS — own an AI company.",
          placement: sharePlacement,
        }}
      />
    </main>
  );
}
