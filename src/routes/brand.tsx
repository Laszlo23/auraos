import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDownToLine, Check, Copy } from "lucide-react";

import { AuraLogo, AuraMark } from "@/components/aura/aura-logo";
import { PulseOrbit } from "@/components/aura/pulse-orbit";
import { Chip, Panel } from "@/components/aura/primitives";
import { SiteFooter } from "@/components/aura/site-footer";
import { BRAND, BRAND_ASSETS, BRAND_COLORS, BRAND_RULES, BRAND_TYPE } from "@/lib/brand";
import { pageHead } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/brand")({
  head: () =>
    pageHead({
      title: "Brand & design system — Aura OS",
      description:
        "Official Aura OS logo, colors, type, and usage. Download the mark and lockup. Keep the CI honest.",
      path: "/brand",
      image: BRAND_ASSETS.appIconPng,
      imageAlt: "Aura OS mark — cyan core, gold approval tick",
      imageWidth: 512,
      imageHeight: 512,
    }),
  component: BrandPage,
});

const DOWNLOADS = [
  { href: BRAND_ASSETS.logoPng, label: "Logo PNG", hint: "Dark lockup · save this" },
  { href: BRAND_ASSETS.logoSvg, label: "Logo SVG", hint: "Same lockup, vector" },
  { href: BRAND_ASSETS.markPng, label: "Mark PNG", hint: "512 × 512 icon" },
  { href: BRAND_ASSETS.mark, label: "Mark SVG", hint: "Transparent vector" },
  { href: BRAND_ASSETS.lockupPng, label: "Lockup PNG", hint: "Transparent wordmark" },
  { href: BRAND_ASSETS.appIconPng, label: "App icon PNG", hint: "Squircle 512" },
  { href: BRAND_ASSETS.appIcon, label: "App icon SVG", hint: "Squircle vector" },
  { href: BRAND_ASSETS.markMono, label: "Mono SVG", hint: "One-color / invert" },
] as const;

