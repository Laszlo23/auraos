import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Monitor, Smartphone, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Chip, PageHeader, Panel, Pulse } from "@/components/aura/primitives";
import { useDispatchTask } from "@/lib/actions";
import { useCompany, useCompanyTable } from "@/hooks/use-aura";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/website")({
  head: () => ({
    meta: [
      { title: "Website — Aura OS" },
      {
        name: "description",
        content:
          "Your company's landing draft from real product and knowledge data — edited by approved agent tasks.",
      },
      { property: "og:title", content: "Website — Aura OS" },
      { property: "og:description", content: "Landing page powered by your company data." },
    ],
  }),
  component: WebsitePage,
});

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
};

type Knowledge = {
  id: string;
  title: string;
  summary: string | null;
  updated_at?: string;
  created_at?: string;
};

type Task = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  result: string | null;
};

function parseLanding(summary: string | null | undefined) {
  const lines = (summary ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const get = (prefix: string) =>
    lines.find((l) => l.toLowerCase().startsWith(prefix.toLowerCase()))?.split(":").slice(1).join(":").trim();
  return {
    hero: get("Hero") ?? null,
    cta: get("CTA") ?? "Get started",
    status: get("Status") ?? null,
    raw: summary ?? "",
  };
}

function WebsitePage() {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [instruction, setInstruction] = useState("");
  const dispatch = useDispatchTask();
  const { data: company } = useCompany();
  const { data: products = [] } = useCompanyTable<Product>("products", {
    orderBy: "created_at",
    ascending: false,
  });
  const { data: knowledge = [] } = useCompanyTable<Knowledge>("knowledge_items", {
    orderBy: "created_at",
    ascending: false,
  });
  const { data: shipped = [] } = useCompanyTable<Task>("tasks", {
    orderBy: "created_at",
    ascending: false,
  });

  const landing = knowledge.find((k) => k.title === "Landing page");
  const parsed = useMemo(() => parseLanding(landing?.summary), [landing?.summary]);
  const siteEdits = shipped.filter((t) => t.title.startsWith("Website:")).slice(0, 8);
  const brand = company?.name && company.name !== "Untitled company" ? company.name : "Your company";
  const tagline = company?.tagline || company?.strategy || parsed.hero || "No landing copy yet — hire a product in onboarding or instruct Iris.";

  const send = () => {
    const text = instruction.trim();
    if (!text) {
      toast.error("Describe the change you want first.");
      return;
    }
    dispatch.mutate(
      {
        title: `Website: ${text.slice(0, 90)}`,
        description: `${text}\n\nUpdate the knowledge item titled "Landing page" with concrete hero, CTA, and section copy. Never invent traffic, LCP, CVR, or SEO scores.`,
        agent: "Iris",
        priority: "high",
        activity: `Iris queued storefront edit — "${text.slice(0, 60)}"`,
        founderApproved: true,
      },
      {
        onSuccess: (res) => {
          setInstruction("");
          toast.success(
            res.workerRan
              ? "Iris ran the edit task — check Tasks for the result."
              : "Iris task queued — approve or wait for the worker.",
          );
        },
      },
    );
  };

  return (
    <div>
      <PageHeader
        eyebrow="Surface"
        title="Your landing page"
        description="Preview is built from your company name, products, and the Landing page knowledge item — not demo metrics."
        actions={
          <div className="flex items-center gap-2">
            <Chip tone="gold">Live data</Chip>
            <div className="glass-soft flex gap-1 rounded-2xl p-1">
              {(["desktop", "mobile"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDevice(d)}
                  className={cn(
                    "grid h-9 w-10 place-items-center rounded-xl transition-colors",
                    device === d ? "bg-primary/15 text-primary" : "text-muted-foreground",
                  )}
                >
                  {d === "desktop" ? (
                    <Monitor className="h-4 w-4" />
                  ) : (
                    <Smartphone className="h-4 w-4" />
                  )}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Panel className="p-4">
          <div
            className={cn(
              "mx-auto overflow-hidden rounded-3xl border border-border bg-[oklch(0.12_0.01_265)] transition-all duration-500",
              device === "mobile" ? "w-[380px] max-w-full" : "w-full",
            )}
          >
            <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
              <span className="ml-3 truncate rounded-lg bg-foreground/6 px-3 py-1 text-[10px] text-muted-foreground">
                {brand.toLowerCase().replace(/\s+/g, "")}.preview
              </span>
            </div>

            <div className="px-8 py-14 text-center">
              <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
                {parsed.status ?? (landing ? "Draft" : "Empty")}
              </p>
              <h2 className="mt-6 text-4xl font-semibold leading-tight">{brand}</h2>
              <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
                {tagline}
              </p>
              <span className="mt-8 inline-block rounded-2xl bg-gold px-6 py-3 text-xs font-semibold text-gold-foreground">
                {parsed.cta}
              </span>
              {products.length > 0 ? (
                <div
                  className={cn(
                    "mt-12 grid gap-4",
                    device === "mobile" ? "grid-cols-2" : "grid-cols-3",
                  )}
                >
                  {products.slice(0, 6).map((p) => (
                    <div
                      key={p.id}
                      className="rounded-2xl bg-foreground/5 px-3 py-4 text-left"
                    >
                      <p className="text-xl">{p.emoji || "✦"}</p>
                      <p className="mt-2 text-[13px] font-semibold">{p.name}</p>
                      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                        {p.description}
                      </p>
                      {p.price > 0 && (
                        <p className="num mt-2 text-[12px] text-gold">${p.price}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-12 text-[13px] text-muted-foreground">
                  No products yet.{" "}
                  <Link to="/products" className="text-primary underline-offset-2 hover:underline">
                    Add a product
                  </Link>{" "}
                  or finish onboarding.
                </p>
              )}
            </div>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel className="p-5">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <Wand2 className="h-3.5 w-3.5 text-primary" /> Edit by instruction
            </p>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={3}
              placeholder="Rewrite the hero for founders who hate day-trading…"
              className="mt-3 w-full resize-none rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary/40"
            />
            <button
              type="button"
              onClick={send}
              disabled={dispatch.isPending}
              className="mt-3 w-full rounded-2xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {dispatch.isPending ? "Sending…" : "Send to Iris"}
            </button>
          </Panel>

          <Panel className="p-5" delay={0.08}>
            <p className="mb-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Recent website tasks
            </p>
            {siteEdits.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                No website tasks yet. Instruct Iris above — results appear here when the worker
                finishes.
              </p>
            ) : (
              <div className="space-y-4">
                {siteEdits.map((t) => (
                  <div key={t.id} className="flex gap-2.5">
                    <span className="mt-1.5">
                      <Pulse tone={t.status === "completed" ? "primary" : "gold"} />
                    </span>
                    <div>
                      <p className="text-[13px] leading-snug">
                        {t.title.replace("Website: ", "")}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Iris · {t.status} · {timeAgo(t.created_at)}
                      </p>
                      {t.result && t.status === "completed" && (
                        <p className="mt-1 line-clamp-3 text-[11px] text-muted-foreground/90">
                          {t.result}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel className="p-5" delay={0.14}>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Source of truth</p>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
              {landing
                ? "Landing page knowledge item is linked. Iris updates it when tasks complete."
                : "No Landing page knowledge item yet — choose a product in onboarding or instruct Iris."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip tone="primary">{products.length} products</Chip>
              <Chip tone="neutral">{siteEdits.filter((t) => t.status === "completed").length} shipped</Chip>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
