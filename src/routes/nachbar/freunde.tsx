import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Panel, Shimmer } from "@/components/aura/primitives";
import { getNachbarHub } from "@/lib/nachbar.functions";
import { NACHBAR_FRIEND_BONUS } from "@/lib/nachbar";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/nachbar/freunde")({
  head: () => ({ meta: [{ title: "Freunde — Aura Nachbar" }] }),
  component: NachbarFreundePage,
});

function NachbarFreundePage() {
  const [copied, setCopied] = useState(false);
  const { data: hub, isLoading } = useQuery({
    queryKey: ["nachbar-hub"],
    queryFn: () => getNachbarHub(),
  });

  if (isLoading) return <Shimmer className="h-40" />;

  const code = hub?.profile.referral_code || "";
  const link = `${SITE_URL}/nachbar/ref/${code}`;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">Freunde</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Einladen</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Freund checkt zum ersten Mal ein → beide bekommen {NACHBAR_FRIEND_BONUS}.
        </p>
      </div>

      <Panel label="Dein Link" glow>
        <p className="font-mono text-2xl font-semibold tracking-[0.2em]">{code || "—"}</p>
        <p className="mt-2 break-all text-xs text-muted-foreground">{link}</p>
        <button
          type="button"
          className="mt-4 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              toast.success("Link kopiert");
            } catch {
              toast.error("Kopieren nicht möglich");
            }
          }}
        >
          {copied ? "Kopiert" : "Link kopieren"}
        </button>
      </Panel>

      <Panel label="Eingeladen">
        {(hub?.friends?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Noch niemand. Teile deinen Link.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {hub!.friends.map((f) => (
              <li key={f.invitee_id} className="flex justify-between gap-2">
                <span className="truncate font-mono text-xs text-muted-foreground">{f.invitee_id.slice(0, 8)}…</span>
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  {f.status === "activated" ? "Check-in ✓" : "Beigetreten"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
