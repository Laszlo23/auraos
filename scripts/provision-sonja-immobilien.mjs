/**
 * Sonja Immobilien — OS Founding Seat (€299/Jahr Bar) · Leads + Social · no Google.
 * Prefer: scripts/fix-sonja-to-os-founding.mjs if account already exists.
 * Fresh: node --env-file=.env scripts/provision-sonja-immobilien.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const EMAIL = "investment.sn@yahoo.com";
const FULL_NAME = "Sonja";
const COMPANY_NAME = "Sonja Immobilien";
const SLUG = "sonja-immobilien";
const AMOUNT_CENTS = 29_900;
const SITE = process.env.SITE_URL?.trim() || "https://aibusiness.fun";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function tempPassword() {
  return `Sonja-${randomBytes(4).toString("hex")}!`;
}

async function main() {
  console.error(
    "This script is deprecated for Local Seat setup.\nRun: node --env-file=.env scripts/fix-sonja-to-os-founding.mjs\nOr reset password only below.",
  );

  const password = tempPassword();
  const existing = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const user = existing.data?.users?.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());
  if (!user) {
    console.error("User not found — create via fix script after createUser, or re-run full OS provision.");
    process.exit(1);
  }
  await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  console.log(JSON.stringify({ email: EMAIL, tempPassword: password, console: `${SITE}/console` }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
