import type { ReactNode } from "react";

import { Chip } from "@/components/aura/primitives";
import { TASK_COST } from "@/lib/task-cost";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export type PowStep = {
  id: string;
  label: string;
  status: string;
  detail?: string;
  at?: string;
};

export type PowSource = {
  url: string;
  title: string;
  snippet?: string;
};

type Props = {
  agentName?: string | null | undefined;
  title: string;
  status: string;
  result?: string | null | undefined;
  completedAt?: string | null | undefined;
  createdAt?: string | null | undefined;
  /** USDC revenue if linked to a settlement */
  settlementUsdc?: number | null | undefined;
  steps?: PowStep[] | null | undefined;
  sources?: PowSource[] | null | undefined;
  progress?: number | null | undefined;
  className?: string;
};

function stepGlyph(status: string) {
  if (status === "done") return "✓";
  if (status === "running") return "●";
  if (status === "failed") return "!";
  if (status === "skipped") return "–";
  return "○";
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[5.5rem_1fr] sm:gap-3">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </dt>
      <dd className="text-[14px] leading-snug text-foreground sm:text-[15px]">{children}</dd>
    </div>
  );
}

export function ProofOfWork({
  agentName,
  title,
  status,
  result,
  completedAt,
  createdAt,
  settlementUsdc,
  steps,
  sources,
  progress,
  className,
}: Props) {
  const done = status === "completed" || status === "done";
  const running = status === "running" || status === "queued";
  const failed = status === "failed";
  const list = steps ?? [];
  const refs = sources ?? [];
  const resultText =
    result?.trim() ||
    (done ? "Completed (no write-up filed)." : running ? "Working…" : "Pending");

  return (
    <article
      className={cn(
        "glass-soft space-y-4 rounded-2xl p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Proof of work
        </p>
        <Chip tone={failed ? "gold" : done ? "primary" : "gold"}>
          {done
            ? refs.length
              ? `Verified · ${refs.length} sources`
              : "Verified · ledger"
            : progress != null
              ? `${progress}% · ${status}`
              : status}
        </Chip>
      </div>

      <h3 className="font-display text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-xl">
        {title}
      </h3>

      <dl className="space-y-3 border-t border-border/40 pt-3">
        <MetaRow label="Who">{agentName ?? "Unassigned"}</MetaRow>
        <MetaRow label="When">
          {completedAt
            ? timeAgo(completedAt)
            : createdAt
              ? `Started ${timeAgo(createdAt)}`
              : "—"}
        </MetaRow>
        <MetaRow label="Cost">{done ? `${TASK_COST} AURA` : `Up to ${TASK_COST} AURA`}</MetaRow>
        <MetaRow label="Profit">
          {settlementUsdc != null && settlementUsdc > 0
            ? `$${settlementUsdc.toFixed(2)} USDC settled`
            : "— (no payment row)"}
        </MetaRow>
      </dl>

      {list.length > 0 ? (
        <div className="space-y-2 border-t border-border/40 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Steps
          </p>
          <ul className="space-y-2">
            {list.map((s) => (
              <li key={s.id} className="flex gap-2.5 text-[14px] leading-snug">
                <span
                  className={cn(
                    "mt-0.5 shrink-0",
                    s.status === "running" || s.status === "done"
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {stepGlyph(s.status)}
                </span>
                <span>
                  <span className="font-medium text-foreground">{s.label}</span>
                  {s.detail ? (
                    <span className="text-muted-foreground"> — {s.detail}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {refs.length > 0 ? (
        <div className="space-y-2 border-t border-border/40 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Sources ({refs.length})
          </p>
          <ul className="space-y-2">
            {refs.slice(0, 5).map((s) => (
              <li key={s.url} className="text-[14px] leading-snug">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-words font-medium text-primary hover:underline"
                >
                  {s.title || s.url}
                </a>
                {s.snippet ? (
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{s.snippet}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-2 border-t border-border/40 pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Result
        </p>
        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground">
          {resultText}
        </p>
      </div>
    </article>
  );
}
