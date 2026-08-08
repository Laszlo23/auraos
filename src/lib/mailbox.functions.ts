import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MailboxProvider = "google_mail" | "microsoft_outlook";

const CLIENT_ENV: Record<MailboxProvider, string> = {
  google_mail: "GOOGLE_MAIL_APP_USER_CONNECTOR_CLIENT_API_KEY",
  microsoft_outlook: "MICROSOFT_OUTLOOK_APP_USER_CONNECTOR_CLIENT_API_KEY",
};

const SCOPES: Record<MailboxProvider, string[]> = {
  google_mail: [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/gmail.send",
  ],
  microsoft_outlook: ["openid", "profile", "email", "offline_access", "Mail.Send", "User.Read"],
};

const isProvider = (v: unknown): v is MailboxProvider =>
  v === "google_mail" || v === "microsoft_outlook";

/** Which mailbox providers are configured for this app, and what the user has connected. */
export const getMailboxStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listConnectorsForUser } = await import("@/server/appUserConnections.server");
    const rows = await listConnectorsForUser(context.userId);
    const providers: MailboxProvider[] = ["google_mail", "microsoft_outlook"];
    return providers.map((id) => {
      const row = rows.find((r) => r.connector_id === id);
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
    if (!isProvider(input.provider)) throw new Error("Unknown mailbox provider");
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
    if (!isProvider(connectorId)) throw new Error("Unexpected connector");

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
    const { disconnectAppUser, GATEWAY_BASE_URL } =
      await import("@/integrations/lovable/appUserConnector");
    const { getConnectionKeyForUser, deleteConnectionForUser } =
      await import("@/server/appUserConnections.server");
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
