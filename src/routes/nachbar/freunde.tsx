import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { NachbarWinShare } from "@/components/aura/nachbar-win-share";
import { Panel, Shimmer } from "@/components/aura/primitives";
import { getNachbarHub } from "@/lib/nachbar.functions";
import { friendStatusLabel } from "@/lib/nachbar-play";
import { NACHBAR_FRIEND_BONUS } from "@/lib/nachbar";
import { nachbarHead } from "@/lib/nachbar-seo";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/nachbar/freunde")({
  ssr: false,
  head: () =>
    nachbarHead({
      title: "Freunde — Aura Nachbar",
      description:
        "Freunde mitbringen. Bonus erst nach dem ersten echten Check-in — beide Seiten, kein Fake.",
      path: "/nachbar/freunde",
      index: false,
    }),
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
  const waiting = (hub?.friends ?? []).filter((f) => f.status !== "activated");
  const arrived = (hub?.friends ?? []).filter((f) => f.status === "activated");

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          Freunde
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Mitbringen</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Zahlt erst, wenn die Person wirklich eincheckt — beide +{NACHBAR_FRIEND_BONUS}.
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
        <div className="mt-3">
          <NachbarWinShare shopName="Komm mit nach Wien" />
        </div>
      </Panel>

      <Panel label="Wartet auf den ersten Besuch">
        {waiting.length === 0 ? (
          <p className="text-sm text-muted-foreground">Niemand in der Warteschlange.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {waiting.map((f) => (
              <li key={f.invitee_id} className="flex justify-between gap-2">
                <span className="truncate font-medium">{f.display_name || "Nachbar"}</span>
                <span className="text-[11px] text-muted-foreground">
                  {friendStatusLabel(f.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel label="Schon da">
        {arrived.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch kein bestätigter Freund-Check-in.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {arrived.map((f) => (
              <li key={f.invitee_id} className="flex justify-between gap-2">
                <span className="truncate font-medium">{f.display_name || "Nachbar"}</span>
                <span className="text-[11px] font-semibold text-primary">
                  {friendStatusLabel(f.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
