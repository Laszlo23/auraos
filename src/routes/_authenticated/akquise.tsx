import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import {
  Download,
  Loader2,
  Mail,
  MailCheck,
  PenLine,
  Radar,
  Send,
  Share2,
  Trash2,
  Unplug,
} from "lucide-react";
import { toast } from "sonner";

import { Celebrate, XpToast } from "@/components/aura/celebrate";
import { ProofOfWork } from "@/components/aura/proof-of-work";
import { Chip, DataRow, Meter, PageHeader, Panel, Pulse } from "@/components/aura/primitives";
import { useCompany, useCompanyTable } from "@/hooks/use-aura";
import { useAwardXp } from "@/hooks/use-progress";
import {
  useConnectMailbox,
  useDisconnectMailbox,
  useMailboxes,
  type MailboxState,
} from "@/hooks/use-mailbox";
import { supabase } from "@/integrations/supabase/client";
import { unpackCampaignRow } from "@/lib/akquise-schema";
import {
  draftLeadEmail,
  publishAkquiseResult,
  researchLeads,
  runAkquiseGoal,
  sendLeadEmail,
} from "@/lib/akquise.functions";
import { AKQUISE_TEMPLATES, type AkquiseTemplateId } from "@/lib/akquise-templates";
import type { MailboxProvider } from "@/lib/mailbox.functions";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/akquise")({
  head: () => ({
    meta: [
      { title: "Lead hunter — Aura OS" },
      {
        name: "description",
        content:
          "Tell Aura what you want done. It plans, researches the web, scores opportunities, and prepares outreach — real sources only.",
      },
      { property: "og:title", content: "Lead hunter — Aura OS" },
      {
        property: "og:description",
        content: "Goal → plan → research → verify → artifact. Cold outreach that actually works.",
      },
    ],
  }),
  component: AkquisePage,
});

type Campaign = {
  id: string;
  name: string;
  objective: string;
  region: string | null;
  brief: string;
  goal?: string | null;
  language: string;
  tone: string;
  status: string;
  seed_urls: string[] | null;
  template?: string | null;
  target_count?: number | null;
  steps?: unknown;
  verify?: { leadCount?: number; withContact?: number; notes?: string[] } | null;
  aura_spent?: number | null;
  agents_labeled?: string[] | null;
  share_slug?: string | null;
  share_public?: boolean | null;
  completed_at?: string | null;
  started_at?: string | null;
  created_at: string;
};

type Lead = {
  id: string;
  campaign_id: string;
  name: string | null;
  org: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  snippet: string | null;
  score: number;
  status: string;
  source_url: string | null;
  draft_subject: string | null;
  draft_body: string | null;
  sent_at: string | null;
  created_at: string;
  metadata?: { website_signals?: string[] } | null;
};

type Step = { id: string; label: string; status: string; detail?: string };

const MAILBOX_META: Record<MailboxProvider, { name: string; glyph: string; blurb: string }> = {
  google_mail: { name: "Gmail", glyph: "M", blurb: "Send from your Google Workspace address." },
  microsoft_outlook: { name: "Outlook", glyph: "O", blurb: "Send from Microsoft 365 or Outlook." },
};

function leadsToCsv(rows: Lead[]) {
  const header = ["name", "org", "email", "phone", "address", "score", "snippet", "source_url", "status"];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    header.join(","),
    ...rows.map((l) =>
      [
        l.name ?? "",
        l.org ?? "",
        l.email ?? "",
        l.phone ?? "",
        l.address ?? "",
        String(l.score),
        l.snippet ?? "",
        l.source_url ?? "",
        l.status,
      ]
        .map(escape)
        .join(","),
    ),
  ];
  return lines.join("\n");
}

