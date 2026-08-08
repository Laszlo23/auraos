import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, Coins, CreditCard, RefreshCw, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Chip, DataRow, Meter, PageHeader, Panel, Pulse } from "@/components/aura/primitives";
import { Counter } from "@/components/aura/counter";
import { useCompany, useCompanyTable } from "@/hooks/use-aura";
import {
  useLogTokens,
  useRenewCycle,
  useSubscription,
  useTokenLedger,
  useUpdateSubscription,
} from "@/hooks/use-tokens";
import { supabase } from "@/integrations/supabase/client";
import { trackAppEvent } from "@/lib/app-track";
import { PLANS, TOKEN_SYMBOL, planById } from "@/lib/plans";
import {
  CHAIN_PHASE,
  ROADMAP,
  cycleProgress,
  cycleWindow,
  daysLeft,
  shortHash,
} from "@/lib/subscription";
import { compact, currency, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const STRIPE_ENABLED = Boolean(import.meta.env["VITE_STRIPE_PUBLISHABLE_KEY"]);

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Subscription — monthly AURA tokens | Aura OS" },
      {
        name: "description",
        content:
          "A monthly token subscription that meters your AI workforce. Off-chain ledger today, on-chain settlement next.",
      },
      { property: "og:title", content: "Tokenized monthly subscription — Aura OS" },
      {
        property: "og:description",
        content: "Meter autonomous work in AURA. Off-chain now, on-chain settlement next.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BillingPage,
});

type Agent = { id: string; name: string; avatar: string; credits_used: number };

