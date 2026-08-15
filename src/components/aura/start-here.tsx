import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";

import { Panel } from "@/components/aura/primitives";
import { cn } from "@/lib/utils";

type Step = { to: string; title: string; body: string; cta: string; done: boolean };

/**
 * The first five minutes. One obvious next action, in plain language.
 */
export function StartHere({
  hasMission,
  hasApproval,
  hasProof,
}: {
  hasMission: boolean;
  hasApproval: boolean;
  hasProof: boolean;
  /** @deprecated kept so older call sites type-check during the cutover */
  hasConnections?: boolean;
  hasInstructed?: boolean;
  hasTasks?: boolean;
}) {
  const steps: Step[] = [
    {
      to: "/missions",
      title: "Give your company something to do",
      body: "A sentence is enough. Aura turns it into a plan you can approve.",
      cta: "Create a mission",
      done: hasMission,
    },
    {
      to: "/approvals",
      title: "Approve the first action",
      body: "Nothing spends or publishes until you tap approve.",
      cta: "Open approvals",
      done: hasApproval,
    },
    {
      to: "/proofs",
      title: "See the proof",
      body: "When work finishes, the result is filed here — not a vanity number.",
      cta: "View proof",
      done: hasProof,
    },
  ];

  const next = steps.find((s) => !s.done);
  if (!next) return null;

  return (
    <Panel label="Your company is ready" glow>
      <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground">
        You own the company. Give an outcome. Aura handles the rest. You are on step{" "}
        <span className="text-foreground">{steps.indexOf(next) + 1} of 3</span>.
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {steps.map((s, i) => {
          const active = s === next;
          return (
            <Link
              key={s.to}
              to={s.to}
              className={cn(
                "group rounded-2xl p-4 transition-colors",
                s.done
                  ? "bg-foreground/4 text-muted-foreground"
                  : active
                    ? "bg-primary/10 ring-1 ring-primary/25"
                    : "bg-foreground/4 opacity-70 hover:opacity-100",
              )}
            >
              <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                {s.done ? (
                  <Check className="h-3 w-3 text-primary" />
                ) : (
                  <span className="num">{i + 1}</span>
                )}
                step {i + 1}
              </span>
              <p className={cn("mt-2 text-sm font-medium", s.done && "line-through")}>{s.title}</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{s.body}</p>
              {!s.done && (
                <span
                  className={cn(
                    "mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {s.cta}
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}
