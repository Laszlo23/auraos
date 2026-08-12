import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Chip, PageHeader, Panel } from "@/components/aura/primitives";
import { acceptWorkJob, deliverWorkJob, listWorkJobs } from "@/lib/economy.functions";
import { currency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({
    meta: [
      { title: "Jobs marketplace — Aura OS" },
      {
        name: "description",
        content: "Accept client jobs, deliver proof of work, settle into the company ledger.",
      },
    ],
  }),
  component: JobsPage,
});

type WorkJob = Record<string, string | number | null>;

function JobsPage() {
  const qc = useQueryClient();
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["work-jobs"],
    queryFn: () => listWorkJobs(),
  });

  const accept = useMutation({
    mutationFn: (jobId: string) => acceptWorkJob({ data: { jobId } }),
    onSuccess: () => {
      toast.success("Job accepted — task created for approval");
      qc.invalidateQueries({ queryKey: ["work-jobs"] });
      qc.invalidateQueries({ queryKey: ["table", "tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deliver = useMutation({
    mutationFn: ({ jobId, resultSummary }: { jobId: string; resultSummary: string }) =>
      deliverWorkJob({ data: { jobId, resultSummary } }),
    onSuccess: (res) => {
      toast.success(`Settled · company earnings ${currency(res.earnings)}`);
      qc.invalidateQueries({ queryKey: ["work-jobs"] });
      qc.invalidateQueries({ queryKey: ["company-economy"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Earn"
        title="Jobs marketplace"
        description="Client budgets settle into your company ledger with an Aura fee. No fake profit — deliver, then settle."
      />

      {isLoading && <p className="text-sm text-muted-foreground">Loading jobs…</p>}

      <div className="grid gap-4">
        {(jobs as WorkJob[]).map((j) => {
          const id = String(j["id"]);
          const status = String(j["status"]);
          return (
            <Panel key={id} className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Chip tone="primary">{String(j["category"])}</Chip>
                    <Chip tone={status === "open" ? "gold" : "primary"}>{status}</Chip>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{String(j["title"])}</h3>
                  <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
                    {String(j["brief"])}
                  </p>
                  <p className="mt-3 text-[12px] text-muted-foreground">
                    Poster · {String(j["poster_label"])} · Budget{" "}
                    <span className="text-gold">{currency(Number(j["budget_usdc"]))}</span>
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {status === "open" && (
                    <button
                      type="button"
                      disabled={accept.isPending}
                      onClick={() => accept.mutate(id)}
                      className="rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                    >
                      Accept job
                    </button>
                  )}
                  {status === "accepted" && (
                    <button
                      type="button"
                      disabled={deliver.isPending}
                      onClick={() => {
                        const summary = window.prompt(
                          "Result summary for the client / PoW receipt?",
                        );
                        if (!summary?.trim()) return;
                        deliver.mutate({ jobId: id, resultSummary: summary });
                      }}
                      className="rounded-2xl bg-gold/20 px-4 py-2 text-xs font-semibold text-gold"
                    >
                      Deliver & settle
                    </button>
                  )}
                </div>
              </div>
              {j["result_summary"] ? (
                <p className="mt-4 rounded-2xl bg-foreground/5 p-3 text-[12px]">
                  Result · {String(j["result_summary"])}
                </p>
              ) : null}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
