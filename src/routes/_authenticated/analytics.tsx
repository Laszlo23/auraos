import { createFileRoute, Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader, Panel, SectionTitle } from "@/components/aura/primitives";
import { Counter } from "@/components/aura/counter";
import { useCompanyTable } from "@/hooks/use-aura";
import { downloadCsv } from "@/lib/actions";
import { compact, currency, percent } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Aura OS" },
      {
        name: "description",
        content:
          "Ninety days of revenue, traffic, conversion and autonomous throughput, read the way an executive reads them.",
      },
      { property: "og:title", content: "Analytics — Aura OS" },
      { property: "og:description", content: "Ninety days of company signal." },
    ],
  }),
  component: AnalyticsPage,
});

type Metric = {
  day: string;
  revenue: number;
  visitors: number;
  tasks_completed: number;
  conversion: number;
};

function AnalyticsPage() {
  const { data: metrics = [] } = useCompanyTable<Metric>("metrics", { orderBy: "day" });
  const rows = metrics.map((m) => ({ ...m, label: m.day.slice(5) }));
  const revenue = rows.reduce((a, m) => a + m.revenue, 0);
  const visitors = rows.reduce((a, m) => a + m.visitors, 0);
  const throughput = rows.reduce((a, m) => a + m.tasks_completed, 0);
  const conv = rows.length ? rows.reduce((a, m) => a + m.conversion, 0) / rows.length : 0;

  const axis = {
    stroke: "color-mix(in oklab, currentColor 22%, transparent)",
    tick: { fill: "currentColor", fontSize: 11, opacity: 0.55 },
  } as const;

  return (
    <div className="space-y-10 text-foreground">
      <PageHeader
        eyebrow="Signal"
        title="Ninety days, honestly reported"
        description="Charts read straight from your metrics table. Empty companies show zeros until real activity lands — we do not invent traffic or revenue."
        actions={
          <button
            onClick={() =>
              downloadCsv("aura-metrics.csv", metrics as unknown as Record<string, unknown>[])
            }
            className="flex items-center gap-2 rounded-2xl bg-foreground/8 px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-foreground/14"
          >
            <Download className="h-3.5 w-3.5" /> Export 90 days
          </button>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Revenue", value: revenue, fmt: (n: number) => currency(n), tone: "text-gold" },
          { label: "Visitors", value: visitors, fmt: (n: number) => compact(n), tone: "" },
          {
            label: "Avg conversion",
            value: conv,
            fmt: (n: number) => percent(n, 2),
            tone: "text-primary",
          },
          { label: "Tasks completed", value: throughput, fmt: (n: number) => compact(n), tone: "" },
        ].map((k, i) => (
          <Panel key={k.label} className="p-6" delay={0.05 * i}>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{k.label}</p>
            <p className={`num mt-3 text-3xl font-semibold ${k.tone}`}>
              <Counter value={k.value} format={k.fmt} />
            </p>
          </Panel>
        ))}
      </div>

      {rows.length === 0 ? (
        <Panel className="p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No metrics yet. Once agents ship work and missions settle, Ledger fills this board.
          </p>
          <Link
            to="/missions"
            className="mt-4 inline-flex rounded-2xl bg-primary/14 px-4 py-2 text-xs font-semibold text-primary"
          >
            Launch a mission
          </Link>
        </Panel>
      ) : null}

      <Panel className="p-7">
        <SectionTitle title="Revenue" hint="Daily, last 90 days" />
        <div className="h-72 w-full">
          {rows.length === 0 ? (
            <p className="grid h-full place-items-center text-sm text-muted-foreground">
              Waiting for the first data point.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows} margin={{ left: -18, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="color-mix(in oklab, currentColor 10%, transparent)"
                />
                <XAxis
                  dataKey="label"
                  {...axis}
                  minTickGap={40}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  {...axis}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => compact(Number(v))}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    fontSize: 12,
                  }}
                  formatter={(v) => currency(Number(v))}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--gold)"
                  strokeWidth={2}
                  fill="url(#rev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="p-7">
          <SectionTitle title="Traffic" hint="Visitors per day" />
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows} margin={{ left: -18, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="vis" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.38} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="color-mix(in oklab, currentColor 10%, transparent)"
                />
                <XAxis
                  dataKey="label"
                  {...axis}
                  minTickGap={40}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  {...axis}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => compact(Number(v))}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="visitors"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#vis)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="p-7">
          <SectionTitle title="Autonomous throughput" hint="Tasks your agents finished" />
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows.slice(-30)} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid
                  vertical={false}
                  stroke="color-mix(in oklab, currentColor 10%, transparent)"
                />
                <XAxis
                  dataKey="label"
                  {...axis}
                  minTickGap={30}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis {...axis} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "color-mix(in oklab, currentColor 6%, transparent)" }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="tasks_completed" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}
