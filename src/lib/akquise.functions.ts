import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  burnAkquiseAura,
  executeAkquiseRun,
  makeShareSlug,
  type ProspectDraft,
} from "@/lib/akquise-engine.server";
import {
  insertAkquiseCampaign,
  insertAkquiseLeadsSafe,
  unpackCampaignRow,
  updateAkquiseCampaign,
} from "@/lib/akquise-schema";
import {
  getTemplate,
  inferTemplateFromGoal,
  isAkquiseMission,
  type AkquiseTemplateId,
} from "@/lib/akquise-templates";

export type { ProspectDraft };

type LooseDb = { from: (table: string) => any };
function asDb(client: unknown): LooseDb {
  return client as LooseDb;
}

async function ownedCompanyId(supabase: LooseDb, userId: string) {
  const { data } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data?.id) throw new Error("Company not found");
  return data.id as string;
}

async function persistProspects(
  supabase: LooseDb,
  companyId: string,
  campaignId: string,
  prospects: ProspectDraft[],
) {
  if (!prospects.length) return 0;
  const rows = prospects.map((p) => ({
    company_id: companyId,
    campaign_id: campaignId,
    name: p.name ?? null,
    org: p.org ?? null,
    email: p.email ?? null,
    phone: p.phone ?? null,
    address: p.address ?? null,
    snippet: p.snippet ?? null,
    score: Math.max(0, Math.min(100, Math.round(Number(p.score) || 0))),
    source_url: p.source_url,
    status: "found",
    metadata: {
      website_signals: p.website_signals ?? [],
    },
  }));
  return insertAkquiseLeadsSafe(supabase, rows);
}

type RunInput = {
  goal: string;
  template?: string | undefined;
  targetCount?: number | undefined;
  region: string;
  language: string;
  tone: string;
  objective: string;
  seedUrls: string[];
  campaignId?: string | undefined;
  name: string;
  clearLeads?: boolean | undefined;
};

async function runAkquiseGoalCore(supabase: LooseDb, companyId: string, data: RunInput) {
  const templateId = (data.template || inferTemplateFromGoal(data.goal)) as AkquiseTemplateId;
  const template = getTemplate(templateId);
  const targetCount = data.targetCount ?? template.defaultTarget;

  // Fail closed before spending LLM/Firecrawl — estimate uses default page budget.
  const { requireAuraBalance } = await import("@/lib/aura-spend.server");
  const { TASK_COST } = await import("@/lib/task-cost");
  const minCost = TASK_COST + 2;
  await requireAuraBalance(supabase, companyId, minCost);

  let campaignId = data.campaignId;
  let previousBrief = data.goal;
  if (campaignId) {
    const { data: existing } = await supabase
      .from("akquise_campaigns")
      .select("id, company_id, brief")
      .eq("id", campaignId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!existing) throw new Error("Campaign not found");
    previousBrief = String(existing.brief ?? data.goal);
  } else {
    campaignId = await insertAkquiseCampaign(supabase, {
      company_id: companyId,
      name: data.name || template.label,
      objective: data.objective || template.objectiveDefault,
      region: data.region || null,
      brief: data.goal,
      goal: data.goal,
      language: data.language,
      tone: data.tone,
      seed_urls: data.seedUrls,
      template: template.id,
      target_count: targetCount,
      status: "planning",
      agents_labeled: template.agents,
      started_at: new Date().toISOString(),
    });
  }

  await updateAkquiseCampaign(
    supabase,
    campaignId!,
    {
      status: "planning",
      goal: data.goal,
      brief: data.goal,
      template: template.id,
      target_count: targetCount,
      region: data.region || null,
      seed_urls: data.seedUrls,
      agents_labeled: template.agents,
      started_at: new Date().toISOString(),
      steps: [],
    },
    previousBrief,
  );

  await supabase.from("activity_events").insert({
    company_id: companyId,
    kind: "mission",
    message: `Akquise run: "${data.goal.slice(0, 100)}" · ${template.label}`,
  });

  await updateAkquiseCampaign(supabase, campaignId!, { status: "running" }, data.goal);

  let engine;
  try {
    engine = await executeAkquiseRun({
      goal: data.goal,
      templateId: template.id,
      targetCount,
      region: data.region || null,
      brief: data.goal,
      objective: data.objective || template.objectiveDefault,
      seedUrls: data.seedUrls,
    });
  } catch (e) {
    await updateAkquiseCampaign(
      supabase,
      campaignId!,
      {
        status: "failed",
        steps: [
          {
            id: "fatal",
            label: "Run failed",
            status: "failed",
            detail: e instanceof Error ? e.message : "Unknown error",
            at: new Date().toISOString(),
          },
        ],
      },
      data.goal,
    );
    throw e;
  }

  await updateAkquiseCampaign(
    supabase,
    campaignId!,
    { status: "verifying", plan: engine.plan, steps: engine.steps },
    data.goal,
  );

  if (data.clearLeads || data.campaignId) {
    await supabase.from("akquise_leads").delete().eq("campaign_id", campaignId);
  }

  const added = await persistProspects(supabase, companyId, campaignId!, engine.prospects);
  const auraSpent = await burnAkquiseAura(
    supabase,
    companyId,
    engine.auraCost,
    `Akquise · ${template.label} · ${added} leads`,
    campaignId!,
  );

  if (added > 0) {
    await supabase.from("knowledge_items").insert({
      company_id: companyId,
      title: `Akquise: ${template.label}`,
      summary: `Goal "${data.goal.slice(0, 160)}" → ${added} prospects (${engine.verify.withContact} with contact on page). Template ${template.id}.`,
      cluster: "Akquise",
      source: "Akquise agent",
    });
  }

  const finalStatus = engine.verify.ok ? "complete" : "failed";
  await updateAkquiseCampaign(
    supabase,
    campaignId!,
    {
      status: finalStatus,
      plan: engine.plan,
      steps: engine.steps,
      artifact: engine.artifact,
      verify: engine.verify,
      aura_spent: auraSpent,
      completed_at: new Date().toISOString(),
    },
    data.goal,
  );

  await supabase.from("activity_events").insert({
    company_id: companyId,
    kind: "task",
    message: `Akquise ${finalStatus}: ${added} leads · ${auraSpent} AURA · ${template.label}`,
  });

  return {
    campaignId: campaignId!,
    template: template.id,
    agents: template.agents,
    added,
    scanned: engine.pagesScanned,
    verify: engine.verify,
    steps: engine.steps,
    auraSpent,
    status: finalStatus,
    shareText: `Aura completed: "${data.goal.slice(0, 80)}" — ${added} real prospects researched.`,
  };
}

