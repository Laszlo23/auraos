import { createFileRoute, Link } from "@tanstack/react-router";
import { Download } from "lucide-react";

import { SiteFooter } from "@/components/aura/site-footer";
import { FOUNDERS } from "@/lib/legal-entity";
import { OG_IMAGE, SITE_URL, SOCIAL_LINKS, url } from "@/lib/site";
import { WIEN_STICKERS } from "@/lib/wien-story";

const TITLE = "AURA Wien Stickers — Drop 0";
const DESCRIPTION =
  "WhatsApp-Sticker der Wien Crew. Collection Drop 0 — Gesichter und Sprüche, kein Token-Sale.";

export const Route = createFileRoute("/sticker")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: url("/sticker") },
      { property: "og:image", content: `${SITE_URL}${WIEN_STICKERS.tray}` },
      { property: "og:locale", content: "de_AT" },
    ],
    links: [{ rel: "canonical", href: url("/sticker") }],
  }),
  component: StickerPackPage,
});

function StickerPackPage() {
  const telegram = SOCIAL_LINKS.find((s) => s.id === "telegram");
  const x = SOCIAL_LINKS.find((s) => s.id === "x");

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 12% -8%, oklch(0.72 0.12 85 / 0.16), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 8%, oklch(0.55 0.1 200 / 0.2), transparent 50%)",
        }}
      />

      <header className="relative border-b border-border/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-6 py-4">
          <Link
            to="/wien"
            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
          >
            ← Wien
          </Link>
          <nav className="ml-auto flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.16em]">
            <Link to="/team" className="text-muted-foreground hover:text-foreground">
              Team
            </Link>
            <Link to="/whitepaper" className="text-muted-foreground hover:text-foreground">
              Whitepaper
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative mx-auto max-w-3xl px-6 py-14 sm:py-20">
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary">
          {WIEN_STICKERS.drop} · Collection
        </p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,8vw,3.6rem)] font-semibold leading-[0.98] tracking-tight">
          {WIEN_STICKERS.name}
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {WIEN_STICKERS.blurb}
        </p>
        <p className="mt-2 text-[13px] text-muted-foreground/80">{WIEN_STICKERS.blurbEn}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={WIEN_STICKERS.zip}
            download
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            <Download className="h-4 w-4" /> Pack laden (ZIP)
          </a>
          {telegram ? (
            <a
              href={telegram.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-border/50 px-5 py-3 text-sm font-semibold"
            >
              Telegram
            </a>
          ) : null}
          {x ? (
            <a
              href={x.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-border/50 px-5 py-3 text-sm font-semibold"
            >
              X
            </a>
          ) : null}
        </div>

        <ul className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {WIEN_STICKERS.items.map((s) => (
            <li
              key={s.id}
              className="overflow-hidden rounded-3xl border border-border/40 bg-card/20"
            >
              <img src={s.src} alt={s.label} width={512} height={512} className="w-full" />
              <p className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {s.label}
              </p>
            </li>
          ))}
        </ul>

        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold tracking-tight">In WhatsApp bringen</h2>
          <ol className="mt-4 space-y-2 text-[14px] text-muted-foreground">
            {WIEN_STICKERS.howTo.map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[12px] text-muted-foreground">
            WhatsApp nimmt Packs nur über Sticker Maker / die WhatsApp-Sticker-App. Wir erfinden
            keinen Gruppen-Link. Tray-Icon:{" "}
            <img
              src={WIEN_STICKERS.tray}
              alt=""
              className="inline-block h-6 w-6 rounded align-middle"
            />
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold tracking-tight">Die Crew</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {FOUNDERS.map((f) => (
              <Link
                key={f.id}
                to="/team"
                className="flex items-center gap-2 rounded-2xl border border-border/40 bg-foreground/[0.03] pr-3"
              >
                <img src={f.avatar} alt="" className="h-10 w-10 rounded-xl object-cover" />
                <span className="text-[12px] font-semibold">{f.name}</span>
              </Link>
            ))}
          </div>
        </section>
      </section>

      <SiteFooter
        share={{
          url: `${SITE_URL}/sticker`,
          text: "AURA Wien Stickers — Drop 0. Oida. Passt scho. Ned Fake-Sterne.",
          placement: "sticker",
        }}
      />
    </main>
  );
}
