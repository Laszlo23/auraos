import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/aura/primitives";
import { dispatchMission } from "@/lib/economy.functions";
import { TASK_COST } from "@/lib/task-cost";

type MissionResult = Awaited<ReturnType<typeof dispatchMission>>;

export function MissionDispatch() {
  const qc = useQueryClient();
  const [mission, setMission] = useState("");
  const [last, setLast] = useState<MissionResult | null>(null);

  const mutate = useMutation({
    mutationFn: () => dispatchMission({ data: { mission } }),
    onSuccess: (res) => {
      setLast(res);
      setMission("");
      qc.invalidateQueries({ queryKey: ["company-economy"] });
      qc.invalidateQueries({ queryKey: ["table", "tasks"] });
      qc.invalidateQueries({ queryKey: ["table", "agents"] });
      qc.invalidateQueries({ queryKey: ["table", "activity_events"] });
      qc.invalidateQueries({ queryKey: ["table", "akquise_campaigns"] });
      qc.invalidateQueries({ queryKey: ["table", "akquise_leads"] });
      const akquise = (res as { akquise?: { added: number; auraSpent: number } }).akquise;
      toast.success(
        akquise
          ? `Got it. ${akquise.added} real prospects · ${akquise.auraSpent} AURA`
          : res.activated.length
            ? `${res.activated.length} employees activated · ${res.status}`
            : "No employees available (all paused?).",
      );
    },
    onError: (e: Error) => toast.error(e.message || "Mission failed"),
  });

  async function share() {
    if (!last) return;
    const text = last.shareText;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Aura OS mission", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Share text copied");
      }
    } catch {
      await navigator.clipboard.writeText(text);
      toast.success("Share text copied");
    }
  }

  const akquise = last
    ? (last as { akquise?: { campaignId: string; added: number; auraSpent: number; scanned: number; template: string } })
        .akquise
    : undefined;

  return (
    <Panel label="Mission" glow delay={0.02}>
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Give the company a job. Lead and outreach goals run the Lead hunter pipeline (real web
        research). Other goals activate employees and burn {TASK_COST} AURA per completed task.
      </p>
      <textarea
        value={mission}
        onChange={(e) => setMission(e.target.value)}
        rows={3}
        placeholder='e.g. "Find 20 Austrian companies that need a new website"'
        aria-label="Company mission"
        className="mt-4 w-full resize-none rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none focus:border-primary/40"
      />
      <button
        type="button"
        disabled={mutate.isPending || mission.trim().length < 8}
        onClick={() => mutate.mutate()}
        className="mt-3 rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
      >
        {mutate.isPending ? "On it…" : "Launch mission"}
      </button>

      {last && last.activated.length > 0 && (
        <div className="mt-5 space-y-3 border-t border-border/50 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="primary">{last.status}</Chip>
            {akquise && <Chip tone="gold">Lead hunter · {akquise.template}</Chip>}
            {last.overBudget && <Chip tone="gold">Over daily AURA budget</Chip>}
            {last.worker?.ok && (
              <Chip tone="primary">
                {akquise
                  ? `${akquise.added} leads · ${akquise.scanned} pages`
                  : `Worker · ${last.worker.tasksProcessed ?? 0} ran`}
              </Chip>
            )}
          </div>
          <ul className="space-y-2">
            {last.activated.map((a) => (
              <li key={`${a.agent}-${a.taskId}`} className="text-[13px]">
                <span className="font-semibold">{a.agent}</span>
                <span className="text-muted-foreground"> · {a.status}</span>
              </li>
            ))}
          </ul>
          <div className="glass-soft rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Proof of work
            </p>
            <p className="mt-2 text-[13px] leading-relaxed">
              {akquise ? (
                <>
                  WHO · {last.activated.map((a) => a.agent).join(", ")} · WHAT ·{" "}
                  {last.mission.slice(0, 120)} · COST · {akquise.auraSpent} AURA · RESULT ·{" "}
                  {akquise.added} prospects (honest count) · REVENUE · only if a settlement exists
                </>
              ) : (
                <>
                  WHO · activated employees above · WHAT · {last.mission.slice(0, 120)} · COST ·{" "}
                  {last.activated.length * TASK_COST} AURA when done · RESULT · on task board
                </>
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {akquise && (
                <Link
                  to="/akquise"
                  className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary"
                >
                  Open lead table →
                </Link>
              )}
              <button
                type="button"
                onClick={share}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary"
              >
                <Share2 className="h-3.5 w-3.5" /> Share milestone
              </button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
