import { createServerFn } from "@tanstack/react-start";

type LooseDb = {
  from: (table: string) => any;
};

type PageRow = { path: string; views: number; sessions: number };
type DayRow = { day: string; views: number; sessions: number };

export type DeskTraffic = {
  days: number;
  pageViews: number;
  sessions: number;
  topPaths: PageRow[];
  daily: DayRow[];
  caddy: {
    generatedAt: string | null;
    humanHits: number;
    botHits: number;
    topPaths: Array<{ path: string; hits: number }>;
    error?: string;
  };
  ga: {
    configured: boolean;
    sessions?: number;
    pageViews?: number;
    topPaths?: Array<{ path: string; views: number }>;
    error?: string;
  };
  relics: {
    remaining: number;
    minted: number;
    max: number;
    sealed: boolean;
    configured: boolean;
  };
};

function asDb(client: unknown): LooseDb {
  return client as LooseDb;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

async function readCaddySummary(): Promise<DeskTraffic["caddy"]> {
  const path = process.env["CADDY_TRAFFIC_SUMMARY"] || "/opt/auraos/var/caddy-traffic.json";
  try {
    const { readFile } = await import("node:fs/promises");
    const raw = await readFile(path, "utf8");
    const json = JSON.parse(raw) as {
      generated_at?: string;
      human_hits?: number;
      bot_hits?: number;
      top_paths?: Array<{ path: string; hits: number }>;
    };
    return {
      generatedAt: json.generated_at || null,
      humanHits: json.human_hits || 0,
      botHits: json.bot_hits || 0,
      topPaths: Array.isArray(json.top_paths) ? json.top_paths.slice(0, 12) : [],
    };
  } catch {
    return { generatedAt: null, humanHits: 0, botHits: 0, topPaths: [] };
  }
}

async function firstPartyViews(days: number): Promise<{
  pageViews: number;
  sessions: number;
  topPaths: PageRow[];
  daily: DayRow[];
}> {
  const db = asDb((await import("@/integrations/supabase/client.server")).supabaseAdmin);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db
    .from("teaser_events")
    .select("placement, session_id, created_at")
    .eq("event", "page_view")
    .gte("created_at", since)
    .limit(8000);

  if (error || !data) {
    return { pageViews: 0, sessions: 0, topPaths: [], daily: [] };
  }

  const rows = data as Array<{ placement: string; session_id: string; created_at: string }>;
  const byPath = new Map<string, { views: number; sessions: Set<string> }>();
  const byDay = new Map<string, { views: number; sessions: Set<string> }>();
  const allSessions = new Set<string>();

  for (const row of rows) {
    const path = (row.placement || "/").slice(0, 200);
    const day = dayKey(row.created_at);
    allSessions.add(row.session_id);

    const p = byPath.get(path) || { views: 0, sessions: new Set<string>() };
    p.views += 1;
    p.sessions.add(row.session_id);
    byPath.set(path, p);

    const d = byDay.get(day) || { views: 0, sessions: new Set<string>() };
    d.views += 1;
    d.sessions.add(row.session_id);
    byDay.set(day, d);
  }

  const topPaths = [...byPath.entries()]
    .map(([path, v]) => ({ path, views: v.views, sessions: v.sessions.size }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);

  const daily = [...byDay.entries()]
    .map(([day, v]) => ({ day, views: v.views, sessions: v.sessions.size }))
    .sort((a, b) => a.day.localeCompare(b.day));

  return { pageViews: rows.length, sessions: allSessions.size, topPaths, daily };
}

export const getDeskTraffic = createServerFn({ method: "GET" })
  .validator((input: { token?: string }) => ({
    token:
      String(input?.token || "")
        .trim()
        .slice(0, 500) || null,
  }))
  .handler(async ({ data }): Promise<DeskTraffic> => {
    const { requireDeskAuth } = await import("@/lib/desk-auth.server");
    requireDeskAuth(data.token);

    const [firstParty, caddy, ga, relics] = await Promise.all([
      firstPartyViews(14),
      readCaddySummary(),
      import("@/lib/ga-data.server").then((m) => m.fetchGa4Traffic(14)),
      import("@/lib/relic.functions")
        .then((m) => m.readRelicVaultStatus())
        .catch(() => ({
          remaining: 7,
          minted: 0,
          max: 7,
          sealed: false,
          configured: false,
          contract: null,
        })),
    ]);

    return {
      days: 14,
      ...firstParty,
      caddy,
      ga,
      relics: {
        remaining: relics.remaining,
        minted: relics.minted,
        max: relics.max,
        sealed: relics.sealed,
        configured: relics.configured,
      },
    };
  });
