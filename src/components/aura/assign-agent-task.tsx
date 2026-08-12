import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";

import { useDispatchTask } from "@/lib/actions";
import { agentVoice } from "@/lib/agent-personality";
import { cn } from "@/lib/utils";

type Props = {
  agentId: string;
  agentName: string;
  paused?: boolean | undefined;
  /** Compact inline (workforce cards) vs sheet (employees page). */
  variant?: "sheet" | "inline";
  className?: string;
  onAssigned?: () => void;
};

/**
 * Founder → one employee, one clear task.
 * Atlas remains the strategist; this is a direct work order.
 */
export function AssignAgentTask({
  agentId,
  agentName,
  paused,
  variant = "sheet",
  className,
  onAssigned,
}: Props) {
  const dispatch = useDispatchTask();
  const [open, setOpen] = useState(variant === "sheet");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const voice = agentVoice(agentName);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (paused || dispatch.isPending) return;
    const brief = title.trim();
    if (brief.length < 4) return;
    await dispatch.mutateAsync({
      agentId,
      agent: agentName,
      title: brief,
      description: detail.trim() || undefined,
      directAssign: true,
      founderApproved: true,
      priority: "high",
      activity: `${agentName} · founder brief`,
    });
    setTitle("");
    setDetail("");
    if (variant === "inline") setOpen(false);
    onAssigned?.();
  };

  if (paused) {
    return (
      <p className={cn("text-[12px] text-muted-foreground", className)}>
        {agentName} is paused — resume before assigning.
      </p>
    );
  }

  if (variant === "inline" && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "rounded-xl bg-primary/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary",
          className,
        )}
      >
        Assign task
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className={cn(
        "space-y-3",
        variant === "inline" && "rounded-2xl border border-primary/25 bg-primary/5 p-3",
        className,
      )}
    >
      {variant === "sheet" ? (
        <>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Assign a task</p>
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            One clear instruction. {voice.tagline} Atlas still owns strategy — this is a direct work
            order.
          </p>
        </>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Assign {agentName}
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={160}
        placeholder={
          agentName === "Vela"
            ? "Draft 3 X posts about our website offer"
            : agentName === "Cass"
              ? "Ship a one-page landing outline"
              : agentName === "Quant"
                ? "Review risk caps — no new trades"
                : `Tell ${agentName} what to do`
        }
        aria-label={`Task for ${agentName}`}
        className="w-full rounded-2xl border border-border bg-foreground/5 px-3.5 py-2.5 text-[13px] outline-none focus:border-primary/40"
      />
      <textarea
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        rows={variant === "sheet" ? 3 : 2}
        maxLength={800}
        placeholder="Optional context, constraints, links…"
        aria-label="Task details"
        className="w-full resize-none rounded-2xl border border-border bg-foreground/5 px-3.5 py-2.5 text-[13px] outline-none focus:border-primary/40"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={dispatch.isPending || title.trim().length < 4}
          className="rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {dispatch.isPending ? "Assigning…" : `Assign to ${agentName}`}
        </button>
        {variant === "sheet" ? (
          <Link
            to="/ceo"
            className="rounded-2xl border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Or ask Atlas
          </Link>
        ) : null}
      </div>
    </form>
  );
}