/** Full goal → plan → execute → verify run. */
export const runAkquiseGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      goal: string;
      template?: string;
      targetCount?: number;
      region?: string;
      language?: string;
      tone?: string;
      objective?: string;
      seedUrls?: string[];
      campaignId?: string;
      name?: string;
    }) => {
      const goal = input.goal?.trim().slice(0, 800);
      if (!goal || goal.length < 8) throw new Error("Describe the goal (at least 8 characters).");
      return {
        goal,
        template: input.template,
        targetCount: input.targetCount,
        region: input.region?.trim().slice(0, 120) || "",
        language: input.language === "en" ? "en" : "de",
        tone: input.tone?.trim().slice(0, 40) || "warm-professional",
        objective: input.objective?.trim().slice(0, 20) || "research",
        seedUrls: (input.seedUrls ?? [])
          .map((u) => u.trim())
          .filter((u) => /^https?:\/\//i.test(u))
          .slice(0, 8),
        campaignId: input.campaignId,
        name: input.name?.trim().slice(0, 80) || "",
      };
    },
  )
  .handler(async ({ data, context }) => {
    const supabase = asDb(context.supabase);
    const companyId = await ownedCompanyId(supabase, context.userId);
    return runAkquiseGoalCore(supabase, companyId, data);
  });

