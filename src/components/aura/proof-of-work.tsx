import { Chip } from "@/components/aura/primitives";
import { TASK_COST } from "@/lib/task-cost";
import { timeAgo } from "@/lib/format";

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
};

function stepGlyph(status: string) {
  if (status === "done") return "✓";
  if (status === "running") return "●";
  if (status === "failed") return "!";
  if (status === "skipped") return "–";
  return "○";
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
}: Props) {
  const done = status === "completed" || status === "done";
  const running = status === "running" || status === "queued";
  const list = steps ?? [];
  const refs = sources ?? [];

  return (
    <div className="glass-soft space-y-2 rounded-2xl p-4 text-[12px] leading-relaxed">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Proof of work</p>
      <p>
        <span className="text-muted-foreground">WHO</span> · {agentName ?? "Unassigned"}
      </p>
      <p>
        <span className="text-muted-foreground">WHAT</span> · {title}
      </p>
      <p>
        <span className="text-muted-foreground">WHEN</span> ·{" "}
        {completedAt ? timeAgo(completedAt) : createdAt ? `started ${timeAgo(createdAt)}` : "—"}
      </p>
      <p>
        <span className="text-muted-foreground">COST</span> ·{" "}
        {done ? `${TASK_COST} AURA` : `up to ${TASK_COST} AURA`}
      </p>

      {list.length > 0 && (
        <div className="mt-2 space-y-1.5 border-t border-border/40 pt-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Steps</p>
          <ul className="space-y-1">
            {list.map((s) => (
              <li key={s.id} className="flex gap-2">
                <span
                  className={
                    s.status === "running"
                      ? "text-primary"
                      : s.status === "done"
                        ? "text-primary"
                        : "text-muted-foreground"
                  }
                >
                  {stepGlyph(s.status)}
                </span>
                <span>
                  <span className="font-medium">{s.label}</span>
                  {s.detail ? (
                    <span className="text-muted-foreground"> · {s.detail}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {refs.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-border/40 pt-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Sources ({refs.length})
          </p>
          <ul className="space-y-1">
            {refs.slice(0, 5).map((s) => (
              <li key={s.url} className="truncate">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {s.title || s.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p>
        <span className="text-muted-foreground">RESULT</span> ·{" "}
        {result?.trim() ||
          (done ? "Completed (no write-up)" : running ? "Working…" : "Pending")}
      </p>
      <p className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground">VERIFIED</span> ·
        <Chip tone={done ? "primary" : "gold"}>
          {done
            ? refs.length
              ? `Ledger + ${refs.length} web sources`
              : "Task settled in ledger"
            : progress != null
              ? `${progress}% · ${status}`
              : status}
        </Chip>
      </p>
      {settlementUsdc != null && settlementUsdc > 0 ? (
        <p>
          <span className="text-muted-foreground">PROFIT</span> · ${settlementUsdc.toFixed(2)} USDC
          (settlement)
        </p>
      ) : (
        <p className="text-muted-foreground">PROFIT · — (no payment row)</p>
      )}
    </div>
  );
}