function AkquisePage() {
  const { data: company } = useCompany();
  const qc = useQueryClient();
  const award = useAwardXp();

  const { data: campaignsRaw = [] } = useCompanyTable<Campaign>("akquise_campaigns", {
    orderBy: "created_at",
    ascending: false,
  });
  const campaigns = campaignsRaw.map(
    (c) => unpackCampaignRow(c as unknown as Record<string, unknown>) as unknown as Campaign,
  );
  const { data: leads = [] } = useCompanyTable<Lead>("akquise_leads", {
    orderBy: "score",
    ascending: false,
  });
  const { data: mailboxes = [] } = useMailboxes();
  const connectMailbox = useConnectMailbox();
  const disconnect = useDisconnectMailbox();

  const [activeId, setActiveId] = useState<string | null>(null);
  const active = campaigns.find((c) => c.id === activeId) ?? campaigns[0] ?? null;
  const activeLeads = active ? leads.filter((l) => l.campaign_id === active.id) : [];

  const [goal, setGoal] = useState("");
  const [template, setTemplate] = useState<AkquiseTemplateId>("website_leads");
  const [region, setRegion] = useState("");
  const [seedUrls, setSeedUrls] = useState("");
  const [language, setLanguage] = useState("de");
  const [openLead, setOpenLead] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const [toastXp, setToastXp] = useState<{ label: string; amount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastShare, setLastShare] = useState<string | null>(null);

  const celebrate = (label: string, amount: number, quest?: string) => {
    setBurst((n) => n + 1);
    setToastXp({ label, amount });
    setTimeout(() => setToastXp(null), 2400);
    award.mutate(quest ? { amount, quest } : { amount });
  };

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["table", "akquise_leads"] });
    await qc.invalidateQueries({ queryKey: ["table", "akquise_campaigns"] });
    await qc.invalidateQueries({ queryKey: ["company-economy"] });
  };

  const selectedTemplate = useMemo(
    () => AKQUISE_TEMPLATES.find((t) => t.id === template)!,
    [template],
  );

  const run = useMutation({
    mutationFn: () =>
      runAkquiseGoal({
        data: {
          goal: goal.trim() || selectedTemplate.goalExample,
          template,
          region,
          language,
          seedUrls: seedUrls
            .split(/[\n,]+/)
            .map((u) => u.trim())
            .filter(Boolean),
          targetCount: selectedTemplate.defaultTarget,
          name: selectedTemplate.label,
        },
      }),
    onSuccess: async (res) => {
      await refresh();
      setActiveId(res.campaignId);
      celebrate(`${res.added} prospects · ${res.auraSpent} AURA`, 200, "akquise:research");
      toast.success(
        res.added
          ? `Got it. Found ${res.added} real prospects.`
          : "Run finished — no prospects on these sources. Try a sharper goal.",
      );
    },
    onError: (e: Error) => setError(e.message),
  });

  const research = useMutation({
    mutationFn: (campaignId: string) => researchLeads({ data: { campaignId } }),
    onSuccess: async (res) => {
      await refresh();
      celebrate(`${res.added} prospects found`, 200, "akquise:research");
    },
    onError: (e: Error) => setError(e.message),
  });

  const draft = useMutation({
    mutationFn: (leadId: string) => draftLeadEmail({ data: { leadId } }),
    onSuccess: async () => {
      await refresh();
      celebrate("Email written", 80);
    },
    onError: (e: Error) => setError(e.message),
  });

  const connectedBox = mailboxes.find((m) => m.connected);
  const send = useMutation({
    mutationFn: (leadId: string) => {
      if (!connectedBox) throw new Error("Connect your mailbox first.");
      return sendLeadEmail({ data: { leadId, provider: connectedBox.provider } });
    },
    onSuccess: async () => {
      await refresh();
      celebrate("Sent from your mailbox", 250, "akquise:send");
    },
    onError: (e: Error) => setError(e.message),
  });

  const share = useMutation({
    mutationFn: (campaignId: string) => publishAkquiseResult({ data: { campaignId } }),
    onSuccess: (res) => {
      const url = `${window.location.origin}${res.url}`;
      setLastShare(url);
      void navigator.clipboard.writeText(url);
      toast.success("Public result link copied");
      void refresh();
    },
    onError: (e: Error) => setError(e.message),
  });

  const removeLead = async (id: string) => {
    await supabase.from("akquise_leads").delete().eq("id", id);
    await refresh();
  };

  const exportCsv = () => {
    if (!activeLeads.length) return;
    const blob = new Blob([leadsToCsv(activeLeads)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `aura-leads-${active?.id?.slice(0, 8) ?? "export"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const sentCount = leads.filter((l) => l.status === "sent").length;
  const draftedCount = leads.filter((l) => l.status === "drafted").length;
  const steps = (Array.isArray(active?.steps) ? active!.steps : []) as Step[];

  return (
    <div className="space-y-8">
      <Celebrate trigger={burst} />
      <XpToast label={toastXp?.label ?? ""} amount={toastXp?.amount ?? 0} show={Boolean(toastXp)} />

      <PageHeader
        eyebrow="Business agent"
        title="What should Aura do?"
        description="Give a goal. Aura plans, searches, scores, verifies, and delivers a lead table — no invented contacts."
        actions={
          <Chip tone={connectedBox ? "primary" : "neutral"}>
            {connectedBox ? <Pulse /> : null}
            {connectedBox ? (connectedBox.account ?? "Mailbox live") : "Mailbox offline"}
          </Chip>
        }
      />

      {error ? (
        <div className="glass-soft rounded-2xl border border-destructive/30 px-4 py-3 text-[13px] text-destructive">
          {error}
          <button onClick={() => setError(null)} className="ml-3 text-muted-foreground underline">
            dismiss
          </button>
        </div>
      ) : null}

      <Panel label="Goal" glow>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={3}
          placeholder={selectedTemplate.goalExample}
          aria-label="What should Aura do?"
          className="w-full resize-none rounded-2xl border border-border bg-foreground/5 px-4 py-4 text-[15px] leading-relaxed outline-none focus:border-primary/40"
        />
        <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Templates
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {AKQUISE_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTemplate(t.id);
                if (!goal.trim()) setGoal(t.goalExample);
              }}
              className={cn(
                "rounded-2xl px-3 py-2 text-left text-[12px] transition-colors",
                template === t.id
                  ? "bg-primary/16 text-primary"
                  : "bg-foreground/6 text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="font-semibold">{t.label}</span>
              <span className="mt-0.5 block text-[10px] opacity-80">{t.short}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Region — e.g. Wien, Österreich"
            className="rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-[13px] outline-none focus:border-primary/40"
          />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 rounded-2xl bg-foreground/6 p-1">
              {(["de", "en"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={cn(
                    "flex-1 rounded-xl px-3 py-2 text-[11px]",
                    language === lang ? "bg-primary/16 text-primary" : "text-muted-foreground",
                  )}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
            <p className="px-1 text-[10px] leading-snug text-muted-foreground">
              DE: klares Alltagsdeutsch. Markennamen bleiben Englisch (Discord, Telegram, LinkedIn).
            </p>
          </div>
        </div>
        <textarea
          value={seedUrls}
          onChange={(e) => setSeedUrls(e.target.value)}
          rows={2}
          placeholder="Optional seed URLs (one per line)"
          className="mt-3 w-full resize-none rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-[13px] outline-none focus:border-primary/40"
        />
        <button
          type="button"
          onClick={() => {
            setError(null);
            if (!company) {
              setError("No company yet.");
              return;
            }
            run.mutate();
          }}
          disabled={run.isPending || (goal.trim().length > 0 && goal.trim().length < 8)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 md:w-auto"
        >
          {run.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Radar className="h-4 w-4" />
          )}
          {run.isPending ? "On it…" : "Got it. Run Aura"}
        </button>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1fr_2.1fr]">
        <div className="space-y-4">
          <Panel label="Runs">
            <div className="space-y-2">
              {campaigns.map((campaign) => {
                const count = leads.filter((l) => l.campaign_id === campaign.id).length;
                const selected = active?.id === campaign.id;
                return (
                  <button
                    key={campaign.id}
                    type="button"
                    onClick={() => setActiveId(campaign.id)}
                    className={cn(
                      "w-full rounded-2xl px-4 py-3 text-left transition-colors",
                      selected ? "bg-primary/12" : "bg-foreground/4 hover:bg-foreground/8",
                    )}
                  >
                    <p className="truncate text-sm font-semibold">{campaign.name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {campaign.template ?? "custom"} · {campaign.status} · {count} leads
                    </p>
                  </button>
                );
              })}
              {campaigns.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-muted-foreground">
                  No runs yet. Type a goal above.
                </p>
              ) : null}
            </div>
          </Panel>

          <Panel label="Your mailbox" glow={Boolean(connectedBox)}>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Agents draft from research; you send from this mailbox. Aura never emails silently.
            </p>
            {connectedBox ? (
              <p className="mt-2 text-[12px] text-foreground/85">
                From:{" "}
                <span className="font-medium">{connectedBox.account ?? connectedBox.provider}</span>
              </p>
            ) : (
              <p className="mt-2 text-[12px] text-gold">
                Connect Gmail or Outlook before Send —{" "}
                <Link to="/connect" className="underline hover:text-foreground">
                  open Connect
                </Link>
                .
              </p>
            )}
            <div className="mt-4 space-y-2">
              {(mailboxes as MailboxState[]).map((box) => {
                const meta = MAILBOX_META[box.provider];
                return (
                  <div key={box.provider} className="glass-soft rounded-2xl p-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-semibold",
                          box.connected
                            ? "bg-primary/14 text-primary"
                            : "bg-foreground/6 text-muted-foreground",
                        )}
                      >
                        {meta.glyph}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{meta.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {box.connected ? (box.account ?? "connected") : meta.blurb}
                        </p>
                      </div>
                      {box.connected ? (
                        <button
                          type="button"
                          onClick={() => disconnect.mutate(box.provider)}
                          className="grid h-8 w-8 place-items-center rounded-xl bg-foreground/6 text-muted-foreground"
                        >
                          <Unplug className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            connectMailbox.mutate(box.provider, {
                              onError: (e: Error) => setError(e.message),
                              onSuccess: () =>
                                celebrate("Mailbox connected", 200, "akquise:mailbox"),
                            });
                          }}
                          disabled={!box.available || connectMailbox.isPending}
                          className="rounded-xl bg-primary/14 px-3 py-1.5 text-[11px] font-medium text-primary disabled:opacity-40"
                        >
                          {box.available ? "Connect" : "Soon"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel label="Pipeline">
            <div className="space-y-1">
              <DataRow label="Prospects found" value={leads.length} />
              <DataRow label="Emails written" value={draftedCount} tone="primary" />
              <DataRow label="Sent" value={sentCount} tone="gold" />
            </div>
            <div className="mt-4">
              <Meter value={leads.length ? Math.round((sentCount / leads.length) * 100) : 0} />
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          {active && (
            <Panel
              label="Proof of work"
              action={
                <div className="flex flex-wrap gap-2">
                  {(active.status === "complete" || active.status === "researched") && (
                    <button
                      type="button"
                      onClick={() => share.mutate(active.id)}
                      disabled={share.isPending}
                      className="flex items-center gap-1.5 rounded-2xl bg-foreground/6 px-3 py-1.5 text-[11px]"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      {active.share_public ? "Copy link" : "Share result"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={exportCsv}
                    disabled={!activeLeads.length}
                    className="flex items-center gap-1.5 rounded-2xl bg-foreground/6 px-3 py-1.5 text-[11px] disabled:opacity-40"
                  >
                    <Download className="h-3.5 w-3.5" /> CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      research.mutate(active.id);
                    }}
                    disabled={research.isPending}
                    className="flex items-center gap-1.5 rounded-2xl bg-primary/14 px-3 py-1.5 text-[11px] text-primary disabled:opacity-50"
                  >
                    {research.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Radar className="h-3.5 w-3.5" />
                    )}
                    Re-run
                  </button>
                </div>
              }
            >
              <ProofOfWork
                agentName={(active.agents_labeled ?? ["Juno"]).join(" · ")}
                title={active.goal || active.brief}
                status={
                  active.status === "complete"
                    ? "completed"
                    : active.status === "failed"
                      ? "failed"
                      : active.status
                }
                result={
                  active.verify
                    ? `${active.verify.leadCount ?? activeLeads.length} leads · ${active.verify.withContact ?? 0} with on-page contact · ${(active.verify.notes ?? []).join(" ")}`
                    : activeLeads.length
                      ? `${activeLeads.length} leads on file`
                      : null
                }
                completedAt={active.completed_at}
                createdAt={active.started_at ?? active.created_at}
              />
              {typeof active.aura_spent === "number" && active.aura_spent > 0 && (
                <p className="mt-3 text-[12px] text-muted-foreground">
                  Compute · {active.aura_spent} AURA burned on this run
                </p>
              )}
              {lastShare && active.share_public && (
                <p className="mt-2 font-mono text-[11px] text-primary">
                  <Link to="/r/$runId" params={{ runId: active.share_slug! }}>
                    {lastShare}
                  </Link>
                </p>
              )}
              {steps.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {steps.map((s) => (
                    <li key={s.id} className="flex items-start gap-2 text-[12px]">
                      <Pulse
                        tone={
                          s.status === "done"
                            ? "primary"
                            : s.status === "failed"
                              ? "destructive"
                              : "muted"
                        }
                      />
                      <span>
                        <span className="font-medium">{s.label}</span>
                        {s.detail ? (
                          <span className="text-muted-foreground"> — {s.detail}</span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          <Panel label={active ? active.name : "Prospects"}>
            <div className="space-y-3">
              {activeLeads.map((lead, i) => {
                const open = openLead === lead.id;
                return (
                  <motion.div
                    key={lead.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 * i, duration: 0.45 }}
                    className="glass-soft rounded-2xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="num grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-[13px] font-semibold text-primary">
                        {lead.score}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {lead.name ?? lead.org ?? "Unnamed prospect"}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {[lead.org, lead.address, lead.email, lead.phone]
                            .filter(Boolean)
                            .join(" · ") || "no contact details on the source page"}
                        </p>
                      </div>
                      <Chip
                        tone={
                          lead.status === "sent"
                            ? "gold"
                            : lead.status === "drafted"
                              ? "primary"
                              : "neutral"
                        }
                      >
                        {lead.status}
                      </Chip>
                    </div>

                    {lead.snippet ? (
                      <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                        {lead.snippet}
                      </p>
                    ) : null}
                    {lead.metadata?.website_signals?.length ? (
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        Signals · {lead.metadata.website_signals.join(" · ")}
                      </p>
                    ) : null}

                    {open && lead.draft_body ? (
                      <div className="mt-3 rounded-2xl bg-foreground/4 p-4">
                        <p className="text-[12px] font-medium">{lead.draft_subject}</p>
                        <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-muted-foreground">
                          {lead.draft_body}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          draft.mutate(lead.id);
                          setOpenLead(lead.id);
                        }}
                        disabled={draft.isPending}
                        className="flex items-center gap-2 rounded-2xl bg-foreground/6 px-3 py-2 text-[11px] text-muted-foreground disabled:opacity-50"
                      >
                        <PenLine className="h-3.5 w-3.5" />
                        {lead.draft_body ? "Rewrite" : "Write email"}
                      </button>
                      {lead.draft_body ? (
                        <button
                          type="button"
                          onClick={() => setOpenLead(open ? null : lead.id)}
                          className="rounded-2xl bg-foreground/6 px-3 py-2 text-[11px] text-muted-foreground"
                        >
                          {open ? "Hide draft" : "Read draft"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          send.mutate(lead.id);
                        }}
                        disabled={
                          !connectedBox ||
                          !lead.email ||
                          !lead.draft_body ||
                          lead.status === "sent" ||
                          send.isPending
                        }
                        className="flex items-center gap-2 rounded-2xl bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground disabled:opacity-40"
                      >
                        {lead.status === "sent" ? (
                          <MailCheck className="h-3.5 w-3.5" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        {lead.status === "sent"
                          ? `Sent ${timeAgo(lead.sent_at ?? lead.created_at)}`
                          : connectedBox
                            ? "Send"
                            : "Connect mailbox"}
                      </button>
                      {!connectedBox && lead.draft_body ? (
                        <Link
                          to="/connect"
                          className="rounded-2xl bg-gold/14 px-3 py-2 text-[11px] font-medium text-gold"
                        >
                          Wire mailbox
                        </Link>
                      ) : null}
                      {lead.source_url ? (
                        <a
                          href={lead.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-muted-foreground underline-offset-4 hover:underline"
                        >
                          source
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeLead(lead.id)}
                        className="ml-auto grid h-8 w-8 place-items-center rounded-xl text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}

              {active && activeLeads.length === 0 ? (
                <div className="py-12 text-center">
                  <Mail className="mx-auto h-5 w-5 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    No prospects yet — run a goal above.
                  </p>
                </div>
              ) : null}
              {!active ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Launch a goal to begin.
                </p>
              ) : null}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
