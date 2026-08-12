import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowRight,
  AtSign,
  Check,
  ClipboardCopy,
  Download,
  ExternalLink,
  Mail,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Chip, Panel, Pulse } from "@/components/aura/primitives";
import { SiteFooter } from "@/components/aura/site-footer";
import { FIO_PARTNER_ASKS, FIO_SHIPPED, fioKitMarkdown, fioPartnerEmailDraft } from "@/lib/fio-kit";
import { fioPreferredDomain, fioRegisterUrl, fioTpid } from "@/lib/fio";
import { LEGAL_EMAIL, OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";

const TITLE = "Aura OS × FIO Protocol — partner kit";
const DESCRIPTION =
  "Aura ships FIO as the primary crypto-handle rail: resolve, attest to verified wallets, public profiles, and soft-gates before USDC moves. Partnership asks for free @domain handles and co-marketing.";

export const Route = createFileRoute("/partners/fio")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/partners/fio` },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/partners/fio` }],
  }),
  component: FioPartnersPage,
});

function FioPartnersPage() {
  const [copied, setCopied] = useState<"email" | "kit" | null>(null);
  const domain = fioPreferredDomain();
  const tpid = fioTpid();

  const copy = async (kind: "email" | "kit", text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    toast.success(kind === "email" ? "Outreach draft copied" : "Kit markdown copied");
    window.setTimeout(() => setCopied(null), 2000);
  };

  const downloadKit = () => {
    const blob = new Blob([fioKitMarkdown()], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aura-fio-partner-kit.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,oklch(0.55_0.08_199/0.18),transparent_55%),radial-gradient(ellipse_at_80%_20%,oklch(0.7_0.1_85/0.08),transparent_50%)]"
      />
      <main className="relative mx-auto w-full max-w-[1040px] px-6 pb-20 pt-10 md:px-10 md:pt-14">
        <Link
          to="/"
          className="text-[12px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Home
        </Link>

        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-8"
        >
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
            <Pulse /> Partners · FIO Protocol
          </p>
          <h1 className="mt-4 font-display text-[clamp(1.85rem,4vw,2.75rem)] font-semibold tracking-tight">
            {SITE_NAME} × FIO
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Human-readable crypto receives for AI company founders. In-app @handles stay for
            leaderboards; <strong className="font-medium text-foreground">FIO</strong> is how money
            finds people across wallets.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Chip tone="primary">
              <AtSign className="h-3 w-3" /> Preferred @{domain}
            </Chip>
            <Chip tone={tpid ? "primary" : "gold"}>
              TPID · {tpid || "set after integrator handle"}
            </Chip>
          </div>
        </motion.header>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "Honest attest",
              body: "FIO maps only to signature-verified wallets. No silent sends. No custodial FIO keys.",
            },
            {
              icon: Wallet,
              title: "Money rails",
              body: "ETH / Base / BSC + USDC resolution. Soft-gate before USDC withdraw and live Grow / Quant.",
            },
            {
              icon: AtSign,
              title: "Public identity",
              body: "Verified FIO on founder profiles. Partner-ready public resolve API.",
            },
          ].map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i, duration: 0.45 }}
            >
              <Panel label={card.title} glow={i === 0}>
                <card.icon className="mb-2 h-4 w-4 text-primary" />
                <p className="text-[13px] leading-relaxed text-muted-foreground">{card.body}</p>
              </Panel>
            </motion.div>
          ))}
        </div>

        <Panel label="Shipped today" className="mt-6" glow>
          <ul className="space-y-2.5">
            {FIO_SHIPPED.map((line) => (
              <li key={line} className="flex gap-2.5 text-[13px] leading-relaxed">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to="/identity"
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-[12px] font-semibold text-primary-foreground"
            >
              Open Identity <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href={fioRegisterUrl(`partner@${domain}`)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl bg-foreground/8 px-4 py-2.5 text-[12px] font-semibold text-muted-foreground"
            >
              Register on FIO <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <Link
              to="/leaderboard"
              className="inline-flex items-center gap-2 rounded-2xl bg-foreground/8 px-4 py-2.5 text-[12px] font-semibold text-muted-foreground"
            >
              Founder profiles
            </Link>
          </div>
        </Panel>

        <Panel label="Partnership asks" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {FIO_PARTNER_ASKS.map((ask) => (
              <div key={ask.title} className="rounded-2xl bg-foreground/4 p-4">
                <p className="text-sm font-semibold">{ask.title}</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  {ask.body}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel label="Outreach packet" className="mt-6" glow>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Copy the draft to email{" "}
            <a
              href="mailto:sales@fioprotocol.io"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              sales@fioprotocol.io
            </a>{" "}
            (and CC {LEGAL_EMAIL}). Attach the markdown kit.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copy("email", fioPartnerEmailDraft())}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-[12px] font-semibold text-primary-foreground"
            >
              {copied === "email" ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <ClipboardCopy className="h-3.5 w-3.5" />
              )}
              Copy email draft
            </button>
            <button
              type="button"
              onClick={() => void copy("kit", fioKitMarkdown())}
              className="inline-flex items-center gap-2 rounded-2xl bg-foreground/8 px-4 py-2.5 text-[12px] font-semibold"
            >
              <ClipboardCopy className="h-3.5 w-3.5" />
              Copy kit markdown
            </button>
            <button
              type="button"
              onClick={downloadKit}
              className="inline-flex items-center gap-2 rounded-2xl bg-foreground/8 px-4 py-2.5 text-[12px] font-semibold"
            >
              <Download className="h-3.5 w-3.5" />
              Download .md
            </button>
            <a
              href={`mailto:sales@fioprotocol.io?subject=${encodeURIComponent("Aura OS × FIO — partnership")}&body=${encodeURIComponent(fioPartnerEmailDraft())}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-gold/14 px-4 py-2.5 text-[12px] font-semibold text-gold"
            >
              <Mail className="h-3.5 w-3.5" />
              Open in mail app
            </a>
          </div>
        </Panel>

        <p className="mt-8 text-center text-[12px] text-muted-foreground">
          Technical notes live in-repo at <code className="text-foreground/80">docs/FIO.md</code>.
          Dev hub:{" "}
          <a
            href="https://dev.fio.net/"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-2 hover:underline"
          >
            dev.fio.net
          </a>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
