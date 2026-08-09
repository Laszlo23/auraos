import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { bulkResolveEngagements } from "@/lib/social.functions";
import { cn } from "@/lib/utils";

type Props = {
  count: number;
  /** Limit provider scope — default all, use "x" on X-heavy queues. */
  provider?: "x" | "linkedin" | "meta" | "tiktok" | "farcaster";
  className?: string;
  /** Show free-auto CTA when queue is getting heavy. */
  showFreeAuto?: boolean;
};

/**
 * Bulk tools for comment/mention reply drafts.
 * Keeps founders out of 1-by-1 hell once the queue grows.
 */
export function SocialReplyBulkBar({
  count,
  provider,
  className,
  showFreeAuto = true,
}: Props) {
  const qc = useQueryClient();

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["table", "channel_engagements"] });
    void qc.invalidateQueries({ queryKey: ["table", "tasks"] });
    void qc.invalidateQueries({ queryKey: ["table", "activity_events"] });
    void qc.invalidateQueries({ queryKey: ["social-status"] });
    void qc.invalidateQueries({ queryKey: ["table", "channel_connections"] });
  };

  const mut = useMutation({
    mutationFn: (input: {
      action: "send_all" | "ignore_all" | "free_auto";
      flush?: "ignore" | "send";
    }) =>
      bulkResolveEngagements({
        data: {
          action: input.action,
          limit: 40,
          ...(provider ? { provider } : {}),
          ...(input.flush ? { flush: input.flush } : {}),
        },
      }),
    onSuccess: (res) => {
      invalidate();
      if (res.action === "free_auto") {
        toast.success(
          `Comments are free (auto). Cleared ${res.ignored} · sent ${res.sent}.`,
        );
        return;
      }
      if (res.action === "send_all") {
        toast.success(
          res.sent > 0
            ? `Sent ${res.sent} replies${res.errors.length ? ` · ${res.errors.length} failed` : ""}`
            : "Nothing ready to send — drafts need reply text.",
        );
        return;
      }
      toast.success(res.ignored > 0 ? `Ignored ${res.ignored} replies` : "Queue already clear");
    },
    onError: (e: Error) => toast.error(e.message || "Bulk action failed"),
  });

  if (count <= 0) return null;

  const heavy = count >= 5;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl border border-border/50 bg-foreground/[0.03] px-3 py-2.5",
        heavy && "border-gold/35 bg-gold/5",
        className,
      )}
    >
      <p className="mr-auto text-[12px] text-muted-foreground">
        {count} comment {count === 1 ? "reply" : "replies"} waiting
        {heavy ? " — bulk actions are faster" : ""}
      </p>
      <button
        type="button"
        disabled={mut.isPending}
        onClick={() => mut.mutate({ action: "send_all" })}
        className="rounded-xl bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
      >
        {mut.isPending ? "…" : `Send all (${Math.min(count, 40)})`}
      </button>
      <button
        type="button"
        disabled={mut.isPending}
        onClick={() => mut.mutate({ action: "ignore_all" })}
        className="rounded-xl bg-foreground/8 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground disabled:opacity-50"
      >
        Ignore all
      </button>
      {showFreeAuto ? (
        <button
          type="button"
          disabled={mut.isPending}
          onClick={() => mut.mutate({ action: "free_auto", flush: "ignore" })}
          className="rounded-xl bg-primary/14 px-3 py-1.5 text-[11px] font-semibold text-primary disabled:opacity-50"
          title="Future comments reply automatically — no per-comment approval"
        >
          Free comments (auto)
        </button>
      ) : null}
    </div>
  );
}
