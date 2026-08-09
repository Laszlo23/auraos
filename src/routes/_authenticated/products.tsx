import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Chip, Meter, PageHeader, Panel } from "@/components/aura/primitives";
import { Counter } from "@/components/aura/counter";
import { useCompanyTable, useRowMutation } from "@/hooks/use-aura";
import { useCreateRow, useDispatchTask } from "@/lib/actions";
import { currency, percent } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({
    meta: [
      { title: "Products — Aura OS" },
      {
        name: "description",
        content:
          "Every product your AI company sells, with live revenue, conversion and inventory pressure.",
      },
      { property: "og:title", content: "Products — Aura OS" },
      { property: "og:description", content: "What your AI company sells." },
    ],
  }),
  component: ProductsPage,
});

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  revenue: number;
  conversion: number;
  subscriptions: number;
  inventory: number;
  emoji: string;
};

function ProductsPage() {
  const { data: products = [] } = useCompanyTable<Product>("products", {
    orderBy: "revenue",
    ascending: false,
  });
  const total = products.reduce((a, p) => a + p.revenue, 0);
  const create = useCreateRow("products");
  const updateProduct = useRowMutation("products");
  const dispatch = useDispatchTask();
  const [draft, setDraft] = useState({ name: "", price: "", description: "" });
  const [open, setOpen] = useState(false);

  const addProduct = () => {
    if (!draft.name.trim()) {
      toast.error("Give the product a name.");
      return;
    }
    create.mutate(
      {
        name: draft.name.trim(),
        description:
          draft.description.trim() || "Added by founder — merchandising brief pending approval.",
        price: Number(draft.price) || 0,
        emoji: "✦",
        revenue: 0,
        conversion: 0,
        subscriptions: 0,
        inventory: 0,
      },
      {
        onSuccess: () => {
          const productName = draft.name.trim();
          setDraft({ name: "", price: "", description: "" });
          setOpen(false);
          dispatch.mutate(
            {
              title: `Merchandise ${productName}`,
              description: `Write product page copy and imagery brief for ${productName}. Update Landing page knowledge if needed. Do not invent revenue or conversion.`,
              agent: "Iris",
              priority: "medium",
              activity: `Iris queued merchandising for ${productName}`,
              founderApproved: true,
            },
            {
              onSuccess: (res) =>
                toast.success(
                  res.workerRan
                    ? "Product saved — Iris ran the merchandising task."
                    : "Product saved — Iris task queued.",
                ),
              onError: () => toast.success("Product saved."),
            },
          );
        },
      },
    );
  };

  return (
    <div>
      <PageHeader
        eyebrow="Catalogue"
        title={
          products.length
            ? `${products.length} product${products.length === 1 ? "" : "s"}, priced and merchandised by agents`
            : "No products yet"
        }
        description={`${currency(total)} recorded revenue from real product rows. Agents only work after you dispatch or approve a task.`}
        actions={
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> New product
          </button>
        }
      />

      {open && (
        <Panel className="mb-6 p-6">
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.5fr_1.6fr_auto]">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Product name"
              aria-label="Product name"
              className="rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none focus:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            <input
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: e.target.value })}
              placeholder="Price"
              inputMode="decimal"
              aria-label="Product price"
              className="rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none focus:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            <input
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="What it is, in one line"
              aria-label="Product description"
              className="rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none focus:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            <button
              onClick={addProduct}
              disabled={create.isPending}
              className="rounded-2xl bg-primary px-5 py-3 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {create.isPending ? "Adding…" : "Add"}
            </button>
          </div>
        </Panel>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {products.length === 0 ? (
          <Panel className="p-8 text-center md:col-span-2 xl:col-span-3">
            <p className="text-sm text-muted-foreground">
              No products yet. Add one above — Iris gets a real merchandising task.
            </p>
          </Panel>
        ) : null}
        {products.map((p, i) => (
          <Panel key={p.id} className="overflow-hidden p-0" delay={0.05 * i}>
            <div
              className="flex h-40 items-center justify-center text-5xl"
              style={{
                background:
                  "radial-gradient(120% 100% at 50% 0%, color-mix(in oklab, var(--primary) 16%, transparent), transparent 70%)",
              }}
            >
              {p.emoji}
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold leading-snug">{p.name}</h3>
                <span className="num text-sm text-gold">{currency(p.price)}</span>
              </div>
              <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">
                {p.description}
              </p>

              <div className="mt-6 flex items-end justify-between">
                <div>
                  <p className="num text-2xl font-semibold">
                    <Counter value={p.revenue} format={(n) => currency(n)} />
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Revenue
                  </p>
                </div>
                <Chip tone="primary">{percent(p.conversion)} conv.</Chip>
              </div>

              <div className="mt-5 space-y-2">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{p.subscriptions.toLocaleString()} subscribers</span>
                  <span>{p.inventory} in stock</span>
                </div>
                <Meter value={Math.min(100, (p.inventory / 24) * 100)} tone="gold" />
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  onClick={() =>
                    dispatch.mutate(
                      {
                        title: `Promote ${p.name}`,
                        description: `Run a two-week push behind ${p.name}.`,
                        agent: "Vela",
                        priority: "high",
                        roi: 0,
                        activity: `Promote task for ${p.name} queued for Vela`,
                      },
                      {
                        onSuccess: (res) =>
                          toast.success(
                            res.workerRan
                              ? `Vela ran the promote task for ${p.name}.`
                              : `Promote task queued for Vela — ${p.name}.`,
                          ),
                      },
                    )
                  }
                  className="flex-1 rounded-2xl bg-primary/14 px-3 py-2 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/22"
                >
                  Promote
                </button>
                <button
                  onClick={() =>
                    updateProduct.mutate(
                      { id: p.id, values: { inventory: p.inventory + 24 } },
                      { onSuccess: () => toast.success(`Restocked ${p.name} by 24 units.`) },
                    )
                  }
                  className="flex-1 rounded-2xl bg-foreground/6 px-3 py-2 text-[11px] transition-colors hover:bg-foreground/12"
                >
                  Restock
                </button>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
