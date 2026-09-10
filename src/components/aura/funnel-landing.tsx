import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useEffect } from "react";
import { Star } from "lucide-react";

import {
  CreatorChainPill,
  CreatorFlowRail,
  CreatorMintFrame,
  CreatorStackShowcase,
  CreatorWeb3Backdrop,
} from "@/components/aura/creator-visuals";
import {
  FunnelCloseBand,
  FunnelConceptStrip,
  FunnelHeroBleed,
  FunnelPainSection,
  FunnelStoryBeats,
  FunnelTrustStrip,
  FunnelWiifmStrip,
  storyForFunnel,
} from "@/components/aura/funnel-visuals";
import { SiteFooter } from "@/components/aura/site-footer";
import { PublicSiteHeader } from "@/components/aura/public-site-header";
import { captureAttribution, rememberFunnel } from "@/lib/attribution";
import { funnelPlanById } from "@/lib/funnel-plans";
import {
  authHrefForFunnel,
  LOCAL_COHORT_CAP,
  REVIEW_BOOST_INVITE_GOAL,
  type FunnelDef,
} from "@/lib/funnels";
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

  if (funnel.id === "builders") {
    return <BuildersFunnelLanding funnel={funnel} />;
  }

  return <DefaultFunnelLanding funnel={funnel} />;
}

function BuildersFunnelLanding({ funnel }: { funnel: FunnelDef }) {
  const href = authHrefForFunnel(funnel.id);
  const story = storyForFunnel(funnel.id);

  return (
    <main className="hood-atmosphere relative min-h-svh overflow-x-hidden text-foreground">
      <CreatorWeb3Backdrop />

      <PublicSiteHeader cta={{ href, label: funnel.cta }} showSignIn={false} fixed />

      <section className="relative z-10 mx-auto grid max-w-6xl gap-12 px-6 pb-16 pt-24 lg:grid-cols-2 lg:items-center lg:py-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <p className="label-luxury">{story.accentLabel}</p>
          <h1 className="display-hero mt-4 text-[clamp(2.2rem,6.5vw,3.5rem)] leading-[0.95]">
            {funnel.headline.split(". ").slice(0, 1).join(". ")}.
            <br />
            <span className="text-money">{funnel.headline.split(". ").slice(1).join(". ")}</span>
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
            {funnel.subhead}
          </p>
          <div className="mt-8">
            <CreatorFlowRail />
          </div>
          <a
            href={href}
            className="cta-liquid cta-magnetic mt-8 inline-flex rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground"
          >
            {funnel.cta}
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.08 }}
        >
          <CreatorMintFrame
            slug="neon-garden"
            name="Neon Garden"
            symbol="NEON"
            priceLabel="10 USDG"
          />
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-8">
        <CreatorStackShowcase />
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Robinhood Chain partners
        </p>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
          Readable Uniswap v4 pool rules live at{" "}
          <a
            href="https://hookr.fun/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            hookr.fun
          </a>{" "}
          ·{" "}
          <a
            href="https://x.com/hookrfun"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            @hookrfun
          </a>
          . Rules before you sign — not an airdrop portal. Verify CAs on official sites only; never
          by DM. Covenant →{" "}
          <Link
            to="/trust"
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            /trust
          </Link>
          .
        </p>
      </section>

      <FunnelPainSection title={story.painTitle} body={story.painBody} items={story.painItems} />
      <FunnelWiifmStrip title={story.wiifmTitle} sub={story.wiifmSub} items={story.wiifm} />
      <FunnelStoryBeats beats={story.beats} />
      <FunnelConceptStrip
        eyebrow={`Aura · ${story.accentLabel}`}
        title={story.conceptsTitle}
        concepts={story.concepts}
      />
      <FunnelTrustStrip title={story.trustTitle} items={story.trustItems} />
      <FunnelCloseBand
        title={story.closeTitle}
        body={story.closeBody}
        cta={funnel.cta}
        href={href}
      />
      <SiteFooter />
    </main>
  );
}

