import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Loader2, Radio, Search, Users } from "lucide-react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/aura/primitives";
import {
  fetchFarcasterChannelFeedFn,
  getFarcasterCapabilities,
  searchFarcasterCastsFn,
  searchFarcasterUsersFn,
} from "@/lib/farcaster.functions";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const CHANNELS = ["base", "crypto", "ai", "founders", "trading"] as const;

export function FarcasterPulse() {
  const caps = useQuery({
    queryKey: ["farcaster-caps"],
    queryFn: () => getFarcasterCapabilities(),
    staleTime: 60_000,
  });
  const [mode, setMode] = useState<"feed" | "search" | "people">("feed");
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("base");
  const [query, setQuery] = useState("Base AI agents");
  const [peopleQ, setPeopleQ] = useState("0xleonardo");
  const [busy, setBusy] = useState(false);

  const feedQ = useQuery({
    queryKey: ["fc-feed", channel],
    queryFn: () => fetchFarcasterChannelFeedFn({ data: { channelId: channel, limit: 10 } }),
    enabled: Boolean(caps.data?.read) && mode === "feed",
    staleTime: 30_000,
  });

  const [searchResults, setSearchResults] = useState<
    Awaited<ReturnType<typeof searchFarcasterCastsFn>>["casts"] | null
  >(null);
  const [people, setPeople] = useState<
    Awaited<ReturnType<typeof searchFarcasterUsersFn>>["users"] | null
  >(null);

  const onSearch = async () => {
    setBusy(true);
    try {
      const res = await searchFarcasterCastsFn({ data: { q: query, limit: 10 } });
      setSearchResults(res.casts);
      setMode("search");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Search failed");
    } finally {
      setBusy(false);
    }
  };

  const onPeople = async () => {
    setBusy(true);
    try {
      const res = await searchFarcasterUsersFn({ data: { q: peopleQ, limit: 8 } });
      setPeople(res.users);
      setMode("people");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "User search failed");
    } finally {
      setBusy(false);
    }
  };

  if (caps.isLoading) return null;
  if (!caps.data?.read) {
    return (
      <Panel label="Farcaster pulse" data-tour="farcaster-pulse">
        <p className="text-[13px] text-muted-foreground">
          Add <code className="text-[11px]">NEYNAR_API_KEY</code> to unlock cast search, channel
          feeds, and profile lookup.
        </p>
      </Panel>
    );
  }

  const casts =
    mode === "feed" ? (feedQ.data?.casts ?? []) : mode === "search" ? (searchResults ?? []) : [];

  return (
    <Panel label="Farcaster pulse" glow data-tour="farcaster-pulse">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground">
          Live Neynar reads — channel feeds, cast search, and people lookup. Casting needs{" "}
          <code className="text-[11px]">NEYNAR_AGENT_ID</code> (one-click) or FID + custody key.
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Chip tone={caps.data.write ? "gold" : "neutral"}>
            {caps.data.write ? "Cast ready" : "Read-only"}
          </Chip>
          <Chip tone="primary">
            <Radio className="h-3 w-3" /> Neynar
          </Chip>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "feed" as const, label: "Channel feed" },
            { id: "search" as const, label: "Search casts" },
            { id: "people" as const, label: "Find people" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setMode(t.id)}
            className={cn(
              "rounded-xl px-3 py-1.5 text-[11px] font-semibold",
              mode === t.id ? "bg-primary/16 text-primary" : "bg-foreground/8 text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {mode === "feed" ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {CHANNELS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c)}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-semibold",
                channel === c ? "bg-gold/16 text-gold" : "bg-foreground/6 text-muted-foreground",
              )}
            >
              /{c}
            </button>
          ))}
        </div>
      ) : null}

      {mode === "search" ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search casts…"
            className="flex-1 rounded-xl bg-foreground/6 px-3 py-2 text-sm outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") void onSearch();
            }}
          />
          <button
            type="button"
            disabled={busy || !query.trim()}
            onClick={() => void onSearch()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Search
          </button>
        </div>
      ) : null}

      {mode === "people" ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={peopleQ}
            onChange={(e) => setPeopleQ(e.target.value)}
            placeholder="@username"
            className="flex-1 rounded-xl bg-foreground/6 px-3 py-2 text-sm outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") void onPeople();
            }}
          />
          <button
            type="button"
            disabled={busy || !peopleQ.trim()}
            onClick={() => void onPeople()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
            Lookup
          </button>
        </div>
      ) : null}

      {mode === "people" ? (
        <div className="mt-5 space-y-3">
          {people == null ? (
            <p className="text-[13px] text-muted-foreground">Search a username to see profile cards.</p>
          ) : people.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No users matched.</p>
          ) : (
            people.map((u) => (
              <a
                key={u.fid}
                href={`https://warpcast.com/${u.username}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 rounded-2xl border border-border/40 px-4 py-3 transition hover:border-primary/30"
              >
                {u.pfpUrl ? (
                  <img
                    src={u.pfpUrl}
                    alt={`${u.username ?? "Farcaster user"} profile photo`}
                    title={u.username ?? "Farcaster profile"}
                    width={40}
                    height={40}
                    loading="lazy"
                    decoding="async"
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-foreground/8 text-[11px]">
                    FC
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {u.displayName}{" "}
                    <span className="text-muted-foreground">@{u.username}</span>
                  </p>
                  <p className="mt-1 line-clamp-2 text-[12px] text-muted-foreground">{u.bio}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {u.followerCount.toLocaleString()} followers · fid {u.fid}
                    {u.score != null ? ` · score ${u.score.toFixed(2)}` : ""}
                  </p>
                </div>
              </a>
            ))
          )}
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {mode === "feed" && feedQ.isLoading ? (
            <p className="inline-flex items-center gap-2 text-[13px] text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading /{channel}…
            </p>
          ) : null}
          {casts.length === 0 && !(mode === "feed" && feedQ.isLoading) ? (
            <p className="text-[13px] text-muted-foreground">
              {mode === "search" ? "Run a search to see casts." : "No casts in this channel right now."}
            </p>
          ) : (
            casts.map((c) => (
              <div
                key={c.hash}
                className="rounded-2xl border border-border/40 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold">@{c.author}</p>
                  <span className="text-[10px] text-muted-foreground">
                    {c.timestamp ? timeAgo(c.timestamp) : ""}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed">{c.text}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  <span>{c.likes} likes</span>
                  <span>{c.recasts} recasts</span>
                  <span>{c.replies} replies</span>
                  {c.channel ? <span>/{c.channel}</span> : null}
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary"
                  >
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </Panel>
  );
}
