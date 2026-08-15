import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { peekFunnel } from "@/lib/attribution";
import { createEmptyCompany } from "@/lib/create-empty-company";
import { isFunnelId } from "@/lib/funnels";
import { isDemoSeedEnabled, seedCompany } from "@/lib/seed";

export type Company = {
  id: string;
  name: string;
  tagline: string | null;
  emoji: string;
  credits: number;
  runway_days: number;
  mrr: number;
  strategy: string | null;
  slug?: string | null;
  autonomy?: number;
  theme?: "dark" | "light" | string | null;
  trading_armed?: boolean;
  max_risk_pct?: number;
  max_notional_usdc_day?: number;
  max_slippage_bps?: number;
  allowed_symbols?: string[];
  city?: string | null;
  niche?: string | null;
  is_local_business?: boolean;
  network_backlink?: boolean;
  entry_funnel?: string | null;
  homepage_url?: string | null;
  google_review_url?: string | null;
  local_cohort_number?: number | null;
  ui_locale?: string | null;
  local_seat_paid_at?: string | null;
  pulse_paper_usdc?: number | null;
};

export function useCompany() {
  return useQuery({
    queryKey: ["company"],
    staleTime: 60_000,
    queryFn: async (): Promise<Company> => {
      // getSession is local/fast; avoid getUser() network race on cold start.
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at")
        .limit(1);
      if (error) throw error;
      if (data && data.length > 0) return data[0] as Company;
      if (isDemoSeedEnabled()) return (await seedCompany(user.id)) as Company;
      const { data: hasSeat } = await supabase.rpc("user_has_company_seat", { _uid: user.id });
      const funnel = peekFunnel();
      if (!hasSeat && (!isFunnelId(funnel) || funnel === "os")) {
        throw new Error("NO_COMPANY");
      }
      return (await createEmptyCompany(user.id)) as Company;
    },
  });
}

export type TableName =
  | "agents"
  | "tasks"
  | "products"
  | "customers"
  | "activity_events"
  | "metrics"
  | "files"
  | "knowledge_items"
  | "automations"
  | "insights"
  | "marketplace_installs"
  | "conversations"
  | "channel_connections"
  | "channel_posts"
  | "trades"
  | "community_posts"
  | "akquise_campaigns"
  | "akquise_leads"
  | "deals"
  | "campaigns"
  | "messages"
  | "channel_engagements"
  | "trading_strategies"
  | "trading_signals"
  | "trading_orders"
  | "smart_money_wallets"
  | "smart_money_events";

const LIVE_TASK_STATUSES = new Set([
  "queued",
  "running",
  "pending_approval",
  "in_progress",
  "queue",
  "pending",
]);

export function rowsHaveLiveWork(rows: { status?: string }[] | undefined): boolean {
  return Boolean(rows?.some((row) => LIVE_TASK_STATUSES.has(String(row.status ?? ""))));
}

export function liveWorkInterval(ms = 12_000) {
  return (q: { state: { data: unknown } }) =>
    rowsHaveLiveWork(q.state.data as { status?: string }[] | undefined) ? ms : false;
}

export function useCompanyTable<T = Record<string, unknown>>(
  table: TableName,
  options?: {
    orderBy?: string;
    ascending?: boolean;
    limit?: number;
    refetchInterval?: number | false | ((query: { state: { data: unknown } }) => number | false);
    enabled?: boolean;
  },
) {
  const { data: company } = useCompany();
  const interval = options?.refetchInterval;
  const staleTime =
    typeof interval === "number"
      ? Math.min(Math.floor(interval / 2), 8_000)
      : typeof interval === "function"
        ? 5_000
        : 30_000;
  return useQuery({
    queryKey: ["table", table, company?.id, options?.orderBy, options?.ascending, options?.limit],
    enabled: Boolean(company?.id) && options?.enabled !== false,
    staleTime,
    refetchInterval: interval ?? false,
    queryFn: async (): Promise<T[]> => {
      // TableName spans company-scoped tables; cast keeps .eq("company_id") typed across the union.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase.from(table) as any).select("*").eq("company_id", company!.id);
      if (options?.orderBy) q = q.order(options.orderBy, { ascending: options.ascending ?? true });
      if (options?.limit) q = q.limit(options.limit);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

export function useRowMutation(table: TableName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, unknown> }) => {
      const { error } = await supabase
        .from(table)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(values as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["table", table] }),
  });
}

/** Patch the founder's primary company (Lokal Betrieb name/city/niche, etc.). */
export function useUpdateCompany() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  return useMutation({
    mutationFn: async (
      values: Partial<
        Pick<
          Company,
          | "name"
          | "tagline"
          | "emoji"
          | "city"
          | "niche"
          | "homepage_url"
          | "google_review_url"
          | "strategy"
        >
      >,
    ) => {
      if (!company?.id) throw new Error("No company yet");
      const { error } = await supabase.from("companies").update(values).eq("id", company.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["company"] });
      void qc.invalidateQueries({ queryKey: ["lokal-hub"] });
    },
  });
}