function CopyChip({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setOk(true);
          toast.success("Copied");
          window.setTimeout(() => setOk(false), 1400);
        } catch {
          toast.error("Could not copy");
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-xl bg-foreground/6 px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
    >
      {ok ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
      {value}
    </button>
  );
}

function BrandPage() {
  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <header className="border-b border-white/5 bg-background/40 backdrop-blur-2xl">
        <div className="austria-bar" aria-hidden />
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3.5 sm:px-6">
          <AuraLogo size="sm" />
          <Chip className="ml-auto">Corporate identity</Chip>
          <Link
            to="/"
            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
          >
            Home
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-20">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
          Design system
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-[clamp(2.4rem,7vw,4.2rem)] font-semibold leading-[0.96] tracking-tight">
          One mark.
          <span className="block text-primary">One language.</span>
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {BRAND.descriptor}. Cyan is intelligence. Gold is revenue. The tick in the ring is founder
          approval — nothing spends without it.
        </p>
        <a
          href={BRAND_ASSETS.logoPng}
          download="aura-os-logo.png"
          className="cta-liquid cta-magnetic mt-8 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
        >
          <ArrowDownToLine className="h-4 w-4" />
          Download logo PNG
        </a>

        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          <Panel label="Living mark" glow className="min-h-[220px]">
            <div className="grid min-h-[160px] place-items-center">
              <PulseOrbit size="hero" />
            </div>
            <p className="mt-4 text-[13px] text-muted-foreground">
              Product chrome — header, hero, app shell. The orbit moves. Do not flatten this into
              slides.
            </p>
          </Panel>
          <Panel label="Static CI" className="min-h-[220px]">
            <div className="grid min-h-[160px] place-items-center rounded-2xl bg-[#07090E] ring-1 ring-white/8">
              <AuraLogo size="lg" to={null} />
            </div>
            <p className="mt-4 text-[13px] text-muted-foreground">
              Favicon, press, decks, avatars. Same geometry as the living mark — frozen.
            </p>
          </Panel>
        </div>

        <Panel label="Downloads" className="mt-6">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {DOWNLOADS.map((d) => (
              <a
                key={d.href}
                href={d.href}
                download
                className="glass-soft flex items-center gap-3 rounded-2xl px-3.5 py-3 transition-colors hover:bg-foreground/6"
              >
                <ArrowDownToLine className="h-4 w-4 shrink-0 text-primary" />
                <span>
                  <span className="block text-[13px] font-semibold">{d.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{d.hint}</span>
                </span>
              </a>
            ))}
          </div>
        </Panel>

        <h2 className="mt-16 font-display text-2xl font-semibold tracking-tight">Color</h2>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">
          Tokens live as oklch in <span className="font-mono text-[12px]">styles.css</span>. Hex is
          for SVG, print, and partners.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Object.values(BRAND_COLORS).map((c) => (
            <div key={c.hex} className="glass overflow-hidden rounded-2xl">
              <div className="h-20" style={{ background: c.hex }} />
              <div className="space-y-2 p-3.5">
                <p className="text-[13px] font-semibold">{c.name}</p>
                <p className="text-[11px] text-muted-foreground">{c.role}</p>
                <CopyChip value={c.hex} />
                <CopyChip value={c.oklch} />
              </div>
            </div>
          ))}
        </div>

        <h2 className="mt-16 font-display text-2xl font-semibold tracking-tight">Type</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {Object.values(BRAND_TYPE).map((t) => (
            <Panel key={t.family} label={t.use}>
              <p
                className="text-3xl font-semibold tracking-tight"
                style={{
                  fontFamily:
                    t.family === "Sora"
                      ? "var(--font-display)"
                      : t.family === "JetBrains Mono"
                        ? "var(--font-mono)"
                        : "var(--font-sans)",
                }}
              >
                {t.family}
              </p>
              <p className="mt-2 text-[13px] text-muted-foreground">{BRAND.tagline}</p>
            </Panel>
          ))}
        </div>

        <h2 className="mt-16 font-display text-2xl font-semibold tracking-tight">Usage</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <Panel label="Do">
            <ul className="space-y-2.5 text-[13px] leading-relaxed text-muted-foreground">
              {BRAND_RULES.do.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {line}
                </li>
              ))}
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {BRAND_RULES.clearSpace} {BRAND_RULES.minMark}
              </li>
            </ul>
          </Panel>
          <Panel label="Don't">
            <ul className="space-y-2.5 text-[13px] leading-relaxed text-muted-foreground">
              {BRAND_RULES.dont.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  {line}
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <h2 className="mt-16 font-display text-2xl font-semibold tracking-tight">UI language</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="glass rounded-[1.65rem] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Glass
            </p>
            <p className="mt-3 font-display text-xl font-semibold">Panels</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Blur + specular rim. Radius 1.2rem base, cards 1.65rem.
            </p>
          </div>
          <div className="rounded-[1.65rem] bg-primary p-5 text-primary-foreground shadow-[var(--shadow-glow)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] opacity-70">
              Primary CTA
            </p>
            <p className="mt-3 font-display text-xl font-semibold">Buy / approve</p>
            <p className="mt-1 text-[13px] opacity-80">
              Cyan fill. Magnetic lift. No extra glow art.
            </p>
          </div>
          <div className="rounded-[1.65rem] bg-gold p-5 text-gold-foreground">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] opacity-70">Gold</p>
            <p className="mt-3 font-display text-xl font-semibold">Seats · money</p>
            <p className="mt-1 text-[13px] opacity-80">Scarcity, USDC, founding inventory.</p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <AuraMark className="h-16 w-16 text-primary" />
          <p className="max-w-md text-[13px] text-muted-foreground">
            Files live at <span className="font-mono text-[12px]">{SITE_URL}/brand/</span>.
            Questions — founders@aibusiness.fun.
          </p>
        </div>
      </div>

      <SiteFooter
        share={{
          url: `${SITE_URL}/brand`,
          text: "Aura OS brand — mark, colors, type. One CI.",
          placement: "brand_footer",
        }}
      />
    </main>
  );
}
