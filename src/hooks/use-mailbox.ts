import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  connectSmtp,
  disconnectMailbox,
  getMailboxStatus,
  getSmtpSettings,
  sendSmtpTest,
  startMailboxConnect,
  type MailboxProvider,
  type SmtpConnectInput,
  type SmtpSettingsPublic,
} from "@/lib/mailbox.functions";

export type MailboxState = {
  provider: MailboxProvider;
  available: boolean;
  connected: boolean;
  account: string | null;
};

export function useMailboxes() {
  return useQuery<MailboxState[]>({
    queryKey: ["mailboxes"],
    queryFn: () => getMailboxStatus() as Promise<MailboxState[]>,
    staleTime: 30_000,
  });
}

export function useSmtpSettings(enabled = true) {
  return useQuery<SmtpSettingsPublic | null>({
    queryKey: ["smtp-settings"],
    queryFn: () => getSmtpSettings() as Promise<SmtpSettingsPublic | null>,
    enabled,
    staleTime: 30_000,
  });
}

function waitForPopup(popup: Window) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(poll);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== popup) return;
      const type = (event.data as { type?: string } | null)?.type;
      if (type !== "mailboxConnected" && type !== "mailboxFailed") return;
      cleanup();
      if (type === "mailboxConnected") resolve();
      else {
        popup.close();
        reject(new Error("The mailbox connection failed."));
      }
    };
    window.addEventListener("message", onMessage);
    const poll = window.setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error("The window closed before the connection finished."));
    }, 500);
  });
}

export function useConnectMailbox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (provider: Exclude<MailboxProvider, "smtp">) => {
      const popup = window.open("", "aura-mailbox", "width=620,height=760");
      if (!popup) throw new Error("Allow popups to connect your mailbox.");
      try {
        const { authorizationUrl } = await startMailboxConnect({ data: { provider } });
        const done = waitForPopup(popup);
        popup.location.href = authorizationUrl;
        await done;
      } catch (error) {
        popup.close();
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mailboxes"] }),
  });
}

export function useConnectSmtp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SmtpConnectInput) => connectSmtp({ data: input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["mailboxes"] });
      void qc.invalidateQueries({ queryKey: ["smtp-settings"] });
    },
  });
}

export function useSendSmtpTest() {
  return useMutation({
    mutationFn: () => sendSmtpTest(),
  });
}

export function useDisconnectMailbox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (provider: MailboxProvider) => disconnectMailbox({ data: { provider } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["mailboxes"] });
      void qc.invalidateQueries({ queryKey: ["smtp-settings"] });
    },
  });
}
