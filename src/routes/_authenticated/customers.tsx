import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Download } from "lucide-react";

import { Chip, PageHeader, Panel } from "@/components/aura/primitives";
import { useCompanyTable } from "@/hooks/use-aura";
import { downloadCsv, useDispatchTask } from "@/lib/actions";
import { currency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Aura OS" },
      {
        name: "description",
        content:
          "Who buys from your AI company, what they're worth, and which relationships need attention.",
      },
      { property: "og:title", content: "Customers — Aura OS" },
      { property: "og:description", content: "The people behind the revenue." },
    ],
  }),
  component: CustomersPage,
});

type Customer = {
  id: string;
  name: string;
  email: string;
  country: string;
  plan: string;
  ltv: number;
  status: string;
};

function CustomersPage() {
  const { data: customers = [] } = useCompanyTable<Customer>("customers", {
    orderBy: "ltv",
    ascending: false,
  });
  const total = customers.reduce((a, c) => a + c.ltv, 0);
  const atRisk = customers.filter((c) => c.status !== "active").length;
  const dispatch = useDispatchTask();

  return (
    <div>
      <PageHeader
        eyebrow="Relationships"
        title={
          customers.length ? `${customers.length} accounts Juno keeps warm` : "No customers yet"
        }
        description={`${currency(total)} of lifetime value under management. ${atRisk} accounts need a human-shaped nudge.`}
        actions={
          <button
            onClick={() =>
              downloadCsv("customers.csv", customers as unknown as Record<string, unknown>[])
            }
            className="flex items-center gap-2 rounded-2xl bg-foreground/8 px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-foreground/14"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        }
      />

      <Panel className="overflow-hidden p-0">
        <div className="divide-y divide-border">
          {customers.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              No customers yet. Orin and Juno will fill this list as deals close.
            </p>
          ) : null}
          {customers.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[1fr_auto] items-center gap-4 px-6 py-4 transition-colors hover:bg-foreground/4 md:grid-cols-[1.4fr_1fr_0.8fr_auto]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{c.email}</p>
              </div>
              <p className="hidden text-[13px] text-muted-foreground md:block">{c.country}</p>
              <p className="hidden text-[13px] md:block">{c.plan}</p>
              <div className="flex items-center gap-3">
                <span className="num text-sm text-gold">{currency(c.ltv)}</span>
                <Chip
                  tone={
                    c.status === "active" ? "primary" : c.status === "churned" ? "danger" : "gold"
                  }
                >
                  {c.status}
                </Chip>
                <button
                  onClick={() =>
                    dispatch.mutate(
                      {
                        title: `Follow up with ${c.name}`,
                        description: `Reach out to ${c.email} — ${c.status} account worth ${currency(c.ltv)}.`,
                        agent: "Juno",
                        priority: c.status === "active" ? "medium" : "high",
                        roi: 0,
                        activity: `Juno opened a follow-up with ${c.name}`,
                      },
                      {
                        onSuccess: (res) =>
                          toast.success(
                            res.workerRan
                              ? `Juno filed a follow-up brief for ${c.name}.`
                              : `Follow-up queued for Juno — ${c.name}.`,
                          ),
                      },
                    )
                  }
                  className="rounded-xl bg-foreground/6 px-3 py-1.5 text-[11px] transition-colors hover:bg-primary/15 hover:text-primary"
                >
                  Follow up
                </button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
