import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MailboxProvider = "google_mail" | "microsoft_outlook" | "smtp";

export type SmtpConnectInput = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  from_name: string;
  from_email: string;
};

const CLIENT_ENV: Record<"google_mail" | "microsoft_outlook", string> = {
  google_mail: "GOOGLE_MAIL_APP_USER_CONNECTOR_CLIENT_API_KEY",
  microsoft_outlook: "MICROSOFT_OUTLOOK_APP_USER_CONNECTOR_CLIENT_API_KEY",
};

const SCOPES: Record<"google_mail" | "microsoft_outlook", string[]> = {
  google_mail: [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/gmail.send",
  ],
  microsoft_outlook: ["openid", "profile", "email", "offline_access", "Mail.Send", "User.Read"],
};

const isOAuthProvider = (v: unknown): v is "google_mail" | "microsoft_outlook" =>
  v === "google_mail" || v === "microsoft_outlook";

const isProvider = (v: unknown): v is MailboxProvider =>
  isOAuthProvider(v) || v === "smtp";

function normalizeSmtpInput(input: SmtpConnectInput): SmtpConnectInput {
  const host = String(input.host ?? "").trim();
  const port = Number(input.port);
  const username = String(input.username ?? "").trim();
  const password = String(input.password ?? "");
  const from_email = String(input.from_email ?? "").trim().toLowerCase();
  const from_name = String(input.from_name ?? "").trim();
  if (!host) throw new Error("SMTP host is required.");
  if (!Number.isFinite(port) || port < 1 || port > 65535) throw new Error("SMTP port is invalid.");
  if (!username) throw new Error("SMTP username is required.");
  if (!password) throw new Error("SMTP password is required.");
  if (!from_email || !from_email.includes("@")) throw new Error("From email is required.");
  return {
    host,
    port,
    secure: Boolean(input.secure),
    username,
    password,
    from_name,
    from_email,
  };
}

/** Which mailbox providers are configured for this app, and what the user has connected. */
export const getMailboxStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listConnectorsForUser } = await import("@/server/appUserConnections.server");
    const rows = await listConnectorsForUser(context.userId);
    const providers: MailboxProvider[] = ["google_mail", "microsoft_outlook", "smtp"];
    return providers.map((id) => {
      const row = rows.find((r) => r.connector_id === id);
      if (id === "smtp") {
        return {
          provider: id,
          available: true,
          connected: Boolean(row),
          account: row?.account_label ?? null,
        };
      }
      return {
        provider: id,
        available: Boolean(process.env[CLIENT_ENV[id]]),
        connected: Boolean(row),
        account: row?.account_label ?? null,
      };
    });
  });

export const startMailboxConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: string }) => {
    if (!isOAuthProvider(input.provider)) {
      throw new Error("Use connectSmtp for username/password SMTP.");
    }
    return { provider: input.provider };
  })
  .handler(async ({ data, context }) => {
    const clientKey = process.env[CLIENT_ENV[data.provider]];
    if (!clientKey) throw new Error("This mailbox provider is not configured yet.");
    const request = getRequest();
    if (!request) throw new Error("Connect must start from an app request.");

    const { authorizeAppUserOAuth, GATEWAY_BASE_URL } =
      await import("@/integrations/lovable/appUserConnector");
    const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    const existing = await getConnectionKeyForUser(context.userId, data.provider);

    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: data.provider,
      appUserId: context.userId,
      clientAPIKey: clientKey,
      returnUrl: new URL("/oauth/mailbox/return", request.url).toString(),
      connectionAPIKey: existing ?? undefined,
      credentialsConfiguration: { scopes: SCOPES[data.provider] },
    });
    return { authorizationUrl };
  });

export const connectSmtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SmtpConnectInput) => normalizeSmtpInput(input))
  .handler(async ({ data, context }) => {
    const { encodeSmtpSecrets } = await import("@/lib/smtp.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ciphertext = encodeSmtpSecrets(data);
    const label = data.from_email;
    const { error } = await supabaseAdmin.from("app_user_connections").upsert(
      {
        user_id: context.userId,
        connector_id: "smtp",
        connection_key_ciphertext: ciphertext,
        account_label: label,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,connector_id" },
    );
    if (error) throw error;
    return { ok: true as const, account: label };
  });

export const sendSmtpTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadSmtpConfigForUser, sendViaSmtp } = await import("@/lib/smtp.server");
    const config = await loadSmtpConfigForUser(context.userId);
    if (!config) throw new Error("Connect SMTP first.");
    await sendViaSmtp({
      config,
      to: config.from_email,
      subject: "Aura OS — SMTP test",
      text: "Your SMTP mailbox is connected. Agents still draft; you approve sends.",
    });
    return { ok: true as const, to: config.from_email };
  });

export const completeMailboxConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => ({ code: String(input.code) }))
  .handler(async ({ data, context }) => {
    const { exchangeAppUserOAuthCode, callAsAppUser, GATEWAY_BASE_URL } =
      await import("@/integrations/lovable/appUserConnector");
    const { saveConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(
      GATEWAY_BASE_URL,
      data.code,
    );
    if (!isOAuthProvider(connectorId)) throw new Error("Unexpected connector");

    let label: string | undefined;
    try {
      const res = await callAsAppUser({
        gatewayBaseUrl: GATEWAY_BASE_URL,
        connectionAPIKey,
        connectorId,
        path:
          connectorId === "google_mail"
            ? "/gmail/v1/users/me/profile"
            : "/me?$select=mail,userPrincipalName",
      });
      if (res.ok) {
        const body = (await res.json()) as {
          emailAddress?: string;
          mail?: string;
          userPrincipalName?: string;
        };
        label = body.emailAddress ?? body.mail ?? body.userPrincipalName;
      }
    } catch {
      label = undefined;
    }

    await saveConnectionKeyForUser(context.userId, connectorId, connectionAPIKey, label);
    return { ok: true, provider: connectorId, account: label ?? null };
  });

export const disconnectMailbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: string }) => {
    if (!isProvider(input.provider)) throw new Error("Unknown mailbox provider");
    return { provider: input.provider };
  })
  .handler(async ({ data, context }) => {
    const { deleteConnectionForUser, getConnectionKeyForUser } =
      await import("@/server/appUserConnections.server");
    if (data.provider === "smtp") {
      await deleteConnectionForUser(context.userId, "smtp");
      return { ok: true };
    }
    const { disconnectAppUser, GATEWAY_BASE_URL } =
      await import("@/integrations/lovable/appUserConnector");
    const key = await getConnectionKeyForUser(context.userId, data.provider);
    if (key) {
      await disconnectAppUser({
        gatewayBaseUrl: GATEWAY_BASE_URL,
        connectionAPIKey: key,
        connectorId: data.provider,
      });
    }
    await deleteConnectionForUser(context.userId, data.provider);
    return { ok: true };
  });
