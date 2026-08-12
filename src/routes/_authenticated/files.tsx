import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Check,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Receipt,
  Search,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Chip, PageHeader, Panel } from "@/components/aura/primitives";
import { useCompany, useCompanyTable } from "@/hooks/use-aura";
import { supabase } from "@/integrations/supabase/client";
import { useCreateRow, useDeleteRow } from "@/lib/actions";
import { trackAppEvent } from "@/lib/app-track";
import {
  EXPENSE_CATEGORIES,
  TAX_ASSIST_DISCLAIMER,
  expenseCategoryLabel,
  taxHintLabel,
} from "@/lib/expenses";
import {
  classifyCompanyBill,
  confirmExpenseItem,
  getTaxPrepSummary,
  listCompanyExpenses,
} from "@/lib/expenses.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/files")({
  head: () => ({
    meta: [
      { title: "Files — Aura OS" },
      {
        name: "description",
        content:
          "Company documents and bills. Ledger classifies receipts for tax-prep assist — you confirm.",
      },
      { property: "og:title", content: "Files — Aura OS" },
      { property: "og:description", content: "Your company document vault." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FilesPage,
});

type FileRow = {
  id: string;
  name: string;
  folder: string;
  kind: string;
  size_kb: number;
  summary: string;
};

type ExpenseRow = {
  id: string;
  file_id: string | null;
  vendor: string | null;
  amount: number | null;
  currency: string;
  invoice_date: string | null;
  category: string;
  tax_hint: string;
  confidence: number;
  status: string;
  notes: string | null;
  created_at: string;
};

const ICON = { pdf: FileText, doc: FileText, sheet: FileSpreadsheet, image: ImageIcon };

function FilesPage() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  const locale = company?.ui_locale === "de" ? "de" : "en";
  const { data: files = [] } = useCompanyTable<FileRow>("files", { orderBy: "name" });
  const [q, setQ] = useState("");
  const [folder, setFolder] = useState<string | null>(null);
  const [classifying, setClassifying] = useState(false);
  const folders = Array.from(new Set(["Bills", ...files.map((f) => f.folder)]));
  const create = useCreateRow("files");
  const remove = useDeleteRow("files");

  const expensesQ = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const res = await listCompanyExpenses({ data: {} });
      return res as { expenses: ExpenseRow[]; disclaimer: string };
    },
  });

  const taxQ = useQuery({
    queryKey: ["tax-prep-summary"],
    queryFn: async () => getTaxPrepSummary() as Promise<{
      confirmedCount: number;
      total: number;
      currency: string;
      byCategory: Record<string, { count: number; total: number; currency: string }>;
      vatCandidates: number;
      disclaimer: string;
    }>,
  });

  const confirmMut = useMutation({
    mutationFn: (args: {
      expenseId: string;
      status: "confirmed" | "rejected";
      category?: string;
      taxHint?: string;
    }) => confirmExpenseItem({ data: args }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expenses"] });
      void qc.invalidateQueries({ queryKey: ["tax-prep-summary"] });
      void qc.invalidateQueries({ queryKey: ["table", "tasks"] });
      toast.success("Expense updated.");
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't update expense."),
  });

  const uploadFiles = async (list: FileList | null, asBill: boolean) => {
    if (!list?.length || !company) return;
    if (asBill) setClassifying(true);
    let classified = 0;
    try {
      for (const file of Array.from(list)) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        const kind = ["png", "jpg", "jpeg", "webp", "gif"].includes(ext)
          ? "image"
          : ["csv", "xlsx", "xls"].includes(ext)
            ? "sheet"
            : ext === "pdf"
              ? "pdf"
              : "doc";
        let summary = asBill
          ? "Bill uploaded — Ledger is classifying…"
          : "Uploaded — assign a task if you want an agent to summarise it.";
        let textExcerpt = "";
        if (kind === "doc" || kind === "sheet") {
          const text = await file.text().catch(() => "");
          if (text) {
            textExcerpt = text.replace(/\s+/g, " ").slice(0, 6000);
            summary = `${textExcerpt.slice(0, 220)}…`;
          }
        }

        const storagePath = `${company.id}/${crypto.randomUUID()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("company-files")
          .upload(storagePath, file, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
          });
        if (uploadError) {
          toast.error(`Could not upload ${file.name}.`);
          continue;
        }

        const row = await create.mutateAsync({
          name: file.name,
          folder: asBill ? "Bills" : (folder ?? "Uploads"),
          kind,
          size_kb: Math.max(1, Math.round(file.size / 1024)),
          summary,
          storage_path: storagePath,
          mime_type: file.type || null,
          size_bytes: file.size,
        });
        trackAppEvent("file_uploaded", {
          company_id: company.id,
          name: file.name,
          kind,
          bill: asBill,
        });

        if (asBill && row?.id) {
          try {
            await classifyCompanyBill({
              data: { fileId: row.id, textExcerpt },
            });
            classified += 1;
          } catch (e) {
            toast.error(
              e instanceof Error
                ? e.message
                : `Uploaded ${file.name}, but Ledger could not classify it.`,
            );
          }
        }
      }
      if (asBill) {
        void qc.invalidateQueries({ queryKey: ["expenses"] });
        void qc.invalidateQueries({ queryKey: ["tax-prep-summary"] });
        void qc.invalidateQueries({ queryKey: ["table", "files"] });
        void qc.invalidateQueries({ queryKey: ["table", "tasks"] });
        toast.success(
          classified > 0
            ? `${classified} bill${classified === 1 ? "" : "s"} classified — confirm below.`
            : "Upload finished.",
        );
      } else {
        toast.success(list.length > 1 ? `${list.length} files added.` : `${list[0]!.name} added.`);
      }
    } finally {
      setClassifying(false);
    }
  };

  const shown = files.filter(
    (f) =>
      (!folder || f.folder === folder) &&
      (f.name.toLowerCase().includes(q.toLowerCase()) ||
        f.summary.toLowerCase().includes(q.toLowerCase())),
  );

  const drafts = (expensesQ.data?.expenses ?? []).filter((e) => e.status === "draft");
  const confirmed = (expensesQ.data?.expenses ?? []).filter((e) => e.status === "confirmed");
  const tax = taxQ.data;

  const exportConfirmedCsv = () => {
    const rows = confirmed;
    if (!rows.length) {
      toast.message("No confirmed expenses yet.");
      return;
    }
    const header = [
      "vendor",
      "amount",
      "currency",
      "invoice_date",
      "category",
      "tax_hint",
      "notes",
    ];
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.vendor ?? "",
          r.amount ?? "",
          r.currency,
          r.invoice_date ?? "",
          r.category,
          r.tax_hint,
          (r.notes ?? "").replace(/"/g, '""'),
        ]
          .map((c) => `"${String(c)}"`)
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aura-tax-prep-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded — for your Steuerberater / CPA.");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Memory"
        title="Company files"
        description="Vault for docs and bills. Upload a bill → Ledger drafts category & tax hints. You confirm before it counts."
        actions={
          <div className="flex flex-wrap gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-border/70 bg-background/40 px-4 py-2.5 text-xs font-semibold transition-opacity hover:opacity-90">
              <Receipt className="h-3.5 w-3.5 text-primary" />
              {classifying ? "Classifying…" : "Upload bill"}
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.csv,.txt,.md,.doc,.docx"
                disabled={classifying}
                className="hidden"
                onChange={(e) => {
                  void uploadFiles(e.target.files, true);
                  e.target.value = "";
                }}
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90">
              <Upload className="h-3.5 w-3.5" /> Upload
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  void uploadFiles(e.target.files, false);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        }
      />

      <Panel className="mb-6 p-5" label="Tax prep (assist)">
        <p className="text-[12px] leading-relaxed text-muted-foreground">{TAX_ASSIST_DISCLAIMER}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Confirmed
            </p>
            <p className="font-medium">{tax?.confirmedCount ?? confirmed.length}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Total (confirmed)
            </p>
            <p className="font-medium">
              {(tax?.total ?? 0).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}{" "}
              {tax?.currency ?? "EUR"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              VAT candidates
            </p>
            <p className="font-medium">{tax?.vatCandidates ?? 0}</p>
          </div>
          <button
            type="button"
            onClick={exportConfirmedCsv}
            className="ml-auto rounded-2xl border border-border/70 px-3.5 py-2 text-xs font-medium hover:bg-foreground/5"
          >
            Export CSV
          </button>
        </div>
        {tax?.byCategory && Object.keys(tax.byCategory).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(tax.byCategory).map(([cat, v]) => (
              <Chip key={cat} tone="primary">
                {expenseCategoryLabel(cat, locale)} · {v.count} ·{" "}
                {v.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} {v.currency}
              </Chip>
            ))}
          </div>
        )}

        {drafts.length > 0 && (
          <div className="mt-6 space-y-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Awaiting your confirm · {drafts.length}
            </p>
            {drafts.map((e) => (
              <div
                key={e.id}
                className="rounded-2xl border border-border/60 px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {e.vendor ?? "Unknown vendor"}
                      {e.amount != null
                        ? ` · ${e.amount} ${e.currency}`
                        : " · amount unclear"}
                    </p>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      {expenseCategoryLabel(e.category, locale)} ·{" "}
                      {taxHintLabel(e.tax_hint, locale)} ·{" "}
                      {Math.round((e.confidence ?? 0) * 100)}% conf
                      {e.invoice_date ? ` · ${e.invoice_date}` : ""}
                    </p>
                    {e.notes && (
                      <p className="mt-1 text-[12px] text-muted-foreground">{e.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Category"
                      className="rounded-xl border border-border/60 bg-transparent px-2 py-1.5 text-[11px]"
                      defaultValue={e.category}
                      id={`cat-${e.id}`}
                    >
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {locale === "de" ? c.labelDe : c.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-xl bg-primary/15 px-3 py-1.5 text-[11px] font-semibold text-primary"
                      disabled={confirmMut.isPending}
                      onClick={() => {
                        const sel = document.getElementById(
                          `cat-${e.id}`,
                        ) as HTMLSelectElement | null;
                        void confirmMut.mutateAsync({
                          expenseId: e.id,
                          status: "confirmed",
                          category: sel?.value,
                        });
                      }}
                    >
                      <Check className="h-3 w-3" /> Confirm
                    </button>
                    <button
                      type="button"
                      className="rounded-xl px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                      disabled={confirmMut.isPending}
                      onClick={() =>
                        void confirmMut.mutateAsync({
                          expenseId: e.id,
                          status: "rejected",
                        })
                      }
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="glass-soft flex flex-1 items-center gap-2.5 rounded-2xl px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search files"
            placeholder="What was our margin floor again?"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          />
        </div>
        <button
          onClick={() => setFolder(null)}
          className={cn(
            "rounded-2xl px-3.5 py-2 text-xs transition-colors",
            !folder ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          All
        </button>
        {folders.map((f) => (
          <button
            key={f}
            onClick={() => setFolder(f)}
            className={cn(
              "rounded-2xl px-3.5 py-2 text-xs transition-colors",
              folder === f
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Panel className="p-10 text-center">
          <p className="text-sm font-medium">No files yet</p>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Upload a bill for Ledger, or drop any document into the vault.
          </p>
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((f, i) => {
            const Icon = ICON[f.kind as keyof typeof ICON] ?? FileText;
            return (
              <Panel key={f.id} className="relative p-5" delay={0.03 * i}>
                <button
                  onClick={() => remove.mutate(f.id)}
                  aria-label={`Remove ${f.name}`}
                  className="absolute right-3 top-3 rounded-lg p-1 text-muted-foreground/60 transition-colors hover:bg-foreground/8 hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-foreground/7">
                    <Icon className="h-4 w-4 text-primary" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{f.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {f.folder} · {f.size_kb} KB
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
                  {f.summary}
                </p>
                <Chip tone="primary" className="mt-4">
                  {f.folder === "Bills" ? "bill" : "indexed"}
                </Chip>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
