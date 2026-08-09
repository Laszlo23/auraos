import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useCompany, useCompanyTable } from "@/hooks/use-aura";
import { AGENT_ROSTER } from "@/lib/agent-roster";
import { taskStatusForAutonomy } from "@/lib/company-economy";
import { proposeNextActionsAi } from "@/lib/propose-actions.functions";
import { triggerWorkerTick } from "@/lib/worker.functions";

type AgentRow = { id: string; name: string };

/** Resolve an agent by exact name — never silently fall back to Atlas. */
export function useAgentLookup() {
  const { data: agents = [] } = useCompanyTable<AgentRow>("agents");
  return (name?: string) => {
    if (!agents.length) return null;
    if (!name) return agents.find((a) => a.name === "Atlas")?.id ?? agents[0]!.id;
    const hit = agents.find((a) => a.name.toLowerCase() === name.toLowerCase());
    return hit?.id ?? null;
  };
}

/** Hire a named agent into the company if missing (client-side). */
export async function hireAgentIfNeeded(
  companyId: string,
  name: string,
): Promise<string> {
  const def = AGENT_ROSTER[name];
  if (!def) throw new Error(`Unknown agent: ${name}`);

  const { data: existing } = await supabase
    .from("agents")
    .select("id")
    .eq("company_id", companyId)
    .eq("name", def.name)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from("agents")
    .insert({
      company_id: companyId,
      name: def.name,
      role: def.role,
      avatar: def.avatar,
      accent: def.accent,
      status: "active",
      current_task: "Just hired — awaiting first brief",
      health: 100,
      performance: 0,
      activity: 0,
      revenue_generated: 0,
      credits_used: 0,
      tasks_completed: 0,
      lessons_count: 0,
      memory: def.memory,
    })
    .select("id")
    .single();
  if (error || !created) throw error ?? new Error(`Could not hire ${name}`);

  await supabase.from("activity_events").insert({
    company_id: companyId,
    agent_id: created.id,
    kind: "hire",
    message: `${def.name} joined as ${def.role}`,
  });

  return created.id;
}

export type NewTask = {
  title: string;
  description?: string;
  agent?: string;
  /** Prefer agent UUID when assigning from an employee card. */
  agentId?: string;
  priority?: "low" | "medium" | "high" | "critical";
  roi?: number;
  activity?: string;
  /** Founder-originated dispatch (mission / button). Autonomy decides queue vs approval. */
  founderApproved?: boolean;
  /**
   * Direct assign from an employee card.
   * Autonomy 0 still gates; otherwise queues immediately (founder already wrote the brief).
   */
  directAssign?: boolean;
};

function initialStatus(
  autonomy: number | undefined,
  opts: { founderApproved?: boolean; directAssign?: boolean },
) {
  if (opts.directAssign) {
    return (autonomy ?? 0) <= 0 ? "pending_approval" : "queued";
  }
  return taskStatusForAutonomy({
    autonomy,
    founderApproved: opts.founderApproved ?? true,
  });
}

async function kickWorker(taskId?: string) {
  try {
    const res = await triggerWorkerTick(
      taskId ? { data: { taskId } } : { data: {} },
    );
    return res;
  } catch (e) {
    console.error("Worker tick failed", e);
    return null;
  }
}

