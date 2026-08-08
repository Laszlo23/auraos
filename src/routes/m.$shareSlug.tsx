import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Chip, Panel, Shimmer } from "@/components/aura/primitives";
import { ShareBar } from "@/components/aura/share";
import { currency, timeAgo } from "@/lib/format";
import { getPublicMission } from "@/lib/revenue-mission.functions";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/m/$shareSlug")({
  head: ({ params }) => ({
    meta: [
      { title: `Mission · Aura OS` },
      {
        name: "description",
        content: "A revenue mission on Aura OS — actuals only when ledger-settled.",
      },
      { property: "og:title", content: "Aura OS mission" },
      { property: "og:url", content: `${SITE_URL}/m/${params.shareSlug}` },
    ],
  }),
  component: PublicMissionPage,
});

function PublicMissionPage() {
  const { shareSlug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["public-mission", shareSlug],
    queryFn: () => getPublicMission({ data: { slug: shareSlug } }),
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
        <h1 className="text-2xl font-semibold">Mission not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This mission is private or the link is wrong.
        </p>
        <Link to="/" className="mt-6 inline-block text-primary">
          Try Aura OS
        </Link>
      </div>
    );
  }

  const shareUrl =
    typeof window !== "undefined" ? window.location.href : `${SITE_URL}/m/${shareSlug}`;
  const shareText = data.showActuals
    ? `Aura mission complete: "${data.goal.slice(0, 80)}" — actual ${currency(data.actuals.revenue_usdc)} USDC settled.`
    : `Aura mission: "${data.goal.slice(0, 80)}" — target ${currency(data.targetUsdc)} (projected until settlement).`;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 md:p-10">
      <div>
        <p className="text-[10px] uppercase tracking-[0.32em] text-primary">
          {data.showActuals ? "Mission complete" : "Mission in progress"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{data.goal}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {data.companyName}
          {data.companySlug ? (
            <>
              {" "}
              ·{" "}
              <Link to="/company/$slug" params={{ slug: data.companySlug }} className="text-primary">
                /company/{data.companySlug}
              </Link>
            </>
          ) : null}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip tone="primary">{data.status}</Chip>
          <Chip tone="gold">#{data.missionNumber}</Chip>
          {data.interventions > 0 && (
            <Chip tone="primary">{data.interventions} interventions</Chip>
          )}
        </div>
      </div>

      <Panel label={data.showActuals ? "Actual economics" : "Projected only"}>
        {data.showActuals ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Revenue · actual
              </p>
              <p className="text-xl font-semibold tabular-nums">
                {currency(data.actuals.revenue_usdc)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Cost · actual
              </p>
              <p className="text-xl font-semibold tabular-nums">
                {currency(data.actuals.cost_usdc)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Profit · actual
              </p>
              <p className="text-xl font-semibold tabular-nums">
                {currency(data.actuals.profit_usdc)}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Target
              </p>
              <p className="text-xl font-semibold tabular-nums">{currency(data.targetUsdc)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Projected revenue
              </p>
              <p className="text-xl font-semibold tabular-nums">
                {currency(data.projected.revenue_usdc)}
              </p>
            </div>
          </div>
        )}
        <p className="mt-4 text-[12px] text-muted-foreground">
          {data.startedAt ? `Started ${timeAgo(data.startedAt)}` : "Not started"}
          {data.completedAt ? ` · Completed ${timeAgo(data.completedAt)}` : ""}
        </p>
        {!data.showActuals && (
          <p className="mt-2 text-[12px] text-muted-foreground">
            Incomplete missions never claim earned revenue without a settlement.
          </p>
        )}
      </Panel>

      <Panel label="Plan snapshot">
        <p className="text-[13px] text-muted-foreground">{data.plan?.summary}</p>
      </Panel>

      <ShareBar url={shareUrl} text={shareText} title="Aura OS mission" />

      <p className="text-center text-sm">
        <Link to="/auth" className="font-semibold text-primary">
          Give your company a mission →
        </Link>
      </p>
    </div>
  );
}
