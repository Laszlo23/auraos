import { createServerFn } from "@tanstack/react-start";

/** Public shared backtest snapshot (no auth). */
export const getPublicBacktestShare = createServerFn({ method: "GET" })
  .inputValidator((input: { shareSlug: string }) => ({
    shareSlug: String(input.shareSlug || "").slice(0, 32),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const supabase = supabaseAdmin as unknown as { from: (t: string) => any };
    const { data: row } = await supabase
      .from("trading_backtest_shares")
      .select("title, payload, created_at, share_slug")
      .eq("share_slug", data.shareSlug)
      .maybeSingle();
    if (!row) return null;

    return {
      title: String(row.title ?? "Backtest"),
      shareSlug: String(row.share_slug ?? data.shareSlug),
      createdAt: String(row.created_at ?? ""),
      payload: row.payload ?? {},
    };
  });
