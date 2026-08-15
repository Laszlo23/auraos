import { Link } from "@tanstack/react-router";

import { Meter, Panel } from "@/components/aura/primitives";

type Props = {
  goal: string;
  completed: number;
  target: number;
};

/**
 * Onboarding is done when the company produces a real result — not when the form ends.
 */
export function FirstWin({ goal, completed, target }: Props) {
  const safeTarget = Math.max(1, target);
  const value = Math.min(completed, safeTarget);
  const done = value >= safeTarget;

  if (done) {
    return (
      <Panel label="This is Aura" glow>
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Your company just did real work.
        </h2>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {goal}. The result is filed as proof — not a projection.
        </p>
        <Link
          to="/proofs"
          className="mt-5 inline-flex rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          View the proof
        </Link>
      </Panel>
    );
  }

  return (
    <Panel label="Your first win" glow>
      <h2 className="font-display text-xl font-semibold tracking-tight">{goal}</h2>
      <p className="mt-2 text-[13px] text-muted-foreground">
        {value} / {safeTarget}
      </p>
      <div className="mt-3 max-w-sm">
        <Meter value={Math.round((value / safeTarget) * 100)} tone="primary" />
      </div>
    </Panel>
  );
}