function DefaultFunnelLanding({ funnel }: { funnel: FunnelDef }) {
  const plans = funnel.planIds
    .map((id) => funnelPlanById(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const href = authHrefForFunnel(funnel.id);
  const story = storyForFunnel(funnel.id);

  return (
    <main className="stage-atmosphere relative min-h-svh overflow-x-hidden text-foreground">
      <PublicSiteHeader cta={{ href, label: funnel.cta }} showSignIn={false} fixed />

      <FunnelHeroBleed
        src={story.image}
        alt={story.imageAlt}
        wash={story.wash}
        showScrollCue={story.scrollCue}
      >
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-display text-[clamp(1.8rem,5vw,2.6rem)] font-semibold tracking-tight text-white"
        >
          {SITE_NAME}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="mt-3 max-w-3xl font-display text-[clamp(2rem,6.5vw,3.6rem)] font-semibold leading-[1.02] tracking-tight text-white"
        >
          {story.hook}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="mt-5 max-w-lg text-[15px] leading-relaxed text-white/75"
        >
          {funnel.subhead}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24 }}
          className="mt-8 flex flex-wrap gap-3"
        >
          <a
            href={href}
            className="cta-liquid cta-magnetic rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
          >
            {funnel.cta}
          </a>
          <a
            href="#story"
            className="rounded-2xl border border-white/25 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10"
          >
            What’s in it for me
          </a>
        </motion.div>
      </FunnelHeroBleed>

      <FunnelPainSection title={story.painTitle} body={story.painBody} items={story.painItems} />
      <FunnelWiifmStrip title={story.wiifmTitle} sub={story.wiifmSub} items={story.wiifm} />
      <FunnelStoryBeats beats={story.beats} />
      <FunnelConceptStrip
        eyebrow={`Aura · ${story.accentLabel}`}
        title={story.conceptsTitle}
        concepts={story.concepts}
      />
      <FunnelTrustStrip title={story.trustTitle} items={story.trustItems} />
      <FunnelCloseBand
        title={story.closeTitle}
        body={story.closeBody}
        cta={funnel.cta}
        href={href}
        secondaryHref="#pricing"
        secondaryLabel="See pricing"
      />
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
  const story = storyForFunnel("local");

  const scarcity = useQuery({
    queryKey: ["local-cohort-scarcity"],
    queryFn: () => getLocalCohortScarcity(),
    staleTime: 60_000,
  });

  const remaining = scarcity.data?.remaining;
  const taken = scarcity.data?.taken;

  return (
    <main className="stage-atmosphere relative min-h-svh overflow-x-hidden text-foreground">
      <PublicSiteHeader cta={{ href, label: funnel.cta }} showSignIn={false} fixed />

      <FunnelHeroBleed
        src={story.image}
        alt={story.imageAlt}
        wash={story.wash}
        showScrollCue={story.scrollCue}
      >
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="display-hero font-display text-[clamp(1.8rem,5vw,2.6rem)] font-semibold tracking-tight text-white"
        >
          {SITE_NAME} · Local
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mt-3 max-w-3xl font-display text-[clamp(2.2rem,7vw,3.8rem)] font-semibold leading-[0.98] tracking-tight text-white"
        >
          {story.hook}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="mt-5 max-w-lg text-[16px] leading-relaxed text-white/75"
        >
          {funnel.subhead}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="mt-9 flex flex-wrap gap-3"
        >
          <a
            href={href}
            className="cta-liquid cta-magnetic rounded-2xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
          >
            {funnel.cta}
          </a>
          <a
            href="#story"
            className="rounded-2xl border border-white/25 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm"
          >
            What’s in it for me
          </a>
        </motion.div>
      </FunnelHeroBleed>

      <FunnelPainSection title={story.painTitle} body={story.painBody} items={story.painItems} />
      <FunnelWiifmStrip title={story.wiifmTitle} sub={story.wiifmSub} items={story.wiifm} />
      <FunnelStoryBeats beats={story.beats} />
      <FunnelConceptStrip
        eyebrow="The idea in icons"
        title={story.conceptsTitle}
        concepts={story.concepts}
      />

      <section
        id="review-boost"
        className="relative overflow-hidden border-t border-border/40 py-16 sm:py-20"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 50% 60% at 85% 20%, oklch(0.78 0.11 82 / 0.22), transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-6">
          <div className="flex flex-wrap items-start gap-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/15 text-gold ring-1 ring-gold/30">
              <Star className="h-8 w-8" strokeWidth={1.6} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
                Review Boost
              </p>
              <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                First {LOCAL_COHORT_CAP} shops — up to {REVIEW_BOOST_INVITE_GOAL} real invites.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
                The cohort that gets systematic Google asks. You approve every send. Never fake
                stars.
              </p>
              <div className="mt-8 flex flex-wrap items-end gap-6">
                <div>
                  <p className="font-display text-5xl font-semibold tracking-tight text-gold tabular-nums">
                    {scarcity.isFetched && remaining != null ? remaining : "—"}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    seats left of {LOCAL_COHORT_CAP}
                    {scarcity.isFetched && taken != null ? ` · ${taken} seated` : ""}
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
          </div>
        </div>
      </section>

      <FunnelTrustStrip title={story.trustTitle} items={story.trustItems} />
      <FunnelCloseBand
        title={story.closeTitle}
        body={story.closeBody}
        cta={funnel.cta}
        href={href}
        secondaryHref="#pricing"
        secondaryLabel="See pricing"
      />
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
