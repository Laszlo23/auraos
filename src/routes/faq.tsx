import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/aura/site-footer";
import { OG_IMAGE, SITE_URL, url } from "@/lib/site";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Aura OS" },
      {
        name: "description",
        content:
          "How Aura OS connects social channels, posts for you, and ships a week-in-review report for your boss.",
      },
      { property: "og:title", content: "FAQ — Aura OS" },
      { property: "og:url", content: url("/faq") },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: url("/faq") }],
  }),
  component: FaqPage,
});

const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: "What is Aura OS?",
    a: (
      <>
        An AI company operating system. You wake a company, agents take jobs (social, outreach,
        trading, support), and you stay in control of publishing and spend. Live product:{" "}
        <a href={SITE_URL} className="text-primary hover:underline">
          aibusiness.fun
        </a>
        .
      </>
    ),
  },
  {
    q: "Which social channels can I connect?",
    a: (
      <>
        X, Meta (Facebook Page + Instagram), LinkedIn, TikTok, and Farcaster. Open{" "}
        <Link to="/connect" className="text-primary hover:underline">
          Connect
        </Link>{" "}
        or{" "}
        <Link to="/channels" className="text-primary hover:underline">
          Channels
        </Link>{" "}
        and click Connect. Each provider needs app credentials configured by the host (see the
        README / social-channels guide).
      </>
    ),
  },
  {
    q: "Why does TikTok say it needs approval?",
    a: (
      <>
        TikTok’s Content Posting API requires Developer Portal review for{" "}
        <span className="font-mono text-[12px]">video.upload</span> /{" "}
        <span className="font-mono text-[12px]">video.publish</span>. Until those scopes are
        approved, connect may work but publishing video will fail with a clear error. TikTok posts
        are video-based — use a share-kit clip from Channels.
      </>
    ),
  },
  {
    q: "How does Farcaster connect work?",
    a: (
      <>
        Aura uses Neynar managed signers. You get a Warpcast approval link (popup), slide to approve
        the signer, and Orin can cast on your behalf. No password is stored — only an encrypted
        signer id.
      </>
    ),
  },
  {
    q: "How do I show my boss what got done this week?",
    a: (
      <>
        Open{" "}
        <Link to="/report" className="text-primary hover:underline">
          Week in review
        </Link>
        , then <strong className="font-semibold text-foreground">Share this week</strong>. That
        freezes the last seven days into a public page you can copy — posts, replies, tasks, and
        agent actions. No login required for the recipient.
      </>
    ),
  },
  {
    q: "Do agents publish without me?",
    a: (
      <>
        Only when you turn on Autopublish / Free reply mode for a connected channel. Default paths
        keep drafts for founder approve. You can always disconnect a channel.
      </>
    ),
  },
  {
    q: "Is access invite-only?",
    a: (
      <>
        Yes during the founding cohort. Earn an invite on{" "}
        <Link to="/access" className="text-primary hover:underline">
          /access
        </Link>{" "}
        or use a code from the community.
      </>
    ),
  },
  {
    q: "Where is privacy explained?",
    a: (
      <>
        See{" "}
        <Link to="/privacy" className="text-primary hover:underline">
          Privacy
        </Link>
        ,{" "}
        <Link to="/terms" className="text-primary hover:underline">
          Terms
        </Link>
        , and{" "}
        <Link to="/cookies" className="text-primary hover:underline">
          Cookies
        </Link>
        . Connected Google, Microsoft, X, Meta, LinkedIn, TikTok, and Farcaster tokens are stored
        encrypted for publishing on your behalf.
      </>
    ),
  },
];

function FaqPage() {
  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 15% -10%, oklch(0.75 0.14 199 / 0.14), transparent 55%), radial-gradient(ellipse 50% 35% at 90% 10%, oklch(0.75 0.12 78 / 0.08), transparent 50%)",
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link
          to="/"
          className="text-[12px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Aura OS
        </Link>
        <Link
          to="/auth"
          className="rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          Enter
        </Link>
      </header>

      <div className="relative z-10 mx-auto max-w-3xl px-6 pb-20">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">FAQ</p>
        <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3rem)] leading-[1.02] tracking-tight">
          Answers for founders
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Channels, TikTok approval, Farcaster, and the week-in-review report — short and honest.
        </p>

        <div className="mt-12 divide-y divide-border/40 border-y border-border/40">
          {FAQS.map((item) => (
            <section key={item.q} className="py-7">
              <h2 className="text-[15px] font-semibold tracking-tight">{item.q}</h2>
              <p className="mt-2.5 text-[14px] leading-relaxed text-muted-foreground">{item.a}</p>
            </section>
          ))}
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
