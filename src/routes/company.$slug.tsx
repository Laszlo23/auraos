import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, Bot, ExternalLink, Radio } from "lucide-react";

import { Chip, Panel, Pulse, Shimmer } from "@/components/aura/primitives";
import { ShareMoment } from "@/components/aura/share";
import { SiteFooter } from "@/components/aura/site-footer";
import { autonomyLabel } from "@/lib/company-economy";
import { getPublicCompany } from "@/lib/economy.functions";
import { currency, timeAgo } from "@/lib/format";
import { OG_IMAGE, SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/company/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — live receipts | Aura OS` },
      {
        name: "description",
        content:
          "Public company receipts on Aura OS — agents, actions, posts, and ledger truth. Zeros are honest.",
      },
      { property: "og:title", content: `${params.slug} — Aura OS company` },
      { property: "og:url", content: `${SITE_URL}/company/${params.slug}` },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/company/${params.slug}` }],
  }),
  component: PublicCompanyPage,
});

function PublicCompanyPage() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["public-company", slug],
    queryFn: () => getPublicCompany({ data: { slug } }),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-8">
        <Shimmer className="h-28" />
        <Shimmer className="h-48" />
        <Shimmer className="h-64" />
      </div>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-lg p-12 text-center">
        <h1 className="font-display text-2xl font-semibold">Company not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">No public passport for this slug.</p>
        <Link to="/" className="mt-6 inline-block text-primary">
          Back to Aura OS
        </Link>
      </main>
    );
  }

  const shareUrl = `${SITE_URL}/company/${data.slug}`;
  const seatBit = data.seat != null ? `Seat #${data.seat}` : null;
  const shareBits = [
    seatBit,
    `${data.actions24h} actions · 24h`,
    `${data.agents} AI employees`,
    data.revenue > 0 ? `revenue ${currency(data.revenue)}` : "ledger zeros stay zeros",
  ].filter(Boolean);
  const shareText = `${data.name} on Aura OS — ${shareBits.join(" · ")}. Live receipts.`;
  const statLine = shareBits.join(" · ");

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 15% -10%, oklch(0.75 0.14 199 / 0.14), transparent 55%), radial-gradient(ellipse 50% 35% at 90% 10%, oklch(0.75 0.12 78 / 0.08), transparent 50%)",
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link
          to="/"
          className="text-[12px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Aura OS
        </Link>
        <Chip tone="primary">
          <Pulse /> Live receipts
        </Chip>
      </header>

      <div className="relative z-10 mx-auto max-w-5xl space-y-8 px-6 pb-16">
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
            Company passport
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/12 text-2xl text-primary">
              {data.emoji}
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-[clamp(2rem,6vw,3.4rem)] leading-[0.98] tracking-tight">
                {data.name}
              </h1>
              {data.tagline ? (
                <p className="mt-2 max-w-2xl text-[15px] text-muted-foreground">{data.tagline}</p>
              ) : (
                <p className="mt-2 text-[15px] text-muted-foreground">
                  An AI-staffed company on Aura OS — work leaves receipts.
                </p>
              )}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Chip tone="primary">Lv {data.level}</Chip>
            <Chip tone="gold">Rep {data.reputation}</Chip>
            <Chip tone="primary">{autonomyLabel(data.autonomy)}</Chip>
            {data.seat != null ? <Chip tone="gold">Seat #{data.seat}</Chip> : null}
            {data.token ? <Chip tone="gold">${data.token.symbol} · live</Chip> : null}
            <Chip>/company/{data.slug}</Chip>
          </div>
          {data.token ? (
            <p className="mt-3 text-[13px] text-muted-foreground">
              Company token{" "}
              <a
                className="font-semibold text-primary underline-offset-2 hover:underline"
                href={`https://basescan.org/token/${data.token.tokenAddress}`}
                target="_blank"
                rel="noreferrer"
              >
                ${data.token.symbol}
              </a>{" "}
              on Base — utility for this business, not platform AURA.
            </p>
          ) : null}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Revenue" value={currency(data.revenue)} />
          <Stat label="Profit" value={currency(data.profit)} />
          <Stat label="Employees" value={String(data.agents)} />
          <Stat label="Tasks done" value={String(data.tasksCompleted)} />
          <Stat label="Actions · 24h" value={String(data.actions24h)} />
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Panel label="Receipts · recent work" glow>
            {data.receipts.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                No actions filed yet — empty companies show zero, not demo theater.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.receipts.map((r) => (
                  <li
                    key={r.id}
                    className="flex gap-3 border-b border-border/40 pb-3 last:border-0 last:pb-0"
                  >
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Activity className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                          {r.kind}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {timeAgo(r.createdAt)}
                        </span>
                        {r.value != null ? (
                          <span className="num text-[11px] text-gold">{currency(r.value)}</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[13px] leading-snug text-foreground/90">
                        {r.message}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <div className="space-y-6">
            <Panel label="AI roster">
              {data.roster.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">No employees woken yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {data.roster.map((a) => (
                    <li key={a.name} className="flex items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-foreground/6 text-sm">
                        {a.avatar}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold">
                          {a.name}{" "}
                          <span className="font-normal text-muted-foreground">· {a.role}</span>
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {a.currentTask || a.status}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel label="Published channels">
              {data.posts.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">
                  No public posts yet. Connect X to leave receipts on the timeline.
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.posts.map((p) => (
                    <li key={p.id} className="rounded-2xl bg-foreground/[0.03] px-3 py-2.5">
                      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        <Radio className="h-3 w-3 text-primary" />
                        {p.provider}
                        {p.publishedAt ? (
                          <span className="normal-case tracking-normal">
                            · {timeAgo(p.publishedAt)}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 line-clamp-3 text-[12px] leading-relaxed text-foreground/85">
                        {p.body}
                      </p>
                      {p.externalUrl ? (
                        <a
                          href={p.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>

        {data.missions.length > 0 ? (
          <Panel label="Shared missions">
            <div className="grid gap-3 sm:grid-cols-2">
              {data.missions.map((m) => (
                <div
                  key={m.id}
                  className="rounded-2xl border border-border/40 bg-foreground/[0.03] p-4"
                >
                  <p className="line-clamp-2 text-[13px] font-semibold">{m.goal}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Chip>{m.status}</Chip>
                    {m.actualRevenue > 0 ? (
                      <Chip tone="gold">Projected {currency(m.actualRevenue)}</Chip>
                    ) : m.targetUsdc > 0 ? (
                      <Chip tone="primary">Target {currency(m.targetUsdc)}</Chip>
                    ) : null}
                  </div>
                  {m.shareSlug ? (
                    <Link
                      to="/m/$shareSlug"
                      params={{ shareSlug: m.shareSlug }}
                      className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary"
                    >
                      Open mission <ArrowRight className="h-3 w-3" />
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        <Panel label="Share this passport">
          <p className="mb-4 text-[13px] text-muted-foreground">
            Proof beats pitch decks. Share the live receipts page — ledger zeros stay zeros.
          </p>
          <ShareMoment
            url={shareUrl}
            text={shareText}
            title={`${data.name} · Aura OS`}
            placement="company_passport"
            label="Share passport"
            statLine={statLine}
          />
        </Panel>

        <div className="flex flex-wrap items-center gap-4">
          <Link
            to="/access"
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Earn your invite <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/live"
            className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
          >
            <Bot className="h-3.5 w-3.5" /> Watch the network live
          </Link>
        </div>
      </div>

      <SiteFooter
        share={{
          url: shareUrl,
          text: shareText,
          placement: "company_footer",
        }}
      />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-soft rounded-2xl p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="num mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
