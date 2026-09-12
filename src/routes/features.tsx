import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { MarketingLayout } from "@/components/aura/marketing-layout";
import { useLocale } from "@/hooks/use-locale";
import {
  FEATURES_COPY,
  FEATURE_DESK,
  FEATURE_NOT,
  FEATURE_PAY,
} from "@/lib/aura-features";
import { CATEGORY_FLOW, CATEGORY_LINE, loc } from "@/lib/product-story";
import { pageHead } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

const TITLE = "Aura OS features — the desk, then the extras";
const DESCRIPTION =
  "What Aura OS actually does: missions, approvals, proof, channels. Tokens and NFTs are optional. Square is not live yet.";

export const Route = createFileRoute("/features")({
  head: () =>
    pageHead({
      title: TITLE,
      description: DESCRIPTION,
      path: "/features",
      jsonLd: {
        "@type": "WebPage",
        name: TITLE,
        description: DESCRIPTION,
        url: `${SITE_URL}/features`,
      },
    }),
  component: FeaturesPage,
});

function FeaturesPage() {
  const { locale, t } = useLocale();
  const de = locale === "de";

  return (
    <MarketingLayout
      cta={{ to: "/access", label: t("landing.navStart") }}
      showSignIn={false}
      shareText="Aura OS features — own an AI company."
    >
      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-8 pt-10 sm:pt-14">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          {loc(locale, FEATURES_COPY.kicker)}
        </p>
        <h1 className="mt-3 font-display text-[clamp(2.2rem,7vw,3.6rem)] font-semibold leading-[0.98] tracking-tight">
          {loc(locale, FEATURES_COPY.title)}
        </h1>
        <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-muted-foreground">
          {loc(locale, FEATURES_COPY.lead)}
        </p>
        <p className="mt-3 font-mono text-[12px] tracking-tight text-gold sm:text-[13px]">
          {loc(locale, CATEGORY_FLOW)}
        </p>
        <p className="mt-2 max-w-xl text-[14px] text-muted-foreground">
          {loc(locale, CATEGORY_LINE)}
        </p>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-12">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          {loc(locale, FEATURES_COPY.deskTitle)}
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {FEATURE_DESK.map((row) => (
            <li key={row.id} className="rounded-2xl border border-border/40 px-5 py-4">
              <p className="font-semibold">{loc(locale, row.title)}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
                {loc(locale, row.body)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-12">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          {loc(locale, FEATURES_COPY.extraTitle)}
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          {loc(locale, FEATURES_COPY.extraLead)}
        </p>
        <h3 className="mt-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {loc(locale, FEATURES_COPY.payTitle)}
        </h3>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {FEATURE_PAY.map((row) => (
            <li key={row.id} className="rounded-2xl border border-border/40 px-5 py-4">
              <p className="font-semibold">{loc(locale, row.title)}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
                {loc(locale, row.body)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-10">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          {loc(locale, FEATURES_COPY.notTitle)}
        </h2>
        <ul className="mt-4 space-y-2 text-[15px] text-muted-foreground">
          {FEATURE_NOT.map((line) => (
            <li key={line.en}>— {loc(locale, line)}</li>
          ))}
        </ul>
      </section>

      <section className="mx-auto flex max-w-6xl flex-wrap gap-3 px-6 pb-20">
        <Link
          to="/try"
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          {de ? "Aura testen" : "Try Aura"} <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/guide"
          className="inline-flex items-center gap-2 rounded-2xl border border-border/50 px-6 py-3 text-sm font-semibold"
        >
          {t("landing.navGuide")}
        </Link>
        <Link
          to="/how-it-works"
          className="inline-flex items-center gap-2 rounded-2xl border border-border/50 px-6 py-3 text-sm font-semibold"
        >
          {t("landing.navHow")}
        </Link>
        <Link
          to="/square"
          className="inline-flex items-center gap-2 rounded-2xl border border-border/50 px-6 py-3 text-sm font-semibold"
        >
          Square
        </Link>
      </section>
    </MarketingLayout>
  );
}
