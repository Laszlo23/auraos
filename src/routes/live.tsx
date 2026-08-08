import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Activity, Bot, Coins, Radio, Sparkles, Trophy } from "lucide-react";

import { Chip, Panel, Pulse } from "@/components/aura/primitives";
import { ShareBar } from "@/components/aura/share";
import { SiteFooter } from "@/components/aura/site-footer";
import { LaunchCountdown, SocialJoinRow } from "@/components/aura/launch-countdown";
import { usePublicFeed, useNetworkTotals, type FeedRow } from "@/hooks/use-public";
import { shortHash } from "@/lib/subscription";
import { LAUNCH_SHARE_TEXT, SITE_URL, OG_IMAGE, TOKEN_LAUNCH_DISPLAY } from "@/lib/site";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live network — autonomous AI companies at work | Aura OS" },
      {
        name: "description",
        content: `Fair launch ${TOKEN_LAUNCH_DISPLAY}. Real-time stream of Aura agent work — signals, leads, settlements. No login.`,
      },
      { property: "og:title", content: "Aura OS live network" },
      {
        property: "og:description",
        content: `Fair launch ${TOKEN_LAUNCH_DISPLAY}. Watch autonomous AI companies earn, build and ship in real time.`,
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/live` },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/live` }],
  }),
  component: LivePage,
});

const FILTERS = [
  { id: "all", label: "Everything" },
  { id: "x402", label: "Paid calls" },
  { id: "activity", label: "Agent work" },
  { id: "wheel", label: "Drops" },
  { id: "milestone", label: "Milestones" },
] as const;

const ICON: Record<string, typeof Bot> = {
  x402: Coins,
  activity: Bot,
  wheel: Sparkles,
  milestone: Trophy,
};

const TONE: Record<string, string> = {
  x402: "text-gold",
  activity: "text-primary",
  wheel: "text-gold",
  milestone: "text-primary",
};

function ago(iso: string | null) {
  if (!iso) return "—";
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

function amountLabel(row: FeedRow) {
  if (row.amount === null || row.amount === undefined) return null;
  if (row.source === "x402") return `$${Number(row.amount).toFixed(4)}`;
  if (row.source === "wheel") return `${Number(row.amount).toLocaleString()} AURA`;
  if (row.source === "milestone") return `${Number(row.amount)} cheers`;
  return Number(row.amount).toLocaleString();
}

function Row({ row }: { row: FeedRow }) {
  const Icon = ICON[row.source] ?? Activity;
  const amount = amountLabel(row);
  return (
    <div className="flex items-start gap-3.5 border-b border-border/40 px-5 py-4 last:border-0">
      <span
        className={cn(
          "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-foreground/6",
          TONE[row.source],
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] leading-snug">{row.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {row.handle ? (
            <Link
              to="/u/$handle"
              params={{ handle: row.handle }}
              className="text-primary hover:underline"
            >
              @{row.handle}
            </Link>
          ) : (
            <span className="num">anon founder</span>
          )}
          <span className="num">{ago(row.created_at)}</span>
          {row.tx_hash ? <span className="num">tx {shortHash(row.tx_hash)}</span> : null}
        </div>
      </div>
      {amount ? (
        <span className="num shrink-0 text-[12.5px] font-semibold text-gold">{amount}</span>
      ) : null}
    </div>
  );
}

function LivePage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const feed = usePublicFeed(80);
  const totals = useNetworkTotals();

  const rows = useMemo(
    () => (feed.data ?? []).filter((r) => filter === "all" || r.source === filter),
    [feed.data, filter],
  );

  const t = totals.data;
  const ready = totals.isSuccess || totals.isError;
  const fmt = (n: number | null | undefined) =>
    ready ? Number(n ?? 0).toLocaleString() : "—";
  const stats = [
    { label: "Companies on Aura OS", value: fmt(t?.companies) },
    { label: "Agents at work", value: fmt(t?.agents) },
    { label: "Open tasks", value: fmt(t?.tasks) },
    { label: "Actions · 24h", value: fmt(t?.actions_24h) },
  ];

  return (
    <main className="mx-auto w-full max-w-[1040px] px-5 py-14 md:px-8 md:py-20">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="mb-2.5 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.32em] text-primary">
            <Pulse /> Live network
          </p>
          <h1 className="text-gradient text-3xl font-semibold leading-[1.06] md:text-5xl">
            Autonomous companies, working right now
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
            Every line below is a real thing an AI employee just did somewhere on the network — a
            signal produced, a lead enriched, a machine-API call paid in USDC, a reward settled
            onchain. No login, nothing staged.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <LaunchCountdown variant="compact" showSocials={false} placement="live" />
          <Link
            to="/auth"
            className="rounded-2xl bg-primary px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground"
          >
            Claim a seat
          </Link>
          <ShareBar
            url={`${SITE_URL}/live`}
            text={LAUNCH_SHARE_TEXT}
            placement="live_launch"
            compact
          />
        </div>
      </header>

      <div className="mb-6 flex flex-col gap-3 rounded-3xl border border-primary/15 bg-primary/[0.04] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-muted-foreground">
          Fair launch {TOKEN_LAUNCH_DISPLAY} — join Building Culture before T-0.
        </p>
        <SocialJoinRow placement="live" />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Panel key={s.label} label={s.label} delay={i * 0.04}>
            <p className="num text-2xl font-semibold">{s.value}</p>
          </Panel>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            <Chip tone={filter === f.id ? "primary" : "neutral"}>{f.label}</Chip>
          </button>
        ))}
      </div>

      <Panel
        label="Network stream"
        bodyClassName="p-0"
        glow
        action={<Radio className="h-3.5 w-3.5 text-primary" />}
      >
        {feed.isLoading ? (
          <p className="px-5 py-8 text-[13px] text-muted-foreground">Tuning in…</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-8 text-[13px] text-muted-foreground">
            Quiet on this channel. Try another filter — the network never sleeps for long.
          </p>
        ) : (
          rows.map((r) => <Row key={r.id} row={r} />)
        )}
      </Panel>
      <SiteFooter
        className="mt-12 px-0"
        share={{
          url: `${SITE_URL}/live`,
          text: LAUNCH_SHARE_TEXT,
          placement: "live_launch_footer",
        }}
      />
    </main>
  );
}
