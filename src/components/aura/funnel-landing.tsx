import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { Chip } from "@/components/aura/primitives";
import { SiteFooter } from "@/components/aura/site-footer";
import { captureAttribution, rememberFunnel } from "@/lib/attribution";
import { funnelPlanById } from "@/lib/funnel-plans";
import { authHrefForFunnel, LOCAL_COHORT_CAP, REVIEW_BOOST_INVITE_GOAL, type FunnelDef } from "@/lib/funnels";
import { getLocalCohortScarcity } from "@/lib/reviews.functions";
import { SITE_NAME } from "@/lib/site";

export function FunnelLanding({ funnel }: { funnel: FunnelDef }) {
  useEffect(() => {
    rememberFunnel(funnel.id);
    captureAttribution();
  }, [funnel.id]);

  if (funnel.id === "local") {
    return <LocalFunnelLanding funnel={funnel} />;
  }

  return <DefaultFunnelLanding funnel={funnel} />;
}

function DefaultFunnelLanding({ funnel }: { funnel: FunnelDef }) {
  const plans = funnel.planIds
    .map((id) => funnelPlanById(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const href = authHrefForFunnel(funnel.id);

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 15% -10%, oklch(0.55 0.1 200 / 0.2), transparent 55%), radial-gradient(ellipse 50% 40% at 95% 15%, oklch(0.75 0.12 85 / 0.12), transparent 50%)",
        }}
      />

      <header className="relative border-b border-border/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
          <Link
            to="/"
            className="font-display text-sm font-semibold tracking-tight text-foreground"
          >
            {SITE_NAME}
          </Link>
          <Chip className="ml-auto">{funnel.audience}</Chip>
          <a
            href={href}
            className="rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            {funnel.cta}
          </a>
        </div>
      </header>

      <section className="relative mx-auto flex min-h-[70svh] max-w-5xl flex-col justify-center px-6 py-16 sm:py-24">
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary">
          Aura · {funnel.audience}
        </p>
        <h1 className="mt-5 max-w-3xl font-display text-[clamp(2.4rem,7vw,4.2rem)] font-semibold leading-[0.98] tracking-tight">
          {funnel.headline}
        </h1>
        <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {funnel.subhead}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={href}
            className="rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            {funnel.cta}
          </a>
          <a
            href="#pricing"
            className="rounded-2xl border border-border/50 px-6 py-3 text-sm font-semibold"
          >
            See pricing
          </a>
        </div>
      </section>

      <PricingBlock plans={plans} href={href} />
      <SiteFooter />
    </main>
  );
}

function LocalFunnelLanding({ funnel }: { funnel: FunnelDef }) {
  const href = authHrefForFunnel(funnel.id);
  const plans = funnel.planIds
    .map((id) => funnelPlanById(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const scarcity = useQuery({
    queryKey: ["local-cohort-scarcity"],
    queryFn: () => getLocalCohortScarcity(),
    staleTime: 60_000,
  });

  const remaining = scarcity.data?.remaining ?? LOCAL_COHORT_CAP;

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 12% -8%, oklch(0.58 0.09 195 / 0.28), transparent 58%), radial-gradient(ellipse 55% 40% at 88% 8%, oklch(0.78 0.11 82 / 0.16), transparent 52%), linear-gradient(180deg, transparent 40%, oklch(0.18 0.02 250 / 0.35) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[70svh] opacity-[0.35]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <header className="relative border-b border-border/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
          <Link
            to="/"
            className="font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl"
          >
            {SITE_NAME}
          </Link>
          <span className="font-display text-lg font-medium tracking-tight text-muted-foreground sm:text-xl">
            Local
          </span>
          <a
            href={href}
            className="ml-auto rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            {funnel.cta}
          </a>
        </div>
      </header>

      <section className="relative mx-auto flex min-h-[78svh] max-w-5xl flex-col justify-center px-6 py-16 sm:py-24">
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary">
          Aura · Local
        </p>
        <h1 className="mt-5 max-w-3xl font-display text-[clamp(2.6rem,8vw,4.6rem)] font-semibold leading-[0.96] tracking-tight">
          {funnel.headline}
        </h1>
        <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-muted-foreground">
          {funnel.subhead}
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <a
            href={href}
            className="rounded-2xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_12px_40px_-18px_oklch(0.55_0.12_200)] transition-transform hover:scale-[1.02]"
          >
            {funnel.cta}
          </a>
          <a
            href="#review-boost"
            className="rounded-2xl border border-border/50 px-7 py-3.5 text-sm font-semibold transition-colors hover:border-primary/40"
          >
            How Review Boost works
          </a>
        </div>
      </section>

      <section id="review-boost" className="relative border-t border-border/40 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
            Review Boost
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            First {LOCAL_COHORT_CAP} local businesses — up to {REVIEW_BOOST_INVITE_GOAL} real
            customer invites.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Agents help you systematically ask real customers for Google reviews. You approve every
            send. We never invent reviews, never post as customers, never scrape fake stars.
          </p>
          <div className="mt-8 flex flex-wrap items-end gap-6">
            <div>
              <p className="font-display text-5xl font-semibold tracking-tight text-gold tabular-nums">
                {scarcity.isLoading ? "—" : remaining}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                seats left of {LOCAL_COHORT_CAP}
              </p>
            </div>
            <a
              href={href}
              className="rounded-2xl border border-gold/40 bg-gold/10 px-5 py-3 text-xs font-semibold"
            >
              Claim a seat
            </a>
          </div>
        </div>
      </section>

      <section className="relative border-t border-border/40 py-16 sm:py-20">
        <div className="mx-auto grid max-w-5xl gap-10 px-6 sm:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">Bring your site</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Paste the homepage you already run. Aura links and promotes it — we do not force a
              rebuild.
            </p>
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">Automate socials</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Connect X, Meta, LinkedIn, TikTok, Farcaster — schedule and approve from one Channels
              desk.
            </p>
          </div>
        </div>
      </section>

      <PricingBlock plans={plans} href={href} />
      <SiteFooter />
    </main>
  );
}

function PricingBlock({
  plans,
  href,
}: {
  plans: NonNullable<ReturnType<typeof funnelPlanById>>[];
  href: string;
}) {
  if (plans.length === 0) return null;
  return (
    <section id="pricing" className="relative border-t border-border/40 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Pricing</h2>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Outcomes first — not AI credits. Powered by Aura OS underneath.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-col rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {plan.name}
              </p>
              <p className="mt-3 font-display text-3xl font-semibold tracking-tight">
                €{plan.eur}
                <span className="text-sm font-normal text-muted-foreground">
                  {plan.mode === "subscription" ? "/mo" : " once"}
                </span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{plan.blurb}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
                {plan.perks.map((perk) => (
                  <li key={perk}>· {perk}</li>
                ))}
              </ul>
              {plan.successFeeNote ? (
                <p className="mt-3 text-[11px] text-muted-foreground">{plan.successFeeNote}</p>
              ) : null}
              <a
                href={href}
                className="mt-6 inline-flex justify-center rounded-2xl bg-primary/90 px-4 py-2.5 text-xs font-semibold text-primary-foreground"
              >
                Continue
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
