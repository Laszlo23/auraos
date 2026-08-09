import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  Lock,
  Timer,
} from "lucide-react";

import { LaunchCountdown } from "@/components/aura/launch-countdown";
import { Chip, Panel, Pulse } from "@/components/aura/primitives";
import { SiteFooter } from "@/components/aura/site-footer";
import { supabase } from "@/integrations/supabase/client";
import {
  LAUNCH_SHARE_TEXT,
  OG_IMAGE,
  SITE_URL,
  WHITELIST_REQUIRED_COUNT,
  WHITELIST_TASKS,
  type WhitelistTask,
} from "@/lib/site";
import { trackTeaser, visitorId } from "@/lib/teaser-track";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/access")({
  head: () => ({
    meta: [
      { title: "Earn early access — whitelist tasks | Aura OS" },
      {
        name: "description",
        content:
          "Complete simple Building Culture tasks — follow, engage, join Discord or Telegram — and earn your Aura OS invite code now.",
      },
      { property: "og:title", content: "Earn Aura OS early access" },
      {
        property: "og:description",
        content: "Grow the community. Unlock your invite. Skip the waitlist.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/access` },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/access` }],
  }),
  component: AccessPage,
});

/** Client hold slightly above server min (8s) so confirm rarely races. */
const VISIT_HOLD_MS = 12_000;
const VISIT_MAX_AGE_MS = 2 * 60 * 60 * 1000;

type VisitProof = {
  opened_at?: string | null;
  confirmed_at?: string | null;
};

type Progress = {
  follow_x: boolean;
  follow_farcaster: boolean;
  like_post: boolean;
  comment_post: boolean;
  share_post: boolean;
  chat_channel: "discord" | "telegram" | null;
  invite_code: string | null;
  complete: boolean;
  done_count: number;
  visits: Record<string, VisitProof>;
};

const EMPTY: Progress = {
  follow_x: false,
  follow_farcaster: false,
  like_post: false,
  comment_post: false,
  share_post: false,
  chat_channel: null,
  invite_code: null,
  complete: false,
  done_count: 0,
  visits: {},
};

function parseVisits(raw: unknown): Record<string, VisitProof> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, VisitProof> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== "object") continue;
    const v = val as Record<string, unknown>;
    out[key] = {
      opened_at: typeof v["opened_at"] === "string" ? v["opened_at"] : null,
      confirmed_at: typeof v["confirmed_at"] === "string" ? v["confirmed_at"] : null,
    };
  }
  return out;
}

function parseProgress(raw: unknown): Progress {
  if (!raw || typeof raw !== "object") return EMPTY;
  const o = raw as Record<string, unknown>;
  const chatRaw = o["chat_channel"];
  const chat = chatRaw === "discord" || chatRaw === "telegram" ? chatRaw : null;
  return {
    follow_x: Boolean(o["follow_x"]),
    follow_farcaster: Boolean(o["follow_farcaster"]),
    like_post: Boolean(o["like_post"]),
    comment_post: Boolean(o["comment_post"]),
    share_post: Boolean(o["share_post"]),
    chat_channel: chat,
    invite_code: typeof o["invite_code"] === "string" ? o["invite_code"] : null,
    complete: Boolean(o["complete"]),
    done_count: typeof o["done_count"] === "number" ? o["done_count"] : 0,
    visits: parseVisits(o["visits"]),
  };
}

function isDone(task: WhitelistTask, p: Progress): boolean {
  if (task.group === "chat_or") {
    return p.chat_channel === task.id;
  }
  switch (task.id) {
    case "follow_x":
      return p.follow_x;
    case "follow_farcaster":
      return p.follow_farcaster;
    case "like_post":
      return p.like_post;
    case "comment_post":
      return p.comment_post;
    case "share_post":
      return p.share_post;
    case "discord":
    case "telegram":
      return false;
    default: {
      const _exhaustive: never = task.id;
      return _exhaustive;
    }
  }
}

function visitKey(task: WhitelistTask): string {
  return task.id;
}

function formatProofTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function AccessPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [progress, setProgress] = useState<Progress>(EMPTY);
  const [busyTask, setBusyTask] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [copied, setCopied] = useState(false);
  /** Tasks where the user left this tab after opening the link. */
  const [returned, setReturned] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState(() => Date.now());
  const [pendingOpen, setPendingOpen] = useState<string | null>(null);

  const required = useMemo(() => WHITELIST_TASKS.filter((t) => t.group === "required"), []);
  const chatTasks = useMemo(() => WHITELIST_TASKS.filter((t) => t.group === "chat_or"), []);

  const load = useCallback(async (em: string) => {
    const value = em.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) return;
    const { data, error } = await supabase.rpc("get_whitelist_progress", {
      _email: value,
      _visitor_id: visitorId(),
    });
    if (error) {
      console.warn("get_whitelist_progress", error.message);
      return;
    }
    setProgress(parseProgress(data));
  }, []);

  useEffect(() => {
    trackTeaser("landing_view", { placement: "access" });
    const saved = window.localStorage.getItem("aura.whitelist.email");
    if (saved) {
      setEmail(saved);
      void load(saved);
    }
    try {
      const raw = window.localStorage.getItem("aura.whitelist.returned");
      if (raw) setReturned(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore */
    }
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  // After Open, require the tab to go hidden then visible again (user left & came back).
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible" || !pendingOpen) return;
      setReturned((prev) => {
        const next = { ...prev, [pendingOpen]: true };
        try {
          window.localStorage.setItem("aura.whitelist.returned", JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
      setPendingOpen(null);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [pendingOpen]);

  const rememberEmail = (value: string) => {
    setEmail(value);
    const trimmed = value.trim().toLowerCase();
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      window.localStorage.setItem("aura.whitelist.email", trimmed);
    }
  };

  const ensureEmail = () => {
    const value = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) || value.length > 255) {
      toast.error("Enter a valid email so we can save your invite.");
      return null;
    }
    window.localStorage.setItem("aura.whitelist.email", value);
    return value;
  };

  const openTask = async (task: WhitelistTask) => {
    const em = ensureEmail();
    if (!em) return;

    setBusyTask(`open:${task.id}`);
    const { data, error } = await supabase.rpc("mark_whitelist_visit", {
      _email: em,
      _visitor_id: visitorId(),
      _task: visitKey(task),
    });
    setBusyTask(null);

    if (error) {
      toast.error(
        error.message.includes("invalid_email") ? "Invalid email." : "Could not record visit.",
      );
      return;
    }

    setProgress(parseProgress(data));
    setPendingOpen(task.id);
    setReturned((prev) => {
      const next = { ...prev, [task.id]: false };
      try {
        window.localStorage.setItem("aura.whitelist.returned", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

    trackTeaser("social_join", { placement: `access_open_${task.id}`.slice(0, 40) });
    window.open(task.href, "_blank", "noopener,noreferrer");
    toast.message("Do the action on the other tab, then come back to confirm.");
  };

  const confirmTask = async (task: WhitelistTask) => {
    const em = ensureEmail();
    if (!em) return;

    const key = visitKey(task);
    const visit = progress.visits[key];
    const openedMs = visit?.opened_at ? Date.parse(visit.opened_at) : NaN;
    if (!Number.isFinite(openedMs)) {
      toast.error("Open the link first — we need visit proof.");
      return;
    }
    if (now - openedMs < VISIT_HOLD_MS) {
      toast.error("Spend a few seconds on the link, then confirm.");
      return;
    }
    if (now - openedMs > VISIT_MAX_AGE_MS) {
      toast.error("That visit expired — open the link again.");
      return;
    }
    if (!returned[task.id] && !visit?.confirmed_at) {
      toast.error("Come back from the other tab first, then confirm.");
      return;
    }

    setBusyTask(task.id);
    const args =
      task.group === "chat_or"
        ? {
            _email: em,
            _visitor_id: visitorId(),
            _task: "chat",
            _chat_channel: task.id as "discord" | "telegram",
          }
        : {
            _email: em,
            _visitor_id: visitorId(),
            _task: task.id,
            _chat_channel: null as string | null,
          };
    const { data, error } = await supabase.rpc("upsert_whitelist_task", args);
    setBusyTask(null);
    if (error) {
      const msg = error.message || "";
      if (msg.includes("visit_required")) {
        toast.error("Open the link first — confirm stays locked until then.");
      } else if (msg.includes("visit_too_soon")) {
        toast.error("Too fast — finish the action, wait a moment, then confirm.");
      } else if (msg.includes("visit_expired")) {
        toast.error("Visit expired — open the link again.");
      } else if (msg.includes("visitor_mismatch")) {
        toast.error("Use the same browser that earned this invite.");
      } else if (msg.includes("invalid_email")) {
        toast.error("Invalid email.");
      } else {
        toast.error("Could not save that task.");
      }
      return;
    }
    trackTeaser("social_join", { placement: `access_${task.id}`.slice(0, 40) });
    setProgress(parseProgress(data));
    toast.success("Task confirmed — proof saved");
  };

  const claim = async () => {
    const em = ensureEmail();
    if (!em) return;
    if (!progress.complete && !progress.invite_code) {
      toast.error("Finish every task first — Discord or Telegram counts as one.");
      return;
    }
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_whitelist_invite", {
      _email: em,
      _visitor_id: visitorId(),
    });
    setClaiming(false);
    if (error) {
      const msg = error.message || "";
      toast.error(
        msg.includes("incomplete")
          ? "Tasks incomplete — confirm each step, then claim."
          : msg.includes("visitor_mismatch")
            ? "Use the same browser that earned this invite."
            : "Could not mint invite. Try again.",
      );
      return;
    }
    const result = data as { invite_code?: string; already?: boolean } | null;
    const code = result?.invite_code;
    if (!code) {
      toast.error("No invite returned.");
      return;
    }
    trackTeaser("cta_click", { placement: "access_claim" });
    setProgress((p) => ({ ...p, invite_code: code, complete: true }));
    toast.success(result?.already ? "Invite restored" : "Invite unlocked");
  };

  const copyCode = async () => {
    if (!progress.invite_code) return;
    try {
      await navigator.clipboard.writeText(progress.invite_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      toast.success("Invite copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const enterWithCode = () => {
    if (!progress.invite_code) return;
    trackTeaser("cta_click", { placement: "access_enter" });
    navigate({ to: "/auth", search: { invite: progress.invite_code } });
  };

  const TaskRow = ({ task }: { task: WhitelistTask }) => {
    const done = isDone(task, progress);
    const chatAltDone =
      task.group === "chat_or" &&
      progress.chat_channel !== null &&
      progress.chat_channel !== task.id;
    const key = visitKey(task);
    const visit = progress.visits[key];
    const openedMs = visit?.opened_at ? Date.parse(visit.opened_at) : NaN;
    const hasVisit = Number.isFinite(openedMs);
    const age = hasVisit ? now - openedMs : 0;
    const holdLeft = hasVisit ? Math.max(0, VISIT_HOLD_MS - age) : VISIT_HOLD_MS;
    const visitFresh = hasVisit && age <= VISIT_MAX_AGE_MS;
    const cameBack = Boolean(returned[task.id]) || Boolean(visit?.confirmed_at);
    const canConfirm =
      !done &&
      !progress.invite_code &&
      !chatAltDone &&
      visitFresh &&
      holdLeft === 0 &&
      cameBack;

    let statusLabel = "1 · Open the link";
    if (done) statusLabel = "Confirmed";
    else if (!hasVisit || !visitFresh) statusLabel = "1 · Open the link";
    else if (!cameBack) statusLabel = "2 · Finish action · return here";
    else if (holdLeft > 0) statusLabel = `2 · Wait ${Math.ceil(holdLeft / 1000)}s`;
    else statusLabel = "3 · Confirm";

    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl px-3.5 py-3.5",
          done ? "bg-primary/10" : chatAltDone ? "bg-foreground/[0.03] opacity-60" : "bg-foreground/5",
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold">{task.label}</p>
            <p className="text-[11px] text-muted-foreground">{task.hint}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em]">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2 py-1",
                  done
                    ? "bg-primary/15 text-primary"
                    : canConfirm
                      ? "bg-gold/15 text-gold"
                      : "bg-foreground/6 text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3 w-3" /> : holdLeft > 0 && hasVisit ? <Timer className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                {statusLabel}
              </span>
              {visit?.opened_at ? (
                <span className="text-muted-foreground/80 normal-case tracking-normal">
                  Opened {formatProofTime(visit.opened_at)}
                  {visit.confirmed_at ? ` · Confirmed ${formatProofTime(visit.confirmed_at)}` : ""}
                </span>
              ) : (
                <span className="text-muted-foreground/70 normal-case tracking-normal">
                  Confirm unlocks after you open & return
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={done || Boolean(progress.invite_code) || chatAltDone || busyTask === `open:${task.id}`}
              onClick={() => void openTask(task)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
            >
              {busyTask === `open:${task.id}` ? (
                "…"
              ) : (
                <>
                  Open <ExternalLink className="h-3 w-3" />
                </>
              )}
            </button>
            <button
              type="button"
              disabled={!canConfirm || busyTask === task.id}
              title={
                !hasVisit
                  ? "Open the link first"
                  : !cameBack
                    ? "Return from the other tab first"
                    : holdLeft > 0
                      ? `Wait ${Math.ceil(holdLeft / 1000)}s`
                      : "Confirm this task"
              }
              onClick={() => void confirmTask(task)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary/14 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {done ? (
                <>
                  <Check className="h-3 w-3" /> Done
                </>
              ) : busyTask === task.id ? (
                "…"
              ) : canConfirm ? (
                "Confirm"
              ) : (
                <>
                  <Lock className="h-3 w-3" /> Confirm
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <header className="border-b border-white/5 bg-background/40 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3.5 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Home
          </Link>
          <Chip className="ml-auto">
            <LaunchCountdown variant="compact" showSocials={false} placement="access" />
          </Chip>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
        <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
          <Pulse /> Whitelist board
        </p>
        <h1 className="font-display text-[clamp(2rem,6vw,3.2rem)] leading-[0.98] tracking-tight">
          Earn your invite.
          <span className="block text-primary">Skip the waitlist.</span>
        </h1>
        <p className="mt-3 text-[12px] font-semibold uppercase tracking-[0.22em] text-gold">
          {WHITELIST_REQUIRED_COUNT} tasks → your invite → Aura OS
        </p>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Own a company staffed by AI employees. For each task: tap Open, do the action in the new
          tab, come back here — Confirm unlocks after a short wait (about 12 seconds) once you
          return.
        </p>

        <Panel label="Your email" className="mt-10" glow>
          <p className="mb-3 text-[12px] text-muted-foreground">
            We bind your invite to this address. Same email always restores the same code.
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => rememberEmail(e.target.value)}
            onBlur={() => void load(email)}
            maxLength={255}
            placeholder="you@company.com"
            aria-label="Email for whitelist invite"
            autoComplete="email"
            className="w-full rounded-2xl bg-foreground/6 px-3.5 py-2.5 text-[13px] outline-none placeholder:text-muted-foreground/60"
          />
        </Panel>

        <div className="mt-8 flex items-baseline justify-between text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          <span>Progress</span>
          <span className="num text-primary">
            {Math.min(progress.done_count, WHITELIST_REQUIRED_COUNT)} / {WHITELIST_REQUIRED_COUNT}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/8">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{
              width: `${Math.min(100, (progress.done_count / WHITELIST_REQUIRED_COUNT) * 100)}%`,
            }}
          />
        </div>

        <section className="mt-8 space-y-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Required · Open → do it → return → Confirm
          </p>
          {required.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </section>

        <section className="mt-8 space-y-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Join one community channel
          </p>
          <p className="text-[12px] text-muted-foreground">Discord or Telegram — pick either.</p>
          {chatTasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </section>

        <Panel label="Your invite" className="mt-10" glow>
          {progress.invite_code ? (
            <div className="space-y-4">
              <p className="text-[12px] text-muted-foreground">
                Ready. Use this code once on signup — it is bound to {email.trim().toLowerCase()}.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-2xl bg-foreground/6 px-3.5 py-3">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  <span className="num text-[15px] font-semibold tracking-[0.12em]">
                    {progress.invite_code}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void copyCode()}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-border/50 px-4 py-3 text-xs font-semibold"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy
                </button>
              </div>
              <button
                type="button"
                onClick={enterWithCode}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground"
              >
                Enter Aura OS <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[12px] text-muted-foreground">
                When all six steps are done, claim a one-use <span className="text-foreground">BETA-</span>{" "}
                invite.
              </p>
              <button
                type="button"
                disabled={!progress.complete || claiming}
                onClick={() => void claim()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
              >
                {claiming ? "Minting…" : "Claim invite"}
              </button>
            </div>
          )}
        </Panel>
      </div>

      <SiteFooter
        share={{
          url: `${SITE_URL}/access`,
          text: LAUNCH_SHARE_TEXT,
          placement: "access_footer",
        }}
      />
    </main>
  );
}
