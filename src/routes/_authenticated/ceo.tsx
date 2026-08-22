import { createFileRoute } from "@tanstack/react-router";

import { Chip, Panel, Pulse } from "@/components/aura/primitives";
import { CeoChat } from "@/components/aura/ceo-chat";
import { useCompany, useCompanyTable } from "@/hooks/use-aura";

export const Route = createFileRoute("/_authenticated/ceo")({
  head: () => ({
    meta: [
      { title: "Atlas, your AI CEO — Aura OS" },
      {
        name: "description",
        content:
          "Speak directly with Atlas, the autonomous chief executive running your company's strategy, agents, and capital.",
      },
      { property: "og:title", content: "Atlas, your AI CEO — Aura OS" },
      { property: "og:description", content: "Instruct the executive who runs your company." },
    ],
  }),
  component: CeoPage,
});

type Agent = { id: string; name: string; role: string; current_task: string };
type Insight = { id: string; kind: string; title: string; body: string; impact: string | null };

function CeoPage() {
  const { data: company } = useCompany();
  const { data: agents = [] } = useCompanyTable<Agent>("agents", { orderBy: "created_at" });
  const { data: insights = [] } = useCompanyTable<Insight>("insights");

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-h-[calc(100vh-12rem)] flex-col sm:min-h-[72vh]">
        <CeoChat />
      </div>

      <aside className="space-y-5">
        <Panel label="Current strategy">
          <p className="text-[12.5px] leading-relaxed text-foreground/85">{company?.strategy}</p>
        </Panel>
        <Panel label="Reporting to Atlas" delay={0.08}>
          <div className="space-y-3">
            {agents.slice(1).map((a) => (
              <div key={a.id} className="flex items-start gap-2.5">
                <span className="mt-1.5">
                  <Pulse tone="muted" />
                </span>
                <div>
                  <p className="text-[12.5px] font-medium">{a.name}</p>
                  <p className="text-[11px] leading-snug text-muted-foreground">{a.current_task}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel label="Pending decisions" delay={0.16}>
          <div className="space-y-3">
            {insights
              .filter((i) => i.kind === "suggestion")
              .map((i) => (
                <div key={i.id} className="glass-soft rounded-2xl p-3.5">
                  <p className="text-[12.5px] leading-snug">{i.title}</p>
                  <Chip tone="gold" className="mt-2">
                    {i.impact}
                  </Chip>
                </div>
              ))}
          </div>
        </Panel>
      </aside>
    </div>
  );
}
