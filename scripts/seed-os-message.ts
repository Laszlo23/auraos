/**
 * One-shot: seed OS message blast for Aura Goods (or COMPANY_ID) and print counts.
 *
 *   npx tsx scripts/seed-os-message.ts
 *   COMPANY_ID=… npx tsx scripts/seed-os-message.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadDotenv() {
  const path = join(ROOT, ".env");
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadDotenv();
  const companyId =
    process.env["COMPANY_ID"]?.trim() || "37d595bb-4688-4613-8f12-cf794af8b251";

  const { seedOsMessageCampaign } = await import("../src/lib/launch-drip.server");
  const { OS_MESSAGE_CAMPAIGN, buildOsMessageSlots, osMessageSummary } =
    await import("../src/lib/x-launch-campaign");
  const { supabaseAdmin } = await import("../src/integrations/supabase/client.server");

  for (const provider of ["x", "farcaster"] as const) {
    await supabaseAdmin
      .from("channel_connections")
      .update({ auto_publish: true, last_sync: new Date().toISOString() })
      .eq("company_id", companyId)
      .eq("provider", provider)
      .eq("status", "connected");
  }

  const { created, skipped } = await seedOsMessageCampaign(companyId, {
    x: true,
    farcaster: true,
  });

  await supabaseAdmin.from("activity_events").insert({
    company_id: companyId,
    kind: "publish",
    message: `OS message blast ${OS_MESSAGE_CAMPAIGN} (${created} new, ${skipped} already queued)`,
  });

  const summary = osMessageSummary(buildOsMessageSlots());
  process.stdout.write(
    [
      `company=${companyId}`,
      `campaign=${OS_MESSAGE_CAMPAIGN}`,
      `created=${created} skipped=${skipped}`,
      `preview=${summary.count} (x=${summary.xCount} fc=${summary.farcasterCount})`,
      `first=${summary.firstAt}`,
      `last=${summary.lastAt}`,
      "",
    ].join("\n"),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
