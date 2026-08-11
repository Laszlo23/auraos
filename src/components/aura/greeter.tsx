import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, MessageCircle, Square, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

import { Pulse } from "@/components/aura/primitives";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { supabase } from "@/integrations/supabase/client";
import { trackTeaser } from "@/lib/teaser-track";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };
type NudgeReason = "hello" | "idle" | "scroll" | "exit";

const OPENING =
  "I'm Aura — the intelligence at the front door. Ask me anything about running a company staffed entirely by AI, or I'll show you around in thirty seconds.";

const PROMPTS = [
  "What is Aura OS, really?",
  "Who are the eight agents?",
  "How does an AI employee actually work?",
  "How do I get a founding seat?",
];

const NUDGE_COPY: Record<NudgeReason, string> = {
  hello: "Your company could be running itself by tonight. Want the thirty-second version?",
  idle: "Still looking? I can point you at the one move that matters — the founding seat.",
  scroll:
    "You scrolled past the story. The short path: claim a $99 seat and Atlas starts work.",
  exit: "Before you go — founding seats are open at $99. I can walk you there in one step.",
};

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const SEEN_KEY = "aura:greeter-seen";
const NUDGE_BUDGET_KEY = "aura:greeter-nudges";

function nudgeBudgetLeft(): number {
  try {
    const n = Number(sessionStorage.getItem(NUDGE_BUDGET_KEY) ?? "0");
    return Math.max(0, 3 - (Number.isFinite(n) ? n : 0));
  } catch {
    return 1;
  }
}

function spendNudgeBudget() {
  try {
    const n = Number(sessionStorage.getItem(NUDGE_BUDGET_KEY) ?? "0");
    sessionStorage.setItem(NUDGE_BUDGET_KEY, String((Number.isFinite(n) ? n : 0) + 1));
  } catch {
    /* ignore */
  }
}

