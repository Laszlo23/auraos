import { Link } from "@tanstack/react-router";

import { Chip, Meter, Panel } from "@/components/aura/primitives";
import { currency, timeAgo } from "@/lib/format";
import type { RevenueMissionRow } from "@/lib/revenue-mission.functions";

type Props = {
  missions: RevenueMissionRow[];
  onOpen?: (id: string) => void;
};

export function MissionHistoryTimeline({ missions, onOpen }: Props) {
  if (missions.length === 0) return null;

  return (
    <Panel
      label="Mission history"
      delay={0.12}
      action={
        <Link
          to="/missions"
          className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary"
        >
          Board
        </Link>
      }
    >
      <div className="space-y-3">
        {missions.slice(0, 8).map((m) => {
          const actual = m.actuals?.revenue_usdc ?? 0;
          const cost = m.actuals?.cost_usdc ?? 0;
          const profit = m.actuals?.profit_usdc ?? 0;
          const agents = Object.keys(
            m.agents_status ||
              (m.plan?.steps || []).reduce(
                (acc, s) => {
                  acc[s.agent] = "1";
                  return acc;
                },
                {} as Record<string, string>,
              ),
          );
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onOpen?.(m.id)}
              className="w-full rounded-2xl border border-border/50 bg-foreground/[0.03] px-4 py-3 text-left transition-colors hover:border-primary/30"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Mission #{m.mission_number}
                </span>
                <Chip
                  tone={
                    m.status === "active"
                      ? "primary"
                      : m.status === "completed"
                        ? "primary"
                        : m.status === "failed"
                          ? "gold"
                          : undefined
                  }
                >
                  {m.status}
                </Chip>
                {m.risk === "high" ? <Chip tone="gold">High risk</Chip> : null}
              </div>
              <p className="mt-2 text-[14px] font-medium leading-snug">{m.goal_text}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <span>Target · {currency(m.target_usdc)}</span>
                <span>Budget · {currency(m.budget_usdc)} allocated</span>
                <span>Agents · {agents.length || "—"}</span>
                {m.started_at ? <span>Started · {timeAgo(m.started_at)}</span> : null}
                {m.completed_at ? <span>Done · {timeAgo(m.completed_at)}</span> : null}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                <Mini label="Actual revenue" value={currency(actual)} />
                <Mini label="Actual cost" value={currency(cost)} />
                <Mini label="Profit / loss" value={currency(profit)} />
                <Mini
                  label="Projected (not actual)"
                  value={currency(m.projected?.revenue_usdc ?? 0)}
                />
              </div>
              <div className="mt-3">
                <Meter value={Math.round((m.progress ?? 0) * 100)} />
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Actual / target · ledger only
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background/40 px-2.5 py-2">
      <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="num mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}
