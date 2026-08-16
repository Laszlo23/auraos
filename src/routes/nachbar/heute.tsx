import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { QrCode, Star } from "lucide-react";
import { toast } from "sonner";

import { Celebrate } from "@/components/aura/celebrate";
import { NachbarRatePad } from "@/components/aura/nachbar-note";
import { NachbarWinShare } from "@/components/aura/nachbar-win-share";
import { Chip, Panel, Shimmer } from "@/components/aura/primitives";
import {
  confirmNachbarCheckin,
  ensureNachbarProfile,
  getNachbarCityBoard,
  getNachbarHub,
  leaveNachbarFeedback,
  markNachbarAr,
  rateNachbarShop,
  requestNachbarCheckin,
  requestNachbarCheckinBySlug,
} from "@/lib/nachbar.functions";
import {
  clearNachbarVisit,
  clearNachbarVisitAuto,
  nachbarStatusLabel,
  peekNachbarVisit,
  rememberNachbarVisit,
} from "@/lib/nachbar-play";
import { nachbarHead } from "@/lib/nachbar-seo";
import { NACHBAR_FRIEND_STORAGE_KEY, NACHBAR_STAMP_GOAL } from "@/lib/nachbar";

export const Route = createFileRoute("/nachbar/heute")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { shop?: string } => {
    const raw = typeof search["shop"] === "string" ? search["shop"] : undefined;
    const shop = raw
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 64);
    return shop ? { shop } : {};
  },
  head: () =>
    nachbarHead({
      title: "Heute — Aura Nachbar",
      description:
        "Tägliches Stadt-Spiel: Check-in im Laden, Stempel, Missionen und Nachbar-Note. Keine Belohnung für Google-Sterne.",
      path: "/nachbar/heute",
      index: false,
    }),
  component: NachbarHeutePage,
});

