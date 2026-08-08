import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowUpRight, Coins, Cpu, Layers, Mail, Sparkles, Users } from "lucide-react";

import { Chip, Panel, Pulse } from "@/components/aura/primitives";
import { ShareBar } from "@/components/aura/share";
import { SiteFooter } from "@/components/aura/site-footer";
import { useNetworkTotals } from "@/hooks/use-public";
import { PROGRAMS, STATUS_LABEL, PITCH, TEAM_SIZE } from "@/lib/grants";
import { LEGAL_EMAIL, OG_IMAGE, SITE_URL } from "@/lib/site";

const TITLE = "Partner with Aura OS — credits & grants";
const DESCRIPTION =
  "Aura OS is an operating system for AI companies: autonomous AI employees with shared memory, real budgets and onchain settlement. Here is what we run on, what we need, and where the credits go.";

export const Route = createFileRoute("/grants")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/grants` },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/grants` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Aura OS",
          url: SITE_URL,
          description: PITCH.oneLine,
          numberOfEmployees: { "@type": "QuantitativeValue", value: TEAM_SIZE },
          foundingDate: "2026",
        }),
      },
    ],
  }),
  component: GrantsPage,
});

const STACK = [
  {
    icon: Cpu,
    title: "Agent runtime",
    body: "Every AI employee has a role, a memory, a token budget and a spend cap. Work is logged as discrete actions with a cost and a result attached — not a chat transcript.",
  },
  {
    icon: Coins,
    title: "x402 machine-payable API",
    body: "Nine priced endpoints answer HTTP 402 with payment requirements, verify the USDC payment, then serve. Revenue splits 60/20/20 between the founder, the treasury and the platform automatically.",
  },
  {
    icon: Layers,
    title: "Onchain settlement",
    body: "Smart accounts are Alchemy Light Accounts per founder (counterfactual until first UserOp). Gas sponsorship via Alchemy Gas Manager when configured. Reward drops anchor to a Base block for a verifiable receipt.",
  },
  {
    icon: Sparkles,
    title: "Built on Lovable Cloud",
    body: "Postgres with row-level security per founder, server functions on an edge runtime, and a TanStack Start front end. One codebase, no ops team.",
  },
];

const TEAM = [
  { role: "Product & founder", note: "Vision, design direction, go-to-market." },
  { role: "Agent systems", note: "Runtime, memory, budgets and spend enforcement." },
  { role: "Protocol & payments", note: "x402 gateway, smart wallets, settlement." },
  { role: "Growth & community", note: "Founding cohorts, contest seasons, build in public." },
];

function StatusChip({ status }: { status: (typeof PROGRAMS)[number]["status"] }) {
  return (
    <Chip
      tone={status === "apply-now" ? "primary" : status === "needs-traction" ? "gold" : "neutral"}
    >
      {STATUS_LABEL[status]}
    </Chip>
  );
}

