import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Chip, Pulse, Shimmer } from "@/components/aura/primitives";
import { ShareBar } from "@/components/aura/share";
import { SiteFooter } from "@/components/aura/site-footer";
import { WeeklyReportView } from "@/components/aura/weekly-report-view";
import { getPublicWeeklyReport } from "@/lib/weekly-report.functions";
import { OG_IMAGE, SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/w/$shareSlug")({
  head: ({ params }) => ({
    meta: [
      { title: `Week in review · Aura OS` },
      {
        name: "description",
        content: "A weekly report from an AI company on Aura OS — posts shipped, replies, and agent work.",
      },
      { property: "og:title", content: "Week in review · Aura OS" },
      { property: "og:url", content: `${SITE_URL}/w/${params.shareSlug}` },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/w/${params.shareSlug}` }],
  }),
  component: PublicWeeklyReportPage,
});

function PublicWeeklyReportPage() {
  const { shareSlug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["public-weekly-report", shareSlug],
    queryFn: () => getPublicWeeklyReport({ data: { slug: shareSlug } }),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-8">
        <Shimmer className="h-28" />
        <Shimmer className="h-48" />
        <Shimmer className="h-64" />
      </div>
    );
  }

  if (!data?.snapshot) {
    return (
      <main className="mx-auto max-w-lg p-12 text-center">
        <h1 className="font-display text-2xl font-semibold">Report not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This week in review is private or the link is wrong.
        </p>
        <Link to="/" className="mt-6 inline-block text-primary">
          Try Aura OS
        </Link>
      </main>
    );
  }

  const snap = data.snapshot;
  const shareUrl =
    typeof window !== "undefined" ? window.location.href : `${SITE_URL}/w/${shareSlug}`;
  const shareText = `${snap.companyName} week in review (${snap.rangeLabel}): ${snap.totals.postsPublished} posts, ${snap.totals.repliesSent} replies, ${snap.totals.agentActions} agent actions.`;

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

      <header className="relative z-10 mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link
          to="/"
          className="text-[12px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Aura OS
        </Link>
        <Chip tone="primary">
          <Pulse /> Week in review
        </Chip>
      </header>

      <div className="relative z-10 mx-auto max-w-3xl space-y-10 px-6 pb-16">
        <WeeklyReportView snapshot={snap} mode="public" />

        <ShareBar
          url={shareUrl}
          text={shareText}
          title={`${snap.companyName} · week in review`}
          placement="weekly-report"
        />

        {snap.companySlug ? (
          <p className="text-center text-[12px] text-muted-foreground">
            Live company passport:{" "}
            <Link
              to="/company/$slug"
              params={{ slug: snap.companySlug }}
              className="text-primary hover:underline"
            >
              /company/{snap.companySlug}
            </Link>
          </p>
        ) : null}
      </div>

      <SiteFooter />
    </main>
  );
}
