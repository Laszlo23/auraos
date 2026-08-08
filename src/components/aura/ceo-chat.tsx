import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowUp, Square } from "lucide-react";

import { Pulse } from "@/components/aura/primitives";
import { useCompany, useCompanyTable } from "@/hooks/use-aura";
import { supabase } from "@/integrations/supabase/client";
import { currency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };
type Agent = {
  id: string;
  name: string;
  role: string;
  current_task: string;
  memory: string | null;
  tasks_completed?: number;
};
type Insight = { id: string; kind: string; title: string; body: string; impact: string | null };
type Knowledge = { id: string; title: string; summary: string | null };

export const CEO_PROMPTS = [
  "What should we do this week?",
  "Propose three tasks I can approve",
  "How do we get our first paying customer?",
  "Brief me on what the agents remember",
];

export function CeoChat({ variant = "full" }: { variant?: "full" | "rail" }) {
  const rail = variant === "rail";
  const { data: company } = useCompany();
  const { data: agents = [] } = useCompanyTable<Agent>("agents", { orderBy: "created_at" });
  const { data: insights = [] } = useCompanyTable<Insight>("insights");
  const { data: knowledge = [] } = useCompanyTable<Knowledge>("knowledge_items", {
    orderBy: "created_at",
    ascending: false,
    limit: 12,
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const conversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!company?.id) return;
    let cancelled = false;
    setLoadingHistory(true);

    void (async () => {
      let conversationId: string | null = null;
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("company_id", company.id)
        .eq("title", "Atlas")
        .maybeSingle();

      if (existing?.id) {
        conversationId = existing.id;
      } else {
        const { data: created, error } = await supabase
          .from("conversations")
          .insert({ company_id: company.id, title: "Atlas" })
          .select("id")
          .single();
        if (error || !created) {
          if (!cancelled) setLoadingHistory(false);
          return;
        }
        conversationId = created.id;
      }

      if (cancelled || !conversationId) return;
      conversationIdRef.current = conversationId;

      const { data: rows } = await supabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (cancelled) return;
      setMessages(
        (rows ?? [])
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role as Message["role"], content: m.content })),
      );
      setLoadingHistory(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [company?.id]);

  async function persistMessage(role: Message["role"], content: string) {
    const conversationId = conversationIdRef.current;
    if (!conversationId || !content.trim()) return;
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role,
      content,
    });
  }

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt || streaming || loadingHistory) return;
    const next: Message[] = [...messages, { role: "user", content: prompt }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    void persistMessage("user", prompt);

    const context = [
      `Company: ${company?.name} — ${company?.tagline ?? "no tagline yet"}`,
      `MRR ${
        (company?.mrr ?? 0) > 0 ? currency(company?.mrr ?? 0) : "none yet (ledger only)"
      }, runway ${
        (company?.runway_days ?? 0) > 0 ? `${company?.runway_days} days` : "not modeled"
      }, autonomy ${company?.autonomy ?? 0} (0=ask first).`,
      `Strategy: ${company?.strategy ?? "Not set — help the founder define an offer."}`,
      `Agents: ${agents
        .map(
          (a) =>
            `${a.name} (${a.role}) tasks=${a.tasks_completed ?? 0} — ${a.current_task || "idle"}; memory: ${(a.memory ?? "").slice(0, 280)}`,
        )
        .join(" | ")}`,
      `Knowledge: ${
        knowledge.length
          ? knowledge.map((k) => `${k.title}: ${(k.summary ?? "").slice(0, 160)}`).join("; ")
          : "Empty — nothing learned yet."
      }`,
      `Open insights: ${
        insights.length
          ? insights.map((i) => `${i.title}${i.impact ? ` [${i.impact}]` : ""}`).join("; ")
          : "None."
      }`,
      `Important: do not invent revenue, customers, or follower counts. Prefer proposing concrete tasks the founder can approve.`,
    ].join("\n");

    const controller = new AbortController();
    abortRef.current = controller;

    let assistantContent = "";
    try {
      const res = await fetch("/api/ceo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        throw new Error(
          res.status === 429
            ? "Atlas is thinking too fast — rate limit reached. Try again shortly."
            : res.status === 402
              ? "Your AI credits are exhausted. Top up to keep Atlas working."
              : detail.includes("not configured") ||
                  detail.includes("GEMINI_API_KEY") ||
                  detail.includes("XAI_API_KEY") ||
                  detail.includes("provider key")
                ? "Atlas is offline: add GEMINI_API_KEY or XAI_API_KEY (Grok credits) to .env.local, then restart the dev server."
                : detail || "Atlas could not respond.",
        );
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: acc }]);
      }
      if (!acc.trim()) {
        assistantContent = "I considered it and have nothing to add yet.";
        setMessages([...next, { role: "assistant", content: assistantContent }]);
      } else {
        assistantContent = acc;
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      assistantContent = (err as Error).message;
      setMessages([...next, { role: "assistant", content: assistantContent }]);
    } finally {
      setStreaming(false);
      abortRef.current = null;
      if (assistantContent) {
        void persistMessage("assistant", assistantContent);
      }
    }
  }

  const empty = messages.length === 0 && !loadingHistory;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!rail && (
        <header className="mb-8 flex items-center gap-4">
          <motion.span
            animate={{ scale: streaming ? [1, 1.08, 1] : 1 }}
            transition={{ duration: 2, repeat: streaming ? Infinity : 0 }}
            className="grid h-14 w-14 place-items-center rounded-3xl bg-primary/15 text-2xl text-primary shadow-[var(--shadow-glow)]"
          >
            ◎
          </motion.span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Atlas</h1>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Pulse /> {streaming ? "thinking" : "chief executive · always awake"}
            </p>
          </div>
        </header>
      )}

      <div
        ref={boxRef}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto pr-1",
          rail ? "space-y-4 pb-4" : "space-y-7 pb-6",
        )}
      >
        {empty && (
          <div className={rail ? "" : "max-w-xl"}>
            <h2
              className={cn(
                "text-gradient font-semibold leading-tight",
                rail ? "text-lg" : "text-4xl",
              )}
            >
              What should the company do next?
            </h2>
            <p
              className={cn(
                "leading-relaxed text-muted-foreground",
                rail ? "mt-2 text-[12px]" : "mt-4 text-sm",
              )}
            >
              Atlas sees your live company, agent memory, and knowledge. Give a direction — agents
              propose work, you approve it.
            </p>
            <div className={cn("flex flex-wrap gap-2", rail ? "mt-4" : "mt-7")}>
              {(rail ? CEO_PROMPTS.slice(0, 3) : CEO_PROMPTS).map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className={cn(
                    "glass-soft rounded-2xl text-left transition-colors hover:border-primary/30 hover:text-primary",
                    rail ? "px-3 py-2 text-[11px]" : "px-4 py-2.5 text-[13px]",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p
                className={cn(
                  "max-w-[85%] rounded-3xl rounded-br-lg bg-primary leading-relaxed text-primary-foreground",
                  rail ? "px-3.5 py-2 text-[12px]" : "px-5 py-3 text-sm",
                )}
              >
                {m.content}
              </p>
            </div>
          ) : (
            <div key={i} className={rail ? "" : "max-w-[85%]"}>
              {m.content ? (
                <p
                  className={cn(
                    "whitespace-pre-wrap leading-relaxed text-foreground/90",
                    rail ? "text-[12.5px]" : "text-[15px]",
                  )}
                >
                  {m.content}
                  {streaming && i === messages.length - 1 ? (
                    <span className="ml-1 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-primary align-middle" />
                  ) : null}
                </p>
              ) : (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Pulse /> Atlas is thinking…
                </p>
              )}
            </div>
          ),
        )}
      </div>

      <div className={cn("rounded-3xl p-2", rail ? "glass-soft" : "glass sticky bottom-4")}>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            rows={1}
            aria-label="Message Atlas"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder="Instruct your CEO…"
            className={cn(
              "max-h-40 flex-1 resize-none bg-transparent outline-none placeholder:text-muted-foreground/70",
              rail ? "min-h-[38px] px-3 py-2 text-[12.5px]" : "min-h-[46px] px-4 py-3 text-sm",
            )}
          />
          {streaming ? (
            <button
              onClick={() => abortRef.current?.abort()}
              className={cn(
                "grid shrink-0 place-items-center rounded-2xl bg-foreground/10",
                rail ? "h-9 w-9" : "h-11 w-11",
              )}
            >
              <Square className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={() => void send(input)}
              disabled={!input.trim()}
              className={cn(
                "grid shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40",
                rail ? "h-9 w-9" : "h-11 w-11",
              )}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
