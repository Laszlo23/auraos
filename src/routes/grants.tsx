import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  Check,
  ClipboardCopy,
  Coins,
  Cpu,
  Download,
  Layers,
  Mail,
  Sparkles,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Chip, Panel, Pulse } from "@/components/aura/primitives";
import { ShareBar } from "@/components/aura/share";
import { SiteFooter } from "@/components/aura/site-footer";
import { useNetworkTotals } from "@/hooks/use-public";
import { PROGRAMS, STATUS_LABEL, PITCH, TEAM_SIZE } from "@/lib/grants";
import {
  grantAnswers,
  grantKitMarkdown,
  grantOutreachDrafts,
  priorityApplyOrder,
} from "@/lib/grant-kit";
import { FOUNDERS } from "@/lib/legal-entity";
import { LEGAL_EMAIL, OG_IMAGE, SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

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

const TEAM = FOUNDERS.map((f, i) => ({
  role: f.name ? `${f.role} · ${f.name}` : `Founder ${i + 1} · TBA`,
  note: f.blurb,
  linkedin: f.linkedin,
}));

function StatusChip({ status }: { status: (typeof PROGRAMS)[number]["status"] }) {
  return (
    <Chip
      tone={status === "apply-now" ? "primary" : status === "needs-traction" ? "gold" : "neutral"}
    >
      {STATUS_LABEL[status]}
    </Chip>
  );
}

async function copyText(label: string, text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Copy failed — select the text manually.");
  }
}

