import { useState } from "react";
import { Check, Copy, KeyRound, Loader2, ShieldCheck, Sparkles, Wallet, X } from "lucide-react";
import { toast } from "sonner";

import { Chip, Meter, Panel } from "@/components/aura/primitives";
import { useCompanyTable } from "@/hooks/use-aura";
import {
  AGENT_PERMISSIONS,
  useIssueSessionKey,
  useProvisionSmartWallet,
  useRevokeSessionKey,
  useSessionKeys,
  useSmartWallet,
} from "@/hooks/use-earn";
import { getTreasuryBalance } from "@/lib/treasury.functions";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const short = (a?: string | null) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");

/**
 * Compact smart-wallet card for Identity. Full deposit UX lives on /wallet.
 */
export function SmartWalletPanel({
  handleId,
  onProvisioned,
}: {
  handleId: string;
  onProvisioned?: () => void;
}) {
  const { data: wallet, isLoading } = useSmartWallet(handleId);
  const provision = useProvisionSmartWallet();
  const [copied, setCopied] = useState(false);
  const treasury = useQuery({
    queryKey: ["treasury-balance"],
    queryFn: () => getTreasuryBalance(),
    refetchInterval: 30_000,
  });

  const address =
    treasury.data?.address ?? (wallet as { address?: string } | null)?.address ?? null;
  const deployed =
    treasury.data?.deployed ?? Boolean((wallet as { deployed?: boolean } | null)?.deployed);
  const legacy = Boolean((wallet as { legacy?: boolean } | null)?.legacy);
  const chain =
    treasury.data?.network ?? (wallet as { chain?: string } | null)?.chain ?? "base-sepolia";
  const usdc = treasury.data?.usdc ?? null;
  const eth = treasury.data?.eth ?? null;
  const sponsored = Boolean(treasury.data?.sponsored);
  const networkLabel = chain === "base" ? "Base mainnet" : "Base Sepolia";
  const mainnetLive = chain === "base";

  const create = async () => {
    try {
      const res = await provision.mutateAsync(handleId);
      toast.success(res.created ? "Smart wallet provisioned." : "Smart wallet refreshed.");
      if (res.legacy) {
        toast.message("Previous address rotated — funds on the old address need a manual move.");
      }
      if (!res.confirmed) {
        toast.info("Address is provisional until the network responds.");
      } else if (res.sponsored && res.deployed) {
        toast.success("Account deployed — gas sponsored by Aura.");
      } else if (!res.deployed) {
        toast.message("Counterfactual address ready. Deploys on first sponsored transaction.");
      }
      if (res.created) onProvisioned?.();
      void treasury.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not provision wallet.");
    }
  };

  const copy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success("Deposit address copied.");
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Panel label="Smart wallet" glow delay={0.03}>
      <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
        Your treasury is an Alchemy Light Account on {networkLabel}. Copy the full deposit address
        below — send only USDC on this network. For balances, QR, and activity, open Wallet.
        {mainnetLive ? (
          <>
            {" "}
            <span className="text-foreground/80">
              Live Base mainnet — Quant stays paper until you explicitly arm live trading.
            </span>
          </>
        ) : null}
      </p>

      {isLoading ? (
        <div className="h-20 animate-pulse rounded-2xl bg-foreground/6" />
      ) : address ? (
        <div className="glass-soft rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/12">
              <Wallet className="h-4 w-4 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Deposit address · {networkLabel}
              </p>
              <p className="mt-1 break-all font-mono text-[12px] leading-relaxed">{address}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {legacy ? <Chip tone="gold">Legacy</Chip> : null}
              <Chip tone={deployed ? "primary" : "neutral"}>
                {deployed ? "Deployed" : "Receiving"}
              </Chip>
              <button
                type="button"
                onClick={() => void copy()}
                className="rounded-xl bg-primary/14 p-2 text-primary transition-colors"
                aria-label="Copy deposit address"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-[12px] text-muted-foreground">
            <span>
              USDC ·{" "}
              <span className="num text-gold">
                {usdc === null ? "…" : usdc.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
            </span>
            <span>
              ETH ·{" "}
              <span className="num text-foreground">
                {eth === null ? "…" : eth.toLocaleString(undefined, { maximumFractionDigits: 6 })}
              </span>
            </span>
            {sponsored ? <span className="text-primary">Gas sponsored by Aura</span> : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="/wallet"
              className="rounded-xl bg-primary/14 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary"
            >
              Open Wallet
            </a>
            <a
              href="/wallet#export"
              className="rounded-xl bg-foreground/8 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
            >
              Export key
            </a>
            {treasury.data?.explorerAddressUrl ? (
              <a
                href={treasury.data.explorerAddressUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-foreground/8 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
              >
                Explorer
              </a>
            ) : null}
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
            {treasury.data?.depositHint ??
              "Send only USDC on this chain. Other networks will not credit this wallet."}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void create()}
          disabled={provision.isPending}
          className="glass-soft hover-lift inline-flex items-center gap-2 rounded-full px-5 py-3 text-[13px] font-medium text-primary disabled:opacity-50"
        >
          {provision.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Provision my smart wallet
        </button>
      )}
    </Panel>
  );
}

/** Scoped spending keys: what an agent may do, how much it may spend, for how long. */
export function SessionKeysPanel({ walletId }: { walletId?: string | null }) {
  const { data: keys = [] } = useSessionKeys();
  const { data: agents = [] } = useCompanyTable<{ id: string; name: string; role: string }>(
    "agents",
  );
  const issue = useIssueSessionKey();
  const revoke = useRevokeSessionKey();

  const [open, setOpen] = useState(false);
  const [agentId, setAgentId] = useState<string>("");
  const [cap, setCap] = useState(2500);
  const [days, setDays] = useState(30);
  const [actions, setActions] = useState<string[]>(["trade"]);

  const toggle = (id: string) =>
    setActions((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const submit = async () => {
    const agent = agents.find((a) => a.id === agentId);
    try {
      await issue.mutateAsync({
        agentId: agentId || null,
        walletId: walletId ?? null,
        label: agent ? `${agent.name} — ${agent.role}` : "Session key",
        spendCap: cap,
        allowedActions: actions,
        days,
      });
      toast.success("Session key issued.");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not issue key.");
    }
  };

  const active = keys.filter((k) => k.status === "active");

  return (
    <Panel
      label="Agent session keys"
      delay={0.06}
      action={
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-full bg-primary/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary transition-opacity hover:opacity-80"
        >
          {open ? "Cancel" : "Issue key"}
        </button>
      }
    >
      <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
        An agent never holds your treasury. It gets an encrypted spend key with a hard cap, an
        allowlist of actions, and an expiry. Caps are enforced in the database before any machine
        purchase. Revoke any key instantly.
      </p>

      {open ? (
        <div className="glass-soft mb-4 space-y-4 rounded-2xl p-4">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              Agent
            </p>
            <div className="flex flex-wrap gap-2">
              {agents.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAgentId(a.id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[12px] transition-colors",
                    agentId === a.id
                      ? "bg-primary/16 text-primary"
                      : "bg-foreground/8 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {a.name}
                </button>
              ))}
              {agents.length === 0 ? (
                <span className="text-[12px] text-muted-foreground">
                  Wake an agent first to bind a key.
                </span>
              ) : null}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              Permissions
            </p>
            <div className="flex flex-wrap gap-2">
              {AGENT_PERMISSIONS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[12px] transition-colors",
                    actions.includes(p.id)
                      ? "bg-primary/16 text-primary"
                      : "bg-foreground/8 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                Spend cap · {cap.toLocaleString()} AURA
              </span>
              <input
                type="range"
                min={100}
                max={50000}
                step={100}
                value={cap}
                onChange={(e) => setCap(Number(e.target.value))}
                className="mt-3 w-full accent-[hsl(var(--primary))]"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                Expires in {days} days
              </span>
              <input
                type="range"
                min={1}
                max={180}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="mt-3 w-full accent-[hsl(var(--primary))]"
              />
            </label>
          </div>

          <button
            onClick={() => void submit()}
            disabled={issue.isPending || actions.length === 0}
            className="hover-lift inline-flex items-center gap-2 rounded-full bg-primary/14 px-5 py-2.5 text-[13px] font-medium text-primary disabled:opacity-40"
          >
            {issue.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Issue session key
          </button>
        </div>
      ) : null}

      {active.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-muted-foreground">
          No keys issued. Your agents can observe but cannot spend.
        </p>
      ) : (
        <div className="space-y-3">
          {active.map((k) => {
            const pct = k.spend_cap > 0 ? (k.spent / k.spend_cap) * 100 : 0;
            return (
              <div key={k.id} className="glass-soft rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{k.label}</p>
                    <p className="num text-[11px] text-muted-foreground">{short(k.key_address)}</p>
                  </div>
                  <button
                    onClick={() => revoke.mutate(k.id)}
                    className="shrink-0 rounded-xl bg-foreground/8 p-2 text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Revoke session key"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-3">
                  <div className="mb-1.5 flex justify-between text-[11px] text-muted-foreground">
                    <span>
                      {k.spent.toLocaleString()} / {k.spend_cap.toLocaleString()} AURA
                    </span>
                    <span>
                      {k.expires_at
                        ? `until ${new Date(k.expires_at).toLocaleDateString()}`
                        : "no expiry"}
                    </span>
                  </div>
                  <Meter value={pct} />
                </div>
                {k.allowed_actions.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {k.allowed_actions.map((a) => (
                      <Chip key={a} tone="neutral">
                        {AGENT_PERMISSIONS.find((p) => p.id === a)?.label ?? a}
                      </Chip>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