/** Re-run research for an existing campaign. */
export const researchLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { campaignId: string }) => ({ campaignId: String(input.campaignId) }))
  .handler(async ({ data, context }) => {
    const supabase = asDb(context.supabase);
    const companyId = await ownedCompanyId(supabase, context.userId);
    const { data: campaign, error } = await supabase
      .from("akquise_campaigns")
      .select("*")
      .eq("id", data.campaignId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (error) throw error;
    if (!campaign) throw new Error("Campaign not found");

    const row = unpackCampaignRow(campaign as Record<string, unknown>);
    const goal = String(row["goal"] || row["brief"] || "");
    const res = await runAkquiseGoalCore(supabase, companyId, {
      goal,
      template: (row["template"] as string) || inferTemplateFromGoal(goal),
      targetCount: Number(row["target_count"] ?? 20),
      region: String(row["region"] ?? ""),
      language: row["language"] === "en" ? "en" : "de",
      tone: String(row["tone"] || "warm-professional"),
      objective: String(row["objective"] || "research"),
      seedUrls: (row["seed_urls"] as string[]) ?? [],
      campaignId: String(row["id"]),
      name: String(row["name"] || ""),
      clearLeads: true,
    });
    return { added: res.added, scanned: res.scanned, verify: res.verify };
  });

/** Used by mission dispatch — same core without createServerFn nesting. */
export async function runAkquiseForMission(supabase: unknown, companyId: string, mission: string) {
  const template = inferTemplateFromGoal(mission);
  return runAkquiseGoalCore(asDb(supabase), companyId, {
    goal: mission,
    template,
    region: "",
    language: "de",
    tone: "warm-professional",
    objective: getTemplate(template).objectiveDefault,
    seedUrls: [],
    name: `Mission · ${getTemplate(template).label}`,
  });
}

function buildSignature(senderName: string, projectName: string) {
  const name = senderName.trim();
  const project = projectName.trim();
  if (name && project) return `${name}\n${project}`;
  if (name) return name;
  if (project) return project;
  return "";
}

function applySignature(body: string, signature: string) {
  const trimmed = body.replace(/\s+$/u, "");
  if (signature) {
    if (trimmed.includes("{{signature}}")) {
      return trimmed.replaceAll("{{signature}}", signature);
    }
    return `${trimmed}\n\n${signature}`;
  }
  return trimmed
    .replaceAll("{{signature}}", "")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

/** Write a personalized cold email for one lead. */
export const draftLeadEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { leadId: string; senderName?: string; projectName?: string }) => ({
    leadId: String(input.leadId),
    senderName: String(input.senderName ?? "")
      .trim()
      .slice(0, 80),
    projectName: String(input.projectName ?? "")
      .trim()
      .slice(0, 120),
  }))
  .handler(async ({ data, context }) => {
    const supabase = asDb(context.supabase);
    const companyId = await ownedCompanyId(supabase, context.userId);
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .maybeSingle();

    const { data: lead, error } = await supabase
      .from("akquise_leads")
      .select("*, akquise_campaigns(*)")
      .eq("id", data.leadId)
      .maybeSingle();
    if (error) throw error;
    if (!lead) throw new Error("Lead not found");
    const campaignRaw = (lead as unknown as { akquise_campaigns: Record<string, unknown> })
      .akquise_campaigns;
    const campaign = unpackCampaignRow(campaignRaw ?? {});

    const projectName = data.projectName || String(company?.name ?? "").trim();
    const senderName = data.senderName;
    if (!senderName) {
      throw new Error(
        "Add your name first — drafts should sign off as you, not as an anonymous agent.",
      );
    }
    if (!projectName) {
      throw new Error(
        "Add your project or company name so the email can introduce what you offer.",
      );
    }
    const signature = buildSignature(senderName, projectName);

    const { firecrawlScrape, askAi, parseJsonBlock } = await import("./akquise.server");
    let context_md = lead.snippet ?? "";
    if (lead.source_url) {
      const page = await firecrawlScrape(lead.source_url);
      if (page) context_md = `${context_md}\n\n${page.markdown.slice(0, 3500)}`;
    }

    const template = getTemplate(campaign["template"] as string | undefined);
    const lang = String(campaign["language"] ?? "de");
    const { languageStyleBlock, sanitizeBrandNames } = await import("./ai-language");
    const raw = await askAi(
      `You write cold outreach emails.
${languageStyleBlock(lang)}
Tone: ${String(campaign["tone"] ?? "warm-professional")}.
Template context: ${template.label}.
Sender: ${senderName} writing on behalf of ${projectName}.
Rules: write in first person as ${senderName}. Naturally mention ${projectName} once when introducing who you are / what you do. Reference at least one concrete detail from the research so it cannot be mistaken for a template. Max 130 words. No hype, no emoji, no "I hope this email finds you well" / "ich hoffe diese Nachricht erreicht Sie wohlauf". One clear, low-friction call to action. End the body with exactly the placeholder line {{signature}} and nothing after it.
Never invent facts. Return ONLY JSON: {"subject": string, "body": string}.`,
      `Goal/brief: ${String(campaign["goal"] || campaign["brief"] || "")}
Objective: ${String(campaign["objective"] ?? "research")}
Sender name: ${senderName}
Project / company: ${projectName}
Prospect: ${lead.name ?? "unknown"} — ${lead.org ?? "unknown"} — ${lead.address ?? ""}
Research:\n${context_md.slice(0, 4000)}`,
    );

    const draft = parseJsonBlock<{ subject?: string; body?: string }>(raw, {});
    const subject = sanitizeBrandNames((draft.subject ?? "").slice(0, 200));
    let body = sanitizeBrandNames(draft.body ?? "");
    body = applySignature(body, signature);
    if (!subject || !body) throw new Error("The agent could not write this one — try again.");

    const { error: updateError } = await supabase
      .from("akquise_leads")
      .update({ draft_subject: subject, draft_body: body, status: "drafted" })
      .eq("id", lead.id);
    if (updateError) throw updateError;

    return { subject, body };
  });