function NachbarHeutePage() {
  const qc = useQueryClient();
  const search = Route.useSearch();
  const [code, setCode] = useState(() => peekNachbarVisit().code);
  const [lastGoogle, setLastGoogle] = useState<string | null>(null);
  const [lastShop, setLastShop] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [arOpen, setArOpen] = useState(false);
  const [note, setNote] = useState("");
  const autoOnce = useRef(false);

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
    retry: 1,
  });
  const board = useQuery({
    queryKey: ["nachbar-city-board"],
    queryFn: () => getNachbarCityBoard(),
    staleTime: 30_000,
  });

  const checkin = useMutation({
    mutationFn: (input: { source: string; value?: string; slug?: string }) =>
      input.slug
        ? requestNachbarCheckinBySlug({ data: { slug: input.slug, source: input.source } })
        : requestNachbarCheckin({ data: { code: input.value || code, source: input.source } }),
    onSuccess: (res) => {
      clearNachbarVisit();
      setLastGoogle(res.google_review_url);
      setLastShop(res.company_name);
      setCelebrate((n) => n + 1);
      toast.success(
        res.pending
          ? `Warte auf Bestätigung bei ${res.company_name}`
          : `Check-in bei ${res.company_name}`,
      );
      void qc.invalidateQueries({ queryKey: ["nachbar-hub"] });
    },
    onError: (e: Error) => {
      clearNachbarVisitAuto();
      toast.error(e.message || "Check-in fehlgeschlagen");
    },
  });
  const confirmOwn = useMutation({
    mutationFn: (checkinId: string) => confirmNachbarCheckin({ data: { checkinId } }),
    onSuccess: (res) => {
      setCelebrate((n) => n + 1);
      toast.success(
        res.self
          ? `Demo bestätigt${res.company_name ? ` · ${res.company_name}` : ""} — Punkte nur für Gäste.`
          : `Bestätigt${res.company_name ? ` · ${res.company_name}` : ""}`,
      );
      void qc.invalidateQueries({ queryKey: ["nachbar-hub"] });
      void qc.invalidateQueries({ queryKey: ["nachbar-city-board"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ar = useMutation({
    mutationFn: () => markNachbarAr({ data: { code } }),
    onSuccess: (res) => {
      toast.success(
        res.granted
          ? `AR-Blick bei ${res.company_name}`
          : res.pending
            ? `Marker gesehen — Laden bestätigt noch`
            : `AR-Blick bei ${res.company_name}`,
      );
      void qc.invalidateQueries({ queryKey: ["nachbar-hub"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const latestConfirmed = (hub?.checkins ?? []).find((c) => c.status === "confirmed");
  const rate = useMutation({
    mutationFn: (score: number) =>
      rateNachbarShop({
        data: { checkinId: latestConfirmed?.id ?? "", score },
      }),
    onSuccess: (res) => {
      toast.success(
        res.granted
          ? `Nachbar-Note ${res.score} — Mission zählt.`
          : `Nachbar-Note ${res.score} gespeichert.`,
      );
      setCelebrate((n) => n + 1);
      void qc.invalidateQueries({ queryKey: ["nachbar-hub"] });
      void qc.invalidateQueries({ queryKey: ["nachbar-city-board"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const feedback = useMutation({
    mutationFn: () =>
      leaveNachbarFeedback({
        data: { checkinId: latestConfirmed?.id ?? "", note },
      }),
    onSuccess: (res) => {
      toast.success(res.granted ? "Feedback ist raus." : "Schon notiert.");
      setNote("");
      void qc.invalidateQueries({ queryKey: ["nachbar-hub"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (autoOnce.current || checkin.isPending) return;
    if (search.shop) rememberNachbarVisit({ shop: search.shop, auto: true });
    const pending = peekNachbarVisit();
    const shop = search.shop || pending.shop;
    if (shop.length >= 2 && pending.auto) {
      autoOnce.current = true;
      checkin.mutate({ source: "shop", slug: shop });
      return;
    }
    if (pending.auto && pending.code.trim().length >= 6) {
      autoOnce.current = true;
      setCode(pending.code);
      checkin.mutate({ source: "qr", value: pending.code });
    }
    // Deep-link / Entdecken auto-submit once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.shop]);

  if (isLoading && !hub) return <Shimmer className="h-40" />;

  const missions = (hub?.missions ?? []).filter((m) => !m.done).slice(0, 3);
  const doneCount = (hub?.missions ?? []).filter((m) => m.done).length;
  const lastStamp = hub?.stamps?.[0];
  const streak = hub?.progress.streak_days ?? 0;
  const justConfirmed = (hub?.checkins ?? []).some((c) => c.status === "confirmed");
  const pendingOwn = (hub?.checkins ?? []).find((c) => c.status === "pending" && c.owned);
  const pendingGuest = (hub?.checkins ?? []).find((c) => c.status === "pending" && !c.owned);
  const cityShops = (board.data?.shops ?? []).slice(0, 8);
  const isFirstVisit = (hub?.checkins?.length ?? 0) === 0 && (hub?.profile.balance ?? 0) === 0;

  return (
    <div className="space-y-5">
      <Celebrate trigger={celebrate} />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">Heute</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Stadt-Spiel</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Echte Besuche. Stempel. Missionen. Keine Fake-Sterne.
        </p>
      </div>

      {isFirstVisit ? (
        <Panel label="So geht’s" glow>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>Im Laden: QR scannen oder Code eingeben</li>
            <li>Warten bis der Tresen bestätigt</li>
            <li>Punkte & Stempel — Google optional, ohne Belohnung</li>
          </ol>
        </Panel>
      ) : null}

      {pendingGuest ? (
        <Panel label="Wartet auf den Tresen" glow>
          <p className="text-sm font-semibold">{pendingGuest.company_name}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            Dein Check-in ist angekommen. Punkte gibt’s erst, wenn jemand im Laden bestätigt —
            am besten vor Ort, nicht von zu Hause.
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {nachbarStatusLabel(pendingGuest.status)}
          </p>
        </Panel>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        <Panel>
          <div className="p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Streak</p>
            <p className="mt-1 font-display text-2xl font-semibold">{streak}</p>
          </div>
        </Panel>
        <Panel>
          <div className="p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Punkte</p>
            <p className="mt-1 font-display text-2xl font-semibold">{hub?.profile.balance ?? 0}</p>
          </div>
        </Panel>
        <Panel>
          <div className="p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">AURA</p>
            <p className="mt-1 font-display text-2xl font-semibold">
              {hub?.progress.aura_weight ?? 0}
            </p>
          </div>
        </Panel>
      </div>

      <Panel label="Missionen" glow>
        {missions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Woche klar — {doneCount} erledigt. Komm morgen wieder.
          </p>
        ) : (
          <ul className="space-y-3">
            {missions.map((m) => (
              <li key={m.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{m.title}</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">{m.body}</p>
                  </div>
                  <Chip tone="gold">+{m.grant_amount}</Chip>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {pendingOwn ? (
        <Panel label="Tresen — du bist der Laden" glow>
          <p className="text-sm font-semibold">{pendingOwn.company_name}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            Dein Check-in wartet. Für die Demo: hier bestätigen. Punkte und Stempel gibt’s nur
            für Gäste — im echten Laden bestätigt der Tresen unter Kunden.
          </p>
          <button
            type="button"
            disabled={confirmOwn.isPending}
            onClick={() => confirmOwn.mutate(pendingOwn.id)}
            className="mt-3 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Besuch bestätigen
          </button>
        </Panel>
      ) : null}

      <Panel label="Check-in">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Am besten im Laden: QR scannen oder Code vom Tresen. Tippen aus der Ferne geht — Punkte
          aber erst nach Bestätigung vor Ort.
        </p>
        {cityShops.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {cityShops.map((shop) => (
              <li key={shop.id}>
                <button
                  type="button"
                  disabled={checkin.isPending || !shop.slug}
                  onClick={() => {
                    if (!shop.slug) return;
                    rememberNachbarVisit({ shop: shop.slug, auto: false });
                    checkin.mutate({ source: "shop", slug: shop.slug });
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/40 px-3 py-2.5 text-left disabled:opacity-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{shop.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {[shop.district, shop.city, shop.niche].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-primary">Los</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Code vom QR"
            className="min-w-0 flex-1 rounded-2xl border border-border/50 bg-background/60 px-4 py-3 font-mono text-sm uppercase tracking-widest outline-none focus:border-primary/50"
            autoCapitalize="characters"
            autoCorrect="off"
          />
          <button
            type="button"
            disabled={checkin.isPending || code.trim().length < 6}
            onClick={() => checkin.mutate({ source: "qr" })}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <QrCode className="h-4 w-4" /> Los
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setArOpen((v) => !v)}
            className="text-[12px] font-semibold text-primary"
          >
            {arOpen ? "Kamera zu" : "AR-Blick"}
          </button>
          {arOpen && code.trim().length >= 6 ? (
            <button
              type="button"
              disabled={ar.isPending}
              onClick={() => ar.mutate()}
              className="text-[12px] font-semibold text-muted-foreground"
            >
              Marker gesehen
            </button>
          ) : null}
        </div>
        {arOpen ? <ArPreview /> : null}
      </Panel>

      {lastStamp ? (
        <Panel label={`Stempel · ${lastStamp.company_name}`}>
          <p className="text-sm">
            {lastStamp.stamp_count}/{NACHBAR_STAMP_GOAL}
            {lastStamp.filled ? " — Karte voll" : ""}
          </p>
          <div className="mt-2 flex gap-1.5">
            {Array.from({ length: NACHBAR_STAMP_GOAL }).map((_, i) => (
              <span
                key={i}
                className={`h-3 flex-1 rounded-full ${
                  i < lastStamp.stamp_count ? "bg-gold" : "bg-foreground/10"
                }`}
              />
            ))}
          </div>
        </Panel>
      ) : null}

      {hub?.next_shop ? (
        <Panel label="Nächster Laden">
          <p className="font-semibold">{hub.next_shop.name}</p>
          <p className="text-[12px] text-muted-foreground">
            {[hub.next_shop.city, hub.next_shop.niche].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm font-semibold">
            {hub.next_shop.slug ? (
              <button
                type="button"
                disabled={checkin.isPending}
                onClick={() =>
                  checkin.mutate({ source: "shop", slug: hub.next_shop!.slug as string })
                }
                className="text-primary"
              >
                Hier einchecken
              </button>
            ) : null}
            {hub.next_shop.slug ? (
              <Link
                to="/b/$slug"
                params={{ slug: hub.next_shop.slug }}
                className="text-muted-foreground"
              >
                Karte
              </Link>
            ) : null}
          </div>
        </Panel>
      ) : null}

      {justConfirmed && lastShop ? (
        <Panel label="Win teilen">
          <p className="mb-2 text-[13px] text-muted-foreground">
            Nach dem Besuch. Teilen allein bringt nichts.
          </p>
          <NachbarWinShare
            shopName={lastShop}
            stamps={
              lastStamp
                ? `${lastStamp.stamp_count}/${NACHBAR_STAMP_GOAL} Stempel`
                : null
            }
            weekDone={doneCount}
          />
        </Panel>
      ) : null}

      {latestConfirmed && !latestConfirmed.rated ? (
        <Panel label="Nachbar-Note" glow>
          <p className="text-sm font-semibold">{latestConfirmed.company_name}</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            1–5 nach dem Besuch. Die Zahl selbst bringt nichts — nur die Mission.
          </p>
          <NachbarRatePad disabled={rate.isPending} onPick={(n) => rate.mutate(n)} />
        </Panel>
      ) : null}

      {latestConfirmed ? (
        <Panel label="Kurzes Feedback">
          <p className="text-[12px] text-muted-foreground">
            An {latestConfirmed.company_name} — kein Google-Stern.
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Was war gut?"
            className="mt-2 w-full rounded-2xl bg-foreground/6 px-3.5 py-2.5 text-[13px] outline-none"
          />
          <button
            type="button"
            disabled={feedback.isPending || note.trim().length < 8}
            onClick={() => feedback.mutate()}
            className="mt-2 rounded-2xl border border-border/50 px-4 py-2 text-xs font-semibold disabled:opacity-40"
          >
            Senden
          </button>
        </Panel>
      ) : null}

      {lastGoogle ? (
        <Panel label="Optional">
          <p className="text-sm text-muted-foreground">
            Google bleibt optional — dafür gibt es{" "}
            <strong className="text-foreground">keine</strong> Belohnung.
          </p>
          <a
            href={lastGoogle}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-border/50 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <Star className="h-4 w-4 opacity-70" /> Optional: Google öffnen
          </a>
        </Panel>
      ) : null}

      {(hub?.checkins?.length ?? 0) > 0 ? (
        <Panel label="Deine Check-ins">
          <ul className="space-y-2">
            {hub!.checkins.slice(0, 8).map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <span className="min-w-0 truncate font-medium">{c.company_name}</span>
                <span className="shrink-0 text-muted-foreground">{nachbarStatusLabel(c.status)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel label="Stadt-Loop">
        <p className="text-sm text-muted-foreground">
          Entdecken → Check-in → Note → Freund mitbringen. Ohne Firma.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
          <Link to="/nachbar/entdecken" className="text-primary">
            Karte →
          </Link>
          <Link to="/nachbar/freunde" className="text-muted-foreground">
            Freunde
          </Link>
        </div>
      </Panel>

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

function ArPreview() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const video = videoRef.current;
    if (!video || !navigator.mediaDevices?.getUserMedia) return;
    void navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((s) => {
        stream = s;
        video.srcObject = s;
        void video.play();
      })
      .catch(() => undefined);
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="relative mt-3 overflow-hidden rounded-2xl border border-border/40 bg-black">
      <video ref={videoRef} playsInline muted className="h-48 w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="h-28 w-28 rounded-2xl border-2 border-gold/80" />
      </div>
      <p className="absolute bottom-2 left-0 right-0 text-center text-[11px] text-white/80">
        Marker / QR am Tresen in den Rahmen
      </p>
    </div>
  );
}
