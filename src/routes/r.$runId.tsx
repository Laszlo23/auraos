import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Chip, Panel, Pulse, Shimmer } from "@/components/aura/primitives";
import { ShareBar } from "@/components/aura/share";
import { getPublicAkquiseResult } from "@/lib/akquise.functions";
import { getTemplate } from "@/lib/akquise-templates";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/r/$runId")({
  head: ({ params }) => ({
    meta: [
      { title: `Aura completed this task · ${params.runId}` },
      {
        name: "description",
        content: "Aura researched, scored, and delivered a real result. Run this yourself.",
      },
      { property: "og:title", content: "Aura completed this task" },
      {
        property: "og:description",
        content: "Real research. Real sources. No invented contacts.",
      },
      { property: "og:url", content: `${SITE_URL}/r/${params.runId}` },
    ],
  }),
  component: PublicResultPage,
});

function PublicResultPage() {
  const { runId } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["akquise-public", runId],
    queryFn: () => getPublicAkquiseResult({ data: { slug: runId } }),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-8">
        <Shimmer className="h-24" />
        <Shimmer className="h-48" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-lg p-12 text-center">
        <h1 className="text-2xl font-semibold">Result not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This run is private or the link is wrong.
        </p>
        <Link to="/" className="mt-6 inline-block text-primary">
          Try Aura OS
        </Link>
      </div>
    );
  }

  const template = getTemplate(data.template);
  const shareUrl = typeof window !== "undefined" ? window.location.href : `${SITE_URL}/r/${runId}`;
  const shareText = `Aura completed: "${data.goal.slice(0, 100)}" — ${data.leads.length} real prospects.`;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 md:p-10">
      <div>
        <p className="text-[10px] uppercase tracking-[0.32em] text-primary">
          Aura completed this task
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{data.goal}</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip tone="primary">{template.label}</Chip>
          <Chip tone="gold">{data.leads.length} prospects</Chip>
          {data.auraSpent > 0 && <Chip tone="primary">{data.auraSpent} AURA</Chip>}
          {data.agents.map((a) => (
            <Chip key={a} tone="gold">
              {a}
            </Chip>
          ))}
        </div>
      </div>

      <Panel label="Execution">
        <ul className="space-y-2">
          {(Array.isArray(data.steps) ? data.steps : []).map(
            (s: { id: string; label: string; status: string; detail?: string }) => (
              <li key={s.id} className="flex items-start gap-2 text-[13px]">
                <Pulse
                  tone={
                    s.status === "done"
                      ? "primary"
                      : s.status === "failed"
                        ? "destructive"
                        : "muted"
                  }
                />
                <span>
                  {s.label}
                  {s.detail ? <span className="text-muted-foreground"> — {s.detail}</span> : null}
                </span>
              </li>
            ),
          )}
        </ul>
      </Panel>

      <Panel label="Result preview (contacts redacted)">
        <div className="space-y-3">
          {data.leads.slice(0, 12).map((l, i) => (
            <div key={i} className="glass-soft rounded-2xl p-3">
              <div className="flex items-center gap-2">
                <span className="num text-sm font-semibold text-primary">{Number(l.score)}</span>
                <p className="text-[13px] font-semibold">{String(l.org || l.name || "Prospect")}</p>
              </div>
              {l.snippet ? (
                <p className="mt-2 text-[12px] text-muted-foreground">{String(l.snippet)}</p>
              ) : null}
              {l.source_url ? (
                <a
                  href={String(l.source_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-[11px] text-primary underline-offset-2 hover:underline"
                >
                  source
                </a>
              ) : null}
            </div>
          ))}
          {data.leads.length === 0 && (
            <p className="text-sm text-muted-foreground">No public lead preview.</p>
          )}
        </div>
      </Panel>

      <Panel label="Honesty">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Emails and phones are hidden on shared pages. Scores and snippets come from scraped
          sources — Aura does not invent contacts.
        </p>
      </Panel>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          to="/akquise"
          className="flex flex-1 items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Run this yourself →
        </Link>
        <Link
          to="/auth"
          className="flex flex-1 items-center justify-center rounded-2xl bg-foreground/8 px-5 py-3 text-sm font-semibold"
        >
          Create your company →
        </Link>
      </div>

      <ShareBar url={shareUrl} text={shareText} title="Aura OS result" />
    </div>
  );
}
