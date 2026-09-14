/**
 * Queue post-T0 CA-live pin + refresh drip + OS message blast, then tick the worker.
 *
 *   npx tsx scripts/seed-ca-live-announce.ts
 *   COMPANY_ID=… npx tsx scripts/seed-ca-live-announce.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadDotenv() {
  for (const name of [".env", ".env.local"]) {
    const path = join(ROOT, name);
    if (!existsSync(path)) continue;
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
}

async function main() {
  loadDotenv();
  // Force CA publish flags for local seed (same as VPS).
  if (!process.env["AURA_CA_PUBLISH"]) process.env["AURA_CA_PUBLISH"] = "1";

  const companyId =
    process.env["COMPANY_ID"]?.trim() || "37d595bb-4688-4613-8f12-cf794af8b251";

  const { supabaseAdmin } = await import("../src/integrations/supabase/client.server");
  const {
    seedCaLiveAnnouncePosts,
    seedOsMessageCampaign,
    seedLaunchDripSlots,
    seedFarcasterDripSlots,
  } = await import("../src/lib/launch-drip.server");
  const { publishDueChannelPosts } = await import("../src/lib/task-worker.server");
  const {
    CA_LIVE_ANNOUNCE_CAMPAIGN,
    OS_MESSAGE_CAMPAIGN,
    buildCaLiveAnnounceSlots,
  } = await import("../src/lib/x-launch-campaign");

  const { data: conns, error: connErr } = await supabaseAdmin
    .from("channel_connections")
    .select("provider, status, scopes, auto_publish")
    .eq("company_id", companyId)
    .in("provider", ["x", "farcaster", "linkedin"]);
  if (connErr) throw connErr;

  for (const provider of ["x", "farcaster"] as const) {
    await supabaseAdmin
      .from("channel_connections")
      .update({ auto_publish: true, last_sync: new Date().toISOString() })
      .eq("company_id", companyId)
      .eq("provider", provider)
      .eq("status", "connected");
  }

  const connected = new Set(
    (conns ?? [])
      .filter((c) => String(c.status) === "connected")
      .map((c) => String(c.provider)),
  );

  const caLive = await seedCaLiveAnnouncePosts(companyId, {
    x: connected.has("x"),
    farcaster: connected.has("farcaster"),
    linkedIn: false, // paste LinkedIn manually until Share scope is live
  });

  await supabaseAdmin.from("activity_events").insert({
    company_id: companyId,
    kind: "publish",
    message: `CA-live announce ${CA_LIVE_ANNOUNCE_CAMPAIGN} (+${caLive.created}, skip ${caLive.skipped})`,
  });

  const os = await seedOsMessageCampaign(companyId, {
    x: connected.has("x"),
    farcaster: connected.has("farcaster"),
  });
  await supabaseAdmin.from("activity_events").insert({
    company_id: companyId,
    kind: "publish",
    message: `OS message blast ${OS_MESSAGE_CAMPAIGN} (+${os.created}, skip ${os.skipped})`,
  });

  let xDrip = { created: 0, skipped: 0 };
  let fcDrip = { created: 0, skipped: 0 };
  if (connected.has("x")) xDrip = await seedLaunchDripSlots(companyId);
  if (connected.has("farcaster")) fcDrip = await seedFarcasterDripSlots(companyId);

  const published = await publishDueChannelPosts(30, companyId);

  const preview = buildCaLiveAnnounceSlots();
  process.stdout.write(
    [
      `company=${companyId}`,
      `connected=${[...connected].join(",") || "(none)"}`,
      `ca-live created=${caLive.created} skipped=${caLive.skipped}`,
      `os-message created=${os.created} skipped=${os.skipped}`,
      `x-drip +${xDrip.created} fc-drip +${fcDrip.created}`,
      `worker published=${published.published} skipped=${published.skipped} errors=${published.errors?.length ?? 0}`,
      "",
      "--- X pin (also queued) ---",
      preview.find((s) => s.provider === "x")?.body ?? "",
      "",
      "--- Farcaster (also queued) ---",
      preview.find((s) => s.provider === "farcaster")?.body ?? "",
      "",
    ].join("\n"),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
