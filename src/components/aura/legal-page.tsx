import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/aura/site-footer";
import { LEGAL_EMAIL, LEGAL_UPDATED, SITE_NAME } from "@/lib/site";

export function LegalPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40 px-6 py-5">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link
            to="/"
            className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground transition-colors hover:text-foreground"
          >
            ◎ {SITE_NAME}
          </Link>
          <Link
            to="/"
            className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.32em] text-primary">
          Legal
        </p>
        <h1 className="text-gradient text-3xl font-semibold leading-tight md:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{description}</p>
        <p className="mt-2 text-[12px] text-muted-foreground/80">Last updated {LEGAL_UPDATED}</p>

        <div className="prose-legal mt-10 space-y-8 text-[14.5px] leading-relaxed text-muted-foreground">
          {children}
        </div>

        <p className="mt-12 text-sm text-muted-foreground">
          Questions:{" "}
          <a className="text-primary hover:underline" href={`mailto:${LEGAL_EMAIL}`}>
            {LEGAL_EMAIL}
          </a>
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.22em] text-foreground">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
