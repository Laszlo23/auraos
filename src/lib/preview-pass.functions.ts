import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isOpsAdminEmail } from "@/lib/ops.functions";
import {
  PREVIEW_PASS_BATCH_MAX,
  PREVIEW_PASS_CODE,
  clampPreviewBatch,
  previewPassShareUrl,
  randomPreviewCode,
} from "@/lib/preview-pass";

type LooseDb = {
  from: (t: string) => any;
};

async function db(): Promise<LooseDb> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as LooseDb;
}

async function emailFromContext(context: { claims?: unknown }): Promise<string | null> {
  const claims = context.claims as Record<string, unknown> | undefined;
  if (typeof claims?.["email"] === "string" && claims["email"]) return claims["email"];
  const meta = claims?.["user_metadata"] as Record<string, unknown> | undefined;
  if (typeof meta?.["email"] === "string" && meta["email"]) return meta["email"];
  return null;
}

export type PreviewPassRow = {
  code: string;
  label: string | null;
  uses: number;
  max_uses: number;
  active: boolean;
};

export const listPreviewPasses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = await emailFromContext(context);
    if (!isOpsAdminEmail(email)) throw new Error("Not authorized for ops");
    const admin = await db();
    const { data, error } = await admin
      .from("invite_codes")
      .select("code, label, uses, max_uses, active")
      .eq("kind", "preview")
      .order("code", { ascending: true })
      .limit(80);
    if (error) throw new Error(error.message);
    return {
      standing: PREVIEW_PASS_CODE,
      shareUrl: previewPassShareUrl(),
      codes: (data ?? []) as PreviewPassRow[],
    };
  });

export const issuePreviewPassBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input?: { count?: number }) => ({
    count: clampPreviewBatch(input?.count ?? PREVIEW_PASS_BATCH_MAX),
  }))
  .handler(async ({ data, context }) => {
    const email = await emailFromContext(context);
    if (!isOpsAdminEmail(email)) throw new Error("Not authorized for ops");

    const admin = await db();
    const codes: string[] = [];
    for (let i = 0; i < data.count; i++) {
      let inserted = false;
      for (let attempt = 0; attempt < 6 && !inserted; attempt++) {
        const bytes = new Uint8Array(8);
        crypto.getRandomValues(bytes);
        const code = randomPreviewCode(bytes);
        const { error } = await admin.from("invite_codes").insert({
          code,
          label: "Preview pass",
          max_uses: 1,
          uses: 0,
          active: true,
          kind: "preview",
        });
        if (!error) {
          codes.push(code);
          inserted = true;
        } else if (!/duplicate|unique/i.test(error.message)) {
          throw new Error(error.message);
        }
      }
      if (!inserted) throw new Error("Could not mint a unique preview code.");
    }
    return { codes, urls: codes.map((c) => previewPassShareUrl(c)) };
  });
