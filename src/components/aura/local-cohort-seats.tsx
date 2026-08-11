import { useQuery } from "@tanstack/react-query";

import { LOCAL_COHORT_CAP } from "@/lib/funnels";
import { getLocalCohortScarcity } from "@/lib/reviews.functions";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  className?: string;
  compact?: boolean;
};

/** Honest local-cohort remaining — public RPCs, no auth required. */
export function LocalCohortSeatsLeft({ label, className, compact }: Props) {
  const scarcity = useQuery({
    queryKey: ["local-cohort-scarcity"],
    queryFn: () => getLocalCohortScarcity(),
    staleTime: 60_000,
  });

  const remaining = scarcity.data?.remaining ?? LOCAL_COHORT_CAP;
  const taken = scarcity.data?.taken ?? 0;

  if (compact) {
    return (
      <p className={cn("text-[12px] text-muted-foreground", className)}>
        <span className="font-semibold tabular-nums text-gold">
          {scarcity.isLoading ? "…" : remaining}
        </span>{" "}
        {label}
      </p>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-end gap-5", className)}>
      <div>
        <p className="font-display text-4xl font-semibold tracking-tight text-gold tabular-nums sm:text-5xl">
          {scarcity.isLoading ? "—" : remaining}
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      </div>
      {!scarcity.isLoading && taken > 0 ? (
        <p className="pb-1 text-[12px] text-muted-foreground">
          {taken} / {LOCAL_COHORT_CAP}
        </p>
      ) : null}
    </div>
  );
}
