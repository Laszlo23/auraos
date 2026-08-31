import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";

import { Panel } from "@/components/aura/primitives";
import { getDeskTraffic, type DeskTraffic } from "@/lib/site-traffic.functions";

function getDeskToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem("aura_desk_token");
  } catch {
    return null;
  }
}

function PathTable({
  rows,
}: {
  rows: Array<{ path: string; views?: number; hits?: number; sessions?: number }>;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-white/60">No rows yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-[10px] uppercase tracking-[0.14em] text-white/45">
          <tr>
            <th className="pb-2 font-medium">Path</th>
            <th className="pb-2 font-medium">Views</th>
            <th className="pb-2 font-medium">Sessions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.path} className="border-t border-white/10">
              <td className="max-w-[220px] truncate py-2 font-mono text-xs text-white/85">
                {row.path}
              </td>
              <td className="py-2 tabular-nums">{row.views ?? row.hits ?? 0}</td>
              <td className="py-2 tabular-nums text-white/60">{row.sessions ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DeskTrafficPanel({
  t,
}: {
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["desk-traffic"],
    queryFn: async () => {
      const token = getDeskToken();
      return getDeskTraffic({ data: { token } });
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return <p className="text-sm text-white/60">{t("common.loading")}</p>;
  }
  if (error || !data) {
    return <p className="text-sm text-white/60">{t("desk.trafficError")}</p>;
  }

  return <TrafficBody data={data} t={t} />;
}

function TrafficBody({
  data,
  t,
}: {
  data: DeskTraffic;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Panel label={t("desk.trafficPageViews")}>
          <p className="num text-3xl font-semibold text-white">{data.pageViews}</p>
          <p className="mt-1 text-xs text-white/50">
            {t("desk.trafficWindow", { days: data.days })}
          </p>
        </Panel>
        <Panel label={t("desk.trafficSessions")}>
          <p className="num text-3xl font-semibold text-white">{data.sessions}</p>
          <p className="mt-1 text-xs text-white/50">{t("desk.trafficFirstParty")}</p>
        </Panel>
        <Panel label={t("desk.trafficCaddy")}>
          <p className="num text-3xl font-semibold text-white">{data.caddy.humanHits}</p>
          <p className="mt-1 text-xs text-white/50">
            {data.caddy.generatedAt
              ? t("desk.trafficCaddyMeta", { bots: data.caddy.botHits })
              : t("desk.trafficCaddyEmpty")}
          </p>
        </Panel>
      </div>

      <Panel label={t("desk.trafficRelics")}>
        <p className="num text-3xl font-semibold text-white">
          {data.relics.remaining}/{data.relics.max}
        </p>
        <p className="mt-1 text-xs text-white/50">
          {data.relics.sealed
            ? t("desk.trafficRelicsSealed")
            : t("desk.trafficRelicsMeta", {
                remaining: data.relics.remaining,
                max: data.relics.max,
              })}
        </p>
        <p className="mt-3 text-xs text-white/40">{t("desk.trafficRelicsTeaser")}</p>
      </Panel>

      <Panel label={t("desk.trafficTopPages")}>
        <PathTable rows={data.topPaths} />
      </Panel>

      {data.caddy.topPaths.length > 0 ? (
        <Panel label={t("desk.trafficCaddyPaths")}>
          <PathTable rows={data.caddy.topPaths} />
        </Panel>
      ) : null}

      <Panel label={t("desk.trafficGa")}>
        {!data.ga.configured ? (
          <p className="text-sm text-white/60">{t("desk.trafficGaMissing")}</p>
        ) : data.ga.error ? (
          <p className="text-sm text-white/70">{data.ga.error}</p>
        ) : (
          <>
            <p className="text-sm text-white/70">
              {t("desk.trafficGaCounts", {
                views: data.ga.pageViews ?? 0,
                sessions: data.ga.sessions ?? 0,
              })}
            </p>
            <div className="mt-3">
              <PathTable rows={data.ga.topPaths ?? []} />
            </div>
          </>
        )}
      </Panel>

      <p className="flex items-center gap-2 text-xs text-white/40">
        <Eye className="h-3.5 w-3.5" />
        {t("desk.trafficNote")}
      </p>
    </div>
  );
}
