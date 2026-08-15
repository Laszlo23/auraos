import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Chip, PageHeader, Panel, SectionTitle } from "@/components/aura/primitives";
import { useCompanyTable } from "@/hooks/use-aura";
import { useCreateRow, useDeleteRow } from "@/lib/actions";
import { getCompanyEconomy } from "@/lib/economy.functions";

export const Route = createFileRoute("/_authenticated/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge — Aura OS" },
      {
        name: "description",
        content:
          "The shared brain of your company: the facts, constraints and hard-won lessons every agent reasons from.",
      },
      { property: "og:title", content: "Knowledge — Aura OS" },
      { property: "og:description", content: "The shared brain of your company." },
    ],
  }),
  component: KnowledgePage,
});

type Item = { id: string; title: string; summary: string; cluster: string; source: string };

function KnowledgePage() {
  const { data: items = [] } = useCompanyTable<Item>("knowledge_items", { orderBy: "cluster" });
  const { data: economy } = useQuery({
    queryKey: ["company-economy"],
    queryFn: () => getCompanyEconomy(),
    staleTime: 30_000,
  });
  const create = useCreateRow("knowledge_items");
  const remove = useDeleteRow("knowledge_items");
  const [open, setOpen] = useState(false);
  const [ask, setAsk] = useState("");
  const [draft, setDraft] = useState({ title: "", summary: "", cluster: "" });
  const visible = ask.trim()
    ? items.filter((i) =>
        `${i.title} ${i.summary} ${i.cluster}`.toLowerCase().includes(ask.trim().toLowerCase()),
      )
    : items;
  const clusters = Array.from(new Set(visible.map((i) => i.cluster)));
  const facts = economy?.memory.facts ?? items.length;
  const decisions = economy?.memory.decisions ?? 0;
  const interactions = economy?.memory.interactions ?? 0;

  const addFact = () => {
    if (!draft.title.trim() || !draft.summary.trim()) {
      toast.error("A fact needs a title and a description.");
      return;
    }
    create.mutate(
      {
        title: draft.title.trim(),
        summary: draft.summary.trim(),
        cluster: draft.cluster.trim() || "Founder notes",
        source: "Founder",
      },
      {
        onSuccess: () => {
          setDraft({ title: "", summary: "", cluster: "" });
          setOpen(false);
          toast.success("Every agent now reasons from this.");
        },
      },
    );
  };

  return (
    <div>
      <PageHeader
        eyebrow="Memory"
        title="What your company remembers"
        description="Customers, products, market knowledge, decisions, and what already worked — never padded."
        actions={
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> Teach the company
          </button>
        }
      />

      <input
        value={ask}
        onChange={(e) => setAsk(e.target.value)}
        placeholder="What did we learn about Vienna real estate?"
        aria-label="Search company memory"
        className="mb-6 w-full rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none focus:border-primary/40"
      />

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <div className="glass-soft rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Facts</p>
          <p className="num mt-1 text-3xl font-semibold">{facts}</p>
        </div>
        <div className="glass-soft rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Decisions</p>
          <p className="num mt-1 text-3xl font-semibold">{decisions}</p>
        </div>
        <div className="glass-soft rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Connected channels
          </p>
          <p className="num mt-1 text-3xl font-semibold">{interactions}</p>
        </div>
      </div>

      {open && (
        <Panel className="mb-8 p-6">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Fact title"
              aria-label="Fact title"
              className="rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none focus:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            <input
              value={draft.cluster}
              onChange={(e) => setDraft({ ...draft, cluster: e.target.value })}
              placeholder="Cluster (e.g. Pricing)"
              aria-label="Knowledge cluster"
              className="rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none focus:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>
          <textarea
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            rows={3}
            placeholder="The constraint, rule or lesson the agents must respect."
            aria-label="Knowledge summary"
            className="mt-3 w-full resize-none rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none focus:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          <button
            onClick={addFact}
            disabled={create.isPending}
            className="mt-3 rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {create.isPending ? "Saving…" : "Save fact"}
          </button>
        </Panel>
      )}

      {ask.trim() && visible.length === 0 ? (
        <p className="mb-8 text-[14px] text-muted-foreground">
          Nothing in memory matches that yet. Teach the company, or try another question.
        </p>
      ) : null}

      <div className="space-y-12">
        {clusters.map((cluster) => (
          <section key={cluster}>
            <SectionTitle
              title={cluster}
              hint={`${items.filter((i) => i.cluster === cluster).length} facts`}
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visible
                .filter((i) => i.cluster === cluster)
                .map((i, idx) => (
                  <Panel key={i.id} className="relative p-6" delay={0.04 * idx}>
                    <span className="absolute left-0 top-7 h-8 w-[3px] rounded-r-full bg-primary/70" />
                    <button
                      onClick={() => remove.mutate(i.id)}
                      aria-label={`Forget ${i.title}`}
                      className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground/60 transition-colors hover:bg-foreground/8 hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <h4 className="text-[15px] font-semibold leading-snug">{i.title}</h4>
                    <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                      {i.summary}
                    </p>
                    <Chip className="mt-5">{i.source}</Chip>
                  </Panel>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
