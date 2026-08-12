import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/aura/site-footer";
import { faqPageJsonLd, pageHead } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { BCC_TOKEN_DISCLAIMER } from "@/lib/legal-entity";

const FAQ_PLAIN: Array<{ q: string; a: string }> = [
  {
    q: "What is Aura OS?",
    a: "An AI company operating system. You wake a company, agents take jobs (social, outreach, trading, support), and you stay in control of publishing and spend. Live at aibusiness.fun.",
  },
  {
    q: "Which social channels can I connect?",
    a: "X, Meta (Facebook Page + Instagram), LinkedIn, TikTok, and Farcaster via Connect or Channels.",
  },
  {
    q: "Do agents publish without me?",
    a: "Only when you turn on Autopublish / Free reply mode. Default paths keep drafts for founder approve.",
  },
  {
    q: "Is Aura OS the same as BCC?",
    a: BCC_TOKEN_DISCLAIMER,
  },
  {
    q: "Can I install Aura OS on my phone or desktop?",
    a: "Yes. Aura OS is a progressive web app. Install from Chrome or Add to Home Screen on iPhone Safari.",
  },
];

export const Route = createFileRoute("/faq")({
  head: () =>
    pageHead({
      title: "FAQ — Aura OS · AI company OS answers",
      description:
        "How Aura OS connects social channels, posts for you, runs trading and yield desks, and ships a week-in-review report — plus Aura OS vs BCC clarity.",
      path: "/faq",
      imageAlt: "Aura OS FAQ — answers about the AI company operating system",
      jsonLd: faqPageJsonLd(FAQ_PLAIN),
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
    q: "Who operates Aura OS?",
    a: (
      <>
        Building Culture LLC. Founder Laszlo Bihary is listed with LinkedIn on{" "}
        <Link to="/team" className="text-primary hover:underline">
          /team
        </Link>
        ; additional founders will be named as published. Legal notice:{" "}
        <Link to="/impressum" className="text-primary hover:underline">
          /impressum
        </Link>
        .
      </>
    ),
  },
  {
    q: "Does Aura OS run on a BCC token?",
    a: <>{BCC_TOKEN_DISCLAIMER}</>,
  },
  {
    q: "How do I get in?",
    a: (
      <>
        Buy a founding seat for $99 (1000 seats). No invite required. After you&apos;re seated you
        get one invite link to share — friends still pay $99. See{" "}
        <Link to="/access" className="text-primary hover:underline">
          /access
        </Link>
        . Token launch is separate from founding seats. Aura OS does not require BCC.
      </>
    ),
  },
  {
    q: "What is Aura for local businesses?",
    a: (
      <>
        English path:{" "}
        <Link
          to="/for/$funnel"
          params={{ funnel: "local" }}
          className="text-primary hover:underline"
        >
          /for/local
        </Link>
        . German phone-first super-app:{" "}
        <Link to="/lokal" className="text-primary hover:underline">
          /lokal
        </Link>{" "}
        — Social, Kunden, Google Review Boost, Boost-Pakete. Local Seat 99 € (Barzahlung-Code oder
        Karte). Nur echte Kunden-Einladungen für Reviews.
      </>
    ),
  },
  {
    q: "Can I install Aura OS on my phone or desktop?",
    a: (
      <>
        Yes. Aura OS is a progressive web app. On Android or desktop Chrome, use{" "}
        <strong className="font-semibold text-foreground">Install</strong> / the Get app banner. On
        iPhone Safari: Share →{" "}
        <strong className="font-semibold text-foreground">Add to Home Screen</strong>. It opens
        full-screen like a native app.
      </>
    ),
  },
  {
    q: "How do I prove work finished — and that agents have memory?",
    a: (
      <>
        Completed tasks store a timestamp and a written result. Agents keep dated memory plus
        company knowledge. Share a week report from inside the app, or send the public proof page:{" "}
        <Link to="/proof" className="text-primary hover:underline">
          /proof
        </Link>
        .
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
