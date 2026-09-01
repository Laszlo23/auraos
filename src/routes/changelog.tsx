import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { Hammer, Sparkles, Wrench, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PublicSiteHeader } from "@/components/aura/public-site-header";
import { SiteFooter } from "@/components/aura/site-footer";
import {
  CHANGELOG_ENTRIES,
  CHANGELOG_INTRO,
  CHANGELOG_TAG_LABEL,
  changelogByMonth,
  formatChangelogDate,
  formatChangelogMonth,
  latestChangelogEntry,
  type ChangelogTag,
} from "@/lib/changelog";
import { useLocale } from "@/hooks/use-locale";
import { OG_IMAGE, SITE_URL, SOCIAL_LINKS, url } from "@/lib/site";
import { cn } from "@/lib/utils";

const TITLE = "Changelog — what we're building · Aura OS";
const DESCRIPTION =
  "Ship log for Aura OS: creator platform, multichain desk, mint pages, and product updates — updated as we build.";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url("/changelog") },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: url("/changelog") }],
  }),
  component: ChangelogPage,
});

function tagIcon(tag: ChangelogTag): LucideIcon {
  switch (tag) {
    case "feature":
      return Sparkles;
    case "improvement":
      return Zap;
    case "fix":
      return Wrench;
    case "infra":
      return Hammer;
    default: {
      const _exhaustive: never = tag;
      return _exhaustive;
    }
  }
}

function tagTone(tag: ChangelogTag): string {
  switch (tag) {
    case "feature":
      return "bg-primary/12 text-primary ring-primary/25";
    case "improvement":
      return "bg-gold/12 text-gold ring-gold/25";
    case "fix":
      return "bg-emerald-500/12 text-emerald-400 ring-emerald-500/25";
    case "infra":
      return "bg-foreground/8 text-muted-foreground ring-border/40";
    default: {
      const _exhaustive: never = tag;
      return _exhaustive;
    }
  }
}

function ChangelogPage() {
  const reduce = useReducedMotion();
  const { locale, t } = useLocale();
  const loc = locale === "de" ? "de" : "en";
  const byMonth = changelogByMonth(CHANGELOG_ENTRIES);
  const months = [...byMonth.keys()].sort((a, b) => b.localeCompare(a));
  const latest = latestChangelogEntry();
  const discord = SOCIAL_LINKS.find((s) => s.id === "discord");

  return (
    <main className="stage-atmosphere relative min-h-svh overflow-x-hidden text-foreground">
      <PublicSiteHeader
        cta={{ to: "/auth", label: t("landing.navStart"), search: { mode: "signup" } }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-24 h-64 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,oklch(0.55_0.16_280/0.14),transparent)]"
      />

      <section className="relative mx-auto max-w-3xl px-6 pb-6 pt-14 sm:pt-20">
        <p className="label-luxury-gold">{CHANGELOG_INTRO.eyebrow}</p>
        <motion.h1
          className="display-editorial mt-4 text-[clamp(2.4rem,8vw,3.6rem)] leading-[0.95] font-semibold tracking-tight"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {CHANGELOG_INTRO.title}
        </motion.h1>
        <motion.p
          className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06 }}
        >
          {CHANGELOG_INTRO.subtitle}
        </motion.p>
        {latest ? (
          <motion.p
            className="num mt-5 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {CHANGELOG_ENTRIES.length} {t("changelog.releases")} · {t("changelog.latest")}{" "}
            {formatChangelogDate(latest.date, loc)}
          </motion.p>
        ) : null}
        <motion.div
          className="mt-8 flex flex-wrap gap-3"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.12 }}
        >
          {discord ? (
            <a
              href={discord.href}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-border/50 px-4 py-2 text-xs font-semibold transition-colors hover:border-primary/35"
            >
              {t("changelog.joinDiscord")}
            </a>
          ) : null}
          <Link
            to="/roadmap"
            className="rounded-2xl border border-border/50 px-4 py-2 text-xs font-semibold transition-colors hover:border-primary/35"
          >
            {t("changelog.seeRoadmap")}
          </Link>
        </motion.div>
      </section>

      <section className="relative mx-auto max-w-3xl px-6 pb-20">
        {months.map((monthKey) => {
          const entries = byMonth.get(monthKey) ?? [];
          return (
            <div key={monthKey} className="mb-14">
              <h2 className="sticky top-[4.5rem] z-10 -mx-2 border-b border-border/40 bg-background/80 px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground backdrop-blur-md">
                {formatChangelogMonth(monthKey, loc)}
              </h2>
              <ol className="relative mt-6 space-y-0">
                <div
                  aria-hidden
                  className="absolute bottom-2 left-[7px] top-2 w-px bg-gradient-to-b from-primary/50 via-border/60 to-transparent"
                />
                {entries.map((entry, i) => {
                  const isLatest = entry.id === latest?.id;
                  return (
                    <motion.li
                      key={entry.id}
                      className={cn(
                        "relative pl-10 pb-10 last:pb-0",
                        isLatest && "rounded-2xl bg-primary/[0.04] pb-10 pl-10 pr-3 pt-2 -ml-1",
                      )}
                      initial={reduce ? false : { opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-20px" }}
                      transition={{ delay: Math.min(i * 0.04, 0.2) }}
                    >
                      <span
                        aria-hidden
                        className="absolute left-0 top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-primary/40 bg-primary/15"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <time
                          dateTime={entry.date}
                          className="text-[11px] font-medium text-muted-foreground"
                        >
                          {formatChangelogDate(entry.date, loc)}
                        </time>
                        {isLatest ? (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary ring-1 ring-primary/25">
                            {t("changelog.latestBadge")}
                          </span>
                        ) : null}
                        {entry.tags.map((tag) => {
                          const Icon = tagIcon(tag);
                          return (
                            <span
                              key={tag}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1",
                                tagTone(tag),
                              )}
                            >
                              <Icon className="h-3 w-3" />
                              {CHANGELOG_TAG_LABEL[tag]}
                            </span>
                          );
                        })}
                      </div>
                      <h3 className="mt-2 font-display text-xl font-semibold tracking-tight">
                        {entry.title}
                      </h3>
                      <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
                        {entry.summary}
                      </p>
                      <ul className="mt-4 space-y-2 border-l border-border/30 pl-4">
                        {entry.items.map((item) => (
                          <li
                            key={item}
                            className="text-[13px] leading-relaxed text-foreground/85 before:mr-2 before:text-primary before:content-['·']"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    </motion.li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </section>

      <SiteFooter
        share={{
          url: `${SITE_URL}/changelog`,
          text: "Aura OS changelog — what we're building, as we ship it.",
          placement: "changelog",
        }}
      />
    </main>
  );
}
