/** Akquise schema compatibility — works before/after Agent OS migration. */

export const AKQUISE_EXTENDED_COLUMNS = [
  "template",
  "goal",
  "target_count",
  "plan",
  "steps",
  "artifact",
  "verify",
  "share_slug",
  "share_public",
  "aura_spent",
  "agents_labeled",
  "started_at",
  "completed_at",
  "mission_id",
] as const;

const BASE_CAMPAIGN_KEYS = new Set([
  "company_id",
  "name",
  "objective",
  "brief",
  "region",
  "language",
  "tone",
  "seed_urls",
  "status",
]);

export function isMissingColumnError(
  error: { message?: string; code?: string } | null | undefined,
) {
  if (!error) return false;
  const msg = error.message ?? "";
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    /Could not find the ['`].*['`] column/i.test(msg) ||
    /column .* does not exist/i.test(msg) ||
    /schema cache/i.test(msg)
  );
}

export type CampaignMeta = {
  goal?: string;
  template?: string;
  target_count?: number;
  agents_labeled?: string[];
  plan?: unknown;
  steps?: unknown;
  artifact?: unknown;
  verify?: unknown;
  aura_spent?: number;
  started_at?: string | null;
  completed_at?: string | null;
  share_slug?: string | null;
  share_public?: boolean;
};

const META_PREFIX = "<!--aura_akquise_meta:";
const META_SUFFIX = "-->";

export function packBriefWithMeta(goal: string, meta: CampaignMeta): string {
  const payload = Buffer.from(JSON.stringify(meta), "utf8").toString("base64url");
  return `${goal.trim()}\n\n${META_PREFIX}${payload}${META_SUFFIX}`;
}

export function unpackCampaignRow(row: Record<string, unknown>): Record<string, unknown> {
  const brief = String(row["brief"] ?? "");
  const start = brief.indexOf(META_PREFIX);
  if (start === -1) {
    return {
      ...row,
      goal: row["goal"] ?? brief,
    };
  }
  const end = brief.indexOf(META_SUFFIX, start);
  if (end === -1) return row;
  const b64 = brief.slice(start + META_PREFIX.length, end);
  let meta: CampaignMeta = {};
  try {
    meta = JSON.parse(Buffer.from(b64, "base64url").toString("utf8")) as CampaignMeta;
  } catch {
    return row;
  }
  const cleanBrief = brief.slice(0, start).trim();
  return {
    ...row,
    brief: cleanBrief,
    goal: (row["goal"] as string) || meta.goal || cleanBrief,
    template: row["template"] ?? meta.template,
    target_count: row["target_count"] ?? meta.target_count,
    agents_labeled: row["agents_labeled"] ?? meta.agents_labeled,
    plan: row["plan"] ?? meta.plan,
    steps: row["steps"] ?? meta.steps,
    artifact: row["artifact"] ?? meta.artifact,
    verify: row["verify"] ?? meta.verify,
    aura_spent: row["aura_spent"] ?? meta.aura_spent,
    started_at: row["started_at"] ?? meta.started_at,
    completed_at: row["completed_at"] ?? meta.completed_at,
    share_slug: row["share_slug"] ?? meta.share_slug,
    share_public: row["share_public"] ?? meta.share_public,
  };
}

function stripToBase(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (BASE_CAMPAIGN_KEYS.has(k)) out[k] = v;
  }
  return out;
}

type LooseDb = { from: (table: string) => any };

/** Insert campaign; falls back to base columns + packed brief if migration missing. */
export async function insertAkquiseCampaign(
  supabase: LooseDb,
  row: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await supabase
    .from("akquise_campaigns")
    .insert(row)
    .select("id")
    .single();
  if (!error && data?.id) return data.id as string;
  if (!isMissingColumnError(error)) throw error ?? new Error("Could not create campaign");

  const meta: CampaignMeta = {
    goal: String(row["goal"] ?? row["brief"] ?? ""),
    target_count: Number(row["target_count"] ?? 20),
    agents_labeled: (row["agents_labeled"] as string[]) ?? [],
    started_at: (row["started_at"] as string) ?? null,
  };
  if (typeof row["template"] === "string") meta.template = row["template"];
  const base = stripToBase({
    ...row,
    brief: packBriefWithMeta(String(row["goal"] ?? row["brief"] ?? ""), meta),
  });
  const { data: created, error: err2 } = await supabase
    .from("akquise_campaigns")
    .insert(base)
    .select("id")
    .single();
  if (err2 || !created?.id) throw err2 ?? new Error("Could not create campaign");
  return created.id as string;
}

/** Update campaign; strips unknown columns and keeps meta in brief when needed. */
export async function updateAkquiseCampaign(
  supabase: LooseDb,
  campaignId: string,
  patch: Record<string, unknown>,
  previousBrief?: string,
) {
  const { error } = await supabase.from("akquise_campaigns").update(patch).eq("id", campaignId);
  if (!error) return { extended: true };
  if (!isMissingColumnError(error)) throw error;

  const prev = unpackCampaignRow({ brief: previousBrief ?? patch["brief"] ?? "" });
  const meta: CampaignMeta = {
    goal: String(patch["goal"] ?? prev["goal"] ?? previousBrief ?? ""),
    target_count: Number(patch["target_count"] ?? prev["target_count"] ?? 20),
    agents_labeled: (patch["agents_labeled"] ?? prev["agents_labeled"] ?? []) as string[],
    aura_spent: Number(patch["aura_spent"] ?? prev["aura_spent"] ?? 0),
    started_at: (patch["started_at"] ?? prev["started_at"] ?? null) as string | null,
    completed_at: (patch["completed_at"] ?? prev["completed_at"] ?? null) as string | null,
    share_slug: (patch["share_slug"] ?? prev["share_slug"] ?? null) as string | null,
    share_public: Boolean(patch["share_public"] ?? prev["share_public"] ?? false),
  };
  if (patch["template"] != null || prev["template"] != null) {
    meta.template = String(patch["template"] ?? prev["template"]);
  }
  if (patch["plan"] !== undefined || prev["plan"] !== undefined)
    meta.plan = patch["plan"] ?? prev["plan"];
  if (patch["steps"] !== undefined || prev["steps"] !== undefined) {
    meta.steps = patch["steps"] ?? prev["steps"];
  }
  if (patch["artifact"] !== undefined || prev["artifact"] !== undefined) {
    meta.artifact = patch["artifact"] ?? prev["artifact"];
  }
  if (patch["verify"] !== undefined || prev["verify"] !== undefined) {
    meta.verify = patch["verify"] ?? prev["verify"];
  }
  const goalText = String(meta.goal || "");
  const base = stripToBase({
    ...patch,
    brief: packBriefWithMeta(goalText, meta),
  });
  // Always allow status / region / etc.
  if (patch["status"] != null) base["status"] = patch["status"];
  if (patch["region"] != null) base["region"] = patch["region"];
  if (patch["seed_urls"] != null) base["seed_urls"] = patch["seed_urls"];
  if (patch["objective"] != null) base["objective"] = patch["objective"];
  if (patch["name"] != null) base["name"] = patch["name"];
  if (patch["language"] != null) base["language"] = patch["language"];
  if (patch["tone"] != null) base["tone"] = patch["tone"];

  const { error: err2 } = await supabase
    .from("akquise_campaigns")
    .update(base)
    .eq("id", campaignId);
  if (err2) throw err2;
  return { extended: false };
}

export async function insertAkquiseLeadsSafe(supabase: LooseDb, rows: Record<string, unknown>[]) {
  if (!rows.length) return 0;
  const { error } = await supabase.from("akquise_leads").insert(rows);
  if (!error) return rows.length;
  if (!isMissingColumnError(error)) throw error;
  const stripped = rows.map((r) => {
    const { metadata: _m, ...rest } = r;
    return rest;
  });
  const { error: err2 } = await supabase.from("akquise_leads").insert(stripped);
  if (err2) throw err2;
  return stripped.length;
}
