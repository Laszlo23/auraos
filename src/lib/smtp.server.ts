import nodemailer from "nodemailer";

import { decryptConnectionKey, encryptConnectionKey } from "@/server/connectionKeyCrypto";

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  from_name: string;
  from_email: string;
};

export function encodeSmtpSecrets(config: SmtpConfig): string {
  return encryptConnectionKey(JSON.stringify(config));
}

export function decodeSmtpSecrets(ciphertext: string): SmtpConfig {
  const raw = JSON.parse(decryptConnectionKey(ciphertext)) as Partial<SmtpConfig>;
  if (
    !raw.host ||
    !raw.port ||
    !raw.username ||
    !raw.password ||
    !raw.from_email ||
    typeof raw.secure !== "boolean"
  ) {
    throw new Error("Stored SMTP config is incomplete.");
  }
  return {
    host: String(raw.host),
    port: Number(raw.port),
    secure: Boolean(raw.secure),
    username: String(raw.username),
    password: String(raw.password),
    from_name: String(raw.from_name ?? ""),
    from_email: String(raw.from_email),
  };
}

export async function sendViaSmtp(opts: {
  config: SmtpConfig;
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: opts.config.host,
    port: opts.config.port,
    secure: opts.config.secure,
    auth: {
      user: opts.config.username,
      pass: opts.config.password,
    },
  });

  const from =
    opts.config.from_name.trim().length > 0
      ? `"${opts.config.from_name.replace(/"/g, "")}" <${opts.config.from_email}>`
      : opts.config.from_email;

  await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
  });
}

export async function loadSmtpConfigForUser(userId: string): Promise<SmtpConfig | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("app_user_connections")
    .select("connection_key_ciphertext")
    .eq("user_id", userId)
    .eq("connector_id", "smtp")
    .maybeSingle();
  if (error) throw error;
  if (!data?.connection_key_ciphertext) return null;
  return decodeSmtpSecrets(data.connection_key_ciphertext);
}

export async function loadSmtpConfigForCompanyOwner(
  companyId: string,
): Promise<{ userId: string; config: SmtpConfig } | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("owner_id")
    .eq("id", companyId)
    .maybeSingle();
  if (!company?.owner_id) return null;
  const config = await loadSmtpConfigForUser(company.owner_id);
  if (!config) return null;
  return { userId: company.owner_id, config };
}
