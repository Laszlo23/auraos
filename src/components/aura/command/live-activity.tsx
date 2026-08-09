import { Link } from "@tanstack/react-router";

import { Panel, Pulse } from "@/components/aura/primitives";
import { currency, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ActivityEvent = {
  id: string;
  kind: string;
  message: string;
  value: number | null;
  created_at: string;
  agent_name?: string | null;
};

function toneFor(kind: string, message: string): "ok" | "active" | "wait" | "fail" | "idle" {
  const m = message.toLowerCase();
  if (kind === "fail" || kind === "error" || m.includes("fail") || m.includes("error")) {
    return "fail";
  }
  if (
    kind === "approval" ||
    m.includes("pending") ||
    m.includes("waiting") ||
    m.includes("approval")
  ) {
    return "wait";
  }
  if (kind === "revenue" || kind === "complete" || m.includes("completed") || m.includes("settled")) {
    return "ok";
  }
  if (kind === "mission" || kind === "publish" || kind === "reply" || m.includes("launch")) {
    return "active";
  }
  return "idle";
}

const TONE_DOT: Record<string, string> = {
  ok: "bg-emerald-400",
  active: "bg-primary",
  wait: "bg-gold",
  fail: "bg-destructive",
  idle: "bg-muted-foreground/40",
};

function parseAgent(message: string, agentName?: string | null): string {
  if (agentName?.trim()) return agentName.trim();
  const known = ["Atlas", "Vela", "Cass", "Iris", "Ledger", "Quant", "Orin", "Juno", "Akquise"];
  for (const name of known) {
    if (message.startsWith(name) || message.includes(`${name} `)) return name;
  }
  return "Company";
}

type Props = {
  events: ActivityEvent[];
  limit?: number;
};

export function LiveCompanyActivity({ events, limit = 16 }: Props) {
  const rows = events.slice(0, limit);

  return (
    <Panel
      label="Live company activity"
      glow
      delay={0.04}
      bodyClassName="p-0"
      action={
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-primary">
          <Pulse /> Live
        </span>
      }
    >
      <div className="max-h-[420px] divide-y divide-border/40 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="px-5 py-8">
            <p className="text-[14px] font-medium">Nothing is running.</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Give Atlas a mission — activity shows up here when employees move.
            </p>
          </div>
        ) : (
          rows.map((e) => {
            const tone = toneFor(e.kind, e.message);
            const who = parseAgent(e.message, e.agent_name);
            return (
              <div key={e.id} className="flex items-start gap-3 px-5 py-3">
                <span
                  className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", TONE_DOT[tone])}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold tracking-wide text-foreground/90">
                    {who}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-snug text-foreground/80">{e.message}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {tone === "fail"
                      ? "failed"
                      : tone === "wait"
                        ? "waiting"
                        : tone === "ok"
                          ? "completed"
                          : tone === "active"
                            ? "active"
                            : "noted"}
                    {e.value ? (
                      <span className="ml-2 text-gold">{currency(e.value)}</span>
                    ) : null}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {timeAgo(e.created_at)}
                </span>
              </div>
            );
          })
        )}
      </div>
      <div className="border-t border-border/40 px-5 py-3">
        <Link
          to="/tasks"
          className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary"
        >
          Open task board →
        </Link>
      </div>
    </Panel>
  );
}
