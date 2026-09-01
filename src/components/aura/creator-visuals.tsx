import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Coins,
  Gem,
  Hexagon,
  Layers,
  Link2,
  Rocket,
  Shield,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";

import { collectionCoverUrl } from "@/lib/creator-contracts";
import { cn } from "@/lib/utils";

/** Animated web3 backdrop — grid, orbs, scan line. */
export function CreatorWeb3Backdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(color-mix(in oklab, var(--primary) 12%, transparent) 1px, transparent 1px),
            linear-gradient(90deg, color-mix(in oklab, var(--primary) 12%, transparent) 1px, transparent 1px)
          `,
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 85% 65% at 50% 0%, black 15%, transparent 72%)",
        }}
      />
      <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary/20 blur-[100px]" />
      <div className="absolute -right-16 top-32 h-64 w-64 rounded-full bg-gold/15 blur-[90px]" />
      <div className="absolute bottom-0 left-1/2 h-48 w-[120%] -translate-x-1/2 bg-gradient-to-t from-primary/8 to-transparent" />
      <div className="creator-scanline absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    </div>
  );
}

export function CreatorChainPill({ chainId = 4663 }: { chainId?: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary backdrop-blur-md">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      Robinhood · {chainId}
    </span>
  );
}

const STACK: Array<{
  icon: LucideIcon;
  title: string;
  body: string;
  accent: "primary" | "gold";
}> = [
  {
    icon: Layers,
    title: "ERC-721 + royalties",
    body: "On-chain collection with EIP-2981 built in. Your art, your rules — deployed in one tx.",
    accent: "primary",
  },
  {
    icon: Coins,
    title: "USDG or ETH desk",
    body: "Primary sales settle on Robinhood Chain. 90% to your wallet, 10% platform — no hidden middlemen.",
    accent: "gold",
  },
  {
    icon: Link2,
    title: "Branded mint page",
    body: "Every drop gets a public storefront at /c/your-slug — shareable, wallet-ready, metadata on-chain.",
    accent: "primary",
  },
  {
    icon: Bot,
    title: "AI drop marketing",
    body: "Aura agents draft threads, teasers, and channel posts while you focus on the art.",
    accent: "gold",
  },
];

export function CreatorStackShowcase({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {STACK.map((item, i) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 * i, duration: 0.45 }}
          className="group relative overflow-hidden rounded-2xl border border-border/40 bg-foreground/[0.03] p-4 backdrop-blur-sm transition hover:border-primary/35"
        >
          <div
            aria-hidden
            className={cn(
              "absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl transition-opacity group-hover:opacity-100 opacity-40",
              item.accent === "gold" ? "bg-gold/25" : "bg-primary/25",
            )}
          />
          <div
            className={cn("icon-well relative mb-3", item.accent === "gold" && "icon-well-gold")}
          >
            <item.icon className="h-4 w-4" />
          </div>
          <p className="relative text-[13px] font-semibold tracking-tight">{item.title}</p>
          <p className="relative mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
            {item.body}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

const FLOW = [
  { icon: Sparkles, label: "Draft", hint: "Name · slug · price" },
  { icon: Rocket, label: "Deploy", hint: "Factory → RH chain" },
  { icon: Hexagon, label: "Mint", hint: "/c/your-slug live" },
  { icon: Zap, label: "Promote", hint: "Agents + channels" },
] as const;

export function CreatorFlowRail() {
  return (
    <ol className="flex flex-wrap items-stretch gap-2 sm:gap-0">
      {FLOW.map((step, i) => (
        <li key={step.label} className="flex min-w-[7.5rem] flex-1 items-center gap-2 sm:min-w-0">
          <div className="flex flex-1 flex-col rounded-2xl border border-border/35 bg-foreground/[0.04] px-3 py-2.5 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-2 sm:py-0">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/25">
                <step.icon className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                  {String(i + 1).padStart(2, "0")} · {step.label}
                </p>
                <p className="hidden text-[10px] text-muted-foreground sm:block">{step.hint}</p>
              </div>
            </div>
          </div>
          {i < FLOW.length - 1 ? (
            <span
              aria-hidden
              className="hidden h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent sm:block"
            />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function CreatorMintFrame({
  slug,
  name,
  symbol,
  priceLabel,
  children,
  className,
}: {
  slug: string;
  name: string;
  symbol?: string;
  priceLabel?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <div aria-hidden className="creator-holo absolute -inset-[1px] rounded-[1.4rem] opacity-80" />
      <div className="relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#07090e]/90 shadow-[0_24px_80px_-28px_var(--glow)] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/8 px-3 py-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/90">
            ◈ Aura Creator
          </span>
          <CreatorChainPill />
        </div>
        {children ?? (
          <img
            src={collectionCoverUrl(slug)}
            alt=""
            className="aspect-square w-full object-cover"
          />
        )}
        <div className="border-t border-white/8 bg-foreground/[0.04] p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display text-base font-semibold tracking-tight">{name}</p>
              {symbol ? (
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{symbol}</p>
              ) : null}
            </div>
            {priceLabel ? (
              <span className="rounded-lg bg-primary/15 px-2 py-1 text-[11px] font-semibold text-primary">
                {priceLabel}
              </span>
            ) : null}
          </div>
          <p className="mt-2 font-mono text-[10px] text-muted-foreground">/c/{slug}</p>
        </div>
      </div>
    </div>
  );
}

export function CreatorPoweredStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-border/30 py-6 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <Shield className="h-3.5 w-3.5 text-primary" />
        On-chain metadata
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Wallet className="h-3.5 w-3.5 text-gold" />
        Wallet-native mint
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Gem className="h-3.5 w-3.5 text-primary" />
        Powered by <span className="text-money font-semibold">Aura OS</span>
      </span>
    </div>
  );
}

export function CreatorDropTicker({
  name,
  symbol,
  maxSupply,
  mintAsset,
}: {
  name: string;
  symbol: string;
  maxSupply: number;
  mintAsset: string;
}) {
  const line = `${name} · ${symbol} · ${maxSupply} editions · ${mintAsset.toUpperCase()} · Robinhood Chain · Primary mint · Aura Creator`;
  return (
    <div className="relative overflow-hidden border-y border-primary/15 bg-primary/[0.04] py-2">
      <div className="ticker-track flex w-max gap-8 whitespace-nowrap px-4 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary/80">
        <span>{line}</span>
        <span aria-hidden>{line}</span>
      </div>
    </div>
  );
}
