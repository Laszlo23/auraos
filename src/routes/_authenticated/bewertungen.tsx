import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Chip, Meter, Panel } from "@/components/aura/primitives";
import { LOCAL_COHORT_CAP, REVIEW_BOOST_INVITE_GOAL } from "@/lib/funnels";
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
    meta: [{ title: "Bewertungen — Aura Lokal" }],
  }),
  component: BewertungenPage,
});

function BewertungenPage() {
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

  const save = useMutation({
    mutationFn: () => updateLocalBusinessProfile({ data: { googleReviewUrl: reviewUrl } }),
    onSuccess: async () => {
      toast.success("Review-Link gespeichert.");
      await qc.invalidateQueries({ queryKey: ["local-business-hub"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const join = useMutation({
    mutationFn: () => ensureLocalCohort(),
    onSuccess: async (res) => {
      toast.success(`Sitz #${res.cohortNumber} gesichert.`);
      await qc.invalidateQueries({ queryKey: ["local-business-hub"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const start = useMutation({
    mutationFn: () => startReviewBoostCampaign(),
    onSuccess: async () => {
      toast.success("Review Boost aktiv.");
      await qc.invalidateQueries({ queryKey: ["local-business-hub"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addInvite = useMutation({
    mutationFn: () => addReviewInvite({ data: { name: inviteName, email: inviteEmail } }),
    onSuccess: async () => {
      toast.success("Einladung entworfen — Link kopieren und senden.");
      setInviteEmail("");
      setInviteName("");
      await qc.invalidateQueries({ queryKey: ["review-invites"] });
      await qc.invalidateQueries({ queryKey: ["local-business-hub"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = hubQ.data?.inviteStats;
  const cohortNum = company?.local_cohort_number;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          Bewertungen
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Google Review Boost
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Invite real customers to leave an optional Google review. We never invent stars, pay for
          ratings, or write reviews for you — only tracked invite links you approve.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Nur echte Kunden. Du gibst jeden Versand frei. Keine Fake-Reviews.
        </p>
      </div>

      <Panel label="Google-Link">
        <input
          value={reviewUrl}
          onChange={(e) => setReviewUrl(e.target.value)}
          placeholder="https://g.page/r/…"
          className="w-full rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => save.mutate()}
            className="rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground"
          >
            Speichern
          </button>
          {!cohortNum ? (
            <button
              type="button"
              disabled={join.isPending}
              onClick={() => join.mutate()}
              className="rounded-2xl border border-border/50 px-4 py-2.5 text-xs font-semibold"
            >
              Cohort sichern
            </button>
          ) : (
            <Chip tone="gold">
              #{cohortNum} / {LOCAL_COHORT_CAP}
            </Chip>
          )}
          <button
            type="button"
            disabled={start.isPending || Boolean(hubQ.data?.campaign)}
            onClick={() => start.mutate()}
            className="rounded-2xl border border-border/50 px-4 py-2.5 text-xs font-semibold disabled:opacity-60"
          >
            {hubQ.data?.campaign ? "Kampagne aktiv" : "Review Boost starten"}
          </button>
        </div>
      </Panel>

      {stats ? (
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["Gesendet", stats.sent],
              ["Geklickt", stats.clicked],
              ["Erhalten", stats.completed],
            ] as const
          ).map(([label, n]) => (
            <div key={label} className="rounded-2xl border border-border/40 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{n}</p>
            </div>
          ))}
        </div>
      ) : null}

      {hubQ.data?.campaign ? (
        <Panel label="Kunden einladen">
          <Meter
            value={
              ((stats?.total ?? 0) / (hubQ.data.campaign.goal_invites || REVIEW_BOOST_INVITE_GOAL)) *
              100
            }
            tone="gold"
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            {stats?.total ?? 0} / {hubQ.data.campaign.goal_invites} Einladungen
          </p>
          <div className="mt-4 grid gap-2">
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
              className="rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              Entwurf anlegen · Link kopieren
            </button>
          </div>
          <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
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
                  className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/40 px-3 py-2 text-sm"
                >
                  <Star className="h-3.5 w-3.5 text-gold" />
                  <span className="min-w-0 flex-1 truncate">
                    {inv.recipient_name || inv.recipient_email}
                  </span>
                  <Chip className="text-[10px]">{inv.status}</Chip>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[11px]"
                    onClick={async () => {
                      await navigator.clipboard.writeText(inv.trackUrl);
                      toast.success("Track-Link kopiert.");
                    }}
                  >
                    <Copy className="h-3 w-3" /> Link
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
                      Als gesendet markieren
                    </button>
                  ) : null}
                  {inv.status !== "completed" ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[11px]"
                      onClick={() =>
                        void markReviewInviteCompleted({ data: { inviteId: inv.id } }).then(() => {
                          toast.success("Als erhalten markiert.");
                          void qc.invalidateQueries({ queryKey: ["review-invites"] });
                        })
                      }
                    >
                      <Check className="h-3 w-3" /> Da
                    </button>
                  ) : null}
                </li>
              ),
            )}
          </ul>
        </Panel>
      ) : null}

      <Link to="/business" className="text-xs text-muted-foreground underline">
        Erweiterte Business-Seite
      </Link>
    </div>
  );
}
