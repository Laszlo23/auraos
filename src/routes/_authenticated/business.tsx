import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, Globe, Link2, Loader2, Megaphone, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Chip, Meter, PageHeader, Panel, Pulse } from "@/components/aura/primitives";
import { CompanyTokenLaunchPanel } from "@/components/aura/company-token-launch";
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
import { SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/business")({
  head: () => ({
    meta: [
      { title: "Business site — Local hub | Aura OS" },
      {
        name: "description",
        content:
          "Paste your homepage, connect socials, and run Review Boost — real customer Google review invites.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BusinessHubPage,
});

function BusinessHubPage() {
  const qc = useQueryClient();
  const hubQ = useQuery({
    queryKey: ["local-business-hub"],
    queryFn: () => getLocalBusinessHub(),
  });
  const invitesQ = useQuery({
    queryKey: ["review-invites"],
    queryFn: () => listReviewInvites(),
  });

  const company = hubQ.data?.company;
  const [homepage, setHomepage] = useState("");
  const [reviewUrl, setReviewUrl] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    if (!company) return;
    setHomepage(company.homepage_url ?? "");
    setReviewUrl(company.google_review_url ?? "");
  }, [company?.id, company?.homepage_url, company?.google_review_url]);

  const saveProfile = useMutation({
    mutationFn: () =>
      updateLocalBusinessProfile({
        data: { homepageUrl: homepage, googleReviewUrl: reviewUrl },
      }),
    onSuccess: async () => {
      toast.success("Business profile saved.");
      await qc.invalidateQueries({ queryKey: ["local-business-hub"] });
      await qc.invalidateQueries({ queryKey: ["company"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const joinCohort = useMutation({
    mutationFn: () => ensureLocalCohort(),
    onSuccess: async (res) => {
      toast.success(`Review Boost seat #${res.cohortNumber} claimed.`);
      await qc.invalidateQueries({ queryKey: ["local-business-hub"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startCampaign = useMutation({
    mutationFn: () => startReviewBoostCampaign(),
    onSuccess: async () => {
      toast.success("Review Boost campaign is active.");
      await qc.invalidateQueries({ queryKey: ["local-business-hub"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addInvite = useMutation({
    mutationFn: () =>
      addReviewInvite({
        data: { name: inviteName, email: inviteEmail },
      }),
    onSuccess: async () => {
      toast.success("Invite drafted — copy the track link and send from your mailbox.");
      setInviteEmail("");
      setInviteName("");
      await qc.invalidateQueries({ queryKey: ["review-invites"] });
      await qc.invalidateQueries({ queryKey: ["local-business-hub"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markSent = useMutation({
    mutationFn: (inviteId: string) => markReviewInviteSent({ data: { inviteId } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["review-invites"] });
      await qc.invalidateQueries({ queryKey: ["local-business-hub"] });
    },
  });

  const markDone = useMutation({
    mutationFn: (inviteId: string) => markReviewInviteCompleted({ data: { inviteId } }),
    onSuccess: async () => {
      toast.success("Marked as review received (founder-attested).");
      await qc.invalidateQueries({ queryKey: ["review-invites"] });
      await qc.invalidateQueries({ queryKey: ["local-business-hub"] });
    },
  });

  const stats = hubQ.data?.inviteStats;
  const cohortNum = company?.local_cohort_number;
  const publicPath = hubQ.data?.publicCardPath;
  const channels = hubQ.data?.channels ?? [];
  const connected = channels.filter((c) => c.status === "connected" || c.status === "active");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Local"
        title="Business site"
        description="Your hub: existing homepage, Google Review Boost, and social automation — powered by Aura OS."
        actions={
          cohortNum ? (
            <Chip tone="gold">
              <Pulse tone="gold" /> Cohort #{cohortNum} / {LOCAL_COHORT_CAP}
            </Chip>
          ) : (
            <Chip>Review Boost · first {LOCAL_COHORT_CAP}</Chip>
          )
        }
      />

      <CompanyTokenLaunchPanel />

      {hubQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading hub…</p>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <Panel label="Your website" glow>
              <p className="text-sm text-muted-foreground">
                Paste the landing or homepage you already run. Aura does not replace it — we link
                and promote it.
              </p>
              <label className="mt-4 block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Homepage URL
                <input
                  value={homepage}
                  onChange={(e) => setHomepage(e.target.value)}
                  placeholder="https://your-business.com"
                  className="mt-2 w-full rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none focus:border-primary/40"
                />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saveProfile.isPending}
                  onClick={() => saveProfile.mutate()}
                  className="rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {saveProfile.isPending ? "Saving…" : "Save website"}
                </button>
                <Link
                  to="/website"
                  className="rounded-2xl border border-border/50 px-4 py-2.5 text-xs font-semibold"
                >
                  Or publish an Aura mini-site
                </Link>
                {homepage.trim() ? (
                  <a
                    href={homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-2xl border border-border/50 px-4 py-2.5 text-xs font-semibold"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open
                  </a>
                ) : null}
              </div>
            </Panel>

            <Panel
              label="Google Review Boost"
              glow
              action={
                <span className="text-[10px] uppercase tracking-[0.16em] text-primary">
                  Real customers only
                </span>
              }
            >
              <p className="text-sm text-muted-foreground">
                First {LOCAL_COHORT_CAP} local businesses get up to {REVIEW_BOOST_INVITE_GOAL}{" "}
                review <span className="text-foreground">invites</span>. Agents help you ask —
                you approve every send. We never invent Google reviews.
              </p>
              <label className="mt-4 block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Google review link
                <input
                  value={reviewUrl}
                  onChange={(e) => setReviewUrl(e.target.value)}
                  placeholder="https://g.page/r/… or maps review URL"
                  className="mt-2 w-full rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none focus:border-primary/40"
                />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saveProfile.isPending}
                  onClick={() => saveProfile.mutate()}
                  className="rounded-2xl border border-border/50 px-4 py-2.5 text-xs font-semibold"
                >
                  Save review link
                </button>
                {!cohortNum ? (
                  <button
                    type="button"
                    disabled={joinCohort.isPending}
                    onClick={() => joinCohort.mutate()}
                    className="rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {joinCohort.isPending ? "Joining…" : "Claim cohort seat"}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={startCampaign.isPending || Boolean(hubQ.data?.campaign)}
                  onClick={() => startCampaign.mutate()}
                  className="rounded-2xl bg-foreground/10 px-4 py-2.5 text-xs font-semibold disabled:opacity-60"
                >
                  {hubQ.data?.campaign
                    ? "Campaign active"
                    : startCampaign.isPending
                      ? "Starting…"
                      : "Start Review Boost"}
                </button>
              </div>

              {stats ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  {(
                    [
                      ["Sent", stats.sent],
                      ["Clicked", stats.clicked],
                      ["Received", stats.completed],
                      ["Total", stats.total],
                    ] as const
                  ).map(([label, n]) => (
                    <div key={label} className="rounded-2xl border border-border/40 bg-foreground/4 p-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        {label}
                      </p>
                      <p className="num mt-1 text-xl font-semibold">{n}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              {hubQ.data?.campaign ? (
                <div className="mt-4 space-y-2">
                  <Meter
                    value={
                      ((stats?.total ?? 0) / (hubQ.data.campaign.goal_invites || REVIEW_BOOST_INVITE_GOAL)) *
                      100
                    }
                    tone="gold"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {stats?.total ?? 0} / {hubQ.data.campaign.goal_invites} invites drafted
                  </p>
                </div>
              ) : null}

              {hubQ.data?.campaign ? (
                <div className="mt-6 space-y-3 border-t border-border/40 pt-5">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Add customer invite
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="Name (optional)"
                      className="rounded-2xl border border-border bg-foreground/5 px-4 py-2.5 text-sm outline-none"
                    />
                    <input
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="customer@email.com"
                      className="rounded-2xl border border-border bg-foreground/5 px-4 py-2.5 text-sm outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={addInvite.isPending || !inviteEmail.trim()}
                    onClick={() => addInvite.mutate()}
                    className="rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {addInvite.isPending ? "Adding…" : "Draft invite"}
                  </button>

                  <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto">
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
                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                          onClick={async () => {
                            await navigator.clipboard.writeText(inv.trackUrl);
                            toast.success("Track link copied — paste into your email.");
                          }}
                        >
                          <Copy className="h-3 w-3" /> Link
                        </button>
                        {inv.status === "draft" || inv.status === "queued" ? (
                          <button
                            type="button"
                            className="text-[11px] font-semibold text-primary"
                            onClick={() => markSent.mutate(inv.id)}
                          >
                            Mark sent
                          </button>
                        ) : null}
                        {inv.status !== "completed" ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                            onClick={() => markDone.mutate(inv.id)}
                          >
                            <Check className="h-3 w-3" /> Got review
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Panel>

            <Panel label="Social automation">
              <p className="text-sm text-muted-foreground">
                Connect channels once — then schedule, drip, and approve replies from Channels.
              </p>
              <p className="mt-3 text-[12px] text-muted-foreground">
                Connected:{" "}
                {connected.length
                  ? connected.map((c) => c.provider).join(" · ")
                  : "none yet"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/connect"
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground"
                >
                  <Link2 className="h-3.5 w-3.5" /> Connect accounts
                </Link>
                <Link
                  to="/channels"
                  className="inline-flex items-center gap-2 rounded-2xl border border-border/50 px-4 py-2.5 text-xs font-semibold"
                >
                  <Megaphone className="h-3.5 w-3.5" /> Open Channels
                </Link>
              </div>
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel label="Public business card">
              <p className="text-sm text-muted-foreground">
                Share a clean page with your homepage CTA and Google review button.
              </p>
              {publicPath ? (
                <>
                  <a
                    href={`${SITE_URL}${publicPath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"
                  >
                    <Globe className="h-4 w-4" />
                    {SITE_URL}
                    {publicPath}
                  </a>
                  <button
                    type="button"
                    className={cn(
                      "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border/50 py-2.5 text-xs font-semibold",
                    )}
                    onClick={async () => {
                      await navigator.clipboard.writeText(`${SITE_URL}${publicPath}`);
                      toast.success("Public card link copied.");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy link
                  </button>
                </>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Saving a company name assigns your public slug…
                  {hubQ.isFetching ? (
                    <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin" />
                  ) : null}
                </p>
              )}
            </Panel>

            <Panel label="Cohort scarcity">
              <p className="num text-3xl font-semibold text-gold">
                {hubQ.data?.cohortRemaining ?? "—"}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Review Boost seats left
              </p>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
