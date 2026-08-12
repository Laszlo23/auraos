import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getFarcasterCapabilities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { neynarApiConfigured, farcasterWriteConfigured } =
      await import("@/lib/farcaster-neynar.server");
    return {
      read: neynarApiConfigured(),
      write: farcasterWriteConfigured(),
    };
  });

export const searchFarcasterCastsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: { q: string; limit?: number }) => ({
    q: String(input.q ?? "").slice(0, 120),
    limit: Math.min(25, Math.max(1, Number(input.limit ?? 12))),
  }))
  .handler(async ({ data }) => {
    const { neynarApiConfigured, searchFarcasterCasts } =
      await import("@/lib/farcaster-neynar.server");
    if (!neynarApiConfigured()) throw new Error("NEYNAR_API_KEY is not set");
    const casts = await searchFarcasterCasts(data.q, data.limit);
    return { casts };
  });

export const fetchFarcasterChannelFeedFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: { channelId?: string; limit?: number }) => ({
    channelId: String(input.channelId ?? "base").slice(0, 64),
    limit: Math.min(25, Math.max(1, Number(input.limit ?? 12))),
  }))
  .handler(async ({ data }) => {
    const { neynarApiConfigured, fetchChannelFeed } = await import("@/lib/farcaster-neynar.server");
    if (!neynarApiConfigured()) throw new Error("NEYNAR_API_KEY is not set");
    const casts = await fetchChannelFeed(data.channelId, data.limit);
    return { channelId: data.channelId, casts };
  });

export const searchFarcasterUsersFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: { q: string; limit?: number }) => ({
    q: String(input.q ?? "").slice(0, 64),
    limit: Math.min(20, Math.max(1, Number(input.limit ?? 8))),
  }))
  .handler(async ({ data }) => {
    const { neynarApiConfigured, searchFarcasterUsers } =
      await import("@/lib/farcaster-neynar.server");
    if (!neynarApiConfigured()) throw new Error("NEYNAR_API_KEY is not set");
    const users = await searchFarcasterUsers(data.q, data.limit);
    return { users };
  });