/** Persist founder edits to a draft before send. */
export const saveLeadDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { leadId: string; subject: string; body: string }) => ({
    leadId: String(input.leadId),
    subject: String(input.subject ?? "")
      .trim()
      .slice(0, 200),
    body: String(input.body ?? "")
      .trim()
      .slice(0, 8000),
  }))
  .handler(async ({ data, context }) => {
    if (!data.subject) throw new Error("Subject cannot be empty.");
    if (!data.body) throw new Error("Email body cannot be empty.");
    const supabase = asDb(context.supabase);
    const companyId = await ownedCompanyId(supabase, context.userId);
    const { data: lead, error } = await supabase
      .from("akquise_leads")
      .select("id, company_id, status")
      .eq("id", data.leadId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (error) throw error;
    if (!lead) throw new Error("Lead not found");
    if (lead.status === "sent") throw new Error("This email was already sent.");

    const { error: updateError } = await supabase
      .from("akquise_leads")
      .update({
        draft_subject: data.subject,
        draft_body: data.body,
        status: "drafted",
      })
      .eq("id", lead.id);
    if (updateError) throw updateError;
    return { ok: true as const, subject: data.subject, body: data.body };
  });

/** Send a drafted email — always explicit founder action. */
export const sendLeadEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { leadId: string; provider: string; subject?: string; body?: string }) => {
    const provider =
      input.provider === "microsoft_outlook"
        ? "microsoft_outlook"
        : input.provider === "smtp"
          ? "smtp"
          : "google_mail";
    const subject =
      typeof input.subject === "string" ? input.subject.trim().slice(0, 200) : undefined;
    const body = typeof input.body === "string" ? input.body.trim().slice(0, 8000) : undefined;
    return {
      leadId: String(input.leadId),
      provider,
      ...(subject ? { subject } : {}),
      ...(body ? { body } : {}),
    };
  })
  .handler(async ({ data, context }) => {
    const supabase = asDb(context.supabase);
    const { data: lead, error } = await supabase
      .from("akquise_leads")
      .select("*")
      .eq("id", data.leadId)
      .maybeSingle();
    if (error) throw error;
    if (!lead) throw new Error("Lead not found");
    if (!lead.email) throw new Error("This lead has no email address yet.");

    const subject = (data.subject ?? lead.draft_subject ?? "").trim();
    const body = (data.body ?? lead.draft_body ?? "").trim();
    if (!subject || !body) throw new Error("Write and review the email first.");

    if (data.subject || data.body) {
      const { error: saveError } = await supabase
        .from("akquise_leads")
        .update({ draft_subject: subject, draft_body: body, status: "drafted" })
        .eq("id", lead.id);
      if (saveError) throw saveError;
    }

    if (data.provider === "smtp") {
      const { loadSmtpConfigForUser, sendViaSmtp } = await import("@/lib/smtp.server");
      const config = await loadSmtpConfigForUser(context.userId);
      if (!config) throw new Error("Connect your SMTP mailbox first.");
      try {
        await sendViaSmtp({
          config,
          to: lead.email,
          subject,
          text: body,
        });
      } catch (err) {
        console.error("SMTP send failed:", err);
        throw new Error(
          err instanceof Error ? `SMTP send failed: ${err.message}` : "SMTP send failed.",
        );
      }
    } else {
      const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");
      const key = await getConnectionKeyForUser(context.userId, data.provider);
      if (!key) throw new Error("Connect your mailbox first.");

      const { callAsAppUser, GATEWAY_BASE_URL } =
        await import("@/integrations/lovable/appUserConnector");

      let res: Response;
      if (data.provider === "google_mail") {
        const mime = [
          `To: ${lead.email}`,
          `Subject: ${subject}`,
          'Content-Type: text/plain; charset="UTF-8"',
          "",
          body,
        ].join("\r\n");
        const raw = Buffer.from(mime, "utf8")
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");
        res = await callAsAppUser({
          gatewayBaseUrl: GATEWAY_BASE_URL,
          connectionAPIKey: key,
          connectorId: "google_mail",
          path: "/gmail/v1/users/me/messages/send",
          init: {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ raw }),
          },
        });
      } else {
        res = await callAsAppUser({
          gatewayBaseUrl: GATEWAY_BASE_URL,
          connectionAPIKey: key,
          connectorId: "microsoft_outlook",
          path: "/me/sendMail",
          init: {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: {
                subject,
                body: { contentType: "Text", content: body },
                toRecipients: [{ emailAddress: { address: lead.email } }],
              },
              saveToSentItems: true,
            }),
          },
        });
      }

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error(`Mailbox send failed [${res.status}]: ${detail}`);
        throw new Error(`Your mailbox rejected the send (${res.status}).`);
      }
    }

    await supabase
      .from("akquise_leads")
      .update({
        draft_subject: subject,
        draft_body: body,
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", lead.id);

    return { ok: true };
  });
