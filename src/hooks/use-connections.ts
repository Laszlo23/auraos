import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCompany, useCompanyTable } from "@/hooks/use-aura";
import {
  disconnectSocial,
  getLaunchDripStatus,
  getSocialStatus,
  pollFarcasterSigner,
  publishShareClipToX,
  publishSocialNow,
  setSocialReplyMode,
  startFarcasterConnect,
  startLaunchDripCampaign,
  startSocialConnect,
} from "@/lib/social.functions";
import { SHARE_POSTS } from "@/lib/share-posts";
import { supabase } from "@/integrations/supabase/client";
import type { SocialProvider as ServerSocialProvider } from "@/lib/social-oauth.server";

export type SocialProvider = ServerSocialProvider;

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
  canPostVideo?: boolean;
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
  {
    id: "tiktok",
    name: "TikTok",
    glyph: "♪",
    blurb: "Short-form video — share clips and launch moments.",
    agent: "Vela",
  },
  {
    id: "farcaster",
    name: "Farcaster",
    glyph: "FC",
    blurb: "Crypto-native casts for founders and builders.",
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
      if (provider === "farcaster") {
        const popup = window.open("", "aura-social", "width=620,height=760");
        if (!popup) throw new Error("Allow popups to connect your account — one click, then done.");
        try {
          const { approvalUrl, signerUuid, state } = await startFarcasterConnect({
            data: { companyId: company.id },
          });
          popup.location.href = approvalUrl;
          const deadline = Date.now() + 5 * 60_000;
          while (Date.now() < deadline) {
            if (popup.closed) {
              // Keep polling briefly — user may have approved in Warpcast and closed the tab.
            }
            await new Promise((r) => setTimeout(r, 2500));
            const result = await pollFarcasterSigner({
              data: { companyId: company.id, state, signerUuid },
            });
            if (result.approved) {
              try {
                popup.close();
              } catch {
                /* ignore */
              }
              return;
            }
            if (popup.closed && result.status === "revoked") {
              throw new Error("Farcaster connect was cancelled.");
            }
          }
          throw new Error("Timed out waiting for Farcaster approval — open Warpcast and try again.");
        } catch (error) {
          try {
            popup.close();
          } catch {
            /* ignore */
          }
          throw error;
        }
      }

      const popup = window.open("", "aura-social", "width=620,height=760");
      if (!popup) throw new Error("Allow popups to connect your account — one click, then done.");
      try {
        const { authorizationUrl } = await startSocialConnect({
          data: { provider, companyId: company.id },
        });
        const done = waitForPopup(popup);
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

export function usePublishShareClip() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  return useMutation({
    mutationFn: async (input: { sharePostId: string; caption?: string }) => {
      if (!company) throw new Error("No company yet.");
      return publishShareClipToX({
        data: {
          companyId: company.id,
          sharePostId: input.sharePostId,
          ...(input.caption != null ? { caption: input.caption } : {}),
        },
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["table", "channel_posts"] });
      void qc.invalidateQueries({ queryKey: ["table", "activity_events"] });
      void qc.invalidateQueries({ queryKey: ["social-status"] });
    },
  });
}

export const SHARE_CLIP_OPTIONS = SHARE_POSTS.slice(0, 8).map((p) => ({
  id: p.id,
  title: p.title,
}));

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

export function useLaunchDripStatus() {
  const { data: company } = useCompany();
  return useQuery({
    queryKey: ["launch-drip", company?.id],
    enabled: Boolean(company?.id),
    staleTime: 20_000,
    queryFn: () => getLaunchDripStatus({ data: { companyId: company!.id } }),
  });
}

export function useStartLaunchDrip() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  return useMutation({
    mutationFn: async (opts?: { enableAutoReply?: boolean }) => {
      if (!company) throw new Error("No company yet.");
      return startLaunchDripCampaign({
        data: {
          companyId: company.id,
          enableAutoReply: opts?.enableAutoReply !== false,
        },
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["launch-drip"] });
      void qc.invalidateQueries({ queryKey: ["table", "channel_posts"] });
      void qc.invalidateQueries({ queryKey: ["social-status"] });
      void qc.invalidateQueries({ queryKey: ["table", "activity_events"] });
    },
  });
}
