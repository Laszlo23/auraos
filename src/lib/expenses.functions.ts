/**
 * Ledger bookkeeper: classify uploaded bills → expense_items + knowledge + task.
 * Assistive only — founder confirms; not licensed tax advice.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ensureCompanyAgent } from "@/lib/agent-roster";
import { taskStatusForAutonomy } from "@/lib/company-economy";
import {
  EXPENSE_CATEGORIES,
  TAX_ASSIST_DISCLAIMER,
  TAX_HINTS,
  type ExpenseCategoryId,
  type TaxHintId,
} from "@/lib/expenses";

type LooseDb = { from: (table: string) => any };

function asDb(client: unknown): LooseDb {
  return client as LooseDb;
}

async function ownedCompany(supabase: LooseDb, userId: string) {
  const { data } = await supabase
    .from("companies")
    .select("id, name, autonomy, ui_locale")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data?.id) throw new Error("Company not found");
  return data as {
    id: string;
    name: string;
    autonomy: number;
    ui_locale: string | null;
  };
}

function isCategory(v: unknown): v is ExpenseCategoryId {
  return typeof v === "string" && EXPENSE_CATEGORIES.some((c) => c.id === v);
}

function isTaxHint(v: unknown): v is TaxHintId {
  return typeof v === "string" && TAX_HINTS.some((c) => c.id === v);
}

type ExtractedBill = {
  vendor: string | null;
  amount: number | null;
  currency: string;
  invoiceDate: string | null;
  category: ExpenseCategoryId;
  taxHint: TaxHintId;
  vatAmount: number | null;
  confidence: number;
  notes: string;
};

async function extractBillFromText(args: {
  fileName: string;
  mimeType: string | null;
  textExcerpt: string;
  locale: string;
}): Promise<ExtractedBill> {
  const { askAi, parseJsonBlock } = await import("@/lib/akquise.server");
  const cats = EXPENSE_CATEGORIES.map((c) => c.id).join("|");
  const hints = TAX_HINTS.map((h) => h.id).join("|");
  const raw = await askAi(
    `You are Ledger, finance agent for an Aura OS company (DE/AT/EU friendly).
Classify a vendor bill / receipt for bookkeeping prep — NOT tax filing advice.
Never invent amounts or dates that are not supported by the text. If unclear, use null and lower confidence.
Return ONLY JSON:
{"vendor":string|null,"amount":number|null,"currency":string,"invoiceDate":"YYYY-MM-DD"|null,"category":"${cats}","taxHint":"${hints}","vatAmount":number|null,"confidence":0-1,"notes":string}
Rules:
- category personal only if clearly private.
- taxHint input_vat_possible when VAT/MwSt/USt line is visible.
- notes: one short sentence for the founder (language: ${args.locale === "de" ? "German" : "English"}).
- Prefer EUR when currency unclear for EU companies.`,
    `File: ${args.fileName}
MIME: ${args.mimeType ?? "unknown"}
Extracted / excerpt text (may be empty for scans):
${args.textExcerpt.slice(0, 6000) || "(no text — classify cautiously from filename only)"}`,
  );

  const parsed = parseJsonBlock<Record<string, unknown>>(raw, {});
  const amount =
    typeof parsed["amount"] === "number" && Number.isFinite(parsed["amount"])
      ? Number(parsed["amount"])
      : null;
  const vatAmount =
    typeof parsed["vatAmount"] === "number" && Number.isFinite(parsed["vatAmount"])
      ? Number(parsed["vatAmount"])
      : null;
  const confidenceRaw =
    typeof parsed["confidence"] === "number" && Number.isFinite(parsed["confidence"])
      ? Number(parsed["confidence"])
      : 0.35;
  const invoiceDate =
    typeof parsed["invoiceDate"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed["invoiceDate"])
      ? parsed["invoiceDate"]
      : null;

  return {
    vendor: typeof parsed["vendor"] === "string" ? parsed["vendor"].trim().slice(0, 160) : null,
    amount,
    currency:
      typeof parsed["currency"] === "string" && parsed["currency"].trim()
        ? parsed["currency"].trim().toUpperCase().slice(0, 8)
        : "EUR",
    invoiceDate,
    category: isCategory(parsed["category"]) ? parsed["category"] : "uncategorized",
    taxHint: isTaxHint(parsed["taxHint"]) ? parsed["taxHint"] : "unknown",
    vatAmount,
    confidence: Math.max(0, Math.min(1, confidenceRaw)),
    notes:
      typeof parsed["notes"] === "string"
        ? parsed["notes"].trim().slice(0, 400)
        : "Needs founder review.",
  };
}

/** After a file lands in Bills (or any folder), classify and queue Ledger. */
export const classifyCompanyBill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { fileId: string; textExcerpt?: string }) => ({
    fileId: String(input.fileId),
    textExcerpt: typeof input.textExcerpt === "string" ? input.textExcerpt.slice(0, 8000) : "",
  }))
  .handler(async ({ data, context }) => {
    const supabase = asDb(context.supabase);
    const company = await ownedCompany(supabase, context.userId);

    const { data: file, error: fileErr } = await supabase
      .from("files")
      .select("id, name, folder, kind, summary, storage_path, mime_type, company_id")
      .eq("id", data.fileId)
      .eq("company_id", company.id)
      .maybeSingle();
    if (fileErr) throw fileErr;
    if (!file) throw new Error("File not found");

    // Prefer client excerpt; fall back to stored summary / download text for small docs.
    let excerpt = data.textExcerpt.trim() || String(file.summary ?? "");
    if (
      !data.textExcerpt.trim() &&
      file.storage_path &&
      (file.kind === "doc" || file.kind === "sheet")
    ) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const dl = await supabaseAdmin.storage.from("company-files").download(file.storage_path);
        if (dl.data) {
          const text = await dl.data.text();
          if (text) excerpt = text.replace(/\s+/g, " ").slice(0, 6000);
        }
      } catch {
        /* keep summary */
      }
    }

    const extracted = await extractBillFromText({
      fileName: String(file.name),
      mimeType: file.mime_type ? String(file.mime_type) : null,
      textExcerpt: excerpt,
      locale: company.ui_locale === "de" ? "de" : "en",
    });

    // Move into Bills folder for vault clarity.
    await supabase.from("files").update({ folder: "Bills" }).eq("id", file.id);

    const ledgerId = await ensureCompanyAgent(supabase, company.id, "Ledger");
    const autonomy = Number(company.autonomy ?? 0);
    const status = taskStatusForAutonomy({ autonomy });

    const taskTitle = extracted.vendor
      ? `Review bill · ${extracted.vendor}`
      : `Review bill · ${String(file.name).slice(0, 48)}`;
    const amountBit =
      extracted.amount != null
        ? `${extracted.amount} ${extracted.currency}`
        : "amount unclear — confirm";
    const taskDescription = [
      `Classify and confirm expense for file ${file.id} (${file.name}).`,
      `Draft: vendor=${extracted.vendor ?? "?"} amount=${amountBit} category=${extracted.category} taxHint=${extracted.taxHint}.`,
      extracted.notes,
      TAX_ASSIST_DISCLAIMER,
    ].join("\n");

    const { data: task, error: taskErr } = await supabase
      .from("tasks")
      .insert({
        company_id: company.id,
        agent_id: ledgerId,
        title: taskTitle.slice(0, 160),
        description: taskDescription.slice(0, 4000),
        status,
        priority: "medium",
        progress: 0,
      })
      .select("id")
      .single();
    if (taskErr) throw taskErr;

    const { data: expense, error: expErr } = await supabase
      .from("expense_items")
      .insert({
        company_id: company.id,
        file_id: file.id,
        task_id: task?.id ?? null,
        vendor: extracted.vendor,
        amount: extracted.amount,
        currency: extracted.currency,
        invoice_date: extracted.invoiceDate,
        category: extracted.category,
        tax_hint: extracted.taxHint,
        vat_amount: extracted.vatAmount,
        confidence: extracted.confidence,
        status: "draft",
        notes: extracted.notes,
        raw_extract: {
          fileName: file.name,
          mimeType: file.mime_type,
          excerpt: excerpt.slice(0, 1500),
        },
      })
      .select("*")
      .single();
    if (expErr) throw expErr;

    await supabase.from("knowledge_items").insert({
      company_id: company.id,
      title: `Bill · ${extracted.vendor ?? file.name}`.slice(0, 120),
      summary: [
        `${amountBit}`,
        `category=${extracted.category}`,
        `hint=${extracted.taxHint}`,
        extracted.notes,
        `file:${file.id}`,
      ]
        .join(" · ")
        .slice(0, 500),
      cluster: "Finance",
      source: `file:${file.id}`,
    });

    await supabase
      .from("files")
      .update({
        summary: `Bill draft · ${extracted.vendor ?? "vendor?"} · ${amountBit} · ${extracted.category} (${Math.round(extracted.confidence * 100)}% conf). Confirm in Tax prep.`,
      })
      .eq("id", file.id);

    return {
      expenseId: expense.id as string,
      taskId: (task?.id as string) ?? null,
      taskStatus: status,
      extracted,
      disclaimer: TAX_ASSIST_DISCLAIMER,
    };
  });

