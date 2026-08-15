import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Activity, ArrowRight, Bot, Building2, ListTodo, type LucideIcon } from "lucide-react";

import { Pulse } from "@/components/aura/primitives";
import { ShareMoment } from "@/components/aura/share";
import { useLocale } from "@/hooks/use-locale";
import { useNetworkTotals, usePublicFeed, type FeedRow } from "@/hooks/use-public";
import { useInView } from "@/hooks/use-in-view";
import { SITE_URL } from "@/lib/site";

/**
 * Permanent proof strip on the landing page. Every number is read from the
 * network's own ledgers — nothing here is written by hand.
 */
function liveValue(n: number | null | undefined, ready: boolean): string {
  if (!ready) return "—";
  return Number(n ?? 0).toLocaleString();
}

function feedLine(row: FeedRow): { who: string; what: string } | null {
  const who = row.handle?.trim() || row.source || "Aura";
  const what = (row.title || row.detail || row.kind || "Activity").trim();
  const lower = what.toLowerCase();
  // Hide reply-draft / approval spam from the public proof strip.
  if (lower.includes("approve") && (lower.includes("reply") || lower.includes("comment"))) {
    return null;
  }
  if (lower.startsWith("draft:") || lower.includes("social-reply")) {
    return null;
  }
  if (lower.includes("reply") && (lower.includes("approve") || lower.includes("approved"))) {
    return null;
  }
  if (lower.includes("machine api") && lower.includes("dev")) {
    return null;
  }
  if (lower.includes("seeded") && lower.includes("drip")) {
    return null;
  }
  return { who, what };
}

export function LiveProof() {
  const { t } = useLocale();
  const { ref, inView: onScreen } = useInView();
  const { data, isSuccess, isError } = useNetworkTotals({
    refetchInterval: onScreen ? 30_000 : false,
  });
  const feed = usePublicFeed(4, { refetchInterval: onScreen ? 12_000 : false });
  const ready = isSuccess || isError;
  const stats: { label: string; value: string; icon: LucideIcon }[] = [
    {
      label: t("landing.liveCompanies"),
      value: liveValue(data?.companies, ready),
      icon: Building2,
    },
    {
      label: t("landing.liveAgents"),
      value: liveValue(data?.agents, ready),
      icon: Bot,
    },
    {
      label: t("landing.liveTasks"),
      value: liveValue(data?.tasks, ready),
      icon: ListTodo,
    },
    {
      label: t("landing.liveActions"),
      value: liveValue(data?.actions_24h, ready),
      icon: Activity,
    },
  ];

  const lines = (feed.data ?? [])
    .map(feedLine)
    .filter((line): line is { who: string; what: string } => line !== null)
    .slice(0, 4);

  const companies = Number(data?.companies ?? 0);
  const actions24h = Number(data?.actions_24h ?? 0);
  const shareStat =
    ready && !isError
      ? `${companies.toLocaleString()} companies · ${actions24h.toLocaleString()} actions · 24h`
      : null;
  const shareText = shareStat
    ? t("landing.liveShareStat", { stat: shareStat })
    : t("landing.liveSharePlain");

  return (
    <section ref={ref} className="relative z-10 mx-auto max-w-6xl px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="glass rounded-3xl p-6 md:p-8"
      >
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.32em] text-primary">
              <Pulse /> {t("landing.liveKicker")}
            </p>
            <h2 className="font-display text-[clamp(1.5rem,4vw,2.4rem)] leading-[1.05] tracking-tight">
              {t("landing.liveTitle")}
            </h2>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
              {t("landing.liveBody")}
            </p>
          </div>
          <Link
            to="/live"
            className="inline-flex items-center gap-1.5 rounded-2xl bg-foreground/8 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("landing.liveWatch")} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="border-t border-border/50 pt-4 sm:border-t-0 sm:border-l sm:pl-5 sm:pt-0 first:border-l-0 first:pl-0"
            >
              <span className="mb-3 grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-3.5 w-3.5" />
              </span>
              <p className="num text-[clamp(1.75rem,4vw,2.4rem)] font-semibold leading-none tracking-tight">
                {s.value}
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {lines.length > 0 ? (
          <div className="mt-8 border-t border-border/40 pt-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              {t("landing.liveLatest")}
            </p>
            <ul className="space-y-2.5">
              {lines.map((line, i) => (
                <li
                  key={`${line.who}-${line.what}-${i}`}
                  className="flex items-start gap-2.5 text-[13px] leading-snug text-muted-foreground"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                    aria-hidden
                  />
                  <span>
                    <span className="font-medium text-foreground/90">{line.who}</span>
                    <span className="text-muted-foreground/50"> · </span>
                    {line.what}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-8 border-t border-border/40 pt-5">
          <ShareMoment
            url={`${SITE_URL}/live`}
            text={shareText}
            title="Aura OS · live network"
            placement="landing_live_proof"
            label={t("landing.liveShare")}
            statLine={shareStat}
          />
        </div>
      </motion.div>
    </section>
  );
}
