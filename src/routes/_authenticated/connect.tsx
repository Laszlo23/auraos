import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Link2, Loader2, Mail, Plug, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Celebrate, XpToast } from "@/components/aura/celebrate";
import { Chip, Meter, PageHeader, Panel, Pulse } from "@/components/aura/primitives";
import { useAwardXp } from "@/hooks/use-progress";
import {
  useChannels,
  useConnectChannel,
  useDisconnectChannel,
  useSocialStatus,
  SOCIALS,
} from "@/hooks/use-connections";
import {
  useConnectMailbox,
  useConnectSmtp,
  useDisconnectMailbox,
  useMailboxes,
  useSendSmtpTest,
  useSmtpSettings,
} from "@/hooks/use-mailbox";
import { useMyHandle, useBindWallet, useVerifyWallet } from "@/hooks/use-identity";
import { useSubscription, useUpdateSubscription } from "@/hooks/use-tokens";
import type { MailboxProvider } from "@/lib/mailbox.functions";
import { shortHash } from "@/lib/subscription";
import { cn } from "@/lib/utils";
import { resolveNetwork } from "@/lib/chain-config";

export const Route = createFileRoute("/_authenticated/connect")({
  head: () => ({
    meta: [
      { title: "Connect — one screen to wire up your AI company | Aura OS" },
      {
        name: "description",
        content:
          "Connect X, Meta, LinkedIn, TikTok, Farcaster, your mailbox and your wallet in one pass. Your agents take it from there.",
      },
      { property: "og:title", content: "Connect — wire up your AI company in one screen" },
      {
        property: "og:description",
        content: "Socials, mailbox and wallet — connected in under a minute.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConnectPage,
});

const OAUTH_MAILBOXES: {
  id: Exclude<MailboxProvider, "smtp">;
  name: string;
  blurb: string;
}[] = [
  {
    id: "google_mail",
    name: "Gmail",
    blurb:
      "Company outbound uses your Gmail. Agents draft; you approve every send. Replies stay in your inbox.",
  },
  {
    id: "microsoft_outlook",
    name: "Outlook",
    blurb:
      "Company outbound uses your Outlook. Agents draft; you approve every send. Replies stay in your inbox.",
  },
];

function Row({
  glyph,
  title,
  blurb,
  status,
  children,
}: {
  glyph: React.ReactNode;
  title: string;
  blurb: string;
  status: "connected" | "idle" | "soon";
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-border/40 px-5 py-4 last:border-0">
      <span
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-base font-semibold",
          status === "connected"
            ? "bg-primary/14 text-primary"
            : "bg-foreground/6 text-muted-foreground",
        )}
      >
        {glyph}
      </span>
      <div className="min-w-[180px] flex-1">
        <p className="flex items-center gap-2 text-sm font-semibold">
          {title}
          {status === "connected" ? <Pulse /> : null}
        </p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{blurb}</p>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function Action({
  onClick,
  loading,
  tone = "primary",
  children,
}: {
  onClick: () => void;
  loading?: boolean;
  tone?: "primary" | "ghost";
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-opacity hover:opacity-90 disabled:opacity-50",
        tone === "primary"
          ? "bg-primary text-primary-foreground"
          : "bg-foreground/8 text-muted-foreground",
      )}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {children}
    </button>
  );
}

function ConnectPage() {
  const { data: channels = [] } = useChannels();
  const { data: socialStatus = [] } = useSocialStatus();
  const connectChannel = useConnectChannel();
  const disconnectChannel = useDisconnectChannel();
  const { data: mailboxes = [] } = useMailboxes();
  const connectMailbox = useConnectMailbox();
  const connectSmtp = useConnectSmtp();
  const sendSmtpTest = useSendSmtpTest();
  const disconnectMailbox = useDisconnectMailbox();
  const { data: smtpSaved } = useSmtpSettings();
  const { data: sub } = useSubscription();
  const updateSub = useUpdateSubscription();
  const { data: handle } = useMyHandle();
  const bindWallet = useBindWallet();
  const verifyWallet = useVerifyWallet();
  const award = useAwardXp();

  const [pending, setPending] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const [xp, setXp] = useState<{ label: string; amount: number } | null>(null);
  const [smtpOpen, setSmtpOpen] = useState(false);
  const [smtpForm, setSmtpForm] = useState({
    host: "",
    port: "587",
    secure: false,
    username: "",
    password: "",
    from_name: "",
    from_email: "",
  });
  const [aiHealth, setAiHealth] = useState<{
    ok: boolean;
    providers: string[];
    primary: string | null;
  } | null>(null);

  useEffect(() => {
    if (!smtpSaved) return;
    setSmtpForm((f) => ({
      ...f,
      host: smtpSaved.host,
      port: String(smtpSaved.port),
      secure: smtpSaved.secure,
      username: smtpSaved.username,
      from_name: smtpSaved.from_name,
      from_email: smtpSaved.from_email,
      // Never echo the stored password into the form.
      password: "",
    }));
  }, [smtpSaved]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/public/ai-health")
      .then((r) => r.json())
      .then((body: { ok?: boolean; providers?: string[]; primary?: string | null }) => {
        if (cancelled) return;
        setAiHealth({
          ok: Boolean(body.ok),
          providers: Array.isArray(body.providers) ? body.providers : [],
          primary: body.primary ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) setAiHealth({ ok: false, providers: [], primary: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const celebrate = (label: string, amount: number, quest?: string) => {
    setBurst((n) => n + 1);
    setXp({ label, amount });
    setTimeout(() => setXp(null), 2400);
    award.mutate(quest ? { amount, quest } : { amount });
  };

  const byProvider = new Map(channels.map((c) => [c.provider, c]));
  const statusByProvider = new Map(socialStatus.map((s) => [s.provider, s]));
  const mailboxConnected = mailboxes.some((m) => m.connected);
  const socialsLive = SOCIALS.filter((s) => byProvider.get(s.id)?.status === "connected").length;
  const steps = [socialsLive > 0, mailboxConnected, Boolean(sub?.wallet_address)];
  const done = steps.filter(Boolean).length;

  async function onConnectSocial(id: (typeof SOCIALS)[number]["id"], name: string) {
    setPending(id);
    try {
      await connectChannel.mutateAsync(id);
      // X OAuth uses a popup — same as mailbox.
      celebrate(`${name} connected`, 150, `channel:${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `${name} could not be connected.`);
    } finally {
      setPending(null);
    }
  }

  async function onConnectMailbox(id: Exclude<MailboxProvider, "smtp">, name: string) {
    setPending(id);
    try {
      await connectMailbox.mutateAsync(id);
      celebrate(`${name} connected`, 200, `mailbox:${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mailbox connection failed.");
    } finally {
      setPending(null);
    }
  }

  async function onSaveSmtp() {
    setPending("smtp");
    try {
      await connectSmtp.mutateAsync({
        host: smtpForm.host,
        port: Number(smtpForm.port),
        secure: smtpForm.secure,
        username: smtpForm.username,
        password: smtpForm.password,
        from_name: smtpForm.from_name,
        from_email: smtpForm.from_email,
      });
      setSmtpForm((f) => ({ ...f, password: "" }));
      setSmtpOpen(false);
      celebrate("SMTP saved", 200, "mailbox:smtp");
      toast.success(`Saved ${smtpForm.from_email.trim() || "SMTP"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "SMTP connection failed.");
    } finally {
      setPending(null);
    }
  }

  async function onSmtpTest() {
    try {
      const res = await sendSmtpTest.mutateAsync();
      toast.success(`Test sent to ${res.to}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "SMTP test failed.");
    }
  }

  async function onConnectWallet() {
    setPending("wallet");
    try {
      if (!handle?.id) {
        toast.error("Claim your @handle under Identity before linking a wallet.");
        return;
      }
      const eth = (
        window as unknown as {
          ethereum?: {
            request: (a: { method: string; params?: unknown[] }) => Promise<string | string[]>;
          };
        }
      ).ethereum;
      if (!eth) {
        toast.error("Install a browser wallet (e.g. MetaMask) or bind one under Identity.");
        return;
      }
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      const address = accounts[0];
      if (!address) throw new Error("No account");

      const chain = resolveNetwork(
        (import.meta.env["VITE_CHAIN_NETWORK"] as string | undefined) ?? "base-sepolia",
      );

      // Bind to Identity slot 2 (rewards) then require EIP-191 proof before storing on subscription.
      const binding = await bindWallet.mutateAsync({
        handleId: handle.id,
        slot: 2,
        role: "rewards",
        address,
        chain,
      });
      await verifyWallet.mutateAsync(binding);
      await updateSub.mutateAsync({ wallet_address: address });
      celebrate("Wallet verified", 250, "wallet:link");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Wallet connection was rejected.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-5">
      <Celebrate trigger={burst} />
      <XpToast label={xp?.label ?? ""} amount={xp?.amount ?? 0} show={Boolean(xp)} />

      <PageHeader
        eyebrow="Setup"
        title="Connect everything once"
        description="Three taps: socials, your mailbox (agents need it for outreach), and wallet. Sends stay founder-approved."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={aiHealth?.ok ? "primary" : "gold"}>
              <Pulse />{" "}
              {aiHealth == null
                ? "AI…"
                : aiHealth.ok
                  ? `AI · ${aiHealth.primary ?? "ready"}`
                  : "AI offline"}
            </Chip>
            <Chip tone={done === 3 ? "primary" : "gold"}>
              <Plug className="h-3 w-3" /> {done}/3 wired
            </Chip>
          </div>
        }
      />

      <Panel label="Setup progress" glow>
        <Meter value={(done / 3) * 100} tone={done === 3 ? "primary" : "gold"} />
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {[
            { label: "Social reach", ok: steps[0] },
            { label: "Own mailbox", ok: steps[1] },
            { label: "Token wallet", ok: steps[2] },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2 text-[12px]">
              <span
                className={cn(
                  "grid h-5 w-5 place-items-center rounded-full",
                  s.ok ? "bg-primary/15 text-primary" : "bg-foreground/8 text-muted-foreground",
                )}
              >
                <Check className="h-3 w-3" />
              </span>
              <span className={s.ok ? "text-foreground" : "text-muted-foreground"}>{s.label}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel label="Social channels" bodyClassName="p-0" delay={0.05}>
        {SOCIALS.map((s) => {
          const channel = byProvider.get(s.id);
          const oauth = statusByProvider.get(s.id);
          const live = channel?.status === "connected" || oauth?.connected;
          const available = oauth?.available ?? s.id === "x";
          return (
            <Row
              key={s.id}
              glyph={s.glyph}
              title={s.name}
              blurb={
                live
                  ? `${channel?.handle ?? oauth?.handle ?? "Connected"} · operated by ${channel?.agent_name ?? oauth?.agent_name ?? s.agent}`
                  : available
                    ? s.blurb
                    : "OAuth credentials not configured in this environment."
              }
              status={live ? "connected" : available ? "idle" : "soon"}
            >
              {live ? (
                <div className="flex flex-wrap items-center gap-2">
                  {s.id === "x" ? (
                    <Link
                      to="/channels"
                      className="rounded-2xl bg-primary/14 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary transition-opacity hover:opacity-80"
                    >
                      Open Channels → drip
                    </Link>
                  ) : null}
                  <Action tone="ghost" onClick={() => disconnectChannel.mutate(s.id)}>
                    Disconnect
                  </Action>
                </div>
              ) : available ? (
                <Action
                  loading={pending === s.id}
                  onClick={() => void onConnectSocial(s.id, s.name)}
                >
                  <Link2 className="h-3.5 w-3.5" /> Connect
                </Action>
              ) : (
                <Chip>Soon</Chip>
              )}
            </Row>
          );
        })}
        {byProvider.get("x")?.status === "connected" || statusByProvider.get("x")?.connected ? (
          <div className="border-t border-border/40 px-4 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
            X is linked. Next:{" "}
            <Link to="/channels" className="font-semibold text-primary hover:underline">
              Channels
            </Link>{" "}
            → turn on Autopublish → start fair-launch drip.
          </div>
        ) : null}
      </Panel>

      <Panel label="Mailbox" bodyClassName="p-0" delay={0.1}>
        {OAUTH_MAILBOXES.map((m) => {
          const state = mailboxes.find((x) => x.provider === m.id);
          const status = state?.connected ? "connected" : state?.available ? "idle" : "soon";
          return (
            <Row
              key={m.id}
              glyph={<Mail className="h-4 w-4" />}
              title={m.name}
              blurb={
                state?.connected
                  ? (state.account ?? "Connected")
                  : state?.available
                    ? m.blurb
                    : "Connector API key missing in env — configure to enable."
              }
              status={status}
            >
              {state?.connected ? (
                <Action tone="ghost" onClick={() => disconnectMailbox.mutate(m.id)}>
                  Disconnect
                </Action>
              ) : state?.available ? (
                <Action
                  loading={pending === m.id}
                  onClick={() => void onConnectMailbox(m.id, m.name)}
                >
                  <Link2 className="h-3.5 w-3.5" /> Connect
                </Action>
              ) : (
                <Chip>Soon</Chip>
              )}
            </Row>
          );
        })}
        {(() => {
          const state = mailboxes.find((x) => x.provider === "smtp");
          const status = state?.connected ? "connected" : "idle";
          const savedLabel =
            state?.account ?? smtpSaved?.from_email ?? null;
          return (
            <div className="border-b border-border/40 last:border-0">
              <Row
                glyph={<Mail className="h-4 w-4" />}
                title="SMTP"
                blurb={
                  state?.connected
                    ? `Saved as ${savedLabel ?? "mailbox"} — host ${smtpSaved?.host ?? "stored"}. Edit anytime; leave password blank to keep it.`
                    : "Any mailbox via host, port, username, and password. Prefer custom-domain SMTP (Zoho, Migadu, Namecheap). Gmail/Microsoft usually need an app password."
                }
                status={status}
              >
                {state?.connected ? (
                  <>
                    <Action
                      tone="ghost"
                      loading={sendSmtpTest.isPending}
                      onClick={() => void onSmtpTest()}
                    >
                      Test send
                    </Action>
                    <Action tone="ghost" onClick={() => setSmtpOpen((o) => !o)}>
                      {smtpOpen ? "Close" : "Edit"}
                    </Action>
                    <Action tone="ghost" onClick={() => disconnectMailbox.mutate("smtp")}>
                      Disconnect
                    </Action>
                  </>
                ) : (
                  <Action onClick={() => setSmtpOpen((o) => !o)}>
                    <Link2 className="h-3.5 w-3.5" /> {smtpOpen ? "Close" : "Connect"}
                  </Action>
                )}
              </Row>
              {smtpOpen ? (
                <div className="grid gap-3 border-t border-border/40 px-5 py-4 sm:grid-cols-2">
                  {(
                    [
                      ["host", "Host", "smtp.example.com"],
                      ["port", "Port", "587"],
                      ["username", "Username", "you@example.com"],
                      [
                        "password",
                        state?.connected ? "Password (blank = keep)" : "Password",
                        "••••••••",
                      ],
                      ["from_email", "From email", "you@example.com"],
                      ["from_name", "From name", "Your Company"],
                    ] as const
                  ).map(([key, label, placeholder]) => (
                    <label key={key} className="block text-[11px] text-muted-foreground">
                      {label}
                      <input
                        type={key === "password" ? "password" : "text"}
                        value={smtpForm[key]}
                        placeholder={placeholder}
                        autoComplete={key === "password" ? "new-password" : "off"}
                        onChange={(e) =>
                          setSmtpForm((f) => ({ ...f, [key]: e.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                      />
                    </label>
                  ))}
                  <label className="flex items-center gap-2 text-[12px] text-muted-foreground sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={smtpForm.secure}
                      onChange={(e) =>
                        setSmtpForm((f) => ({ ...f, secure: e.target.checked }))
                      }
                    />
                    Use TLS (secure) — usually on for port 465
                  </label>
                  <div className="sm:col-span-2">
                    <Action loading={pending === "smtp"} onClick={() => void onSaveSmtp()}>
                      Save SMTP
                    </Action>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })()}
      </Panel>

      <Panel label="Token wallet" delay={0.15}>
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gold/14 text-gold">
            <Wallet className="h-4 w-4" />
          </span>
          <div className="min-w-[220px] flex-1">
            <p className="text-sm font-semibold">
              {sub?.wallet_address ? shortHash(sub.wallet_address) : "Reserve your wallet"}
            </p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
              Link an external wallet and prove ownership with a signature. Billing stays off-chain
              (AURA credits); this locks your founder conversion rate for on-chain settlement.
            </p>
          </div>
          {sub?.wallet_address ? (
            <Link
              to="/billing"
              className="rounded-2xl bg-foreground/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Manage subscription
            </Link>
          ) : (
            <Action loading={pending === "wallet"} onClick={() => void onConnectWallet()}>
              <Wallet className="h-3.5 w-3.5" /> Link wallet
            </Action>
          )}
        </div>
      </Panel>
    </div>
  );
}
