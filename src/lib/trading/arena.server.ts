/**
 * Weekly Trading Arena — risk-adjusted realized PnL leaderboard.
 * Service-role only (called from the trading worker tick).
 */

type Admin = { from: (table: string) => any };

function weekWindow(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay(); // 0 Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const starts = new Date(d);
  starts.setUTCDate(d.getUTCDate() + mondayOffset);
  starts.setUTCHours(0, 0, 0, 0);
  const ends = new Date(starts);
  ends.setUTCDate(starts.getUTCDate() + 7);
  const slug = `tw-${starts.toISOString().slice(0, 10)}`;
  const name = `Trading Week ${starts.toISOString().slice(0, 10)}`;
  return { starts, ends, slug, name };
}

export async function ensureActiveTradingSeason(db: Admin) {
  const { starts, ends, slug, name } = weekWindow();
  const { data: existing } = await db
    .from("trading_seasons")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (existing)
    return existing as {
      id: string;
      slug: string;
      starts_at: string;
      ends_at: string;
      status: string;
    };

  // Close prior active seasons
  await db
    .from("trading_seasons")
    .update({ status: "closed" })
    .eq("status", "active")
    .lt("ends_at", starts.toISOString());

  const { data: created, error } = await db
    .from("trading_seasons")
    .insert({
      slug,
      name,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      status: "active",
      prize_pool_aura: 5000,
    })
    .select("*")
    .single();
  if (error) throw error;
  return created as {
    id: string;
    slug: string;
    starts_at: string;
    ends_at: string;
    status: string;
  };
}

/** Risk-adjusted score from closed trades in the season window. */
export function scoreDeskWeek(opts: {
  realizedPnl: number;
  maxDrawdownPct: number;
  tradeCount: number;
}): number {
  if (opts.tradeCount < 1) return 0;
  const ddPenalty = Math.min(0.85, Math.max(0, opts.maxDrawdownPct) / 100);
  const raw = opts.realizedPnl * (1 - ddPenalty);
  // Mild participation bonus so desks that actually trade outrank zeros
  return Number((raw + Math.min(opts.tradeCount, 10) * 0.25).toFixed(4));
}

export async function recomputeTradingArena(db: Admin) {
  const season = await ensureActiveTradingSeason(db);
  const { data: companies } = await db.from("companies").select("id, name").limit(200);

  const rows: {
    season_id: string;
    company_id: string;
    company_name: string | null;
    realized_pnl: number;
    open_pnl: number;
    max_drawdown_pct: number;
    trade_count: number;
    score: number;
    updated_at: string;
  }[] = [];

  for (const c of (companies ?? []) as { id: string; name: string | null }[]) {
    const { data: closed } = await db
      .from("trades")
      .select("pnl, closed_at, opened_at")
      .eq("company_id", c.id)
      .eq("status", "closed")
      .eq("paper", false)
      .gte("closed_at", season.starts_at)
      .lt("closed_at", season.ends_at);

    const closedList = (closed ?? []) as { pnl: number }[];
    const realized = closedList.reduce((s, t) => s + Number(t.pnl ?? 0), 0);
    const tradeCount = closedList.length;

    const { data: openTrades } = await db
      .from("trades")
      .select("pnl, mark_price, entry, size")
      .eq("company_id", c.id)
      .eq("status", "open")
      .eq("paper", false);

    let openPnl = 0;
    for (const t of (openTrades ?? []) as {
      pnl?: number;
      mark_price?: number;
      entry?: number;
      size?: number;
    }[]) {
      if (t.mark_price && t.entry && t.size) {
        openPnl += Number(t.size) * ((Number(t.mark_price) - Number(t.entry)) / Number(t.entry));
      } else {
        openPnl += Number(t.pnl ?? 0);
      }
    }

    // Approximate max DD from cumulative closed PnL path
    let peak = 0;
    let equity = 0;
    let maxDd = 0;
    for (const t of closedList) {
      equity += Number(t.pnl ?? 0);
      peak = Math.max(peak, equity);
      if (peak > 0) maxDd = Math.max(maxDd, ((peak - equity) / Math.max(peak, 1)) * 100);
    }

    const score = scoreDeskWeek({
      realizedPnl: realized,
      maxDrawdownPct: maxDd,
      tradeCount,
    });

    rows.push({
      season_id: season.id,
      company_id: c.id,
      company_name: c.name,
      realized_pnl: Number(realized.toFixed(4)),
      open_pnl: Number(openPnl.toFixed(4)),
      max_drawdown_pct: Number(maxDd.toFixed(2)),
      trade_count: tradeCount,
      score,
      updated_at: new Date().toISOString(),
    });
  }

  // Only upsert desks with activity or existing entry
  const active = rows.filter((r) => r.trade_count > 0 || r.open_pnl !== 0);
  for (const row of active) {
    await db.from("trading_season_entries").upsert(row, {
      onConflict: "season_id,company_id",
    });
  }

  const { data: ranked } = await db
    .from("trading_season_entries")
    .select("id, score")
    .eq("season_id", season.id)
    .order("score", { ascending: false });

  let rank = 1;
  for (const r of (ranked ?? []) as { id: string }[]) {
    await db.from("trading_season_entries").update({ rank }).eq("id", r.id);
    rank += 1;
  }

  return { seasonId: season.id, entries: active.length };
}
