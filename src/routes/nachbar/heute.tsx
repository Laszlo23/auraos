import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { QrCode, Star } from "lucide-react";
import { toast } from "sonner";

import { Panel, Shimmer } from "@/components/aura/primitives";
import {
  ensureNachbarProfile,
  getNachbarHub,
  requestNachbarCheckin,
} from "@/lib/nachbar.functions";
import { NACHBAR_CHECKIN_STORAGE_KEY, NACHBAR_FRIEND_STORAGE_KEY } from "@/lib/nachbar";

export const Route = createFileRoute("/nachbar/heute")({
  head: () => ({ meta: [{ title: "Heute — Aura Nachbar" }] }),
  component: NachbarHeutePage,
});

function NachbarHeutePage() {
  const qc = useQueryClient();
  const [code, setCode] = useState(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem(NACHBAR_CHECKIN_STORAGE_KEY) || "";
  });
  const [lastGoogle, setLastGoogle] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    if (bootstrapped) return;
    setBootstrapped(true);
    const friend = localStorage.getItem(NACHBAR_FRIEND_STORAGE_KEY) || undefined;
    void ensureNachbarProfile({
      data: friend ? { friendCode: friend } : {},
    })
      .then(() => {
        if (friend) localStorage.removeItem(NACHBAR_FRIEND_STORAGE_KEY);
        void qc.invalidateQueries({ queryKey: ["nachbar-hub"] });
      })
      .catch(() => {
        /* profile created on first hub fetch */
      });
  }, [bootstrapped, qc]);

  const { data: hub, isLoading } = useQuery({
    queryKey: ["nachbar-hub"],
    queryFn: () => getNachbarHub(),
  });

  const checkin = useMutation({
    mutationFn: () => requestNachbarCheckin({ data: { code, source: "qr" } }),
    onSuccess: (res) => {
      sessionStorage.removeItem(NACHBAR_CHECKIN_STORAGE_KEY);
      setLastGoogle(res.google_review_url);
      toast.success(
        res.pending
          ? `Warte auf Bestätigung bei ${res.company_name}`
          : `Check-in bei ${res.company_name}`,
      );
      void qc.invalidateQueries({ queryKey: ["nachbar-hub"] });
    },
    onError: (e: Error) => toast.error(e.message || "Check-in fehlgeschlagen"),
  });

  if (isLoading) return <Shimmer className="h-40" />;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">Heute</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Check-in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Scan den QR am Tresen oder tippe den Laden-Code. Belohnung nur für den Besuch — nicht für
          Google-Sterne.
        </p>
      </div>

      <Panel label="Laden-Code" glow>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="z. B. ABCD1234"
            className="flex-1 rounded-2xl border border-border/50 bg-background/60 px-4 py-3 font-mono text-sm uppercase tracking-widest outline-none focus:border-primary/50"
            autoCapitalize="characters"
            autoCorrect="off"
          />
          <button
            type="button"
            disabled={checkin.isPending || code.trim().length < 6}
            onClick={() => checkin.mutate()}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <QrCode className="h-4 w-4" /> Los
          </button>
        </div>
      </Panel>

      {lastGoogle ? (
        <Panel label="Optional">
          <p className="text-sm text-muted-foreground">
            Wenn es dir gefallen hat, kannst du optional Google Bescheid sagen — dafür gibt es{" "}
            <strong className="text-foreground">keine</strong> Belohnung.
          </p>
          <a
            href={lastGoogle}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-2.5 text-sm font-semibold"
          >
            <Star className="h-4 w-4 text-gold" /> Optional: Google öffnen
          </a>
        </Panel>
      ) : null}

      {(hub?.checkins?.length ?? 0) > 0 ? (
        <Panel label="Deine Check-ins">
          <ul className="space-y-2">
            {hub!.checkins.slice(0, 8).map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{c.company_name}</span>
                <span className="text-muted-foreground">
                  {c.status === "pending" ? "Wartet auf den Laden" : c.status}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel label="Deine Läden">
        {(hub?.shops?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Läden.{" "}
            <Link to="/nachbar/entdecken" className="font-semibold text-primary">
              Entdecken →
            </Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {hub!.shops.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{s.name}</span>
                <span className="text-muted-foreground">
                  {[s.city, s.niche].filter(Boolean).join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
