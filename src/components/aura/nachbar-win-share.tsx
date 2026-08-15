import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

import { shareNachbarWin } from "@/lib/nachbar.functions";
import { SITE_URL } from "@/lib/site";

export function NachbarWinShare({
  shopName,
  stamps,
  weekDone,
}: {
  shopName?: string | null;
  stamps?: string | null;
  weekDone?: number;
}) {
  const qc = useQueryClient();
  const url = `${SITE_URL}/nachbar`;
  const text = [
    shopName ? `Check-in bei ${shopName}` : "Aura Nachbar in Wien",
    stamps ? stamps : null,
    weekDone ? `${weekDone} Missionen diese Woche` : null,
    "Echter Besuch. Keine Fake-Sterne.",
    url,
  ]
    .filter(Boolean)
    .join(" · ");

  const mark = useMutation({
    mutationFn: () => shareNachbarWin(),
    onSuccess: (res) => {
      if (res.granted) toast.success("Mission: Win geteilt.");
      void qc.invalidateQueries({ queryKey: ["nachbar-hub"] });
    },
    onError: (e: Error) => {
      if (!/Besuch/i.test(e.message)) toast.error(e.message);
    },
  });

  const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => mark.mutate()}
        className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground"
      >
        <Share2 className="h-3.5 w-3.5" /> WhatsApp
      </a>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            toast.success("Link kopiert");
          } catch {
            toast.error("Kopieren nicht möglich");
          }
          mark.mutate();
        }}
        className="rounded-2xl border border-border/50 px-4 py-2.5 text-xs font-semibold"
      >
        Kopieren
      </button>
    </div>
  );
}