/** Queue real work: hire agent if needed, insert task, announce, run worker when queued. */
export function useDispatchTask() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  const findAgent = useAgentLookup();

  return useMutation({
    mutationFn: async (task: NewTask) => {
      if (!company) throw new Error("No company yet");
      let agentId = task.agentId ?? findAgent(task.agent);
      if (!agentId && task.agent && AGENT_ROSTER[task.agent]) {
        agentId = await hireAgentIfNeeded(company.id, task.agent);
      }
      if (!agentId) {
        throw new Error(
          task.agent
            ? `${task.agent} is not on the roster yet — hire them from Marketplace first.`
            : "No agents hired yet.",
        );
      }

      const { data: agentRow } = await supabase
        .from("agents")
        .select("id, name, paused")
        .eq("id", agentId)
        .eq("company_id", company.id)
        .maybeSingle();
      if (!agentRow) throw new Error("Employee not found on this company.");
      if (agentRow.paused) {
        throw new Error(`${agentRow.name} is paused — resume them before assigning.`);
      }

      const status = initialStatus(company.autonomy, {
        founderApproved: task.founderApproved ?? true,
        directAssign: task.directAssign,
      });
      const title = task.title.trim();
      if (title.length < 4) throw new Error("Give a clearer one-line task.");

      const { data: created, error } = await supabase
        .from("tasks")
        .insert({
          company_id: company.id,
          agent_id: agentId,
          title,
          description: task.description?.trim() || null,
          status,
          priority: task.priority ?? "medium",
          roi: task.roi ?? 0,
          progress: 0,
        })
        .select("id, status")
        .single();
      if (error || !created) throw error ?? new Error("Could not create task");

      // Do not mark the agent busy here — current_task / Active derive from
      // running|queued tasks once the worker actually starts (or queues) work.

      const who = agentRow.name;
      await supabase.from("activity_events").insert({
        company_id: company.id,
        agent_id: agentId,
        kind: task.directAssign ? "decision" : "task",
        message:
          status === "pending_approval"
            ? task.directAssign
              ? `Founder assigned ${who} (needs approval): ${task.activity ?? title}`
              : `Awaiting approval: ${task.activity ?? title}`
            : task.directAssign
              ? `Founder assigned ${who}: ${task.activity ?? title}`
              : (task.activity ?? title),
      });

      if (status === "queued") {
        const tick = await kickWorker(created.id);
        if (!tick?.ok) {
          return { status, workerRan: false as const, taskId: created.id, agentName: who };
        }
        return {
          status,
          workerRan: true as const,
          tasksProcessed: tick.tasksProcessed,
          taskId: created.id,
          agentName: who,
        };
      }
      return { status, workerRan: false as const, taskId: created.id, agentName: who };
    },
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["table", "tasks"] });
      void qc.invalidateQueries({ queryKey: ["table", "activity_events"] });
      void qc.invalidateQueries({ queryKey: ["table", "agents"] });
      if (res.status === "pending_approval") {
        toast.success(
          res.agentName
            ? `Assigned to ${res.agentName} — approve on Command Center to run`
            : "Task awaiting your approval",
        );
      } else if (res.workerRan) {
        toast.success(
          res.agentName ? `${res.agentName} is on it` : "Task queued — agents executing",
        );
      } else {
        toast.success(
          res.agentName ? `${res.agentName} queued — worker will pick it up` : "Task queued",
        );
      }
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't reach the agents — try again."),
  });
}

/** Atlas proposes 1–3 tasks from live company context (AI) — pending until founder approves. */
export function useProposeNextActions() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  const findAgent = useAgentLookup();

  return useMutation({
    mutationFn: async () => {
      if (!company) throw new Error("No company yet");
      let atlasId = findAgent("Atlas");
      if (!atlasId) atlasId = await hireAgentIfNeeded(company.id, "Atlas");

      const proposals = await proposeNextActionsAi({ data: { companyId: company.id } });

      for (const p of proposals) {
        let agentId = findAgent(p.agent);
        if (!agentId && AGENT_ROSTER[p.agent]) {
          agentId = await hireAgentIfNeeded(company.id, p.agent);
        }
        if (!agentId) agentId = atlasId;
        const { error } = await supabase.from("tasks").insert({
          company_id: company.id,
          agent_id: agentId,
          title: p.title,
          description: p.description,
          status: "pending_approval",
          priority: p.priority,
          roi: 0,
          progress: 0,
        });
        if (error) throw error;
      }

      await supabase.from("activity_events").insert({
        company_id: company.id,
        agent_id: atlasId,
        kind: "proposal",
        message: "Atlas proposed next actions from live context — approve to let agents work.",
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["table", "tasks"] });
      void qc.invalidateQueries({ queryKey: ["table", "activity_events"] });
      void qc.invalidateQueries({ queryKey: ["table", "agents"] });
      toast.success("Atlas proposed next actions. Approve them on Tasks.");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Couldn't create proposals."),
  });
}

