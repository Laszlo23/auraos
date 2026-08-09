import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Link2, Loader2, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Chip, PageHeader, Pulse, Shimmer } from "@/components/aura/primitives";
import { WeeklyReportView } from "@/components/aura/weekly-report-view";
import { getWeeklyReport, shareWeeklyReport } from "@/lib/weekly-report.functions";

export const Route = createFileRoute("/_authenticated/report")({
  head: () => ({
    meta: [
      { title: "Week in review — Aura OS" },
      {
        name: "description",
        content:
          "A boss-ready weekly report of posts shipped, replies sent, and agent work — share a stable link.",
      },
      { property: "og:title", content: "Week in review — Aura OS" },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["weekly-report"],
    queryFn: () => getWeeklyReport(),
    staleTime: 30_000,
  });
  const [copied, setCopied] = useState(false);

  const share = useMutation({
    mutationFn: () => shareWeeklyReport(),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ["weekly-report"] });
      try {
        await navigator.clipboard.writeText(res.shareUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
        toast.success("Report link copied — send it to your boss");
      } catch {
        toast.success("Report is live", { description: res.shareUrl });
      }
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Could not share report");
    },
  });

  const copyExisting = async () => {
    if (!data?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(data.shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Shimmer className="h-24" />
        <Shimmer className="h-40" />
        <Shimmer className="h-64" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-3xl border border-border/50 p-10 text-center">
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Could not load this week’s report."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 text-foreground">
      <PageHeader
        eyebrow="Report"
        title="Week in review"
        description="What your AI company shipped on social — and what the agents did — ready to send upstairs."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {data.shareUrl ? (
              <>
                <Chip tone="primary">
                  <Pulse /> Shared
                </Chip>
                <button
                  type="button"
                  onClick={() => void copyExisting()}
                  className="flex items-center gap-2 rounded-2xl bg-foreground/8 px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-foreground/14"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy link"}
                </button>
                <Link
                  to="/w/$shareSlug"
                  params={{ shareSlug: data.shareSlug! }}
                  className="flex items-center gap-2 rounded-2xl bg-foreground/8 px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-foreground/14"
                >
                  <Link2 className="h-3.5 w-3.5" /> Preview
                </Link>
              </>
            ) : null}
            <button
              type="button"
              disabled={share.isPending}
              onClick={() => share.mutate()}
              className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {share.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Share2 className="h-3.5 w-3.5" />
              )}
              {data.shareUrl ? "Refresh & share" : "Share this week"}
            </button>
          </div>
        }
      />

      <WeeklyReportView snapshot={data} mode="founder" />
    </div>
  );
}
