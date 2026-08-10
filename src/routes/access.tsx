import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, KeyRound } from "lucide-react";

import { FoundingCohort, MarketingWaveScarcity } from "@/components/aura/scarcity";
import { Chip, Panel, Pulse } from "@/components/aura/primitives";
import { SiteFooter } from "@/components/aura/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { startFoundingSeatCheckout } from "@/lib/founding-seat";
import { LAUNCH_SHARE_TEXT, OG_IMAGE, SITE_URL } from "@/lib/site";
import { trackTeaser } from "@/lib/teaser-track";

export const Route = createFileRoute("/access")({
  validateSearch: (search: Record<string, unknown>) => {
    const out: { invite?: string; seat?: "cancel" | "success" } = {};
    if (typeof search["invite"] === "string") out.invite = search["invite"];
    if (search["seat"] === "cancel" || search["seat"] === "success") {
      out.seat = search["seat"];
    }
    return out;
  },
  head: () => ({
    meta: [
      { title: "Founding seats — Aura OS" },
      {
        name: "description",
        content:
          "Invite-only paid founding seats. $99 one-time · 1000 companies · one invite each.",
      },
      { property: "og:title", content: "Founding seats — Aura OS" },
      {
        property: "og:description",
        content: "Paid founding seats. Invite unlocks checkout. One invite per founder.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/access` },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/access` }],
  }),
  component: AccessPage,
});

function AccessPage() {
  const navigate = useNavigate();
  const { invite: inviteFromLink, seat } = Route.useSearch();
  const [invite, setInvite] = useState(inviteFromLink?.toUpperCase() ?? "");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);

  useEffect(() => {
    if (inviteFromLink) setInvite(inviteFromLink.toUpperCase());
  }, [inviteFromLink]);

  useEffect(() => {
    if (seat === "cancel") toast.message("Checkout canceled — your invite is still valid.");
  }, [seat]);

  const continueWithInvite = async () => {
    const code = invite.trim().toUpperCase();
    if (!code) {
      toast.error("Enter an invite code — it unlocks the right to buy a founding seat.");
      return;
    }
    setBusy(true);
    try {
      const { data: ok, error } = await supabase.rpc("check_invite_code", { _code: code });
      if (error) throw error;
      if (!ok) {
        toast.error("That invite is invalid or already used.");
        return;
      }
      trackTeaser("cta_click", { placement: "access_invite" });

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: hasSeat } = await supabase.rpc("user_has_company_seat");
        if (hasSeat) {
          navigate({ to: "/console" });
          return;
        }
        const url = await startFoundingSeatCheckout(code);
        window.location.href = url;
        return;
      }

      navigate({ to: "/auth", search: { invite: code, mode: "signup" } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not continue");
    } finally {
      setBusy(false);
    }
  };

  const joinWaitlist = async () => {
    const value = email.trim().toLowerCase();
    if (!value.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("waitlist_signups").insert({
        email: value,
        source: "access_founding",
      });
      if (error && !/duplicate|unique/i.test(error.message)) throw error;
      setWaitlisted(true);
      trackTeaser("cta_click", { placement: "access_waitlist" });
      toast.success("You're on the list — we'll email when seats open.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not join waitlist");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <header className="border-b border-white/5 bg-background/40 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3.5 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Home
          </Link>
          <Chip className="ml-auto">Invite-only · paid seats</Chip>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
        <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
          <Pulse /> Founding cohort
        </p>
        <h1 className="font-display text-[clamp(2rem,6vw,3.2rem)] leading-[0.98] tracking-tight">
          Paid founding seats.
          <span className="block text-primary">One invite each.</span>
        </h1>
        <p className="mt-3 text-[12px] font-semibold uppercase tracking-[0.22em] text-gold">
          $99 one-time · 1000 companies · invite unlocks checkout
        </p>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Free multi-use codes are closed. A valid invite is the scarce right to buy a founding
          seat — you still pay $99. After you seat, you get exactly one invite to pass on. Rewards
          are in-app AURA (compute), not cash.
        </p>

        <div className="mt-8 space-y-6">
          <MarketingWaveScarcity />
          <FoundingCohort />
        </div>

        <Panel label="Your invite" className="mt-10" glow>
          <p className="mb-3 text-[12px] text-muted-foreground">
            Enter a founder invite (or early wave code). Then sign in and pay the founding seat.
          </p>
          <div className="flex flex-wrap gap-2">
            <div className="flex min-w-[12rem] flex-1 items-center gap-2 rounded-2xl bg-foreground/6 px-3.5 py-2.5">
              <KeyRound className="h-3.5 w-3.5 shrink-0 text-primary" />
              <input
                value={invite}
                onChange={(e) => setInvite(e.target.value.toUpperCase())}
                placeholder="INV-…"
                maxLength={32}
                aria-label="Invite code"
                className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/60"
              />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void continueWithInvite()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-[12px] text-muted-foreground">
            Already signed in without a seat? Continue with your invite to open $99 checkout.
          </p>
        </Panel>

        <Panel label="No invite yet" className="mt-6">
          {waitlisted ? (
            <p className="text-[13px] text-muted-foreground">
              You're on the waitlist. We'll email when a wave invite is available — seats stay paid.
            </p>
          ) : (
            <>
              <p className="mb-3 text-[12px] text-muted-foreground">
                Request interest. We do not mint free seats from social tasks anymore.
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  className="min-w-[12rem] flex-1 rounded-2xl bg-foreground/6 px-3.5 py-2.5 text-[13px] outline-none placeholder:text-muted-foreground/60"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void joinWaitlist()}
                  className="rounded-2xl border border-border/50 px-4 py-2.5 text-xs font-semibold disabled:opacity-40"
                >
                  Request seat
                </button>
              </div>
            </>
          )}
        </Panel>
      </div>

      <SiteFooter
        share={{
          url: `${SITE_URL}/access`,
          text: LAUNCH_SHARE_TEXT,
          placement: "access_footer",
        }}
      />
    </main>
  );
}