export const listCompanyExpenses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { status?: string } = {}) => ({
    status:
      input.status === "draft" || input.status === "confirmed" || input.status === "rejected"
        ? input.status
        : undefined,
  }))
  .handler(async ({ data, context }) => {
    const supabase = asDb(context.supabase);
    const company = await ownedCompany(supabase, context.userId);
    let q = supabase
      .from("expense_items")
      .select(
        "id, file_id, task_id, vendor, amount, currency, invoice_date, category, tax_hint, vat_amount, confidence, status, notes, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw error;
    return { expenses: rows ?? [], disclaimer: TAX_ASSIST_DISCLAIMER };
  });

export const confirmExpenseItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      expenseId: string;
      status: "confirmed" | "rejected";
      category?: string | undefined;
      taxHint?: string | undefined;
      notes?: string | undefined;
    }) => ({
      expenseId: String(input.expenseId),
      status: input.status === "rejected" ? ("rejected" as const) : ("confirmed" as const),
      category: isCategory(input.category) ? input.category : undefined,
      taxHint: isTaxHint(input.taxHint) ? input.taxHint : undefined,
      notes: typeof input.notes === "string" ? input.notes.trim().slice(0, 400) : undefined,
    }),
  )
  .handler(async ({ data, context }) => {
    const supabase = asDb(context.supabase);
    const company = await ownedCompany(supabase, context.userId);
    const patch: Record<string, unknown> = {
      status: data.status,
      updated_at: new Date().toISOString(),
    };
    if (data.category) patch["category"] = data.category;
    if (data.taxHint) patch["tax_hint"] = data.taxHint;
    if (data.notes != null) patch["notes"] = data.notes;

    const { error } = await supabase
      .from("expense_items")
      .update(patch)
      .eq("id", data.expenseId)
      .eq("company_id", company.id);
    if (error) throw error;
    return { ok: true as const };
  });

