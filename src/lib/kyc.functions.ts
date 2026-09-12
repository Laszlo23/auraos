import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SITE_URL } from "@/lib/site";
import type { KycStatus } from "@/lib/didit.server";

type KycRow = {
  user_id: string;
  provider: string;
  session_id: string | null;
  workflow_id: string | null;
  status: KycStatus;
  vendor_data: string | null;
  last_decision: Record<string, unknown>;
  verified_at: string | null;
  updated_at: string;
};

export type KycPublicConfig = {
  configured: boolean;
  gates: Array<"sale" | "trading">;
};

export type KycView = {
  configured: boolean;
  gates: Array<"sale" | "trading">;
  status: KycStatus;
  approved: boolean;
  sessionId: string | null;
  verifiedAt: string | null;
  updatedAt: string | null;
};

function asDb(client: unknown): { from: (table: string) => any } {
  return client as { from: (table: string) => any };
}

export async function persistKycDecision(input: {
  userId?: string | null;
  sessionId?: string | null;
  vendorData?: string | null;
  rawStatus?: string | null;
  workflowId?: string | null;
}): Promise<KycRow | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { mapDiditStatus } = await import("@/lib/didit.server");
  const db = asDb(supabaseAdmin);
  const status = mapDiditStatus(input.rawStatus);
  const userId = input.userId || input.vendorData || null;
  if (!userId && !input.sessionId) return null;

  let existing: KycRow | null = null;
  if (input.sessionId) {
    const { data } = await db.from("user_kyc").select("*").eq("session_id", input.sessionId).maybeSingle();
    existing = (data as KycRow | null) ?? null;
  }
  if (!existing && userId) {
    const { data } = await db
      .from("user_kyc")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", "didit")
      .maybeSingle();
    existing = (data as KycRow | null) ?? null;
  }

  const now = new Date().toISOString();
  const verifiedAt = status === "approved" ? (existing?.verified_at ?? now) : existing?.verified_at ?? null;
  const row = {
    user_id: existing?.user_id ?? userId,
    provider: "didit",
    session_id: input.sessionId ?? existing?.session_id ?? null,
    workflow_id: input.workflowId ?? existing?.workflow_id ?? null,
    status,
    vendor_data: input.vendorData ?? existing?.vendor_data ?? userId,
    last_decision: {
      status: input.rawStatus ?? status,
      session_id: input.sessionId ?? existing?.session_id ?? null,
      updated_at: now,
    },
    verified_at: status === "approved" ? verifiedAt : null,
    updated_at: now,
  };
  if (!row.user_id) return null;

  const { data, error } = await db
    .from("user_kyc")
    .upsert(row, { onConflict: "user_id,provider" })
    .select("*")
    .maybeSingle();
  if (error) throw error;

  await db
    .from("profiles")
    .update({
      kyc_status: status,
      kyc_provider: "didit",
      kyc_verified_at: row.verified_at,
    })
    .eq("id", row.user_id);

  return (data as KycRow | null) ?? (row as KycRow);
}

export const getKycPublicConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { diditConfigured, diditGates } = await import("@/lib/didit.server");
  return {
    configured: diditConfigured(),
    gates: diditGates(),
  } satisfies KycPublicConfig;
});

export const getKycStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<KycView> => {
    const { diditConfigured, diditGates, isKycApproved } = await import("@/lib/didit.server");
    const db = asDb(context.supabase);
    const { data } = await db
      .from("user_kyc")
      .select("session_id, status, verified_at, updated_at")
      .eq("user_id", context.userId)
      .eq("provider", "didit")
      .maybeSingle();
    const status = (data?.status as KycStatus | undefined) ?? "none";
    return {
      configured: diditConfigured(),
      gates: diditGates(),
      status,
      approved: isKycApproved(status),
      sessionId: data?.session_id ?? null,
      verifiedAt: data?.verified_at ?? null,
      updatedAt: data?.updated_at ?? null,
    };
  });

export const startKycSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { createDiditSession, diditConfigured, mapDiditStatus } = await import("@/lib/didit.server");
    if (!diditConfigured()) throw new Error("KYC is not configured on this host.");

    const session = await createDiditSession({
      vendorData: context.userId,
      callback: `${SITE_URL}/identity?kyc=return`,
    });
    if (!session.url) throw new Error("Didit did not return a verification URL.");

    await persistKycDecision({
      userId: context.userId,
      sessionId: session.session_id,
      vendorData: context.userId,
      rawStatus: session.status ?? "Not Started",
      workflowId: session.workflow_id ?? null,
    });

    return {
      url: session.url,
      sessionId: session.session_id,
      status: mapDiditStatus(session.status),
    };
  });

export const refreshKycStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<KycView> => {
    const { getDiditDecision, listDiditSessionsForVendor, diditConfigured, diditGates, isKycApproved } =
      await import("@/lib/didit.server");
    const db = asDb(context.supabase);
    const { data: row } = await db
      .from("user_kyc")
      .select("session_id")
      .eq("user_id", context.userId)
      .eq("provider", "didit")
      .maybeSingle();

    let sessionId = (row?.session_id as string | null) ?? null;
    if (!sessionId) {
      const listed = await listDiditSessionsForVendor(context.userId);
      sessionId = listed[0]?.session_id ?? null;
    }
    if (sessionId) {
      const decision = await getDiditDecision(sessionId);
      await persistKycDecision({
        userId: context.userId,
        sessionId: decision.session_id ?? sessionId,
        vendorData: decision.vendor_data ?? context.userId,
        rawStatus: decision.status ?? null,
      });
    }

    const { data } = await db
      .from("user_kyc")
      .select("session_id, status, verified_at, updated_at")
      .eq("user_id", context.userId)
      .eq("provider", "didit")
      .maybeSingle();
    const status = (data?.status as KycStatus | undefined) ?? "none";
    return {
      configured: diditConfigured(),
      gates: diditGates(),
      status,
      approved: isKycApproved(status),
      sessionId: data?.session_id ?? null,
      verifiedAt: data?.verified_at ?? null,
      updatedAt: data?.updated_at ?? null,
    };
  });
