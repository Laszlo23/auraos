import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  AtSign,
  BadgeCheck,
  Link2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Celebrate, XpToast } from "@/components/aura/celebrate";
import { Chip, PageHeader, Panel } from "@/components/aura/primitives";
import { SessionKeysPanel, SmartWalletPanel } from "@/components/aura/smart-wallet";
import { useAwardXp } from "@/hooks/use-progress";
import { getOkxStatus } from "@/lib/okx.functions";
import { useQuery } from "@tanstack/react-query";
import {
  WALLET_ROLES,
  useAttestFio,
  useBindWallet,
  useClaimHandle,
  useFioAttestations,
  useMyHandle,
  useRemoveFioAttestation,
  useResolveFio,
  useRevalidateFio,
  useUnbindWallet,
  useUpdateHandle,
  useVerifyWallet,
  useWallets,
  type WalletBinding,
} from "@/hooks/use-identity";
import { shortHash } from "@/lib/subscription";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/identity")({
  head: () => ({
    meta: [
      { title: "Identity — one @handle, three wallets | Aura OS" },
      {
        name: "description",
        content:
          "Claim your founder @handle and bind up to three verified wallets — treasury, rewards and personal — with signature proof.",
      },
      { property: "og:title", content: "Identity — one @handle, three verified wallets" },
      {
        property: "og:description",
        content: "Your public founder identity across the Aura contest network.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IdentityPage,
});

function ClaimCard({ onDone }: { onDone: () => void }) {
  const claim = useClaimHandle();
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  const valid = /^[a-z0-9_]{3,20}$/.test(handle) && name.trim().length > 1;

  return (
    <Panel label="Claim your handle" glow>
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Your handle is the public face of your AI company — it carries your leaderboard rank, your
        milestones and your wallets. It is permanent, so choose well.
      </p>
      <div className="mt-5 space-y-3">
        <label className="glass-soft flex items-center gap-2 rounded-2xl px-4 py-3">
          <AtSign className="h-4 w-4 shrink-0 text-primary" />
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            placeholder="yourhandle"
            maxLength={20}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
          <span className="shrink-0 text-[11px] text-muted-foreground">{handle.length}/20</span>
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Display name"
          aria-label="Display name"
          className="glass-soft w-full rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/40"
        />
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          placeholder="One line on what your company is building…"
          aria-label="Company bio"
          className="glass-soft w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/40"
        />
        <button
          disabled={!valid || claim.isPending}
          onClick={async () => {
            try {
              await claim.mutateAsync({ handle, display_name: name, bio });
              onDone();
            } catch (error) {
              toast.error(
                error instanceof Error && error.message.includes("duplicate")
                  ? "That handle is already taken."
                  : "Could not claim that handle.",
              );
            }
          }}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {claim.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Claim @{handle || "handle"}
        </button>
      </div>
    </Panel>
  );
}

function WalletSlot({
  slot,
  handleId,
  wallet,
  onVerified,
}: {
  slot: number;
  handleId: string;
  wallet: WalletBinding | undefined;
  onVerified: () => void;
}) {
  const bind = useBindWallet();
  const unbind = useUnbindWallet();
  const verify = useVerifyWallet();
  const role = WALLET_ROLES[slot - 1]!;

  async function onBind() {
    try {
      const eth = (
        window as unknown as {
          ethereum?: { request: (a: { method: string }) => Promise<string[]> };
        }
      ).ethereum;
      if (!eth) throw new Error("No browser wallet found. Install MetaMask or Rabby.");
      const [address] = await eth.request({ method: "eth_requestAccounts" });
      if (!address) throw new Error("No account selected.");
      await bind.mutateAsync({ handleId, slot, role: role.id, address });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Wallet connection was rejected.");
    }
  }

  async function onVerify() {
    if (!wallet) return;
    try {
      await verify.mutateAsync(wallet);
      onVerified();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed.");
    }
  }

  return (
    <div
      className={cn(
        "glass-soft flex flex-col gap-3 rounded-3xl p-4",
        wallet?.verified && "ring-1 ring-primary/25",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-2xl",
            wallet?.verified
              ? "bg-primary/14 text-primary"
              : "bg-foreground/6 text-muted-foreground",
          )}
        >
          <Wallet className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{role.label}</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            slot {slot}
          </p>
        </div>
        {wallet?.verified ? (
          <Chip tone="primary">
            <BadgeCheck className="h-3 w-3" /> verified
          </Chip>
        ) : null}
      </div>

      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
        {wallet ? shortHash(wallet.address) : role.blurb}
      </p>

      <div className="mt-auto flex flex-wrap gap-2">
        {!wallet ? (
          <button
            onClick={() => void onBind()}
            disabled={bind.isPending}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {bind.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Bind
          </button>
        ) : (
          <>
            {!wallet.verified && (
              <button
                onClick={() => void onVerify()}
                disabled={verify.isPending}
                className="inline-flex items-center gap-2 rounded-2xl bg-gold/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {verify.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
                Verify
              </button>
            )}
            <button
              onClick={() => unbind.mutate(wallet.id)}
              className="rounded-2xl bg-foreground/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Unbind
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function IdentityPage() {
  return <IdentityBody />;
}

function lastChecked(rows: { last_checked_at: string | null }[]) {
  const stamps = rows
    .map((r) => (r.last_checked_at ? new Date(r.last_checked_at).getTime() : 0))
    .filter(Boolean);
  if (!stamps.length) return "not checked yet";
  const mins = Math.round((Date.now() - Math.max(...stamps)) / 60000);
  if (mins < 1) return "checked just now";
  if (mins < 60) return `checked ${mins}m ago`;
  return `checked ${Math.round(mins / 60)}h ago`;
}

function FioPanel({
  handleId,
  wallets,
  onAttested,
}: {
  handleId: string;
  wallets: WalletBinding[];
  onAttested: () => void;
}) {
  const { data: attestations = [] } = useFioAttestations(handleId);
  const resolve = useResolveFio();
  const attest = useAttestFio();
  const remove = useRemoveFioAttestation();
  const revalidate = useRevalidateFio();
  const swept = useRef(false);

  const STALE_MS = 6 * 60 * 60 * 1000;
  const needsSweep = attestations.some(
    (a) => !a.last_checked_at || Date.now() - new Date(a.last_checked_at).getTime() > STALE_MS,
  );

  useEffect(() => {
    if (!needsSweep || swept.current || revalidate.isPending) return;
    swept.current = true;
    revalidate.mutate(handleId);
  }, [needsSweep, handleId, revalidate]);

  const verifiedWallets = wallets.filter((w) => w.verified);
  const [fio, setFio] = useState("");
  const [walletId, setWalletId] = useState<string>(verifiedWallets[0]?.id ?? "");
  const [preview, setPreview] = useState<string | null>(null);

  const active = walletId || verifiedWallets[0]?.id || "";

  return (
    <Panel label="FIO attestations" delay={0.1}>
      <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
        Bind a FIO crypto handle to a verified wallet. We resolve the handle on the FIO chain and
        store the attestation only when it maps to the exact address you signed with.
      </p>

      {verifiedWallets.length === 0 ? (
        <p className="text-[12.5px] text-gold">
          Verify at least one wallet slot to attest a FIO handle.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {verifiedWallets.map((w) => (
              <button
                key={w.id}
                onClick={() => setWalletId(w.id)}
                className={cn(
                  "rounded-2xl px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-opacity",
                  active === w.id
                    ? "bg-primary/14 text-primary"
                    : "bg-foreground/8 text-muted-foreground hover:text-foreground",
                )}
              >
                {WALLET_ROLES[w.slot - 1]?.label ?? `Slot ${w.slot}`} · {shortHash(w.address)}
              </button>
            ))}
          </div>

          <label className="glass-soft flex items-center gap-2 rounded-2xl px-4 py-3">
            <Link2 className="h-4 w-4 shrink-0 text-primary" />
            <input
              value={fio}
              onChange={(e) => {
                setFio(e.target.value.toLowerCase().replace(/[^a-z0-9@-]/g, ""));
                setPreview(null);
              }}
              placeholder="founder@aura"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
          </label>

          {preview ? (
            <p className="text-[12.5px] text-muted-foreground">Resolves to {preview}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              disabled={!fio.includes("@") || resolve.isPending}
              onClick={async () => {
                try {
                  const res = await resolve.mutateAsync({ fioHandle: fio });
                  if (!res.registered) toast.error("That FIO handle is not registered yet.");
                  else if (!res.publicAddress) toast.error("No ETH address mapped to that handle.");
                  setPreview(res.publicAddress ? shortHash(res.publicAddress) : null);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Lookup failed.");
                }
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-foreground/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              {resolve.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Resolve
            </button>
            <button
              disabled={!fio.includes("@") || !active || attest.isPending}
              onClick={async () => {
                try {
                  await attest.mutateAsync({ fioHandle: fio, walletId: active });
                  setFio("");
                  setPreview(null);
                  onAttested();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Attestation failed.");
                }
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {attest.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Attest
            </button>
          </div>
        </div>
      )}

      {attestations.length > 0 ? (
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {revalidate.isPending ? "re-checking on chain…" : lastChecked(attestations)}
            </p>
            <button
              onClick={() => revalidate.mutate(handleId)}
              disabled={revalidate.isPending}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", revalidate.isPending && "animate-spin")} />
              Re-check
            </button>
          </div>
          {attestations.map((a) => (
            <div key={a.id} className="glass-soft flex items-center gap-3 rounded-2xl px-4 py-3">
              {a.status === "valid" ? (
                <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <TriangleAlert className="h-4 w-4 shrink-0 text-gold" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{a.fio_handle}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {a.chain_code}/{a.token_code} ·{" "}
                  {a.resolved_address ? shortHash(a.resolved_address) : "unmapped"}
                  {a.previous_address ? ` · was ${shortHash(a.previous_address)}` : ""}
                </p>
              </div>
              <Chip tone={a.status === "valid" ? "primary" : "gold"}>
                {a.status === "valid" ? "attested" : a.status === "changed" ? "updated" : "expired"}
              </Chip>
              <button
                onClick={() => remove.mutate(a.id)}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label={`Remove ${a.fio_handle}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}

function IdentityBody() {
  const { data: handle } = useMyHandle();
  const { data: wallets = [] } = useWallets(handle?.id);
  const updateHandle = useUpdateHandle();
  const award = useAwardXp();
  const [burst, setBurst] = useState(0);
  const [xp, setXp] = useState<{ label: string; amount: number } | null>(null);

  const celebrate = (label: string, amount: number, quest?: string) => {
    setBurst((n) => n + 1);
    setXp({ label, amount });
    setTimeout(() => setXp(null), 2400);
    award.mutate(quest ? { amount, quest } : { amount });
  };

  const verified = wallets.filter((w) => w.verified).length;

  return (
    <div className="space-y-5">
      <Celebrate trigger={burst} />
      <XpToast label={xp?.label ?? ""} amount={xp?.amount ?? 0} show={Boolean(xp)} />

      <PageHeader
        eyebrow="Identity"
        title={handle ? `@${handle.handle}` : "Claim your founder identity"}
        description="One handle, three wallets, one public record. FIO-ready so your handle travels with you."
        actions={
          <Chip tone={verified > 0 ? "primary" : "gold"}>
            <ShieldCheck className="h-3 w-3" /> {verified}/3 verified
          </Chip>
        }
      />

      {!handle ? (
        <ClaimCard onDone={() => celebrate("Handle claimed", 150, "identity:handle")} />
      ) : (
        <>
          <Panel label="Public profile" glow>
            <div className="flex flex-wrap items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-3xl bg-primary/12 text-2xl">
                {handle.avatar}
              </span>
              <div className="min-w-[220px] flex-1">
                <p className="text-lg font-semibold tracking-tight">{handle.display_name}</p>
                <p className="text-[12.5px] text-muted-foreground">
                  {handle.bio ?? "Add a line about what you are building."}
                </p>
              </div>
              <button
                onClick={() => updateHandle.mutate({ id: handle.id, is_public: !handle.is_public })}
                className={cn(
                  "rounded-2xl px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-opacity hover:opacity-85",
                  handle.is_public
                    ? "bg-primary/14 text-primary"
                    : "bg-foreground/8 text-muted-foreground",
                )}
              >
                {handle.is_public ? "Public" : "Private"}
              </button>
              <a
                href={`/u/${handle.handle}`}
                className="rounded-2xl bg-foreground/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
              >
                View profile
              </a>
            </div>
          </Panel>

          <SmartWalletPanel
            handleId={handle.id}
            onProvisioned={() => celebrate("Smart wallet live", 200, "identity:smart")}
          />

          <Panel label="Wallet slots" delay={0.05}>
            <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
              Bind up to three wallets and prove each external one with a signature. Verified wallets
              are the ones that receive contest payouts and, at phase three, on-chain settlement.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {[1, 2, 3].map((slot) => (
                <WalletSlot
                  key={slot}
                  slot={slot}
                  handleId={handle.id}
                  wallet={wallets.find((w) => w.slot === slot)}
                  onVerified={() => celebrate("Wallet verified", 200, "identity:wallet")}
                />
              ))}
            </div>
          </Panel>

          <SessionKeysPanel walletId={wallets.find((w) => w.slot === 1)?.id ?? null} />

          <OkxRailsPanel />

          <FioPanel
            handleId={handle.id}
            wallets={wallets}
            onAttested={() => celebrate("FIO handle attested", 175, "identity:fio")}
          />
        </>
      )}
    </div>
  );
}

function OkxRailsPanel() {
  const status = useQuery({
    queryKey: ["okx-status"],
    queryFn: () => getOkxStatus(),
    staleTime: 60_000,
  });
  const s = status.data as
    | {
        configured?: boolean;
        builderCode?: boolean;
        label?: string;
        network?: string;
      }
    | undefined;
  return (
    <Panel label="DEX rails · OKX" delay={0.08}>
      <p className="mb-3 text-[13px] leading-relaxed text-muted-foreground">
        OKX powers agent swap quotes and builder attribution on the server. Members never install an
        OKX wallet — your Alchemy Light Account remains the treasury.
      </p>
      <div className="flex flex-wrap gap-2">
        <Chip tone={s?.configured ? "primary" : "neutral"}>
          {s?.configured ? "API connected" : "Not configured"}
        </Chip>
        <Chip tone={s?.builderCode ? "primary" : "neutral"}>
          {s?.builderCode ? "Builder code set" : "No builder code"}
        </Chip>
        <Chip tone="neutral">{s?.label ?? s?.network ?? "…"}</Chip>
      </div>
    </Panel>
  );
}
