import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Chip, Meter, PageHeader, Panel, Shimmer } from "@/components/aura/primitives";
import { MissionDetailSheet } from "@/components/aura/mission-detail-sheet";
import { RevenueMissionsBand } from "@/components/aura/revenue-missions";
import { currency, timeAgo } from "@/lib/format";
import { listRevenueMissions } from "@/lib/revenue-mission.functions";

export const Route = createFileRoute("/_authenticated/missions")({
  head: () => ({
    meta: [
      { title: "Revenue Missions — Aura OS" },
      {
        name: "description",
        content:
          "Goal → strategy → execution → result. Progress from real ledger settlements only.",
      },
    ],
  }),
  component: MissionsPage,
});

function MissionsPage() {
  const [peekMissionId, setPeekMissionId] = useState<string | null>(null);
  const { data: missions = [], isLoading } = useQuery({
    queryKey: ["revenue-missions"],
    queryFn: () => listRevenueMissions(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Company"
        title="Revenue Missions"
        description="Give the company an outcome. AI plans the path. You start it. Settled revenue only from the ledger."
      />

      <RevenueMissionsBand />

      <Panel label="All missions">
        {isLoading && <Shimmer className="h-32" />}
        {!isLoading && missions.length === 0 && (
          <div className="rounded-2xl border border-border/40 bg-foreground/[0.03] px-4 py-5">
            <p className="font-medium">Give your company something to do.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              A sentence is enough. Aura turns it into a plan you approve.
            </p>
          </div>
        )}
        <ul className="space-y-3">
          {missions.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setPeekMissionId(m.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 px-4 py-3 text-left transition hover:border-primary/30"
              >
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    #{m.mission_number} · {m.created_at ? timeAgo(m.created_at) : ""}
                  </p>
                  <p className="truncate text-sm font-medium">{m.goal_text}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-28">
                    <Meter value={Math.round((m.progress ?? 0) * 100)} />
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {currency(m.actuals?.revenue_usdc ?? 0)} / {currency(m.target_usdc)}
                  </span>
                  <Chip
                    tone={
                      m.status === "active" ? "primary" : m.status === "paused" ? "gold" : "gold"
                    }
                  >
                    {m.status}
                  </Chip>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      <MissionDetailSheet
        missionId={peekMissionId}
        open={Boolean(peekMissionId)}
        onOpenChange={(next) => {
          if (!next) setPeekMissionId(null);
        }}
      />
    </div>
  );
}
