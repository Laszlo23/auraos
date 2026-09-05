import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Panel } from "@/components/aura/primitives";
import {
  getLeadDigestPrefs,
  saveLeadDigestPrefs,
  sendLeadDigestNow,
} from "@/lib/lead-digest.functions";

/** Twice-daily lead digests into the founder's real inbox. */
export function LeadDigestPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["lead-digest-prefs"],
    queryFn: () => getLeadDigestPrefs(),
  });

  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState("");
  const [language, setLanguage] = useState<"de" | "en">("de");

  useEffect(() => {
    if (!data) return;
    setEnabled(Boolean(data.pref?.enabled));
    setEmail(String(data.pref?.email || data.defaultEmail || ""));
    setLanguage(data.pref?.language === "en" ? "en" : "de");
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      saveLeadDigestPrefs({
        data: {
          enabled,
          email: email.trim(),
          timezone: "Europe/Vienna",
          hours: [8, 16],
          language,
        },
      }),
    onSuccess: () => {
      toast.success(enabled ? "Lead digest on — 08:00 & 16:00 Vienna" : "Lead digest off");
      void qc.invalidateQueries({ queryKey: ["lead-digest-prefs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendNow = useMutation({
    mutationFn: () => sendLeadDigestNow(),
    onSuccess: (r) => {
      toast.success(`Digest sent (${r.leadCount ?? 0} new leads)`);
      void qc.invalidateQueries({ queryKey: ["lead-digest-prefs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Panel label="Inbox digests" glow={enabled}>
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Get your leads in your real email twice a day (08:00 &amp; 16:00 Vienna) — custom to your
        company, not a generic blast.
      </p>
      {isLoading ? (
        <p className="mt-3 text-[12px] text-muted-foreground">Loading…</p>
      ) : (
        <div className="mt-3 space-y-3">
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded border-border"
            />
            Email me leads twice daily
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Deliver to
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-2xl border border-border bg-foreground/5 px-3 py-2.5 text-[13px] outline-none focus:border-primary/40"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Language
            </span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value === "en" ? "en" : "de")}
              className="w-full rounded-2xl border border-border bg-foreground/5 px-3 py-2.5 text-[13px] outline-none focus:border-primary/40"
            >
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </select>
          </label>
          {data?.pref?.last_sent_at ? (
            <p className="text-[11px] text-muted-foreground">
              Last sent: {new Date(String(data.pref.last_sent_at)).toLocaleString()}
              {data.pref.last_sent_slot ? ` · slot ${String(data.pref.last_sent_slot)}` : ""}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={save.isPending || !email.trim()}
              onClick={() => save.mutate()}
              className="rounded-xl bg-primary px-3.5 py-2 text-[12px] font-semibold text-primary-foreground disabled:opacity-60"
            >
              {save.isPending ? "Saving…" : "Save digest"}
            </button>
            <button
              type="button"
              disabled={sendNow.isPending || !enabled}
              onClick={() => sendNow.mutate()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-foreground/5 px-3.5 py-2 text-[12px] font-medium disabled:opacity-60"
            >
              {sendNow.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Mail className="h-3.5 w-3.5" />
              )}
              Send now
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Needs <code className="text-foreground/80">PLATFORM_SMTP_*</code> on the server (or your
            connected SMTP under Connect) so mail can leave Aura.
          </p>
        </div>
      )}
    </Panel>
  );
}
