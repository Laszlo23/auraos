import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Chip, PageHeader, Panel, Pulse } from "@/components/aura/primitives";
import { Counter } from "@/components/aura/counter";
import { useCompany, useCompanyTable } from "@/hooks/use-aura";
import { useDispatchTask } from "@/lib/actions";
import { trackAppEvent } from "@/lib/app-track";
import { currency } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({
    meta: [
      { title: "Sales — Aura OS" },
      {
        name: "description",
        content:
          "The pipeline Orin qualifies and you advance — deals move when you approve the next step.",
      },
      { property: "og:title", content: "Sales — Aura OS" },
      { property: "og:description", content: "A pipeline you steer. Agents draft the next move." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SalesPage,
});

type Deal = {
  id: string;
  name: string;
  stage: string;
  value: number;
  note: string | null;
  status: string;
};

const STAGES = ["Inbound", "Qualified", "Negotiating", "Won"] as const;

function SalesPage() {
  const { data: company } = useCompany();
  const { data: deals = [], isLoading } = useCompanyTable<Deal>("deals", {
    orderBy: "sort_order",
  });
  const qc = useQueryClient();
  const dispatch = useDispatchTask();

  const byStage = STAGES.map((name) => ({
    name,
    deals: deals.filter((d) => d.stage === name && d.status !== "lost"),
  }));
  const pipeline = deals
    .filter((d) => d.stage !== "Won" && d.status === "open")
    .reduce((a, d) => a + Number(d.value), 0);
  const won = deals.filter((d) => d.stage === "Won").reduce((a, d) => a + Number(d.value), 0);

  const advance = async (deal: Deal) => {
    const idx = STAGES.indexOf(deal.stage as (typeof STAGES)[number]);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const nextStage = STAGES[idx + 1]!;
    const { error } = await supabase
      .from("deals")
      .update({
        stage: nextStage,
        status: nextStage === "Won" ? "won" : "open",
        updated_at: new Date().toISOString(),
      })
      .eq("id", deal.id);
    if (error) {
      toast.error("Could not advance that deal.");
      return;
    }
    dispatch.mutate({
      title: `${deal.name} → ${nextStage}`,
      description: `Move ${deal.name} into ${nextStage} and run the next play.`,
      agent: "Orin",
      priority: "high",
      activity: `You moved ${deal.name} to ${nextStage}; Orin follow-up queued`,
    });
    trackAppEvent("deal_advanced", {
      company_id: company?.id,
      deal: deal.name,
      stage: nextStage,
    });
    toast.success(`${deal.name} moved to ${nextStage}.`);
    void qc.invalidateQueries({ queryKey: ["table", "deals"] });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Pipeline"
        title={deals.length ? `Orin is carrying ${currency(pipeline)}` : "Orin's pipeline is empty"}
        description="Every lead is qualified, sequenced and negotiated. Advancing a deal updates the pipeline and queues Orin's next play — it does not invent closed work."
      />

      <div className="mb-8 grid gap-5 sm:grid-cols-3">
        {[
          ["Open pipeline", pipeline, "text-gold"],
          ["Won", won, ""],
          ["Open deals", deals.filter((d) => d.status === "open").length, "text-primary"],
        ].map(([label, value, tone], i) => (
          <Panel key={label as string} className="p-6" delay={0.05 * i}>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
            <p className={`num mt-3 text-3xl font-semibold ${tone}`}>
              <Counter
                value={value as number}
                format={(n) => (label === "Open deals" ? `${Math.round(n)}` : currency(n))}
              />
            </p>
          </Panel>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading pipeline…</p>
      ) : deals.length === 0 ? (
        <Panel className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No deals yet. Start a mission or ask Atlas to propose the first outreach tasks.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              to="/missions"
              className="rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              Open Missions
            </Link>
            <Link
              to="/akquise"
              className="rounded-2xl bg-foreground/8 px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Akquise
            </Link>
          </div>
        </Panel>
      ) : (
        <div className="grid gap-5 lg:grid-cols-4">
          {byStage.map((stage, si) => (
            <div key={stage.name}>
              <div className="mb-4 flex items-center gap-2 px-1">
                <Pulse tone={stage.name === "Won" ? "gold" : "primary"} />
                <p className="text-sm font-medium">{stage.name}</p>
                <span className="num ml-auto text-xs text-muted-foreground">
                  {currency(stage.deals.reduce((a, d) => a + Number(d.value), 0))}
                </span>
              </div>
              <div className="space-y-3">
                {stage.deals.length === 0 ? (
                  <p className="px-1 text-[12px] text-muted-foreground/70">Empty</p>
                ) : (
                  stage.deals.map((deal, i) => (
                    <Panel key={deal.id} className="p-4" delay={0.03 * (i + si)}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-medium">{deal.name}</p>
                        <span className="num text-[13px] text-gold">
                          {currency(Number(deal.value))}
                        </span>
                      </div>
                      {deal.note ? (
                        <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
                          {deal.note}
                        </p>
                      ) : null}
                      <div className="mt-3 flex items-center gap-2">
                        <Chip>Orin</Chip>
                        {si < STAGES.length - 1 && (
                          <button
                            type="button"
                            onClick={() => void advance(deal)}
                            className="ml-auto rounded-xl bg-foreground/6 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-primary/14 hover:text-primary"
                          >
                            Advance
                          </button>
                        )}
                      </div>
                    </Panel>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