export function Greeter() {
  const navigate = useNavigate();
  const reducedMotion = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [nudgeReason, setNudgeReason] = useState<NudgeReason>("hello");
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: OPENING }]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false });
  const [aiOnline, setAiOnline] = useState<boolean | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const engagedRef = useRef(false);
  const maxScrollRef = useRef(0);
  const lastMoveRef = useRef(Date.now());

  /** Soft cursor follower — presence without noise. Disabled for reduced motion / touch. */
  useEffect(() => {
    if (reducedMotion) return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (!fine) return;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let visible = false;

    const tick = () => {
      curX += (targetX - curX) * 0.18;
      curY += (targetY - curY) * 0.18;
      setCursor({ x: curX, y: curY, visible });
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);

    const onMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      visible = true;
      lastMoveRef.current = Date.now();
    };
    const onLeave = () => {
      visible = false;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [reducedMotion]);

  /** Attention drops → contextual nudge (budgeted, once-ish per signal). */
  useEffect(() => {
    if (open) return;

    const show = (reason: NudgeReason, event: "idle_drop" | "exit_intent" | "scroll_drop") => {
      if (nudgeBudgetLeft() <= 0) return;
      spendNudgeBudget();
      setNudgeReason(reason);
      setNudge(true);
      trackTeaser(event, { placement: "greeter" });
      trackTeaser("attention_nudge", { placement: reason });
    };

    const idleTimer = window.setInterval(() => {
      if (document.hidden || engagedRef.current) return;
      if (Date.now() - lastMoveRef.current < 12_000) return;
      if (nudge) return;
      show("idle", "idle_drop");
    }, 4_000);

    const onScroll = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const pct = Math.round((window.scrollY / max) * 100);
      maxScrollRef.current = Math.max(maxScrollRef.current, pct);
      lastMoveRef.current = Date.now();
      if (pct >= 55 && !engagedRef.current && !nudge && nudgeBudgetLeft() > 0) {
        show("scroll", "scroll_drop");
      }
    };

    const onExit = (e: MouseEvent) => {
      if (e.clientY > 12) return;
      if (engagedRef.current || nudge) return;
      show("exit", "exit_intent");
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mouseout", onExit);
    return () => {
      window.clearInterval(idleTimer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseout", onExit);
    };
  }, [open, nudge]);

  /** Proactive greeting — once per browser, after the hero has had its moment. */
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      /* private mode */
    }
    if (seen) return;
    const t = setTimeout(() => {
      if (nudgeBudgetLeft() <= 0) return;
      setNudgeReason("hello");
      setNudge(true);
    }, 4200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, streaming]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/public/ai-health")
      .then((r) => r.json())
      .then((body: { ok?: boolean }) => {
        if (!cancelled) setAiOnline(Boolean(body.ok));
      })
      .catch(() => {
        if (!cancelled) setAiOnline(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function launch() {
    engagedRef.current = true;
    setNudge(false);
    setOpen(true);
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt || streaming) return;
    engagedRef.current = true;

    // A visitor who types an email is claiming a seat — take it there and then.
    const email = prompt.match(EMAIL_RE)?.[0];
    if (email)
      void supabase
        .from("waitlist_signups")
        .insert({ email })
        .then(() => undefined);

    const next: Message[] = [...messages, { role: "user", content: prompt }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/public/greeter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        const message =
          res.status === 429
            ? "A lot of founders are asking at once. Give me a moment and try again."
            : res.status === 402
              ? "My reserve is empty for the moment — the team has been told."
              : detail.includes("not configured") ||
                  detail.includes("FREELLM") ||
                  detail.includes("GEMINI_API_KEY") ||
                  detail.includes("XAI_API_KEY") ||
                  detail.includes("provider key")
                ? "I'm offline until FreeLLM or a fallback provider key is live on the server."
                : detail || "I lost the connection. Try again?";
        setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: message }]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: acc }]);
      }
      if (!acc.trim()) {
        setMessages((m) => [
          ...m.slice(0, -1),
          { role: "assistant", content: "I went quiet there. Ask me once more." },
        ]);
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setMessages((m) => [
          ...m.slice(0, -1),
          { role: "assistant", content: "Something interrupted us. Try again?" },
        ]);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <>
      {!reducedMotion && cursor.visible ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[45] hidden h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/35 bg-primary/10 mix-blend-screen md:block"
          style={{ left: cursor.x, top: cursor.y }}
        />
      ) : null}

      {/* Launcher */}
      <div className="pointer-events-none fixed bottom-5 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-7 sm:right-7">
        <AnimatePresence>
          {nudge && !open ? (
            <motion.button
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 8, filter: "blur(6px)" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              onClick={launch}
              className="glass pointer-events-auto max-w-[17rem] rounded-2xl px-4 py-3 text-left shadow-[var(--shadow-glow)]"
            >
              <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                <Pulse /> Aura
                {aiOnline === false ? (
                  <span className="normal-case tracking-normal text-gold">· reconnecting</span>
                ) : null}
              </span>
              <span className="mt-1.5 block text-[13px] leading-relaxed text-foreground">
                {NUDGE_COPY[nudgeReason]}
              </span>
            </motion.button>
          ) : null}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => (open ? setOpen(false) : launch())}
          whileTap={{ scale: 0.94 }}
          aria-label={open ? "Close Aura" : "Chat with Aura"}
          className="glass pointer-events-auto relative flex h-13 w-13 items-center justify-center rounded-full p-3.5 shadow-[var(--shadow-glow)]"
        >
          <span className="absolute inset-0 rounded-full bg-primary/10 blur-md" />
          {open ? (
            <X className="relative h-5 w-5 text-foreground" />
          ) : (
            <MessageCircle className="relative h-5 w-5 text-primary" />
          )}
          {!open ? (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
          ) : null}
        </motion.button>
      </div>

      {/* Panel */}
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="glass fixed inset-x-3 bottom-24 z-50 flex max-h-[72vh] flex-col overflow-hidden rounded-3xl shadow-[var(--shadow-glow)] sm:inset-x-auto sm:right-7 sm:bottom-28 sm:h-[30rem] sm:w-[23rem]"
          >
            <div className="flex items-center gap-2.5 border-b border-border/60 px-5 py-3">
              <Pulse />
              <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                Aura · front desk
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="ml-auto text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div ref={boxRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "text-[13px] leading-relaxed",
                    m.role === "user" ? "flex justify-end" : "text-foreground/90",
                  )}
                >
                  {m.role === "user" ? (
                    <span className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-primary-foreground">
                      {m.content}
                    </span>
                  ) : m.content ? (
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  ) : (
                    <span className="text-muted-foreground">Thinking…</span>
                  )}
                </div>
              ))}

              {messages.length <= 1 && !streaming ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => void send(p)}
                      className="rounded-full border border-border/70 px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="border-t border-border/60 px-4 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send(input);
                    }
                  }}
                  placeholder="Ask Aura anything…"
                  className="max-h-24 flex-1 resize-none bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
                />
                {streaming ? (
                  <button
                    onClick={() => abortRef.current?.abort()}
                    aria-label="Stop"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 text-muted-foreground"
                  >
                    <Square className="h-3 w-3" />
                  </button>
                ) : (
                  <button
                    onClick={() => void send(input)}
                    disabled={!input.trim()}
                    aria-label="Send"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  trackTeaser("cta_click", { placement: "greeter_seat" });
                  void navigate({ to: "/access", search: {} });
                }}
                className="mt-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:text-primary"
              >
                Claim founding seat →
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
