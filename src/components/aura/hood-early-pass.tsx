import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import {
  checkHoodEarlyPermit,
  getHoodEarlyStatus,
  unlockHoodEarlyMint,
} from "@/lib/hood-early.functions";
import {
  HOOD_EARLY_COPY,
  HOOD_EARLY_STORAGE_KEY,
  HOOD_EARLY_SUPPORTER_CAP,
} from "@/lib/hood-early";

function readStoredPermit(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(HOOD_EARLY_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredPermit(permit: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (permit) sessionStorage.setItem(HOOD_EARLY_STORAGE_KEY, permit);
    else sessionStorage.removeItem(HOOD_EARLY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function HoodEarlyPassGate({
  locale = "en",
  onUnlocked,
  compact = false,
}: {
  locale?: "en" | "de";
  onUnlocked?: (unlocked: boolean) => void;
  compact?: boolean;
}) {
  const de = locale === "de";
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  const statusQ = useQuery({
    queryKey: ["hood-early-status"],
    queryFn: () => getHoodEarlyStatus(),
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
  const status = statusQ.data;

  useEffect(() => {
    const permit = readStoredPermit();
    if (!permit) {
      onUnlocked?.(false);
      return;
    }
    let cancelled = false;
    void checkHoodEarlyPermit({ data: { permit } }).then((res) => {
      if (cancelled) return;
      if (res.valid) {
        setUnlocked(true);
        onUnlocked?.(true);
      } else {
        writeStoredPermit(null);
        setUnlocked(false);
        onUnlocked?.(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [onUnlocked]);

  const unlock = useMutation({
    mutationFn: () => unlockHoodEarlyMint({ data: { password } }),
    onSuccess: (res) => {
      if (!res.ok || !res.permit) {
        const msg =
          res.error === "rate"
            ? de
              ? "Zu viele Versuche — kurz warten."
              : "Too many tries — wait a bit."
            : res.error === "sold_out"
              ? de
                ? HOOD_EARLY_COPY.soldOutDe
                : HOOD_EARLY_COPY.soldOut
              : res.error === "public_open"
                ? de
                  ? HOOD_EARLY_COPY.publicOpenDe
                  : HOOD_EARLY_COPY.publicOpen
                : res.error === "unarmed"
                  ? de
                    ? "Early Pass ist noch nicht konfiguriert."
                    : "Early pass is not configured yet."
                  : de
                    ? "Passwort stimmt nicht."
                    : "Wrong password.";
        toast.error(msg);
        return;
      }
      writeStoredPermit(res.permit);
      setUnlocked(true);
      setPassword("");
      onUnlocked?.(true);
      toast.success(de ? "Early Pass freigeschaltet" : "Early pass unlocked");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (statusQ.isLoading || (statusQ.isFetching && !status)) {
    return (
      <div className="flex items-center gap-2 rounded-[1.4rem] border border-border/40 px-4 py-3 text-[13px] text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {de ? "Early Pass prüfen…" : "Checking early pass…"}
      </div>
    );
  }

  if (status?.publicOpen) {
    return (
      <p className="text-[12px] text-muted-foreground">
        {de ? HOOD_EARLY_COPY.publicOpenDe : HOOD_EARLY_COPY.publicOpen}
      </p>
    );
  }

  if (!status?.configured) {
    return null;
  }

  if (status.earlyOpen === false && (status.slotsLeft ?? 1) <= 0) {
    return (
      <p className="rounded-2xl border border-border/50 px-4 py-3 text-[13px] text-muted-foreground">
        {de ? HOOD_EARLY_COPY.soldOutDe : HOOD_EARLY_COPY.soldOut}
      </p>
    );
  }

  if (unlocked) {
    return (
      <div className={compact ? "hood-panel px-4 py-3" : "rounded-[1.4rem] border border-gold/35 bg-gold/10 px-4 py-3.5"}>
        <p className="label-luxury-gold text-[10px] tracking-[0.22em]">
          {de ? HOOD_EARLY_COPY.kickerDe : HOOD_EARLY_COPY.kicker}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-foreground/90">
          {de
            ? `Freigeschaltet. Noch ${status?.slotsLeft ?? HOOD_EARLY_SUPPORTER_CAP} / ${HOOD_EARLY_SUPPORTER_CAP} Early-Slots.`
            : `Unlocked. ${status?.slotsLeft ?? HOOD_EARLY_SUPPORTER_CAP} / ${HOOD_EARLY_SUPPORTER_CAP} early slots left.`}
        </p>
        <button
          type="button"
          className="mt-2 text-[11px] font-semibold text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => {
            writeStoredPermit(null);
            setUnlocked(false);
            onUnlocked?.(false);
          }}
        >
          {de ? "Passwort-Session beenden" : "Clear pass session"}
        </button>
      </div>
    );
  }

  return (
    <div className={compact ? "hood-panel space-y-3 p-4" : "space-y-3 rounded-[1.4rem] border border-gold/30 bg-hood-stage/70 p-4 sm:p-5"}>
      <div className="flex items-start gap-2">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
        <div>
          <p className="label-luxury-gold text-[10px] tracking-[0.22em]">
            {de ? HOOD_EARLY_COPY.kickerDe : HOOD_EARLY_COPY.kicker}
          </p>
          {!compact ? (
            <>
              <p className="mt-1.5 text-[14px] font-semibold leading-snug">
                {de ? HOOD_EARLY_COPY.titleDe : HOOD_EARLY_COPY.title}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                {de ? HOOD_EARLY_COPY.leadDe : HOOD_EARLY_COPY.lead}
              </p>
            </>
          ) : (
            <p className="mt-1 text-[13px] text-muted-foreground">
              {de ? HOOD_EARLY_COPY.hintDe : HOOD_EARLY_COPY.hint}
            </p>
          )}
          {status?.slotsLeft != null ? (
            <p className="mt-2 font-mono text-[11px] text-gold/90">
              {status.slotsLeft} / {HOOD_EARLY_SUPPORTER_CAP} {de ? "übrig" : "left"}
              {status.totalMinted != null ? ` · ${status.totalMinted} minted` : ""}
            </p>
          ) : null}
        </div>
      </div>
      <label className="block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {de ? "Early-Passwort / Invite" : "Early password / invite"}
      </label>
      <input
        type="password"
        autoComplete="off"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && password.trim()) unlock.mutate();
        }}
        placeholder={de ? "Passwort eingeben" : "Enter password"}
        className="w-full rounded-2xl border border-border/50 bg-background px-4 py-3 text-sm"
      />
      <button
        type="button"
        disabled={unlock.isPending || !password.trim()}
        onClick={() => unlock.mutate()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gold px-5 py-3 text-sm font-semibold text-background disabled:opacity-50"
      >
        {unlock.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {de ? "Early Mint freischalten" : "Unlock early mint"}
      </button>
      {!compact ? (
        <p className="text-[11px] text-muted-foreground">
          {de ? HOOD_EARLY_COPY.hintDe : HOOD_EARLY_COPY.hint}
        </p>
      ) : null}
    </div>
  );
}
