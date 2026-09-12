import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { MarketingLayout } from "@/components/aura/marketing-layout";
import { useLocale } from "@/hooks/use-locale";
import {
  GUIDE_COPY,
  GUIDE_DESK,
  GUIDE_HOUR,
  GUIDE_MORE,
  GUIDE_PATH,
  GUIDE_PROMPTS,
  GUIDE_RULES,
} from "@/lib/founder-guide";
import { loc } from "@/lib/product-story";
import { pageHead } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

const TITLE = "Founder guide — how to get work out of Aura OS";
const DESCRIPTION =
  "First hour, how to brief Atlas, missions, approvals, channels, and honest rules. Specific briefs beat vibes.";

export const Route = createFileRoute("/guide")({
  head: () =>
    pageHead({
      title: TITLE,
      description: DESCRIPTION,
      path: GUIDE_PATH,
      jsonLd: {
        "@type": "WebPage",
        name: TITLE,
        description: DESCRIPTION,
        url: `${SITE_URL}${GUIDE_PATH}`,
      },
    }),
  component: GuidePage,
});

function GuidePage() {
  const { locale, t } = useLocale();
  const de = locale === "de";

  return (
    <MarketingLayout
      cta={{ to: "/access", label: t("landing.navStart") }}
      showSignIn={false}
      shareText="Founder guide — how to get work out of Aura OS."
    >
      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-8 pt-10 sm:pt-14">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          {loc(locale, GUIDE_COPY.kicker)}
        </p>
        <h1 className="mt-3 font-display text-[clamp(2.2rem,7vw,3.6rem)] font-semibold leading-[0.98] tracking-tight">
          {loc(locale, GUIDE_COPY.title)}
        </h1>
        <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-muted-foreground">
          {loc(locale, GUIDE_COPY.lead)}
        </p>
      </section>

      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-14">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          {loc(locale, GUIDE_COPY.hourTitle)}
        </h2>
        <ol className="mt-6 space-y-3">
          {GUIDE_HOUR.map((step) => (
            <li
              key={step.n}
              className="grid gap-2 rounded-[1.6rem] border border-border/40 px-5 py-4 sm:grid-cols-[4rem_1fr]"
            >
              <p className="font-display text-2xl text-gold">{step.n}</p>
              <div>
                {step.href ? (
                  <Link
                    to={step.href}
                    className="font-semibold underline-offset-2 hover:underline"
                  >
                    {loc(locale, step.title)}
                  </Link>
                ) : (
                  <p className="font-semibold">{loc(locale, step.title)}</p>
                )}
                <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
                  {loc(locale, step.body)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-14">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          {loc(locale, GUIDE_COPY.talkTitle)}
        </h2>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {loc(locale, GUIDE_COPY.talkLead)}
        </p>
        <ul className="mt-6 space-y-3">
          {GUIDE_PROMPTS.map((row) => (
            <li
              key={row.bad.en}
              className="rounded-[1.6rem] border border-border/40 px-5 py-4"
            >
              <p className="text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                {de ? "Statt" : "Instead of"}
              </p>
              <p className="mt-1 text-[14px] text-muted-foreground line-through decoration-border">
                {loc(locale, row.bad)}
              </p>
              <p className="mt-3 text-[12px] uppercase tracking-[0.16em] text-gold">
                {de ? "So" : "Try"}
              </p>
              <p className="mt-1 text-[15px] leading-relaxed">{loc(locale, row.good)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-14">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          {loc(locale, GUIDE_COPY.deskTitle)}
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          {loc(locale, GUIDE_COPY.deskLead)}
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {GUIDE_DESK.map((row) => (
            <li key={row.id} className="rounded-2xl border border-border/40 px-5 py-4">
              <Link to={row.href} className="font-semibold underline-offset-2 hover:underline">
                {loc(locale, row.title)}
              </Link>
              <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
                {loc(locale, row.body)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-14">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          {loc(locale, GUIDE_COPY.rulesTitle)}
        </h2>
        <ul className="mt-4 space-y-2 text-[15px] text-muted-foreground">
          {GUIDE_RULES.map((line) => (
            <li key={line.en}>— {loc(locale, line)}</li>
          ))}
        </ul>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-10">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          {loc(locale, GUIDE_COPY.moreTitle)}
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {GUIDE_MORE.map((row) => (
            <li key={row.href} className="rounded-2xl border border-border/40 px-5 py-4">
              <Link to={row.href} className="font-semibold underline-offset-2 hover:underline">
                {loc(locale, row.label)}
              </Link>
              <p className="mt-1 text-[14px] text-muted-foreground">{loc(locale, row.body)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto flex max-w-6xl flex-wrap gap-3 px-6 pb-20">
        <Link
          to="/access"
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          {t("landing.navStart")} <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/try"
          className="inline-flex items-center gap-2 rounded-2xl border border-border/50 px-6 py-3 text-sm font-semibold"
        >
          {t("landing.navTry")}
        </Link>
      </section>
    </MarketingLayout>
  );
}
