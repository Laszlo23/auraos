import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Chip, Meter, PageHeader, Panel, SectionTitle } from "@/components/aura/primitives";
import { Counter } from "@/components/aura/counter";
import { Spark } from "@/components/aura/spark";
import { useCompany, useCompanyTable } from "@/hooks/use-aura";
import { useDispatchTask } from "@/lib/actions";
import { trackAppEvent } from "@/lib/app-track";
import { compact, currency, percent } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/marketing")({
  head: () => ({
    meta: [
      { title: "Marketing — Aura OS" },
      {
        name: "description",
        content:
          "Campaigns Vela writes, launches and rebalances on her own — with the channel mix that protects your margin.",
      },
      { property: "og:title", content: "Marketing — Aura OS" },
      { property: "og:description", content: "Campaigns that run themselves." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MarketingPage,
});

type Metric = { day: string; visitors: number; revenue: number };
type Campaign = {
  id: string;
  name: string;
  channel: string;
  progress: number;
  value: number;
  roas: number;
  status: string;
};

function MarketingPage() {
  const { data: company } = useCompany();
  const { data: metrics = [] } = useCompanyTable<Metric>("metrics", { orderBy: "day" });
  const { data: campaigns = [], isLoading } = useCompanyTable<Campaign>("campaigns", {
    orderBy: "created_at",
  });
  const last = metrics.slice(-30);
  const dispatch = useDispatchTask();
  const qc = useQueryClient();

  const channelMix = (() => {
    const totals = new Map<string, number>();
    for (const c of campaigns) {
      totals.set(c.channel, (totals.get(c.channel) ?? 0) + Number(c.value));
    }
    const sum = [...totals.values()].reduce((a, b) => a + b, 0) || 1;
    return [...totals.entries()]
      .map(([name, value]) => [name, Math.round((value / sum) * 100)] as const)
      .sort((a, b) => b[1] - a[1]);
  })();

  const toggleCampaign = async (c: Campaign) => {
    const next = c.status === "running" ? "paused" : "running";
    const { error } = await supabase
      .from("campaigns")
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq("id", c.id);
    if (error) {
      toast.error("Could not update campaign.");
      return;
    }
    if (next === "running") {
      dispatch.mutate({
        title: `Run campaign — ${c.name}`,
        agent: "Vela",
        priority: "medium",
        activity: `Campaign "${c.name}" marked running — Vela task queued`,
      });
    }
    trackAppEvent("campaign_toggled", {
      company_id: company?.id,
      campaign: c.name,
      status: next,
    });
    toast.success(
      next === "running"
        ? `${c.name} marked running — Vela task queued.`
        : `${c.name} paused in the database.`,
    );
    void qc.invalidateQueries({ queryKey: ["table", "campaigns"] });
  };

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Demand"
        title={
          campaigns.length
            ? `${campaigns.filter((c) => c.status === "running").length} campaigns marked running`
            : "No campaigns yet"
        }
        description="Campaign rows are real database records. Launch queues a Vela task — we do not invent spend or ROAS."
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel className="p-7">
          <SectionTitle title="Reach" hint="Visitors, last 30 days" />
          {last.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No metrics yet.</p>
          ) : (
            <>
              <div className="h-32">
                <Spark points={last.map((m) => m.visitors)} height={128} />
              </div>
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div>
                  <p className="num text-2xl font-semibold">
                    <Counter value={last.reduce((a, m) => a + m.visitors, 0)} format={compact} />
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Visitors
                  </p>
                </div>
                <div>
                  <p className="num text-2xl font-semibold text-gold">
                    <Counter
                      value={last.reduce((a, m) => a + m.revenue, 0)}
                      format={(n) => currency(n)}
                    />
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Attributed
                  </p>
                </div>
                <div>
                  <p className="num text-2xl font-semibold text-primary">
                    {campaigns.length
                      ? percent(
                          campaigns.reduce((a, c) => a + Number(c.roas), 0) / campaigns.length,
                        )
                      : "—"}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Avg ROAS
                  </p>
                </div>
              </div>
            </>
          )}
        </Panel>

        <Panel className="p-7" delay={0.08}>
          <SectionTitle title="Channel mix" hint="From live campaign value" />
          <div className="space-y-5">
            {channelMix.length === 0 ? (
              <p className="text-sm text-muted-foreground">No channel spend yet.</p>
            ) : (
              channelMix.map(([name, share]) => (
                <div key={name}>
                  <div className="mb-2 flex justify-between text-[13px]">
                    <span>{name}</span>
                    <span className="num text-muted-foreground">{share}%</span>
                  </div>
                  <Meter value={share} tone={name === "Paid" ? "gold" : "primary"} />
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      <section>
        <SectionTitle title="Campaigns" hint="Persisted status" />
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading campaigns…</p>
        ) : campaigns.length === 0 ? (
          <Panel className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No data yet — approve your first agent proposal, or create a campaign for Vela.
            </p>
          </Panel>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {campaigns.map((c, i) => (
              <Panel key={c.id} className="p-6" delay={0.04 * i}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[15px] font-semibold leading-snug">{c.name}</h3>
                  <Chip
                    tone={
                      c.status === "running"
                        ? "primary"
                        : c.status === "queued"
                          ? "neutral"
                          : "gold"
                    }
                  >
                    {c.status}
                  </Chip>
                </div>
                <p className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                  {c.channel}
                </p>
                <div className="mt-5">
                  <Meter value={c.progress} />
                </div>
                <div className="mt-4 flex justify-between text-[13px]">
                  <span className="text-gold">{currency(Number(c.value))}</span>
                  <span className="text-muted-foreground">{percent(Number(c.roas))} ROAS</span>
                </div>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleCampaign(c)}
                    className="flex-1 rounded-2xl bg-foreground/6 px-3 py-2 text-[11px] transition-colors hover:bg-foreground/12"
                  >
                    {c.status === "running" ? "Pause" : "Launch"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      dispatch.mutate({
                        title: `Brief on ${c.name}`,
                        agent: "Vela",
                        priority: "low",
                        activity: `Brief on "${c.name}" queued for Vela`,
                      })
                    }
                    className="rounded-2xl bg-foreground/6 px-3 py-2 text-[11px] transition-colors hover:bg-foreground/12"
                  >
                    Brief
                  </button>
                </div>
              </Panel>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