/** Founder approves a pending task → queued → agent executes immediately (plan → research → deliverable). */
export function useApproveTask() {
  const qc = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!company) throw new Error("No company yet");

      const { data: task } = await supabase
        .from("tasks")
        .select("id, result, description, status")
        .eq("id", taskId)
        .eq("company_id", company.id)
        .maybeSingle();
      if (!task || task.status !== "pending_approval") {
        throw new Error("Task is not waiting for approval");
      }

      // Social reply tasks: post the real reply instead of generic agent work.
      const sourceKey = typeof task.result === "string" ? task.result : "";
      if (sourceKey.startsWith("social-reply:")) {
        const parts = sourceKey.split(":");
        const provider = parts[1];
        const externalId = parts.slice(2).join(":");
        if (!provider || !externalId) throw new Error("Invalid social reply task");
        const { data: eng } = await supabase
          .from("channel_engagements")
          .select("id, reply_body")
          .eq("company_id", company.id)
          .eq("provider", provider)
          .eq("external_id", externalId)
          .maybeSingle();
        if (!eng) throw new Error("Engagement not found — open Channels to reply");
        const { approveEngagementReply } = await import("@/lib/social.functions");
        await approveEngagementReply({
          data: {
            engagementId: eng.id,
            ...(eng.reply_body ? { reply: eng.reply_body } : {}),
          },
        });
        return { kind: "social" as const, workerRan: false, tasksProcessed: 0, focusedOk: true };
      }

      const { error } = await supabase
        .from("tasks")
        // steps/artifact are new columns — cast until generated Database types catch up
        .update({
          status: "queued",
          progress: 0,
          result: "Approved — agent starting now…",
          steps: [
            { id: "plan", label: "Build step-by-step plan", status: "pending" },
            { id: "search", label: "Web research", status: "pending" },
            { id: "synthesize", label: "Write deliverable", status: "pending" },
            { id: "file", label: "File result", status: "pending" },
          ],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .eq("id", taskId)
        .eq("company_id", company.id)
        .eq("status", "pending_approval");
      if (error) {
        // Retry without steps if column missing
        if (/steps|schema cache|42703|PGRST204/i.test(error.message)) {
          const { error: e2 } = await supabase
            .from("tasks")
            .update({
              status: "queued",
              progress: 0,
              result: "Approved — agent starting now…",
            })
            .eq("id", taskId)
            .eq("company_id", company.id)
            .eq("status", "pending_approval");
          if (e2) throw e2;
        } else {
          throw error;
        }
      }
      await supabase.from("activity_events").insert({
        company_id: company.id,
        kind: "decision",
        message: "Founder approved a task — agent executing now",
      });
      const tick = await kickWorker(taskId);
      return {
        kind: "task" as const,
        workerRan: Boolean(tick?.ok),
        tasksProcessed: tick?.tasksProcessed ?? 0,
        focusedOk: tick?.focusedTaskOk ?? null,
      };
    },
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["table", "tasks"] });
      void qc.invalidateQueries({ queryKey: ["table", "activity_events"] });
      void qc.invalidateQueries({ queryKey: ["table", "agents"] });
      void qc.invalidateQueries({ queryKey: ["table", "knowledge_items"] });
      void qc.invalidateQueries({ queryKey: ["table", "channel_engagements"] });
      if (res.kind === "social") {
        toast.success("Reply sent.");
        return;
      }
      if (res.focusedOk || (res.workerRan && res.tasksProcessed > 0)) {
        toast.success("Approved — agent ran plan, research, and filed a result.");
      } else if (res.workerRan) {
        toast.success("Approved — worker started. Watch the Running column for live steps.");
      } else {
        toast.success("Approved and queued. Worker will pick it up shortly.");
      }
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't approve that task."),
  });
}

/** Founder rejects a pending task. */
export function useRejectTask() {
  const qc = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!company) throw new Error("No company yet");

      const { data: task } = await supabase
        .from("tasks")
        .select("id, result, status")
        .eq("id", taskId)
        .eq("company_id", company.id)
        .maybeSingle();
      if (!task || task.status !== "pending_approval") {
        throw new Error("Task is not waiting for approval");
      }

      const sourceKey = typeof task.result === "string" ? task.result : "";
      if (sourceKey.startsWith("social-reply:")) {
        const parts = sourceKey.split(":");
        const provider = parts[1];
        const externalId = parts.slice(2).join(":");
        if (provider && externalId) {
          await supabase
            .from("channel_engagements")
            .update({ status: "ignored" })
            .eq("company_id", company.id)
            .eq("provider", provider)
            .eq("external_id", externalId);
        }
      }

      const { error } = await supabase
        .from("tasks")
        .update({ status: "failed", result: "Rejected by founder.", progress: 0 })
        .eq("id", taskId)
        .eq("company_id", company.id)
        .eq("status", "pending_approval");
      if (error) throw error;
      await supabase.from("activity_events").insert({
        company_id: company.id,
        kind: "decision",
        message: "Founder rejected a task",
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["table", "tasks"] });
      void qc.invalidateQueries({ queryKey: ["table", "activity_events"] });
      void qc.invalidateQueries({ queryKey: ["table", "channel_engagements"] });
      toast.message("Proposal dismissed.");
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't reject that task."),
  });
}

/** Insert an arbitrary row for a table scoped to the company. */
export function useCreateRow(table: "products" | "knowledge_items" | "files" | "customers") {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (!company) throw new Error("No company yet");
      const { error } = await supabase
        .from(table)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert({ ...values, company_id: company.id } as any);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["table", table] }),
    onError: () => toast.error("Couldn't save that."),
  });
}

export function useDeleteRow(table: "knowledge_items" | "products" | "files") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["table", table] }),
    onError: () => toast.error("Couldn't remove that."),
  });
}

/** Download any row set as CSV — a real export, not a toast. */
export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    toast.error("Nothing to export yet.");
    return;
  }
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`${filename} exported.`);
}
