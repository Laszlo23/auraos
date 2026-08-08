import { createFileRoute } from "@tanstack/react-router";

import { Chip, PageHeader, Panel, Pulse } from "@/components/aura/primitives";
import { useCompanyTable, useRowMutation } from "@/hooks/use-aura";

export const Route = createFileRoute("/_authenticated/automation")({
  head: () => ({
    meta: [
      { title: "Automation — Aura OS" },
      {
        name: "description",
        content:
          "Standing instructions your company follows without being asked — flows that run whether or not you're watching.",
      },
      { property: "og:title", content: "Automation — Aura OS" },
      { property: "og:description", content: "Standing instructions, running quietly." },
    ],
  }),
  component: AutomationPage,
});

type Automation = {
  id: string;
  name: string;
  description: string;
  status: string;
  runs: number;
  nodes: string[];
};

function AutomationPage() {
  const { data: flows = [] } = useCompanyTable<Automation>("automations", {
    orderBy: "created_at",
  });
  const mutate = useRowMutation("automations");

  return (
    <div>
      <PageHeader
        eyebrow="Reflexes"
        title="Standing instructions"
        description="Catalog of automation recipes saved for your company. Pause/resume updates status in the database — a dedicated runner is not live yet, so these do not fire on their own."
      />

      {flows.length === 0 ? (
        <Panel className="p-8 text-center text-sm text-muted-foreground">
          No automations yet. When you add flows they will appear here with honest status — not
          simulated runs.
        </Panel>
      ) : null}

      <div className="space-y-5">
        {flows.map((f, i) => (
          <Panel key={f.id} className="p-7" delay={0.05 * i}>
            <div className="flex flex-wrap items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <Pulse tone={f.status === "active" ? "primary" : "muted"} />
                  <h3 className="text-lg font-semibold">{f.name}</h3>
                  <Chip tone={f.status === "active" ? "primary" : "neutral"}>{f.status}</Chip>
                </div>
                <p className="mt-2.5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
              <div className="text-right">
                <p className="num text-2xl font-semibold">{f.runs.toLocaleString()}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">runs</p>
              </div>
              <button
                onClick={() =>
                  mutate.mutate({
                    id: f.id,
                    values: { status: f.status === "active" ? "paused" : "active" },
                  })
                }
                className="rounded-2xl bg-foreground/7 px-4 py-2 text-xs transition-colors hover:bg-foreground/12"
              >
                {f.status === "active" ? "Pause" : "Resume"}
              </button>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-2">
              {f.nodes.map((n, idx) => (
                <div key={n} className="flex items-center gap-2">
                  <span className="glass-soft rounded-2xl px-3.5 py-2 text-[12px]">{n}</span>
                  {idx < f.nodes.length - 1 && (
                    <svg width="30" height="8" className="text-primary/60">
                      <line
                        x1="0"
                        y1="4"
                        x2="30"
                        y2="4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className={f.status === "active" ? "flow-line" : ""}
                      />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
