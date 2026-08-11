import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel, Shimmer } from "@/components/aura/primitives";
import { getOpsDashboard, triggerOpsTick, type OpsDashboard } from "@/lib/ops.functions";

export const Route = createFileRoute("/_authenticated/ops")({
  head: () => ({
    meta: [
      { title: "Ops — Aura OS" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OpsPage,
});

function OpsPage() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["ops-dashboard"],
    queryFn: async (): Promise<OpsDashboard> =>
      (await getOpsDashboard()) as unknown as OpsDashboard,
    retry: false,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const tick = useMutation({
    mutationFn: () => triggerOpsTick(),
    onSuccess: (res) => {
      const r = res as {
        tasksProcessed?: number;
        missionsAdvanced?: number;
      };
      toast.success(
        `Tick done · tasks ${r.tasksProcessed ?? 0} · missions +${r.missionsAdvanced ?? 0}`,
      );
      void qc.invalidateQueries({ queryKey: ["ops-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message || "Tick failed"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Shimmer className="h-16" />
        <Shimmer className="h-40" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
        <h1 className="font-display text-2xl">Ops</h1>
        <p className="text-[13px] text-muted-foreground">
          {error instanceof Error ? error.message : "Not authorized."}
        </p>
        <p className="text-[12px] text-muted-foreground">
          Set <code className="text-foreground/80">OPS_ADMIN_EMAILS</code> to your login email.
        </p>
        <Link to="/console" className="text-[12px] text-primary">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const hbAgeMin = data.lastHeartbeat
    ? Math.round((Date.now() - new Date(data.lastHeartbeat.ranAt).getTime()) / 60_000)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform ops"
        description={`Signed in as ${data.email}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-border/50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => tick.mutate()}
              disabled={tick.isPending}
              className="rounded-2xl bg-primary/14 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary disabled:opacity-50"
            >
              {tick.isPending ? "Running…" : "Trigger tick"}
            </button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Last worker heartbeat"
          value={
            hbAgeMin == null
              ? "never"
              : hbAgeMin < 1
                ? "just now"
                : `${hbAgeMin}m ago`
          }
        />
        <Stat label="Active missions" value={String(data.activeMissionCount)} />
        <Stat label="Spins today" value={String(data.spinsToday)} />
        <Stat label="Chain stamp pending" value={String(data.pendingChainSpins)} />
      </div>

      <Panel label="Stuck missions · no update &gt; 30m">
        {data.stuckMissions.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">None — good.</p>
        ) : (
          <ul className="space-y-2">
            {data.stuckMissions.map((m) => (
              <li
                key={m.id}
                className="rounded-2xl border border-border/40 px-3 py-2 text-[12px]"
              >
                <div className="font-medium text-foreground/90">
                  {(m.goal_text || "Mission").slice(0, 80)}
                </div>
                <div className="mt-1 text-muted-foreground">
                  updated {new Date(m.updated_at).toLocaleString()} · NBA{" "}
                  {m.next_best_action?.title?.slice(0, 40) || "—"} (
                  {m.next_best_action?.status || "none"})
                </div>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground/80">
                  {m.company_id} · {m.id}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel label="Companies · recent">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[12px]">
            <thead className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="pb-2 pr-3 font-semibold">Name</th>
                <th className="pb-2 pr-3 font-semibold">Autonomy</th>
                <th className="pb-2 pr-3 font-semibold">Paper</th>
                <th className="pb-2 pr-3 font-semibold">Armed</th>
                <th className="pb-2 font-semibold">Desk</th>
              </tr>
            </thead>
            <tbody>
              {data.companies.map((c) => (
                <tr key={c.id} className="border-t border-border/30">
                  <td className="py-2 pr-3">{c.name}</td>
                  <td className="py-2 pr-3">{c.autonomy ?? "—"}</td>
                  <td className="py-2 pr-3">{c.trading_paper ? "yes" : "live"}</td>
                  <td className="py-2 pr-3">{c.trading_armed ? "armed" : "off"}</td>
                  <td className="py-2">{c.desk_network || "base"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/50 px-3.5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-xl text-foreground">{value}</p>
    </div>
  );
}
