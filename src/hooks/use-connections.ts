import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCompany, useCompanyTable } from "@/hooks/use-aura";
import {
  disconnectSocial,
  getSocialStatus,
  publishSocialNow,
  setSocialReplyMode,
  startSocialConnect,
} from "@/lib/social.functions";
import { supabase } from "@/integrations/supabase/client";

export type SocialProvider = "x" | "meta" | "linkedin";

export type ChannelRow = {
  id: string;
  provider: string;
  handle: string | null;
  status: string;
  followers: number;
  engagement: number;
  reach: number;
  auto_publish: boolean;
  agent_name: string | null;
  last_sync: string | null;
  reply_mode?: string;
};

export type SocialStatus = {
  provider: SocialProvider;
  available: boolean;
  connected: boolean;
  needsReconnect?: boolean;
  handle: string | null;
  followers: number;
  engagement: number;
  reach: number;
  auto_publish: boolean;
  agent_name: string | null;
  last_sync: string | null;
  reply_mode: string;
  meta_page_name: string | null;
  has_instagram: boolean;
  connection_id: string | null;
};

export const SOCIALS: {
  id: SocialProvider;
  name: string;
  glyph: string;
  blurb: string;
  agent: string;
}[] = [
  {
    id: "x",
    name: "X",
    glyph: "𝕏",
    blurb: "Real-time voice, threads, replies, launch moments.",
    agent: "Vela",
  },
  {
    id: "meta",
    name: "Meta",
    glyph: "∞",
    blurb: "Facebook Page + Instagram — reach and community.",
    agent: "Vela",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    glyph: "in",
    blurb: "B2B credibility, partners and hiring.",
    agent: "Orin",
  },
];

export function useChannels() {
  return useCompanyTable<ChannelRow>("channel_connections");
}

export function useSocialStatus() {
  const { data: company } = useCompany();
  return useQuery({
    queryKey: ["social-status", company?.id],
    enabled: Boolean(company?.id),
    staleTime: 15_000,
    queryFn: () => getSocialStatus({ data: { companyId: company!.id } }) as Promise<SocialStatus[]>,
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
      if (type !== "socialConnected" && type !== "socialFailed") return;
      cleanup();
      if (type === "socialConnected") resolve();
      else {
        popup.close();
        const err = (event.data as { error?: string } | null)?.error;
        reject(new Error(err || "The social connection failed."));
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

/** One-tap popup OAuth — same ease as mailbox connect. */
export function useConnectChannel() {
  const qc = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (provider: SocialProvider) => {
      if (!company) throw new Error("No company yet.");
      const popup = window.open("", "aura-social", "width=620,height=760");
      if (!popup) throw new Error("Allow popups to connect your account — one click, then done.");
      try {
        const { authorizationUrl } = await startSocialConnect({
          data: { provider, companyId: company.id },
        });
        const done = waitForPopup(popup);
        // Pass session cookie by navigating same-origin start URL
        popup.location.href = authorizationUrl;
        await done;
      } catch (error) {
        popup.close();
        throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["social-status"] });
      void qc.invalidateQueries({ queryKey: ["table", "channel_connections"] });
    },
  });
}

export function useDisconnectChannel() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  return useMutation({
    mutationFn: async (provider: SocialProvider) => {
      if (!company) throw new Error("No company yet.");
      await disconnectSocial({ data: { provider, companyId: company.id } });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["social-status"] });
      void qc.invalidateQueries({ queryKey: ["table", "channel_connections"] });
    },
  });
}

export function usePublishSocial() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  return useMutation({
    mutationFn: async (input: { provider: SocialProvider; body: string }) => {
      if (!company) throw new Error("No company yet.");
      return publishSocialNow({
        data: { companyId: company.id, provider: input.provider, body: input.body },
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["table", "channel_posts"] });
      void qc.invalidateQueries({ queryKey: ["table", "tasks"] });
      void qc.invalidateQueries({ queryKey: ["table", "activity_events"] });
    },
  });
}

export function useSetReplyMode() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  return useMutation({
    mutationFn: async (input: { provider: SocialProvider; mode: "off" | "draft" | "auto" }) => {
      if (!company) throw new Error("No company yet.");
      return setSocialReplyMode({
        data: { companyId: company.id, provider: input.provider, mode: input.mode },
      });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["social-status"] }),
  });
}

export function useToggleAutoPublish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (channel: ChannelRow) => {
      const { error } = await supabase
        .from("channel_connections")
        .update({ auto_publish: !channel.auto_publish })
        .eq("id", channel.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["table", "channel_connections"] });
      void qc.invalidateQueries({ queryKey: ["social-status"] });
    },
  });
}
