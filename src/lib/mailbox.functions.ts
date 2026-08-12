import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

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

export type SmtpSettingsPublic = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
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

const isProvider = (v: unknown): v is MailboxProvider => isOAuthProvider(v) || v === "smtp";

const smtpConnectSchema = z.object({
  host: z.string().trim().min(1, "SMTP host is required."),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().trim().min(1, "SMTP username is required."),
  /** Empty string keeps the previously stored password when updating. */
  password: z.string(),
  from_name: z.string().trim(),
  from_email: z.string().trim().toLowerCase().email("From email is required."),
});

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

/** Non-secret SMTP fields for the Connect form (password never leaves the server). */
export const getSmtpSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SmtpSettingsPublic | null> => {
    const { loadSmtpConfigForUser } = await import("@/lib/smtp.server");
    const config = await loadSmtpConfigForUser(context.userId);
    if (!config) return null;
    return {
      host: config.host,
      port: config.port,
      secure: config.secure,
      username: config.username,
      from_name: config.from_name,
      from_email: config.from_email,
    };
  });

export const startMailboxConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const provider = (input as { provider?: string })?.provider;
    if (!isOAuthProvider(provider)) {
      throw new Error("Use connectSmtp for username/password SMTP.");
    }
    return { provider };
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
  .validator((input: unknown) => smtpConnectSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { encodeSmtpSecrets, loadSmtpConfigForUser } = await import("@/lib/smtp.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let password = data.password;
    if (!password) {
      const existing = await loadSmtpConfigForUser(context.userId);
      if (!existing?.password) throw new Error("SMTP password is required.");
      password = existing.password;
    }

    const ciphertext = encodeSmtpSecrets({ ...data, password });
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
  .validator((input: unknown) => z.object({ code: z.string().min(1) }).parse(input))
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
  .validator((input: unknown) => {
    const provider = (input as { provider?: string })?.provider;
    if (!isProvider(provider)) throw new Error("Unknown mailbox provider");
    return { provider };
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