function GrantsPage() {
  const totals = useNetworkTotals();
  const t = totals.data;

  const stats = [
    { label: "Companies on the network", value: Number(t?.companies ?? 0).toLocaleString() },
    { label: "AI employees at work", value: Number(t?.agents ?? 0).toLocaleString() },
    { label: "Paid machine calls", value: Number(t?.paid_calls ?? 0).toLocaleString() },
    { label: "USDC settled", value: `$${Number(t?.usdc_paid ?? 0).toFixed(4)}` },
  ];

  return (
    <main className="mx-auto w-full max-w-[1040px] px-5 py-14 md:px-8 md:py-20">
      <header className="mb-12 max-w-3xl">
        <p className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.32em] text-primary">
          <Pulse /> Partners &amp; programmes
        </p>
        <h1 className="text-gradient text-3xl font-semibold leading-[1.05] md:text-5xl">
          We are building the rails for AI companies. We are asking for compute.
        </h1>
        <p className="mt-4 text-[14.5px] leading-relaxed text-muted-foreground">{PITCH.oneLine}</p>
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
          Self-funded, {TEAM_SIZE} people, live product in invite-only beta. No outside capital.
          Everything below is measured from the running system, not a deck.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href={`mailto:${LEGAL_EMAIL}?subject=Aura%20OS%20—%20credits%20%26%20grants`}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground"
          >
            <Mail className="h-3.5 w-3.5" /> Talk to us
          </a>
          <Link
            to="/live"
            className="inline-flex items-center gap-2 rounded-2xl border border-border px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
          >
            See it running
          </Link>
          <ShareBar
            url={`${SITE_URL}/grants`}
            text="Aura OS — an operating system for AI companies."
            placement="grants"
            compact
          />
        </div>
      </header>

      <section aria-labelledby="traction" className="mb-14">
        <h2
          id="traction"
          className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground"
        >
          Live, right now
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Panel key={s.label} label={s.label} delay={i * 0.04}>
              <p className="num text-2xl font-semibold">{s.value}</p>
            </Panel>
          ))}
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
          These counters read the public network views directly. Early numbers are small on purpose
          — the beta is invite-only and we open seats in waves. Trading activity shown inside the
          product is a simulation and is labelled as such wherever it appears.
        </p>
      </section>

      <section aria-labelledby="what" className="mb-14 grid gap-8 lg:grid-cols-[1fr_1.15fr]">
        <div>
          <h2
            id="what"
            className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground"
          >
            What we are building
          </h2>
          <p className="text-[14px] leading-relaxed">{PITCH.problem}</p>
          <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">{PITCH.solution}</p>
          <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">{PITCH.why}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {STACK.map((s, i) => (
            <Panel key={s.title} delay={i * 0.05} className="p-5">
              <s.icon className="h-4 w-4 text-primary" />
              <p className="mt-3 text-[14px] font-semibold">{s.title}</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{s.body}</p>
            </Panel>
          ))}
        </div>
      </section>

      <section aria-labelledby="architecture" className="mb-14">
        <h2
          id="architecture"
          className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground"
        >
          How it fits together
        </h2>
        <Panel label="Architecture" bodyClassName="overflow-x-auto p-5">
          <pre className="num text-[11px] leading-[1.7] text-muted-foreground">{`  founder  ──▶  CEO agent  ──▶  AI employees (role · memory · budget · spend cap)
                                        │
                     shared company memory (Postgres, RLS per founder)
                                        │
          ┌─────────────────────────────┴──────────────────────────────┐
          ▼                                                            ▼
  x402 gateway  ── HTTP 402 → verify USDC → serve            smart accounts (Light Account)
  9 priced endpoints                                          counterfactual → deploy on first UserOp
          │                                                            │
          └──────── revenue split 60 founder / 20 treasury / 20 platform ────────┘
                                        │
                            settlement anchored to a Base block`}</pre>
        </Panel>
      </section>

      <section aria-labelledby="credits" className="mb-14">
        <h2
          id="credits"
          className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground"
        >
          Where credits go
        </h2>
        <p className="mb-6 max-w-3xl text-[14px] leading-relaxed text-muted-foreground">
          {PITCH.useOfCredits}
        </p>
        <div className="space-y-2">
          {PROGRAMS.map((p, i) => (
            <Panel key={p.id} delay={i * 0.02} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                    {p.org}
                  </p>
                  <p className="mt-1 text-[14.5px] font-semibold">{p.program}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip status={p.status} />
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                  >
                    Programme <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-[12.5px] leading-relaxed text-muted-foreground sm:grid-cols-2">
                <p>
                  <span className="text-foreground">Offers </span>
                  {p.gives}
                </p>
                <p>
                  <span className="text-foreground">Requires </span>
                  {p.needs}
                </p>
              </div>
              <p className="mt-2 border-l border-primary/30 pl-3 text-[12.5px] leading-relaxed">
                {p.unlocks}
              </p>
            </Panel>
          ))}
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
          Programme terms change often. Figures we could not confirm from an official page are
          marked unverified rather than guessed.
        </p>
      </section>

      <section aria-labelledby="team" className="mb-16">
        <h2
          id="team"
          className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground"
        >
          The team
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((m, i) => (
            <motion.div
              key={m.role}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.05, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="glass rounded-3xl p-5"
            >
              <Users className="h-4 w-4 text-primary" />
              <p className="mt-3 text-[13.5px] font-semibold">{m.role}</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{m.note}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="glass rounded-3xl p-6 text-center">
        <p className="text-[15px] font-semibold">Backing compute, not a pitch deck.</p>
        <p className="mx-auto mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
          If your programme funds early teams shipping real agent infrastructure, we would like to
          talk. We can share live metrics, architecture detail and a walkthrough of the running
          product the same day.
        </p>
        <a
          href={`mailto:${LEGAL_EMAIL}?subject=Aura%20OS%20—%20credits%20%26%20grants`}
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground"
        >
          <Mail className="h-3.5 w-3.5" /> {LEGAL_EMAIL}
        </a>
      </footer>
      <SiteFooter className="mt-10 border-t-0 px-0" />
    </main>
  );
}
