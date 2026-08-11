import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/aura/primitives";
import { useLocale } from "@/hooks/use-locale";
import { celebrateLokalWin } from "@/hooks/use-lokal-engagement";
import {
  addReviewInvite,
  ensureLocalCohort,
  getLocalBusinessHub,
  listReviewInvites,
  markReviewInviteCompleted,
  markReviewInviteSent,
  startReviewBoostCampaign,
  updateLocalBusinessProfile,
} from "@/lib/reviews.functions";

export const Route = createFileRoute("/_authenticated/bewertungen")({
  head: () => ({
    meta: [{ title: "Sterne — Aura Lokal" }],
  }),
  component: BewertungenPage,
});

function BewertungenPage() {
  const { t } = useLocale();
  const qc = useQueryClient();
  const hubQ = useQuery({ queryKey: ["local-business-hub"], queryFn: () => getLocalBusinessHub() });
  const invitesQ = useQuery({ queryKey: ["review-invites"], queryFn: () => listReviewInvites() });
  const company = hubQ.data?.company;
  const [reviewUrl, setReviewUrl] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    if (!company) return;
    setReviewUrl(company.google_review_url ?? "");
  }, [company?.id, company?.google_review_url]);

  const hasLink = Boolean(company?.google_review_url?.trim());
  const campaign = hubQ.data?.campaign;
  const stats = hubQ.data?.inviteStats;

  const saveAndStart = useMutation({
    mutationFn: async () => {
      await updateLocalBusinessProfile({ data: { googleReviewUrl: reviewUrl } });
      try {
        await ensureLocalCohort();
      } catch {
        /* cohort optional if full */
      }
      if (!campaign) {
        await startReviewBoostCampaign();
      }
    },
    onSuccess: async () => {
      toast.success(t("common.save"));
      await qc.invalidateQueries({ queryKey: ["local-business-hub"] });
      await qc.invalidateQueries({ queryKey: ["review-invites"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addInvite = useMutation({
    mutationFn: async () => {
      if (!campaign) {
        await startReviewBoostCampaign();
      }
      return addReviewInvite({ data: { name: inviteName, email: inviteEmail } });
    },
    onSuccess: async () => {
      celebrateLokalWin("Einladung bereit — jetzt an den Kunden schicken.");
      setInviteEmail("");
      setInviteName("");
      await qc.invalidateQueries({ queryKey: ["review-invites"] });
      await qc.invalidateQueries({ queryKey: ["local-business-hub"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          {t("nav.bewertungen")}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          {t("bewertungen.title")}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">{t("bewertungen.blurb")}</p>
      </div>

      <Panel label={t("bewertungen.step1")} glow={!hasLink}>
        <p className="text-sm text-muted-foreground">{t("bewertungen.step1Hint")}</p>
        <input
          value={reviewUrl}
          onChange={(e) => setReviewUrl(e.target.value)}
          placeholder="https://g.page/r/…"
          className="mt-3 w-full rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none"
        />
        <button
          type="button"
          disabled={saveAndStart.isPending || !reviewUrl.trim()}
          onClick={() => saveAndStart.mutate()}
          className="mt-3 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {saveAndStart.isPending ? t("common.loading") : t("bewertungen.step1Save")}
        </button>
      </Panel>

      {hasLink || campaign ? (
        <>
          {stats ? (
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  [t("bewertungen.statsSent"), stats.sent],
                  [t("bewertungen.statsClicked"), stats.clicked],
                  [t("bewertungen.statsDone"), stats.completed],
                ] as const
              ).map(([label, n]) => (
                <div key={label} className="rounded-2xl border border-border/40 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">{n}</p>
                </div>
              ))}
            </div>
          ) : null}

          <Panel label={t("bewertungen.step2")} glow>
            <p className="text-sm text-muted-foreground">{t("bewertungen.step2Hint")}</p>
            <div className="mt-3 grid gap-2">
              <input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Name (optional)"
                className="rounded-2xl border border-border bg-foreground/5 px-4 py-2.5 text-sm"
              />
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="kunde@email.de"
                className="rounded-2xl border border-border bg-foreground/5 px-4 py-2.5 text-sm"
              />
              <button
                type="button"
                disabled={addInvite.isPending || !inviteEmail.trim()}
                onClick={() => addInvite.mutate()}
                className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {addInvite.isPending ? t("common.loading") : t("bewertungen.step2Add")}
              </button>
            </div>
          </Panel>

          <Panel label={t("bewertungen.step3")}>
            {(invitesQ.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("bewertungen.empty")}</p>
            ) : (
              <ul className="max-h-72 space-y-2 overflow-y-auto">
                {(invitesQ.data ?? []).map(
                  (inv: {
                    id: string;
                    recipient_email: string | null;
                    recipient_name: string | null;
                    status: string;
                    trackUrl: string;
                  }) => (
                    <li
                      key={inv.id}
                      className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/40 px-3 py-2.5 text-sm"
                    >
                      <Star className="h-3.5 w-3.5 text-gold" />
                      <span className="min-w-0 flex-1 truncate">
                        {inv.recipient_name || inv.recipient_email}
                      </span>
                      <Chip className="text-[10px]">{inv.status}</Chip>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold"
                        onClick={async () => {
                          await navigator.clipboard.writeText(inv.trackUrl);
                          toast.success(t("bewertungen.copyLink"));
                        }}
                      >
                        <Copy className="h-3 w-3" /> {t("bewertungen.copyLink")}
                      </button>
                      {inv.status === "draft" || inv.status === "queued" ? (
                        <button
                          type="button"
                          className="text-[11px] font-semibold text-primary"
                          onClick={() =>
                            void markReviewInviteSent({ data: { inviteId: inv.id } }).then(() =>
                              qc.invalidateQueries({ queryKey: ["review-invites"] }),
                            )
                          }
                        >
                          {t("bewertungen.markSent")}
                        </button>
                      ) : null}
                      {inv.status !== "completed" ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold"
                          onClick={() =>
                            void markReviewInviteCompleted({ data: { inviteId: inv.id } }).then(
                              () => {
                                celebrateLokalWin("Sterne-Einladung als erledigt markiert.");
                                void qc.invalidateQueries({ queryKey: ["review-invites"] });
                              },
                            )
                          }
                        >
                          <Check className="h-3 w-3" /> {t("bewertungen.markDone")}
                        </button>
                      ) : null}
                    </li>
                  ),
                )}
              </ul>
            )}
          </Panel>
        </>
      ) : null}
    </div>
  );
}