/** Publish a completed run for the viral result page. */
export const publishAkquiseResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { campaignId: string }) => ({
    campaignId: String(input.campaignId),
  }))
  .handler(async ({ data, context }) => {
    const supabase = asDb(context.supabase);
    const companyId = await ownedCompanyId(supabase, context.userId);
    const { data: campaign } = await supabase
      .from("akquise_campaigns")
      .select("*")
      .eq("id", data.campaignId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!campaign) throw new Error("Campaign not found");
    const row = unpackCampaignRow(campaign as Record<string, unknown>);
    if (row["status"] !== "complete" && row["status"] !== "researched") {
      throw new Error("Only completed runs can be shared.");
    }
    const slug = (row["share_slug"] as string) || makeShareSlug();
    await updateAkquiseCampaign(
      supabase,
      String(row["id"]),
      { share_slug: slug, share_public: true },
      String(campaign.brief ?? ""),
    );
    return { slug, url: `/r/${slug}` };
  });

/** Public (PII-redacted) result for shared runs. */
export const getPublicAkquiseResult = createServerFn({ method: "GET" })
  .validator((input: { slug: string }) => {
    const slug = input.slug
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 16);
    if (!slug) throw new Error("slug required");
    return { slug };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = asDb(supabaseAdmin);

    // Prefer extended select; fall back to base columns + packed brief meta
    let campaign: Record<string, unknown> | null = null;
    const extended = await admin
      .from("akquise_campaigns")
      .select(
        "id, name, goal, brief, template, status, plan, steps, artifact, verify, agents_labeled, aura_spent, completed_at, started_at, region, share_slug, share_public, target_count",
      )
      .eq("share_slug", data.slug)
      .eq("share_public", true)
      .maybeSingle();
    if (!extended.error && extended.data) {
      campaign = extended.data as Record<string, unknown>;
    } else {
      const { data: all } = await admin
        .from("akquise_campaigns")
        .select("*")
        .eq("status", "complete")
        .limit(200);
      const match = ((all ?? []) as Record<string, unknown>[])
        .map((r) => unpackCampaignRow(r))
        .find((r) => r["share_slug"] === data.slug && r["share_public"] === true);
      campaign = match ?? null;
    }
    if (!campaign) return null;
    const row = unpackCampaignRow(campaign);

    const { data: leads } = await admin
      .from("akquise_leads")
      .select("org, name, snippet, score, source_url, status, metadata")
      .eq("campaign_id", row["id"])
      .order("score", { ascending: false })
      .limit(40);

    let leadRows = leads;
    if (!leadRows) {
      const fallback = await admin
        .from("akquise_leads")
        .select("org, name, snippet, score, source_url, status")
        .eq("campaign_id", row["id"])
        .order("score", { ascending: false })
        .limit(40);
      leadRows = fallback.data;
    }

    return {
      name: row["name"] as string,
      goal: String(row["goal"] || row["brief"] || ""),
      template: String(row["template"] || "real_estate"),
      status: String(row["status"] || ""),
      region: (row["region"] as string | null) ?? null,
      agents: (row["agents_labeled"] as string[]) ?? [],
      steps: row["steps"] ?? [],
      plan: row["plan"] ?? {},
      verify: row["verify"] ?? {},
      artifact: row["artifact"] ?? {},
      auraSpent: Number(row["aura_spent"] ?? 0),
      startedAt: (row["started_at"] as string | null) ?? null,
      completedAt: (row["completed_at"] as string | null) ?? null,
      targetCount: Number(row["target_count"] ?? 0),
      leads: ((leadRows ?? []) as Record<string, unknown>[]).map((l) => ({
        org: l["org"] ?? null,
        name: l["name"] ?? null,
        snippet: l["snippet"] ?? null,
        score: l["score"] ?? 0,
        source_url: l["source_url"] ?? null,
        has_contact: false,
        signals: (l["metadata"] as { website_signals?: string[] } | null)?.website_signals ?? [],
      })),
    };
  });

export { isAkquiseMission, inferTemplateFromGoal, getTemplate };
