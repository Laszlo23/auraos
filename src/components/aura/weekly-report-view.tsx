import { ExternalLink } from "lucide-react";

import { Chip, Pulse } from "@/components/aura/primitives";
import { compact, timeAgo } from "@/lib/format";
import type { WeeklyReportSnapshot } from "@/lib/weekly-report.functions";
import { cn } from "@/lib/utils";

const PROVIDER_LABEL: Record<string, string> = {
  x: "X",
  linkedin: "LinkedIn",
  meta: "Meta",
  tiktok: "TikTok",
  farcaster: "Farcaster",
};

function providerName(p: string) {
  return PROVIDER_LABEL[p] ?? p;
}

export function WeeklyReportView({
  snapshot,
  mode = "founder",
}: {
  snapshot: WeeklyReportSnapshot;
  mode?: "founder" | "public";
}) {
  const t = snapshot.totals;
  const connected = snapshot.channels.filter((c) => c.status === "connected");

  return (
    <div className="space-y-12">
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
          Week in review
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          {snapshot.companyEmoji ? (
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/12 text-2xl">
              {snapshot.companyEmoji}
            </span>
          ) : null}
          <div className="min-w-0">
            <h1
              className={cn(
                "font-display leading-[0.98] tracking-tight",
                mode === "public"
                  ? "text-[clamp(2rem,6vw,3.4rem)]"
                  : "text-gradient text-3xl font-semibold md:text-4xl",
              )}
            >
              {snapshot.companyName}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {snapshot.rangeLabel}
              {snapshot.companyTagline ? ` · ${snapshot.companyTagline}` : null}
            </p>
          </div>
        </div>

        {snapshot.summary ? (
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-foreground/90">
            {snapshot.summary}
          </p>
        ) : null}

        <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5 border-y border-border/50 py-6 sm:grid-cols-4">
          {[
            { label: "Posts", value: compact(t.postsPublished) },
            { label: "Replies", value: compact(t.repliesSent) },
            { label: "Tasks done", value: compact(t.tasksCompleted) },
            { label: "Agent actions", value: compact(t.agentActions) },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {stat.label}
              </p>
              <p className="num mt-1 text-2xl font-semibold tabular-nums md:text-3xl">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {(t.impressions > 0 || t.likes > 0 || t.reposts > 0) && (
          <p className="mt-3 text-[12px] text-muted-foreground">
            Engagement on shipped posts: {compact(t.impressions)} impressions · {compact(t.likes)}{" "}
            likes · {compact(t.reposts)} reposts
          </p>
        )}

        {connected.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {connected.map((c) => (
              <Chip key={c.provider} tone="neutral">
                <Pulse /> {providerName(c.provider)}
                {c.handle ? ` · ${c.handle}` : ""}
              </Chip>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-[13px] text-muted-foreground">
            No channels connected yet — connect X, Meta or LinkedIn to fill this report.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          What shipped
        </h2>
        <p className="mt-1.5 text-[13px] text-muted-foreground/80">
          Posts published in the last seven days
        </p>
        {snapshot.posts.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Zero posts this week. Quiet weeks stay honest.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-border/40">
            {snapshot.posts.map((p) => (
              <li key={p.id} className="flex flex-col gap-2 py-4 first:pt-2 sm:flex-row sm:gap-6">
                <div className="w-28 shrink-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    {providerName(p.provider)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {p.published_at ? timeAgo(p.published_at) : "—"}
                  </p>
                  {p.agent_name ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">{p.agent_name}</p>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground/90">
                    {p.body}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    {p.likes > 0 ? <span>{compact(p.likes)} likes</span> : null}
                    {p.reposts > 0 ? <span>{compact(p.reposts)} reposts</span> : null}
                    {p.impressions > 0 ? <span>{compact(p.impressions)} impressions</span> : null}
                    {p.external_url ? (
                      <a
                        href={p.external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {snapshot.replies.length > 0 ? (
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Replies sent
          </h2>
          <ul className="mt-5 space-y-4">
            {snapshot.replies.map((r, i) => (
              <li key={`${r.provider}-${i}`} className="border-l-2 border-primary/30 pl-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {providerName(r.provider)}
                  {r.author_handle ? ` · to ${r.author_handle}` : ""}
                </p>
                <p className="mt-1 text-[14px] leading-relaxed">{r.reply_body}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          What agents did
        </h2>
        <p className="mt-1.5 text-[13px] text-muted-foreground/80">
          Recent company activity from the last seven days
        </p>
        {snapshot.activity.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">No agent actions logged this week.</p>
        ) : (
          <ul className="mt-6 divide-y divide-border/40">
            {snapshot.activity.map((a, i) => (
              <li key={`${a.created_at}-${i}`} className="flex gap-4 py-3.5">
                <span className="w-20 shrink-0 text-[10px] uppercase tracking-[0.16em] text-primary">
                  {a.kind}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] leading-relaxed text-foreground/90">{a.message}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(a.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