function BillingPage() {
  const { data: company } = useCompany();
  const { data: sub } = useSubscription();
  const update = useUpdateSubscription();
  const renew = useRenewCycle();
  const log = useLogTokens();
  const { data: ledger = [] } = useTokenLedger(14);
  const { data: agents = [] } = useCompanyTable<Agent>("agents", {
    orderBy: "credits_used",
    ascending: false,
  });
  const [connecting, setConnecting] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null);
  const rolled = useRef(false);

  // Auto-renew actually rolls the cycle forward once it has elapsed.
  useEffect(() => {
    if (!sub || rolled.current) return;
    if (!sub.auto_renew) return;
    if (new Date(sub.cycle_end).getTime() > Date.now()) return;
    rolled.current = true;
    renew.mutate(sub, {
      onSuccess: () => toast.success(`Cycle renewed · allowance refilled in ${TOKEN_SYMBOL}.`),
    });
  }, [sub, renew]);

  const spent = agents.reduce((a, x) => a + x.credits_used, 0);
  const max = agents[0]?.credits_used ?? 1;
  const plan = planById(sub?.plan ?? "company");
  const pct = sub ? (sub.tokens_remaining / sub.tokens_per_cycle) * 100 : 0;
  const left = daysLeft(sub?.cycle_end);
  const elapsed = cycleProgress(sub?.cycle_start, sub?.cycle_end);

  async function connectWallet() {
    setConnecting(true);
    try {
      const eth = (
        window as unknown as {
          ethereum?: { request: (a: { method: string }) => Promise<string[]> };
        }
      ).ethereum;
      if (!eth) {
        toast.error("Install a browser wallet (e.g. MetaMask) or bind one under Identity.");
        return;
      }
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      const address = accounts[0];
      if (!address) throw new Error("No account returned");
      await update.mutateAsync({ wallet_address: address });
      toast.success(`Wallet reserved · ${shortHash(address)}`);
    } catch {
      toast.error("Wallet connection was rejected.");
    } finally {
      setConnecting(false);
    }
  }

  async function startCheckout(planId: string) {
    if (!company) return;
    if (!STRIPE_ENABLED) {
      toast.error(
        "Card top-ups require Stripe. Set VITE_STRIPE_PUBLISHABLE_KEY to enable checkout.",
      );
      return;
    }
    setCheckoutBusy(planId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error("Sign in again to pay with card.");
        return;
      }
      trackAppEvent("checkout_started", { company_id: company.id, plan: planId });
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ plan: planId, company_id: company.id }),
      });
      const payload = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !payload.url) {
        throw new Error(payload.error || "Checkout failed");
      }
      window.location.assign(payload.url);
    } catch (err) {
      toast.error((err as Error).message || "Could not start Stripe checkout.");
    } finally {
      setCheckoutBusy(null);
    }
  }

  async function topUp(_amount: number) {
    if (!STRIPE_ENABLED) {
      toast.error("Top-ups require Stripe. Configure billing to add AURA with a card.");
      return;
    }
    await startCheckout(sub?.plan ?? "company");
  }

  async function switchPlan(id: string) {
    // Prefer Stripe checkout for paid plan changes when configured.
    if (STRIPE_ENABLED) {
      await startCheckout(id);
      return;
    }
    const p = planById(id);
    await update.mutateAsync({
      plan: p.id,
      tokens_per_cycle: p.tokens,
      tokens_remaining: p.tokens,
      status: "active",
      ...cycleWindow(),
    });
    await log.mutateAsync({
      kind: "grant",
      amount: p.tokens,
      reason: `Cycle allowance · ${p.name}`,
    });
    toast.success(`Now on ${p.name}. A fresh 30-day cycle just started.`);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Capital"
        title="Tokenized monthly subscription"
        description="One monthly allowance of AURA. Agents burn it as they work. Ledger is source of truth today — smart-wallet settlement migrates 1:1 later."
        actions={
          <Chip tone="gold">
            <Pulse tone="gold" /> {CHAIN_PHASE.label}
          </Chip>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Panel
            label={`${plan.name} · monthly cycle`}
            glow
            action={
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-primary">
                <Pulse /> metering
              </span>
            }
          >
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <p className="num text-5xl font-semibold text-gold">
                  <Counter value={sub?.tokens_remaining ?? 0} format={compact} />
                </p>
                <p className="mt-1.5 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {TOKEN_SYMBOL} left · {compact(sub?.tokens_per_cycle ?? 0)} per month
                </p>
              </div>
              <div className="ml-auto flex gap-2">
                {[2500, 10000].map((a) => (
                  <button
                    key={a}
                    onClick={() => void topUp(a)}
                    className="rounded-2xl bg-foreground/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors hover:bg-foreground/12"
                  >
                    +{compact(a)}
                  </button>
                ))}
                {sub ? (
                  <button
                    onClick={() =>
                      renew.mutate(sub, { onSuccess: () => toast.success("Cycle restarted.") })
                    }
                    className="inline-flex items-center gap-2 rounded-2xl bg-foreground/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors hover:bg-foreground/12"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", renew.isPending && "animate-spin")} />{" "}
                    Renew
                  </button>
                ) : null}
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <Meter value={pct} tone="gold" />
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                <span>cycle {Math.round(elapsed)}% elapsed</span>
                <span>{left} days to renewal</span>
              </div>
            </div>
            <div className="mt-5 grid gap-x-8 sm:grid-cols-2">
              <DataRow
                label="Price"
                value={`${plan.aura.toLocaleString()} ${TOKEN_SYMBOL} · ${currency(plan.fiat)}`}
                tone="gold"
              />
              <DataRow label="Burn this cycle" value={`${compact(spent)} ${TOKEN_SYMBOL}`} />
              <DataRow label="Settlement" value="Off-chain ledger" tone="primary" />
              <DataRow
                label="Auto-renew"
                value={
                  <button
                    onClick={() => void update.mutateAsync({ auto_renew: !sub?.auto_renew })}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]",
                      sub?.auto_renew
                        ? "bg-primary/15 text-primary"
                        : "bg-foreground/8 text-muted-foreground",
                    )}
                  >
                    {sub?.auto_renew ? "on" : "off"}
                  </button>
                }
              />
            </div>
          </Panel>

          <div className="grid gap-5 md:grid-cols-3">
            {PLANS.map((p, i) => {
              const active = p.id === plan.id;
              return (
                <Panel key={p.id} label={p.name} glow={active} delay={0.05 * i}>
                  <p className="num text-2xl font-semibold text-gold">
                    {p.aura.toLocaleString()} <span className="text-xs">{TOKEN_SYMBOL}</span>
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    or {currency(p.fiat)} / month
                  </p>
                  <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
                    {p.blurb}
                  </p>
                  <ul className="mt-4 space-y-1.5">
                    {p.perks.map((perk) => (
                      <li
                        key={perk}
                        className="flex items-center gap-2 text-[12px] text-foreground/85"
                      >
                        <Check className="h-3 w-3 shrink-0 text-primary" /> {perk}
                      </li>
                    ))}
                  </ul>
                  <p className="num mt-4 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {compact(p.tokens)} {TOKEN_SYMBOL} allowance
                  </p>
                  <button
                    disabled={active || checkoutBusy === p.id}
                    onClick={() => void switchPlan(p.id)}
                    className={cn(
                      "mt-5 w-full rounded-2xl py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-opacity hover:opacity-90",
                      active ? "bg-primary/15 text-primary" : "bg-foreground/8",
                    )}
                  >
                    {active ? "Current plan" : STRIPE_ENABLED ? "Checkout" : "Switch"}
                  </button>
                  <button
                    disabled={checkoutBusy === p.id}
                    onClick={() => void startCheckout(p.id)}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors hover:bg-foreground/6 disabled:opacity-50"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    {checkoutBusy === p.id ? "Redirecting…" : "Pay with card"}
                  </button>
                </Panel>
              );
            })}
          </div>

          <Panel label="Token roadmap" delay={0.1}>
            <div className="grid gap-4 sm:grid-cols-2">
              {ROADMAP.map((r) => (
                <div key={r.phase} className="glass-soft rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <span className="num text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      {r.phase}
                    </span>
                    <Chip
                      tone={
                        r.state === "live" ? "primary" : r.state === "soon" ? "neutral" : "gold"
                      }
                    >
                      {r.state === "live" ? "live" : r.state === "soon" ? "next" : "open now"}
                    </Chip>
                  </div>
                  <p className="mt-2.5 text-sm font-semibold">{r.title}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                    {r.body}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel label="Burn by agent" delay={0.14}>
            <div className="space-y-4">
              {agents.map((a) => (
                <div key={a.id}>
                  <div className="mb-1.5 flex items-center gap-2.5 text-[12.5px]">
                    <span className="grid h-6 w-6 place-items-center rounded-lg bg-foreground/8 text-[11px]">
                      {a.avatar}
                    </span>
                    {a.name}
                    <span className="num ml-auto text-muted-foreground">
                      {a.credits_used.toLocaleString()} {TOKEN_SYMBOL}
                    </span>
                  </div>
                  <Meter value={(a.credits_used / max) * 100} />
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel label="Wallet" delay={0.06}>
            {sub?.wallet_address ? (
              <>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/15 text-primary">
                    <Wallet className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="num truncate text-[13px] font-semibold">
                      {shortHash(sub.wallet_address)}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      reserved for {CHAIN_PHASE.next}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-[12.5px] leading-relaxed text-muted-foreground">
                  Your balance stays on the Aura ledger until settlement goes live, then migrates
                  1:1 to this address.
                </p>
              </>
            ) : (
              <>
                <Coins className="h-5 w-5 text-gold" />
                <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
                  Billing runs off-chain today. Reserve a wallet now and your {TOKEN_SYMBOL}{" "}
                  migrates 1:1 when settlement ships.
                </p>
                <button
                  onClick={() => void connectWallet()}
                  disabled={connecting}
                  className="mt-4 w-full rounded-2xl bg-primary py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {connecting ? "Connecting…" : "Reserve wallet"}
                </button>
              </>
            )}
            <Link
              to="/connect"
              className="mt-4 block rounded-2xl bg-foreground/8 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Connection hub
            </Link>
          </Panel>

          <Panel label="Ledger" delay={0.12} bodyClassName="p-0">
            <div className="max-h-[360px] divide-y divide-border/40 overflow-y-auto">
              {ledger.length === 0 ? (
                <p className="px-5 py-6 text-[12px] text-muted-foreground">
                  No token movements yet this cycle.
                </p>
              ) : (
                ledger.map((l) => (
                  <div key={l.id} className="flex items-start gap-3 px-5 py-2.5">
                    <p className="min-w-0 flex-1 font-mono text-[11.5px] leading-relaxed text-foreground/85">
                      {l.reason}
                      <span className="block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        {timeAgo(l.created_at)}
                      </span>
                    </p>
                    <span
                      className={cn(
                        "num shrink-0 text-[12px] font-semibold",
                        l.kind === "grant" ? "text-primary" : "text-gold",
                      )}
                    >
                      {l.kind === "grant" ? "+" : "−"}
                      {compact(l.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel label="Status" delay={0.18}>
            <Chip tone={pct > 35 ? "primary" : "danger"}>
              {pct > 35 ? "healthy" : "top-up recommended"}
            </Chip>
            <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
              The ledger watches burn rate and warns Atlas before runway becomes a decision.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