function GrantsPage() {
  const totals = useNetworkTotals();
  const t = totals.data;
  const traction = useMemo(
    () => ({
      companies: Number(t?.companies ?? 0),
      agents: Number(t?.agents ?? 0),
      actions24h: Number(t?.actions_24h ?? 0),
      paidCalls: Number(t?.paid_calls ?? 0),
      usdcPaid: Number(t?.usdc_paid ?? 0),
    }),
    [t],
  );
  const answers = useMemo(() => grantAnswers(traction), [traction]);
  const ranked = useMemo(() => priorityApplyOrder(), []);
  const drafts = useMemo(() => grantOutreachDrafts(traction), [traction]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const stats = [
    { label: "Companies on the network", value: Number(t?.companies ?? 0).toLocaleString() },
    { label: "AI employees at work", value: Number(t?.agents ?? 0).toLocaleString() },
    { label: "Paid machine calls", value: Number(t?.paid_calls ?? 0).toLocaleString() },
    { label: "USDC settled", value: `$${Number(t?.usdc_paid ?? 0).toFixed(4)}` },
  ];

  const markCopied = (id: string) => {
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  const downloadKit = () => {
    const md = grantKitMarkdown(traction);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aura-os-grant-application-kit.md";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Application kit downloaded");
  };

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
          Self-funded, {TEAM_SIZE} people, live product. No outside capital.
          Everything below is measured from the running system, not a deck. Grant portals still need
          a human click — this page is the kit so applying is paste, not invent.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={downloadKit}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground"
          >
            <Download className="h-3.5 w-3.5" /> Download application kit
          </button>
          <a
            href={`mailto:${LEGAL_EMAIL}?subject=Aura%20OS%20—%20credits%20%26%20grants`}
            className="inline-flex items-center gap-2 rounded-2xl border border-border px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
          >
            <Mail className="h-3.5 w-3.5" /> {LEGAL_EMAIL}
          </a>
          <Link
            to="/live"
            className="inline-flex items-center gap-2 rounded-2xl border border-border px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
          >
            See it running
          </Link>
          <ShareBar
            url={`${SITE_URL}/grants`}
            text="Aura OS — an operating system for AI companies. Honest traction + grant kit."
            placement="grants"
            compact
          />
        </div>
      </header>

      <section aria-labelledby="kit" className="mb-14">
        <h2
          id="kit"
          className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground"
        >
          Application kit · copy &amp; paste
        </h2>
        <Panel label="Ready answers" glow>
          <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
            Live traction line updates from the public ledger. Paste into Google / Microsoft / AWS /
            Base / Arbitrum / Polygon forms. Do not invent numbers.
          </p>
          <p className="mb-4 rounded-2xl bg-foreground/[0.04] px-4 py-3 text-[12.5px] leading-relaxed">
            <span className="font-semibold text-foreground">Traction · </span>
            <span className="num text-muted-foreground">{answers.tractionLine}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["one-liner", answers.oneLiner],
                ["~250 words", answers.words250],
                ["long form", answers.words1000],
                ["architecture", answers.architecture],
                ["traction", answers.tractionLine],
              ] as const
            ).map(([label, text]) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  void copyText(label, text);
                  markCopied(label);
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-2xl border border-border/60 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground",
                  copiedId === label && "border-primary/50 text-primary",
                )}
              >
                {copiedId === label ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <ClipboardCopy className="h-3.5 w-3.5" />
                )}
                Copy {label}
              </button>
            ))}
          </div>
          <p className="mt-4 text-[12px] text-muted-foreground">
            Founder mailbox SMTP is connected as {LEGAL_EMAIL} for approved outreach — agents draft,
            you send. Portals still require signing in with your founder account.
          </p>
          <Link
            to="/akquise"
            search={{ template: "grant_hunter" }}
            className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
          >
            Open Grant Hunter in Akquise <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Panel>
      </section>

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
          — founding seats are live via Stripe and we grow from real paid companies. Trading
          activity shown inside the product is labelled paper vs live wherever it appears.
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
          Where credits go · apply order
        </h2>
        <p className="mb-6 max-w-3xl text-[14px] leading-relaxed text-muted-foreground">
          {PITCH.useOfCredits} Priority: self-serve cloud credits, then Base / Arbitrum / Polygon
          chain programmes, then Austrian cash tracks.
        </p>
        <div className="space-y-2">
          {ranked.map((p, i) => {
            const draft = drafts.find((d) => d.programId === p.id);
            return (
              <Panel key={p.id} delay={i * 0.02} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                      {i + 1}. {p.org}
                    </p>
                    <p className="mt-1 text-[14.5px] font-semibold">{p.program}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip status={p.status} />
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 rounded-xl bg-primary/12 px-3 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/18"
                    >
                      Open apply <ArrowUpRight className="h-3 w-3" />
                    </a>
                    {draft ? (
                      <button
                        type="button"
                        onClick={() => {
                          void copyText(`${p.org} draft`, draft.body);
                          markCopied(p.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-border/60 px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                      >
                        {copiedId === p.id ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <ClipboardCopy className="h-3 w-3" />
                        )}
                        Copy pitch
                      </button>
                    ) : null}
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
            );
          })}
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
          Programme terms change often. Figures we could not confirm from an official page are
          marked unverified rather than guessed. We do not auto-submit third-party forms.
        </p>
      </section>

      <section aria-labelledby="team" className="mb-16">
        <h2
          id="team"
          className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground"
        >
          The team
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((m, i) => (
            <motion.div
              key={`${m.role}-${i}`}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.05, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="glass rounded-3xl p-5"
            >
              <Users className="h-4 w-4 text-primary" />
              <p className="mt-3 text-[13.5px] font-semibold">{m.role}</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{m.note}</p>
              {m.linkedin ? (
                <a
                  href={m.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-[11px] font-semibold text-primary hover:underline"
                >
                  LinkedIn →
                </a>
              ) : null}
            </motion.div>
          ))}
        </div>
        <p className="mt-4 text-[12px] text-muted-foreground">
          Full roster & company notice:{" "}
          <a href={`${SITE_URL}/team`} className="text-primary hover:underline">
            {SITE_URL.replace("https://", "")}/team
          </a>
        </p>
      </section>

      <footer className="glass rounded-3xl p-6 text-center">
        <p className="text-[15px] font-semibold">Backing compute, not a pitch deck.</p>
        <p className="mx-auto mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
          If your programme funds early teams shipping real agent infrastructure, we would like to
          talk. We can share live metrics, architecture detail and a walkthrough of the running
          product the same day.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={downloadKit}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground"
          >
            <Download className="h-3.5 w-3.5" /> Download kit
          </button>
          <a
            href={`mailto:${LEGAL_EMAIL}?subject=Aura%20OS%20—%20credits%20%26%20grants`}
            className="inline-flex items-center gap-2 rounded-2xl border border-border px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.16em]"
          >
            <Mail className="h-3.5 w-3.5" /> {LEGAL_EMAIL}
          </a>
        </div>
      </footer>
      <SiteFooter className="mt-10 border-t-0 px-0" />
    </main>
  );
}
