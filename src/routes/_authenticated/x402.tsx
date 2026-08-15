import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Loader2, Play, Radio, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Chip, PageHeader, Panel } from "@/components/aura/primitives";
import { supabase } from "@/integrations/supabase/client";
import {
  X402_CATALOG,
  REVENUE_SPLIT,
  splitRevenue,
  usd,
  type X402Endpoint,
} from "@/lib/x402-catalog";
import { SITE_URL } from "@/lib/site";
import { agentBuy } from "@/lib/x402-client";
import { useCompany } from "@/hooks/use-aura";
import { useSessionKeys } from "@/hooks/use-earn";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/x402")({
  head: () => ({
    meta: [
      { title: "Machine API — get paid per call | Aura OS" },
      {
        name: "description",
        content:
          "Aura endpoints priced in USDC over the x402 protocol. Agents pay per call, settlement lands onchain, every request is logged.",
      },
      { property: "og:title", content: "Machine API — get paid per call" },
      {
        property: "og:description",
        content:
          "Quant signals, lead enrichment and company briefs, sold to autonomous agents per request.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: X402Page,
});

type CallRow = {
  id: string;
  slug: string;
  payer: string | null;
  amount_usdc: number;
  network: string;
  tx_hash: string | null;
  status: string;
  latency_ms: number | null;
  created_at: string;
  direction?: string | null;
  platform_fee?: number | null;
  owner_share?: number | null;
  treasury_share?: number | null;
};

const STATUS_TONE: Record<string, string> = {
  settled: "text-primary",
  dev: "text-gold",
  rejected: "text-destructive",
  settle_failed: "text-destructive",
  handler_error: "text-destructive",
};

function short(v: string | null, n = 6) {
  if (!v) return "—";
  return v.length > n * 2 + 2 ? `${v.slice(0, n)}…${v.slice(-4)}` : v;
}

function CopyLine({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="glass-soft group relative overflow-x-auto rounded-xl p-3">
      <pre className="num whitespace-pre text-[11px] leading-relaxed text-muted-foreground">
        {text}
      </pre>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        }}
        className="absolute right-2 top-2 rounded-lg p-1.5 text-muted-foreground opacity-0 transition hover:text-foreground group-hover:opacity-100"
        aria-label="Copy request"
      >
        {done ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function EndpointCard({
  ep,
  origin,
  onProbe,
  busy,
}: {
  ep: X402Endpoint;
  origin: string;
  onProbe: (ep: X402Endpoint) => void;
  busy: string | null;
}) {
  const snippet = `curl -s -X POST ${origin}${ep.path} \\\n  -H 'content-type: application/json' \\\n  -d '${ep.input}'\n# -> 402 with payment requirements, then retry with X-PAYMENT`;
  return (
    <Panel label={ep.name} className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[13px] leading-relaxed text-muted-foreground">{ep.description}</p>
        <span className="num shrink-0 text-sm font-semibold text-gold">{usd(ep.price_usdc)}</span>
      </div>
      <CopyLine text={snippet} />
      <div className="flex items-center justify-between">
        <Chip>{ep.network}</Chip>
        <button
          type="button"
          onClick={() => onProbe(ep)}
          disabled={busy === ep.slug}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-primary transition hover:bg-primary/10 disabled:opacity-50"
        >
          {busy === ep.slug ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          Probe paywall
        </button>
      </div>
    </Panel>
  );
}

function X402Page() {
  const [busy, setBusy] = useState<string | null>(null);
  const [probe, setProbe] = useState<string | null>(null);
  const { data: company } = useCompany();
  const origin = typeof window === "undefined" ? SITE_URL : window.location.origin;

  const calls = useQuery({
    queryKey: ["x402-calls"],
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("x402_calls")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return (data ?? []) as CallRow[];
    },
  });

  const totals = useMemo(() => {
    const rows = calls.data ?? [];
    const earned = rows.filter(
      (r) => r.direction !== "spent" && (r.status === "settled" || r.status === "dev"),
    );
    const spent = rows.filter((r) => r.direction === "spent");
    const paid = earned;
    return {
      revenue: earned.reduce((n, r) => n + Number(r.amount_usdc ?? 0), 0),
      spent: spent.reduce((n, r) => n + Number(r.amount_usdc ?? 0), 0),
      owner: earned.reduce((n, r) => n + Number(r.owner_share ?? 0), 0),
      calls: rows.length,
      p50: paid.length
        ? Math.round(
            [...paid.map((r) => r.latency_ms ?? 0)].sort((a, b) => a - b)[
              Math.floor(paid.length / 2)
            ] ?? 0,
          )
        : 0,
    };
  }, [calls.data]);

  async function onProbe(ep: X402Endpoint) {
    setBusy(ep.slug);
    try {
      const res = await fetch(ep.path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: ep.input,
      });
      const body = await res.json();
      setProbe(JSON.stringify({ status: res.status, ...body }, null, 2));
      toast.success(
        res.status === 402 ? "402 — payment requirements served" : `Responded ${res.status}`,
      );
    } catch {
      toast.error("Endpoint unreachable");
    } finally {
      setBusy(null);
      void calls.refetch();
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="x402"
        title="Machine API"
        description="Priced in USDC on Base via x402. No settled calls yet — this desk stays quiet until a real Base payment lands. Dev / Sepolia totals are not shown as revenue."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Earned", value: usd(totals.revenue), icon: Wallet },
          { label: "Spent by agents", value: usd(totals.spent), icon: Radio },
          { label: "Your share", value: usd(totals.owner), icon: Play },
        ].map((s) => (
          <Panel key={s.label} label={s.label}>
            <p className="num text-2xl font-semibold">{s.value}</p>
          </Panel>
        ))}
      </div>

      <Panel label="Revenue routing">
        <p className="mb-3 text-[13px] text-muted-foreground">
          Every settled call splits automatically. Your share lands in the company AURA reserve the
          moment the payment settles.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { k: "Founder rewards", v: REVENUE_SPLIT.owner },
            { k: "Company treasury", v: REVENUE_SPLIT.treasury },
            { k: "Platform fee", v: REVENUE_SPLIT.platform },
          ].map((s) => (
            <div key={s.k} className="glass-soft rounded-xl p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.k}</p>
              <p className="num mt-1 text-lg font-semibold text-primary">
                {Math.round(s.v * 100)}%
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <AgentDesk companyId={company?.id ?? null} onDone={() => void calls.refetch()} />

      <div className="grid gap-4 lg:grid-cols-3">
        {X402_CATALOG.map((ep) => (
          <EndpointCard key={ep.slug} ep={ep} origin={origin} onProbe={onProbe} busy={busy} />
        ))}
      </div>

      {probe && (
        <Panel label="Last probe">
          <pre className="num max-h-64 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">
            {probe}
          </pre>
        </Panel>
      )}

      <Panel label="Discovery">
        <p className="mb-3 text-[13px] text-muted-foreground">
          Any paying agent can crawl the manifest to price every endpoint before it spends.
        </p>
        <CopyLine text={`curl -s ${origin}/api/public/x402/`} />
      </Panel>

      <Panel label="Call log">
        {calls.isLoading ? (
          <p className="text-[13px] text-muted-foreground">Loading…</p>
        ) : (calls.data ?? []).length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            No paid calls yet. Probe an endpoint to open the ledger.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border/40">
                  <th className="py-2 pr-4 font-medium">Endpoint</th>
                  <th className="py-2 pr-4 font-medium">Flow</th>
                  <th className="py-2 pr-4 font-medium">Payer</th>
                  <th className="py-2 pr-4 font-medium">Amount</th>
                  <th className="py-2 pr-4 font-medium">Your share</th>
                  <th className="py-2 pr-4 font-medium">Tx</th>
                  <th className="py-2 pr-4 font-medium">Latency</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(calls.data ?? []).map((r) => (
                  <tr key={r.id} className="border-b border-border/20 last:border-0">
                    <td className="py-2 pr-4">{r.slug}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={
                          r.direction === "spent" ? "text-muted-foreground" : "text-primary"
                        }
                      >
                        {r.direction === "spent" ? "spent" : "earned"}
                      </span>
                    </td>
                    <td className="num py-2 pr-4 text-muted-foreground">{short(r.payer)}</td>
                    <td className="num py-2 pr-4 text-gold">{usd(Number(r.amount_usdc ?? 0))}</td>
                    <td className="num py-2 pr-4 text-muted-foreground">
                      {r.direction === "spent" ? "—" : usd(Number(r.owner_share ?? 0))}
                    </td>
                    <td className="num py-2 pr-4 text-muted-foreground">{short(r.tx_hash)}</td>
                    <td className="num py-2 pr-4 text-muted-foreground">
                      {r.latency_ms ?? "—"} ms
                    </td>
                    <td
                      className={cn(
                        "py-2 font-medium",
                        STATUS_TONE[r.status] ?? "text-muted-foreground",
                      )}
                    >
                      {r.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

/** Agents as buyers: pay for another endpoint out of a session key's spend cap. */
function AgentDesk({ companyId, onDone }: { companyId: string | null; onDone: () => void }) {
  const { data: keys = [] } = useSessionKeys();
  const active = keys.filter((k) => k.status === "active");
  const [keyId, setKeyId] = useState<string>("");
  const [slug, setSlug] = useState<string>(X402_CATALOG[0]!.slug);
  const [running, setRunning] = useState(false);
  const [out, setOut] = useState<string | null>(null);

  const ep = X402_CATALOG.find((e) => e.slug === slug)!;
  const chosen = active.find((k) => k.id === (keyId || active[0]?.id));
  const remaining = chosen ? Math.max(0, chosen.spend_cap - chosen.spent) / 100 : 0;

  async function run() {
    if (!companyId || !chosen) return;
    setRunning(true);
    setOut(null);
    try {
      const res = (await agentBuy({
        data: { sessionKeyId: chosen.id, companyId, slug, input: ep.input },
      })) as {
        resultJson: string;
        simulated: boolean;
        amount_usdc: number;
      };
      setOut(JSON.stringify(JSON.parse(res.resultJson), null, 2));
      toast.success(
        res.simulated
          ? `Simulated agent pay ${usd(res.amount_usdc)} for ${ep.name}`
          : `Agent paid ${usd(res.amount_usdc)} for ${ep.name}`,
      );
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <Panel label="Agent desk — buy a call">
      <p className="mb-3 text-[13px] text-muted-foreground">
        Your agents can pay other endpoints to do their job. Spend is capped by the session key and
        every purchase is logged as network revenue.
      </p>
      {active.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          No active session keys. Issue one on the Earn page to give an agent a spend budget.
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            Session key
            <select
              value={keyId || active[0]!.id}
              onChange={(e) => setKeyId(e.target.value)}
              className="glass-soft rounded-xl px-3 py-2 text-[13px] text-foreground outline-none"
            >
              {active.map((k) => (
                <option key={k.id} value={k.id} className="bg-background">
                  {k.label ?? short(k.key_address)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            Endpoint
            <select
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="glass-soft rounded-xl px-3 py-2 text-[13px] text-foreground outline-none"
            >
              {X402_CATALOG.map((e) => (
                <option key={e.slug} value={e.slug} className="bg-background">
                  {e.name} — {usd(e.price_usdc)}
                </option>
              ))}
            </select>
          </label>
          <div className="text-[12px] text-muted-foreground">
            <p className="num">Budget left {usd(remaining)}</p>
            <p className="num">Seller keeps {usd(splitRevenue(ep.price_usdc).owner_share)}</p>
          </div>
          <button
            type="button"
            onClick={() => void run()}
            disabled={running || !companyId}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-[12.5px] font-medium text-primary-foreground transition disabled:opacity-50"
          >
            {running ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            Pay & call
          </button>
        </div>
      )}
      {out && (
        <pre className="num mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">
          {out}
        </pre>
      )}
    </Panel>
  );
}
