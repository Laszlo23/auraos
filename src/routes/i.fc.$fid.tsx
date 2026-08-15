import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { SiteFooter } from "@/components/aura/site-footer";
import { supabase } from "@/integrations/supabase/client";
import {
  claimFcBuilderInvite,
  previewFcBuilderInvite,
  submitFcBuilderFeedback,
} from "@/lib/fc-builder.functions";
import { FC_BUILDER_CREDITS, fcBuilderInvitePath } from "@/lib/fc-builder";
import { ogCampaignMeta } from "@/lib/og-campaign";
import { SITE_URL, url } from "@/lib/site";

export const Route = createFileRoute("/i/fc/$fid")({
  validateSearch: (search: Record<string, unknown>) => {
    const out: { k?: string } = {};
    if (typeof search["k"] === "string") out.k = search["k"];
    return out;
  },
  params: {
    parse: (p) => ({ fid: String(p.fid || "") }),
    stringify: (p) => ({ fid: p.fid }),
  },
  head: ({ params }) => {
    const fid = params.fid;
    return {
      meta: [
        { title: `Personal invite · fid ${fid} — Aura OS` },
        {
          name: "description",
          content: "Come build with us. Test credits waiting. No judging. Just the now.",
        },
        { property: "og:title", content: `Personal invite · fid ${fid}` },
        {
          property: "og:description",
          content: "A personal Farcaster invite to test Aura OS with the crew.",
        },
        { property: "og:url", content: url(`/i/fc/${fid}`) },
        ...ogCampaignMeta("share"),
      ],
      links: [{ rel: "canonical", href: url(`/i/fc/${fid}`) }],
    };
  },
  component: FcBuilderInvitePage,
});

function FcBuilderInvitePage() {
  const { fid: fidRaw } = Route.useParams();
  const { k } = Route.useSearch();
  const fid = Number(fidRaw);
  const token = (k ?? "").trim();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const preview = useQuery({
    queryKey: ["fc-builder-preview", fid],
    queryFn: () => previewFcBuilderInvite({ data: { fid } }),
    enabled: Number.isFinite(fid) && fid > 0,
  });

  const invite = preview.data?.invite;
  const next = token ? fcBuilderInvitePath(fid, token) : fcBuilderInvitePath(fid);

  const claim = useMutation({
    mutationFn: () => claimFcBuilderInvite({ data: { fid, token } }),
    onSuccess: (res) => {
      toast.success(
        res.alreadyClaimed
          ? "Credits already on your company"
          : `${res.credits} test AURA landed on your company`,
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Claim failed"),
  });

  const [note, setNote] = useState("");
  const feedback = useMutation({
    mutationFn: () => submitFcBuilderFeedback({ data: { fid, token, feedback: note } }),
    onSuccess: () => toast.success("Noted. That’s the team build."),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const claimed = claim.data != null || invite?.claimed;

  return (
    <main className="relative min-h-svh overflow-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% -10%, oklch(0.75 0.14 199 / 0.16), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 20%, oklch(0.75 0.12 78 / 0.1), transparent 50%)",
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link to="/" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Aura OS
        </Link>
        <Link to="/wien" className="text-[12px] text-muted-foreground hover:text-foreground">
          Wien
        </Link>
      </header>

      <div className="relative z-10 mx-auto max-w-3xl px-6 pb-20">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          Personal invite · fid {Number.isFinite(fid) ? fid : "—"}
        </p>
        <h1 className="mt-3 font-display text-[clamp(2rem,7vw,3.4rem)] leading-[0.96] tracking-tight">
          {invite?.displayName || (invite?.username ? `@${invite.username}` : "Come build with us.")}
          <span className="block text-muted-foreground">Kein Urteil. Nur jetzt.</span>
        </h1>
        <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-muted-foreground">
          A founder tagged you on Farcaster. {invite?.credits ?? FC_BUILDER_CREDITS} test AURA
          waiting after you sign in — enough to try the desk. The founding seat stays $99. Feedback
          is the ask.
        </p>

        {!token ? (
          <p className="mt-6 rounded-2xl border border-border/50 bg-white/[0.03] p-4 text-[14px] text-muted-foreground">
            This page is a preview. Open the personal link from the cast to claim credits.
          </p>
        ) : !userId ? (
          <Link
            to="/auth"
            search={{ mode: "signup" as const, next }}
            className="mt-8 inline-flex rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            Sign in to claim test credits
          </Link>
        ) : (
          <div className="mt-8 space-y-4">
            <button
              type="button"
              disabled={claim.isPending || claimed}
              onClick={() => claim.mutate()}
              className="rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {claimed ? "Credits claimed" : `Claim ${invite?.credits ?? FC_BUILDER_CREDITS} test AURA`}
            </button>
            {claimed ? (
              <form
                className="space-y-3 rounded-[1.5rem] border border-border/50 bg-white/[0.03] p-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  feedback.mutate();
                }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  What should we build together?
                </p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-border/50 bg-background/70 p-3 text-[14px]"
                  placeholder="A note. A bug. A vibe. No judging."
                />
                <button
                  type="submit"
                  disabled={feedback.isPending || !note.trim()}
                  className="rounded-2xl border border-primary/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary disabled:opacity-50"
                >
                  Send to the crew
                </button>
              </form>
            ) : null}
            <Link to="/access" className="block text-[12px] text-muted-foreground hover:text-foreground">
              Founding seat still $99 →
            </Link>
          </div>
        )}
      </div>

      <SiteFooter
        share={{
          url: `${SITE_URL}${fcBuilderInvitePath(Number.isFinite(fid) ? fid : 0)}`,
          text: "Personal Farcaster invite — come build with us.",
          placement: "fc_builder",
        }}
      />
    </main>
  );
}
