/**
 * Atlas proposes real next actions from live company context (AI, not templates).
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AGENT_ROSTER } from "@/lib/agent-roster";
import { aiJson } from "@/lib/ai.server";

export type ProposedAction = {
  title: string;
  description: string;
  agent: string;
  priority: "low" | "medium" | "high" | "critical";
};

type Db = {
  from: (t: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => any;
      order?: (col: string, opts: { ascending: boolean }) => any;
      limit?: (n: number) => any;
      maybeSingle?: () => any;
    };
  };
};

export const proposeNextActionsAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string }) => ({
    companyId: String(input.companyId),
  }))
  .handler(async ({ data, context }) => {
    const db = context.supabase as unknown as Db;

    const { data: company, error: cErr } = await db
      .from("companies")
      .select("id, name, tagline, strategy, mrr, autonomy, owner_id")
      .eq("id", data.companyId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (cErr || !company) throw new Error("Company not found.");

    const [{ data: agents }, { data: tasks }, { data: knowledge }, { data: missions }] =
      await Promise.all([
        db
          .from("agents")
          .select("name, role, current_task, tasks_completed, memory")
          .eq("company_id", company.id),
        db
          .from("tasks")
          .select("title, status, description")
          .eq("company_id", company.id)
          .order("created_at", { ascending: false })
          .limit(20),
        db
          .from("knowledge_items")
          .select("title, summary")
          .eq("company_id", company.id)
          .order("created_at", { ascending: false })
          .limit(8),
        db
          .from("revenue_missions")
          .select("title, status, goal")
          .eq("company_id", company.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

    const roster = Object.keys(AGENT_ROSTER).join(", ");
    const open = ((tasks ?? []) as { status: string; title: string }[]).filter((t) =>
      ["pending_approval", "queued", "running"].includes(t.status),
    );

    const raw = await aiJson(
      `You are Atlas, CEO of an Aura OS company. Propose exactly 3 concrete next tasks for the founder to approve.
Rules:
- Use only facts from company context. Never invent MRR, customers, revenue, or followers.
- Each task must be executable by one agent and produce a real deliverable (brief, research with sources when possible, outreach list, offer definition).
- Prefer research / offer clarity / first customers when the company is empty.
- agent must be one of: ${roster}
- priority: low|medium|high|critical
Return JSON: {"proposals":[{"title":"...","description":"...","agent":"Cass","priority":"high"}]}`,
      [
        `Company: ${company.name} — ${company.tagline ?? "no tagline"}`,
        `Strategy: ${company.strategy ?? "not set"}`,
        `Autonomy: ${company.autonomy ?? 0} (0=ask first)`,
        `Agents: ${
          ((agents ?? []) as { name: string; role: string; tasks_completed?: number; current_task: string }[])
            .map(
              (a) =>
                `${a.name} (${a.role}) tasks=${a.tasks_completed ?? 0} now=${a.current_task}`,
            )
            .join(" | ") || "Atlas only"
        }`,
        `Open tasks: ${open.length ? open.map((t) => `${t.status}:${t.title}`).join("; ") : "none"}`,
        `Recent tasks: ${
          ((tasks ?? []) as { status: string; title: string }[])
            .slice(0, 8)
            .map((t) => `${t.status}:${t.title}`)
            .join("; ") || "none"
        }`,
        `Knowledge: ${
          ((knowledge ?? []) as { title: string }[]).map((k) => k.title).join("; ") || "empty"
        }`,
        `Missions: ${
          ((missions ?? []) as { status: string; title: string }[])
            .map((m) => `${m.status}:${m.title}`)
            .join("; ") || "none"
        }`,
      ].join("\n"),
      "proposals",
    );

    const list = Array.isArray(raw["proposals"]) ? (raw["proposals"] as ProposedAction[]) : [];
    const cleaned: ProposedAction[] = list
      .filter((p) => p && typeof p.title === "string" && p.title.trim())
      .slice(0, 3)
      .map((p) => {
        const agentName =
          typeof p.agent === "string" && AGENT_ROSTER[p.agent] ? p.agent : "Atlas";
        const priority =
          p.priority === "low" ||
          p.priority === "medium" ||
          p.priority === "high" ||
          p.priority === "critical"
            ? p.priority
            : "medium";
        return {
          title: String(p.title).slice(0, 160),
          description: String(p.description ?? "Execute and file a brief for founder review.").slice(
            0,
            1200,
          ),
          agent: agentName,
          priority,
        };
      });

    if (cleaned.length === 0) {
      const name = company.name || "the company";
      return [
        {
          title: `Clarify the offer for ${name}`,
          description:
            "Define what we sell, who buys it, and a first price. File a one-page brief — no invented revenue.",
          agent: "Atlas",
          priority: "high" as const,
        },
        {
          title: `Research the market around ${name}`,
          description:
            "Find 3–5 real competitors or alternatives. Summarize positioning and gaps. Cite sources when search is available.",
          agent: "Cass",
          priority: "high" as const,
        },
        {
          title: "List first outreach targets",
          description:
            "Name 8–12 realistic prospect types we could pitch this week, with why they fit and one angle each.",
          agent: "Juno",
          priority: "medium" as const,
        },
      ] satisfies ProposedAction[];
    }

    return cleaned;
  });
