import nodemailer from "nodemailer";

import type { SmtpConfig } from "@/lib/smtp.server";
import { sendViaSmtp } from "@/lib/smtp.server";

/** Optional Aura-branded SMTP for digests (Aura → client inbox). */
export function platformSmtpConfigured(): boolean {
  return Boolean(
    process.env["PLATFORM_SMTP_HOST"]?.trim() &&
    process.env["PLATFORM_SMTP_USER"]?.trim() &&
    process.env["PLATFORM_SMTP_PASS"]?.trim() &&
    process.env["PLATFORM_SMTP_FROM"]?.trim(),
  );
}

export function loadPlatformSmtpConfig(): SmtpConfig | null {
  if (!platformSmtpConfigured()) return null;
  let host = process.env["PLATFORM_SMTP_HOST"]!.trim();
  // Hostinger (and others) expose imap.* for mailboxes — that is not SMTP.
  // Mis-pointing here yields ECONNRESET and silent digest failures.
  if (/^imap\./i.test(host)) {
    const smtpHost = host.replace(/^imap\./i, "smtp.");
    console.warn(
      `[platform-mail] PLATFORM_SMTP_HOST=${host} looks like IMAP; using ${smtpHost} instead`,
    );
    host = smtpHost;
  }
  const user = process.env["PLATFORM_SMTP_USER"]!.trim();
  const pass = process.env["PLATFORM_SMTP_PASS"]!.trim();
  const from = process.env["PLATFORM_SMTP_FROM"]!.trim();
  const port = Number(process.env["PLATFORM_SMTP_PORT"]?.trim() || "465");
  const secureEnv = process.env["PLATFORM_SMTP_SECURE"]?.trim().toLowerCase();
  const secure =
    secureEnv === "false" || secureEnv === "0" ? false : port === 465 || secureEnv === "true";
  const fromName = process.env["PLATFORM_SMTP_FROM_NAME"]?.trim() || "Aura OS";
  return {
    host,
    port: Number.isFinite(port) ? port : 465,
    secure,
    username: user,
    password: pass,
    from_name: fromName,
    from_email: from,
  };
}

export async function sendPlatformMail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ via: "platform_smtp" }> {
  const config = loadPlatformSmtpConfig();
  if (!config) {
    throw new Error(
      "PLATFORM_SMTP_* not configured — set host/user/pass/from on the VPS to email digests.",
    );
  }
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.username, pass: config.password },
  });
  const from =
    config.from_name.trim().length > 0
      ? `"${config.from_name.replace(/"/g, "")}" <${config.from_email}>`
      : config.from_email;
  await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    ...(opts.html ? { html: opts.html } : {}),
  });
  return { via: "platform_smtp" };
}

/**
 * Prefer Aura platform SMTP; fall back to the company owner's connected SMTP
 * (still delivers into the client's inbox).
 */
export async function sendDigestMail(opts: {
  companyId: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ via: "platform_smtp" | "company_smtp" }> {
  if (platformSmtpConfigured()) {
    await sendPlatformMail(opts);
    return { via: "platform_smtp" };
  }
  const { loadSmtpConfigForCompanyOwner } = await import("@/lib/smtp.server");
  const mail = await loadSmtpConfigForCompanyOwner(opts.companyId);
  if (!mail) {
    throw new Error(
      "No mail route: set PLATFORM_SMTP_* or connect SMTP under Channels / Connect for this company.",
    );
  }
  await sendViaSmtp({
    config: mail.config,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
  });
  return { via: "company_smtp" };
}
