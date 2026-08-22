import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Send, Users } from "lucide-react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/aura/primitives";
import { useCompany } from "@/hooks/use-aura";
import { useSocialStatus } from "@/hooks/use-connections";
import {
  fetchLatestCastByFidFn,
  getFarcasterCapabilities,
  lookupFarcasterUserByFidFn,
  searchFarcasterUsersFn,
} from "@/lib/farcaster.functions";
import { FC_BUILDER_CREDITS, fcBuilderCastBody, fcBuilderInviteUrl } from "@/lib/fc-builder";
import {
  listFcBuilderInvites,
  sendFcBuilderInvite,
  type FcBuilderInviteRow,
} from "@/lib/fc-builder.functions";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export function FcBuilderInvites() {
  const { data: company } = useCompany();
  const { data: statuses = [] } = useSocialStatus();
  const fc = statuses.find((s) => s.provider === "farcaster");
  const qc = useQueryClient();
  const caps = useQuery({
    queryKey: ["farcaster-caps"],
    queryFn: () => getFarcasterCapabilities(),
    staleTime: 60_000,
  });
  const invitesQ = useQuery({
    queryKey: ["fc-builder-invites", company?.id],
    queryFn: () => listFcBuilderInvites({ data: { companyId: company!.id } }),
    enabled: Boolean(company?.id),
  });

  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [people, setPeople] = useState<
    Awaited<ReturnType<typeof searchFarcasterUsersFn>>["users"] | null
  >(null);
  const [picked, setPicked] = useState<{
    fid: number;
    username: string;
    displayName: string;
  } | null>(null);
  const [latest, setLatest] = useState<
    Awaited<ReturnType<typeof fetchLatestCastByFidFn>>["cast"] | null
  >(null);
  const [confirm, setConfirm] = useState(false);

  const send = useMutation({
    mutationFn: async () => {
      if (!company || !picked) throw new Error("Pick someone first.");
      return sendFcBuilderInvite({
        data: { companyId: company.id, fid: picked.fid, confirm: true },
      });
    },
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["fc-builder-invites"] });
      if (res.alreadySent) {
        toast.message("Already sent — one invite per FID.");
      } else {
        toast.success(res.replied ? "Replied on their latest cast" : "Posted a personal mention");
      }
      setPicked(null);
      setLatest(null);
      setConfirm(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Send failed"),
  });

  const onSearch = async () => {
    setBusy(true);
    try {
      const trimmed = q.trim().replace(/^@/, "");
      if (/^\d+$/.test(trimmed)) {
        const byFid = await lookupFarcasterUserByFidFn({ data: { fid: Number(trimmed) } });
        setPeople(byFid.user ? [byFid.user] : []);
      } else {
        const res = await searchFarcasterUsersFn({ data: { q: trimmed, limit: 8 } });
        setPeople(res.users);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Search failed");
    } finally {
      setBusy(false);
    }
  };

  const onPick = async (u: { fid: number; username: string; displayName: string }) => {
    setPicked(u);
    setConfirm(false);
    setLatest(null);
    try {
      const res = await fetchLatestCastByFidFn({ data: { fid: u.fid } });
      setLatest(res.cast);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load their latest cast");
    }
  };

  if (caps.isLoading) return null;
  if (!caps.data?.read) return null;

  const previewUrl = picked ? fcBuilderInviteUrl(picked.fid, "preview") : "";
  const previewBody = picked
    ? fcBuilderCastBody({
        username: picked.username,
        fid: picked.fid,
        url: previewUrl.replace("preview", "…"),
      })
    : "";

  return (
    <Panel label="Builder invites · Farcaster" glow data-tour="fc-builder-invites">
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Pick someone by name or FID. We reply on their latest cast from our connected account —
        personal link, {FC_BUILDER_CREDITS} test AURA after they sign in. Seat stays $99. One FID,
        one invite.
      </p>
      {!fc?.connected ? (
        <p className="mt-3 rounded-2xl bg-gold/10 px-3 py-2 text-[12px] text-gold">
          Connect Farcaster above first. We cannot post as them — only reply from our account.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void onSearch();
          }}
          placeholder="username or fid"
          className="min-w-[12rem] flex-1 rounded-2xl border border-border/50 bg-background/60 px-3 py-2 text-[13px]"
        />
        <button
          type="button"
          disabled={busy || !q.trim()}
          onClick={() => void onSearch()}
          className="inline-flex items-center gap-1.5 rounded-2xl border border-border/50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Users className="h-3.5 w-3.5" />
          )}
          Find
        </button>
      </div>

      {people && people.length > 0 ? (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {people.map((u) => (
            <li key={u.fid}>
              <button
                type="button"
                onClick={() => void onPick(u)}
                className={cn(
                  "w-full rounded-2xl border px-3 py-2 text-left transition-colors",
                  picked?.fid === u.fid
                    ? "border-primary/50 bg-primary/10"
                    : "border-border/40 bg-foreground/4 hover:border-border",
                )}
              >
                <span className="block text-[13px] font-semibold">
                  {u.displayName || u.username}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  @{u.username} · fid {u.fid}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {picked ? (
        <div className="mt-4 space-y-3 rounded-2xl border border-border/40 bg-background/50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Preview · @{picked.username}
          </p>
          {latest ? (
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Latest cast: “{latest.text.slice(0, 180)}
              {latest.text.length > 180 ? "…" : ""}”
            </p>
          ) : (
            <p className="text-[13px] text-muted-foreground">
              No casts yet — we’ll post a standalone mention instead.
            </p>
          )}
          <pre className="whitespace-pre-wrap rounded-2xl bg-foreground/5 p-3 font-sans text-[12px] leading-relaxed text-muted-foreground">
            {previewBody}
          </pre>
          <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
            />
            Reply on their wall (latest cast) from our account
          </label>
          <button
            type="button"
            disabled={!confirm || !fc?.connected || send.isPending}
            onClick={() => send.mutate()}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground disabled:opacity-50"
          >
            {send.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Send personal invite
          </button>
        </div>
      ) : null}

      <InviteList rows={invitesQ.data?.invites ?? []} />
    </Panel>
  );
}

function InviteList({ rows }: { rows: FcBuilderInviteRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-5 space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Sent
      </p>
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/40 px-3 py-2"
        >
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold">
              @{row.username} · fid {row.fid}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {row.credits} AURA · {timeAgo(row.created_at)}
              {row.feedback ? ` · “${row.feedback.slice(0, 80)}”` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Chip tone={row.status === "feedback" ? "gold" : "neutral"}>{row.status}</Chip>
            {row.cast_url ? (
              <a
                href={row.cast_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
