import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";

import { Panel } from "@/components/aura/primitives";
import { cn } from "@/lib/utils";

type Step = { to: string; title: string; body: string; cta: string; done: boolean };

/**
 * The first five minutes. One obvious next action, in plain language.
 */
export function StartHere({
  hasConnections,
  hasInstructed,
  hasTasks,
}: {
  hasConnections: boolean;
  hasInstructed: boolean;
  hasTasks: boolean;
}) {
  const steps: Step[] = [
    {
      to: "/connect",
      title: "Connect one account",
      body: "Your email or a social account. That is how your agents reach the outside world.",
      cta: "Connect",
      done: hasConnections,
    },
    {
      to: "/ceo",
      title: "Tell the CEO what you want",
      body: 'Plain words work: "find me ten leads in Vienna" or "write this week\'s posts".',
      cta: "Say something",
      done: hasInstructed,
    },
    {
      to: "/tasks",
      title: "Watch the work happen",
      body: "Your team picks the job up and reports back. Nothing for you to configure.",
      cta: "Open work",
      done: hasTasks,
    },
  ];

  const next = steps.find((s) => !s.done);
  if (!next) return null;

  return (
    <Panel label="Start here" glow>
      <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground">
        Three steps and your company runs itself. You are on step{" "}
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
