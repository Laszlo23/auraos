import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";

import { Panel } from "@/components/aura/primitives";
import { cn } from "@/lib/utils";

type Step = { to: string; title: string; body: string; cta: string; done: boolean };

/**
 * One loving next step for early founders — not five competing panels.
 */
export function StartHere({
  hasMission,
  hasApproval,
  hasProof,
  hasCrew = false,
}: {
  hasMission: boolean;
  hasApproval: boolean;
  hasProof: boolean;
  /** Squad join or Scout join counts as showing up with people. */
  hasCrew?: boolean;
}) {
  const steps: Step[] = [
    {
      to: "/missions",
      title: "Give your company one job today",
      body: "A sentence is enough. Aura drafts the plan — you stay in control.",
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
    {
      to: "/community",
      title: "Show up with people",
      body: "Join a squad for growth tasks, or Scouts on Quest for local invites. Pick one.",
      cta: "Open Community",
      done: hasCrew,
    },
  ];

  const next = steps.find((s) => !s.done);
  if (!next) return null;

  const stepIndex = steps.indexOf(next) + 1;

  return (
    <Panel label="Your next love step" glow>
      <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground">
        You’re building a company. One job today — step{" "}
        <span className="text-foreground">
          {stepIndex} of {steps.length}
        </span>
        . Aim for a few hours back every day: missions draft the grind, you approve in minutes.
        Quest XP and Aura Reputation (€49/mo for local shops) are different things; this strip is
        just the path to your first real win.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              {active ? (
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                  {s.cta} <ArrowRight className="h-3 w-3" />
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}
