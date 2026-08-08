import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileSpreadsheet, FileText, Image as ImageIcon, Search, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Chip, PageHeader, Panel } from "@/components/aura/primitives";
import { useCompany, useCompanyTable } from "@/hooks/use-aura";
import { supabase } from "@/integrations/supabase/client";
import { useCreateRow, useDeleteRow } from "@/lib/actions";
import { trackAppEvent } from "@/lib/app-track";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/files")({
  head: () => ({
    meta: [
      { title: "Files — Aura OS" },
      {
        name: "description",
        content:
          "Company documents stored in your vault. Uploads keep a text excerpt; agents summarise when you assign a task.",
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

const ICON = { pdf: FileText, doc: FileText, sheet: FileSpreadsheet, image: ImageIcon };

function FilesPage() {
  const { data: company } = useCompany();
  const { data: files = [] } = useCompanyTable<FileRow>("files", { orderBy: "name" });
  const [q, setQ] = useState("");
  const [folder, setFolder] = useState<string | null>(null);
  const folders = Array.from(new Set(files.map((f) => f.folder)));
  const create = useCreateRow("files");
  const remove = useDeleteRow("files");

  const onUpload = async (list: FileList | null) => {
    if (!list?.length || !company) return;
    for (const file of Array.from(list)) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const kind = ["png", "jpg", "jpeg", "webp", "gif"].includes(ext)
        ? "image"
        : ["csv", "xlsx", "xls"].includes(ext)
          ? "sheet"
          : ext === "pdf"
            ? "pdf"
            : "doc";
      let summary = "Uploaded — assign a task if you want an agent to summarise it.";
      if (kind === "doc" || kind === "sheet") {
        const text = await file.text().catch(() => "");
        if (text) summary = `${text.replace(/\s+/g, " ").slice(0, 220)}…`;
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

      await create.mutateAsync({
        name: file.name,
        folder: folder ?? "Uploads",
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
      });
    }
    toast.success(list.length > 1 ? `${list.length} files added.` : `${list[0]!.name} added.`);
  };

  const shown = files.filter(
    (f) =>
      (!folder || f.folder === folder) &&
      (f.name.toLowerCase().includes(q.toLowerCase()) ||
        f.summary.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div>
      <PageHeader
        eyebrow="Memory"
        title="Company files"
        description="Real uploads in your vault. Text by name or excerpt — agents only summarise when you dispatch a task."
        actions={
          <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            <Upload className="h-3.5 w-3.5" /> Upload
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => void onUpload(e.target.files)}
            />
          </label>
        }
      />

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
            Upload a document and the agents will index it for the company memory.
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
                  indexed
                </Chip>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
