import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, Panel, Shimmer } from "@/components/aura/primitives";
import {
  getFollowerNoticeSummary,
  importFollowerNoticeCsv,
} from "@/lib/follower-notice.functions";
import { parseFollowerNoticeCsv } from "@/lib/follower-notice";
import { issueHoodGiveawayBatch, listHoodGiveawayCodes } from "@/lib/hood-giveaway.functions";
import { getOpsDashboard, triggerOpsTick, type OpsDashboard } from "@/lib/ops.functions";
import { issuePreviewPassBatch, listPreviewPasses } from "@/lib/preview-pass.functions";
import { PREVIEW_PASS_CODE, previewPassShareUrl } from "@/lib/preview-pass";
import { displayUserLabel } from "@/lib/siwe-display";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/ops")({
  head: () => ({
    meta: [{ title: "Ops — Aura OS" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: OpsPage,
});

function OpsPage() {
  const qc = useQueryClient();
  const [issuedCodes, setIssuedCodes] = useState<string[]>([]);
  const [issuedPreview, setIssuedPreview] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<string>("");
  const [csvName, setCsvName] = useState("csv");
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["ops-dashboard"],
    queryFn: async (): Promise<OpsDashboard> =>
      (await getOpsDashboard()) as unknown as OpsDashboard,
    retry: false,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const hoodCodes = useQuery({
    queryKey: ["ops-hood-giveaway"],
    queryFn: () => listHoodGiveawayCodes(),
    staleTime: 15_000,
  });

  const previewCodes = useQuery({
    queryKey: ["ops-preview-passes"],
    queryFn: () => listPreviewPasses(),
    staleTime: 15_000,
  });

  const noticeList = useQuery({
    queryKey: ["ops-follower-notices"],
    queryFn: () => getFollowerNoticeSummary(),
    staleTime: 15_000,
  });

  const parsedCsv = parseFollowerNoticeCsv(csvPreview);

  const importNotice = useMutation({
    mutationFn: () =>
      importFollowerNoticeCsv({
        data: { csv: csvPreview, batch: csvName },
      }),
    onSuccess: (res) => {
      toast.success(`Imported ${res.inserted} new wallets · ${res.already} already listed`);
      setCsvPreview("");
      void qc.invalidateQueries({ queryKey: ["ops-follower-notices"] });
    },
    onError: (e: Error) => toast.error(e.message || "CSV import failed"),
  });

  const issuePreview = useMutation({
    mutationFn: () => issuePreviewPassBatch({ data: { count: 6 } }),
    onSuccess: (res) => {
      setIssuedPreview(res.codes);
      toast.success(`Issued ${res.codes.length} preview codes — copy the links.`);
      void qc.invalidateQueries({ queryKey: ["ops-preview-passes"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not issue preview codes"),
  });

  const issueHood = useMutation({
    mutationFn: () => issueHoodGiveawayBatch({ data: { count: 6 } }),
    onSuccess: (res) => {
      setIssuedCodes(res.codes);
      toast.success(`Issued ${res.codes.length} Hood codes — copy them now.`);
      void qc.invalidateQueries({ queryKey: ["ops-hood-giveaway"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not issue Hood codes"),
  });

  const tick = useMutation({
    mutationFn: () => triggerOpsTick(),
    onSuccess: (res) => {
      const r = res as {
        tasksProcessed?: number;
        missionsAdvanced?: number;
      };
      toast.success(
        `Tick done · tasks ${r.tasksProcessed ?? 0} · missions +${r.missionsAdvanced ?? 0}`,
      );
      void qc.invalidateQueries({ queryKey: ["ops-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message || "Tick failed"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Shimmer className="h-16" />
        <Shimmer className="h-40" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
        <h1 className="font-display text-2xl">Ops</h1>
        <p className="text-[13px] text-muted-foreground">
          {error instanceof Error ? error.message : "Not authorized."}
        </p>
        <p className="text-[12px] text-muted-foreground">
          Set <code className="text-foreground/80">OPS_ADMIN_EMAILS</code> to your login email.
        </p>
        <Link to="/console" className="text-[12px] text-primary">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const hbAgeMin = data.lastHeartbeat
    ? Math.round((Date.now() - new Date(data.lastHeartbeat.ranAt).getTime()) / 60_000)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform ops"
        description={`Signed in as ${displayUserLabel(data.email)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-border/50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => tick.mutate()}
              disabled={tick.isPending}
              className="rounded-2xl bg-primary/14 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary disabled:opacity-50"
            >
              {tick.isPending ? "Running…" : "Trigger tick"}
            </button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Last worker heartbeat"
          value={hbAgeMin == null ? "never" : hbAgeMin < 1 ? "just now" : `${hbAgeMin}m ago`}
        />
        <Stat label="Active missions" value={String(data.activeMissionCount)} />
        <Stat label="Spins today" value={String(data.spinsToday)} />
        <Stat label="Chain stamp pending" value={String(data.pendingChainSpins)} />
      </div>

      <Panel label="Preview pass · testers">
        <p className="mb-3 text-[13px] text-muted-foreground">
          Complimentary OS access. Does not take a founding seat. Share the standing{" "}
          <span className="font-mono text-foreground">{PREVIEW_PASS_CODE}</span> link, or issue
          one-time codes.
        </p>
        <div className="mb-3 rounded-2xl border border-primary/30 bg-primary/8 px-3.5 py-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Share this
          </p>
          <p className="break-all font-mono text-[12px] text-foreground">
            {previewCodes.data?.shareUrl ?? previewPassShareUrl()}
          </p>
        </div>
        <button
          type="button"
          disabled={issuePreview.isPending}
          onClick={() => issuePreview.mutate()}
          className="rounded-2xl bg-primary/14 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary disabled:opacity-50"
        >
          {issuePreview.isPending ? "Issuing…" : "Issue 6 one-time codes"}
        </button>
        {issuedPreview.length > 0 ? (
          <ul className="mt-4 space-y-1 font-mono text-[12px]">
            {issuedPreview.map((c) => (
              <li key={c}>
                <span className="text-foreground">{c}</span>{" "}
                <span className="text-muted-foreground">{previewPassShareUrl(c)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {(previewCodes.data?.codes ?? []).length > 0 ? (
          <ul className="mt-4 space-y-1.5 text-[12px]">
            {previewCodes.data!.codes.map((row) => (
              <li key={row.code} className="flex flex-wrap justify-between gap-2 font-mono">
                <span>{row.code}</span>
                <span className="text-muted-foreground">
                  {row.uses}/{row.max_uses}
                  {row.active ? "" : " · off"}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>

      <Panel label="Hood giveaway · 6 codes">
        <p className="mb-3 text-[13px] text-muted-foreground">
          One-time Hood mint links. Recipients connect a wallet and claim. Does not grant a founding
          seat.
        </p>
        <button
          type="button"
          disabled={issueHood.isPending}
          onClick={() => issueHood.mutate()}
          className="rounded-2xl bg-primary/14 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary disabled:opacity-50"
        >
          {issueHood.isPending ? "Issuing…" : "Issue 6 Hood codes"}
        </button>
        {issuedCodes.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/8 px-3.5 py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              Copy these now
            </p>
            <ul className="space-y-1 font-mono text-[12px]">
              {issuedCodes.map((c) => (
                <li key={c}>
                  <span className="text-foreground">{c}</span>{" "}
                  <span className="text-muted-foreground">
                    {SITE_URL}/hood/claim/{c}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {(hoodCodes.data?.codes ?? []).length > 0 ? (
          <ul className="mt-4 space-y-1.5 text-[12px]">
            {hoodCodes.data!.codes.map((row) => (
              <li key={row.code} className="flex flex-wrap justify-between gap-2 font-mono">
                <span>{row.code}</span>
                <span className="text-muted-foreground">
                  {row.status}
                  {row.token_id != null ? ` · #${row.token_id}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>

      <Panel label="Follower notice CSV">
        <p className="text-[13px] text-muted-foreground">
          Wallet list only. Official page is{" "}
          <a href={`${SITE_URL}/drop`} className="text-primary">
            {SITE_URL}/drop
          </a>
          . Not an AURA airdrop — people come to the site. Never send from the T-0 treasury.
        </p>
        <p className="mt-2 text-[12px] text-muted-foreground">
          Listed {noticeList.data?.total ?? "—"} · opened {noticeList.data?.seen ?? "—"}
        </p>
        <label className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Upload CSV
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            className="mt-2 block w-full text-[12px] text-foreground"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setCsvName(file.name.slice(0, 80) || "csv");
              void file.text().then(setCsvPreview);
            }}
          />
        </label>
        {csvPreview ? (
          <p className="mt-3 text-[12px] text-muted-foreground">
            {parsedCsv.wallets.length} unique wallets · {parsedCsv.duplicates} dupes ·{" "}
            {parsedCsv.invalidCount} skipped
          </p>
        ) : null}
        <button
          type="button"
          disabled={!parsedCsv.wallets.length || importNotice.isPending}
          onClick={() => importNotice.mutate()}
          className="mt-4 rounded-2xl bg-primary/14 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary disabled:opacity-50"
        >
          {importNotice.isPending ? "Importing…" : "Import wallets"}
        </button>
      </Panel>

      <Panel label="Stuck missions · no update &gt; 30m">
        {data.stuckMissions.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">None — good.</p>
        ) : (
          <ul className="space-y-2">
            {data.stuckMissions.map((m) => (
              <li key={m.id} className="rounded-2xl border border-border/40 px-3 py-2 text-[12px]">
                <div className="font-medium text-foreground/90">
                  {(m.goal_text || "Mission").slice(0, 80)}
                </div>
                <div className="mt-1 text-muted-foreground">
                  updated {new Date(m.updated_at).toLocaleString()} · NBA{" "}
                  {m.next_best_action?.title?.slice(0, 40) || "—"} (
                  {m.next_best_action?.status || "none"})
                </div>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground/80">
                  {m.company_id} · {m.id}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel label="Companies · recent">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[12px]">
            <thead className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="pb-2 pr-3 font-semibold">Name</th>
                <th className="pb-2 pr-3 font-semibold">Autonomy</th>
                <th className="pb-2 pr-3 font-semibold">Paper</th>
                <th className="pb-2 pr-3 font-semibold">Armed</th>
                <th className="pb-2 font-semibold">Desk</th>
              </tr>
            </thead>
            <tbody>
              {data.companies.map((c) => (
                <tr key={c.id} className="border-t border-border/30">
                  <td className="py-2 pr-3">{c.name}</td>
                  <td className="py-2 pr-3">{c.autonomy ?? "—"}</td>
                  <td className="py-2 pr-3">{c.trading_paper ? "yes" : "live"}</td>
                  <td className="py-2 pr-3">{c.trading_armed ? "armed" : "off"}</td>
                  <td className="py-2">{c.desk_network || "base"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/50 px-3.5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-xl text-foreground">{value}</p>
    </div>
  );
}
