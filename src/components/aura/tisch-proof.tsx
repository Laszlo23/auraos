import { Link } from "@tanstack/react-router";
import { MessageCircle, Presentation } from "lucide-react";
import { useState, type ReactNode } from "react";

import { AuraLogo } from "@/components/aura/aura-logo";
import { AURA_REPUTATION_EUR } from "@/lib/boost-packs";
import { LOKAL_SALES, LOKAL_SALES_WHATSAPP } from "@/lib/lokal-sales";
import type { PublicTischProof } from "@/lib/reviews.public.functions";
import { url } from "@/lib/site";

const STEPS = [
  {
    n: "01",
    title: "Kostenloser Check",
    body: "Name, Stadt, Google-Link. Eine Minute am Tisch.",
  },
  {
    n: "02",
    title: "Google-Link",
    body: "Wohin Gäste nach dem Besuch gehen — ehrlich, ohne Belohnung.",
  },
  {
    n: "03",
    title: `${AURA_REPUTATION_EUR} € / Monat`,
    body: "Karte — oder Bar-Code an der Theke. Heute starten.",
  },
] as const;

export function TischShell({ kicker, children }: { kicker: string; children: ReactNode }) {
  return (
    <main className="relative min-h-svh bg-background pb-[calc(7rem+env(safe-area-inset-bottom))] text-foreground">
      <div className="austria-bar" aria-hidden />
      <header className="relative z-10 flex items-center gap-3 border-b border-border/40 px-4 py-3 sm:px-6">
        <AuraLogo size="xs" to="/lokal" label="Aura Local" />
        <p className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {kicker}
        </p>
        <Link
          to="/verkauf"
          className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
        >
          <Presentation className="h-3.5 w-3.5" />
          Deck
        </Link>
      </header>
      {children}
    </main>
  );
}

export function TischStartSteps() {
  return (
    <section className="space-y-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
        So startet ihr heute
      </p>
      <ol className="space-y-3">
        {STEPS.map((step) => (
          <li key={step.n} className="flex gap-4">
            <span className="font-display text-xl font-semibold text-primary/70">{step.n}</span>
            <div>
              <p className="font-display text-lg font-semibold tracking-tight">{step.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function TischStickyCta({ shopSlug }: { shopSlug?: string }) {
  const waText = shopSlug
    ? `${LOKAL_SALES_WHATSAPP}\nTisch: ${url(`/tisch/${shopSlug}`)}`
    : LOKAL_SALES_WHATSAPP;
  const wa = `https://wa.me/?text=${encodeURIComponent(waText)}`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/50 bg-background/90 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg gap-2">
        <a
          href={LOKAL_SALES.auditUrl}
          className="flex-1 rounded-2xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground"
        >
          Jetzt starten
        </a>
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/50 px-4 py-3 text-sm font-semibold"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
      </div>
    </div>
  );
}

export function TischProofMasonry({
  proofs,
  linked,
}: {
  proofs: PublicTischProof[];
  linked?: boolean;
}) {
  if (!proofs.length) return null;

  return (
    <div className="columns-2 gap-3 sm:columns-3">
      {proofs.map((proof) => {
        const img = (
          <img
            src={proof.url}
            alt={proof.caption || `${proof.shopName} Bewertung`}
            className="w-full rounded-[1.2rem] object-cover"
            loading="lazy"
          />
        );
        return (
          <figure key={proof.id} className="mb-3 break-inside-avoid">
            {linked ? (
              <Link to="/tisch/$slug" params={{ slug: proof.shopSlug }} className="block">
                {img}
              </Link>
            ) : (
              img
            )}
            <figcaption className="mt-1.5 px-0.5 text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">{proof.shopName}</span>
              {proof.district ? ` · ${proof.district}` : ""}
              {proof.caption ? ` · ${proof.caption}` : ""}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}

export function TischProofSwipe({
  proofs,
  shopName,
}: {
  proofs: PublicTischProof[];
  shopName: string;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  if (!proofs.length) return null;
  const open = openIdx != null ? proofs[openIdx] : null;

  return (
    <div>
      <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
        {proofs.map((proof, i) => (
          <button
            key={proof.id}
            type="button"
            onClick={() => setOpenIdx(i)}
            className="w-[78vw] max-w-sm shrink-0 snap-center overflow-hidden rounded-[1.6rem] border border-border/40 bg-card/40 text-left"
          >
            <img
              src={proof.url}
              alt={proof.caption || `${shopName} Bewertung ${i + 1}`}
              className="aspect-[3/4] w-full object-cover"
            />
            {proof.caption ? (
              <p className="px-3 py-2 text-[12px] text-muted-foreground">{proof.caption}</p>
            ) : null}
          </button>
        ))}
      </div>
      {open ? (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setOpenIdx(null)}
        >
          <img
            src={open.url}
            alt={open.caption || shopName}
            className="max-h-[90vh] max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}

export function nicheLabel(niche: string | null | undefined) {
  const raw = (niche || "").trim();
  return raw || "Betriebe";
}