export const getTaxPrepSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = asDb(context.supabase);
    const company = await ownedCompany(supabase, context.userId);
    const { data: rows, error } = await supabase
      .from("expense_items")
      .select("category, tax_hint, amount, currency, status, vendor, invoice_date")
      .eq("company_id", company.id)
      .eq("status", "confirmed")
      .order("invoice_date", { ascending: false })
      .limit(500);
    if (error) throw error;

    const byCategory: Record<string, { count: number; total: number; currency: string }> = {};
    let total = 0;
    let currency = "EUR";
    for (const r of rows ?? []) {
      const cat = String(r.category ?? "uncategorized");
      const amt = Number(r.amount ?? 0);
      if (!byCategory[cat]) {
        byCategory[cat] = {
          count: 0,
          total: 0,
          currency: String(r.currency ?? "EUR"),
        };
      }
      byCategory[cat]!.count += 1;
      if (Number.isFinite(amt)) {
        byCategory[cat]!.total += amt;
        total += amt;
      }
      currency = String(r.currency ?? currency);
    }

    const vatCandidates = (rows ?? []).filter(
      (r: { tax_hint?: string | null }) => r.tax_hint === "input_vat_possible",
    ).length;

    return {
      confirmedCount: (rows ?? []).length,
      total,
      currency,
      byCategory,
      vatCandidates,
      disclaimer: TAX_ASSIST_DISCLAIMER,
    };
  });
