import { Download, Share, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { trackTeaser } from "@/lib/teaser-track";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "auraos_pwa_install_dismissed";
export const SHOW_INSTALL_EVENT = "auraos:show-install";

export function requestInstallPrompt() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DISMISS_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(SHOW_INSTALL_EVENT));
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const ios = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone,
  );
  return mq || ios;
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const notOther = !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return iOS && webkit && notOther;
}

/**
 * Install / Add-to-Home-Screen prompt for Chromium (desktop + Android)
 * and Safari iOS instructions. Hidden when already installed.
 */
export function InstallApp({ className }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [manualHint, setManualHint] = useState(false);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const gotBip = useRef(false);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }

    if (isIosSafari()) {
      setIosHint(true);
      setVisible(true);
      return;
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      gotBip.current = true;
      setDeferred(e as BeforeInstallPromptEvent);
      try {
        if (localStorage.getItem(DISMISS_KEY) === "1") return;
      } catch {
        /* ignore */
      }
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    const onShow = () => {
      if (isStandalone()) return;
      if (isIosSafari()) setIosHint(true);
      else if (!gotBip.current) setManualHint(true);
      setVisible(true);
    };
    window.addEventListener(SHOW_INSTALL_EVENT, onShow);

    // Desktop Safari / Firefox: show manual tip after a short delay if no BIP.
    const t = window.setTimeout(() => {
      if (gotBip.current || isStandalone()) return;
      try {
        if (localStorage.getItem(DISMISS_KEY) === "1") return;
      } catch {
        /* ignore */
      }
      const ua = navigator.userAgent;
      if (/Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) {
        setManualHint(true);
        setVisible(true);
      }
    }, 4000);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener(SHOW_INSTALL_EVENT, onShow);
      window.clearTimeout(t);
    };
  }, []);

  if (!visible || isStandalone()) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    trackTeaser("cta_click", { placement: "pwa_dismiss" });
  };

  const install = async () => {
    if (!deferred) return;
    setBusy(true);
    trackTeaser("cta_click", { placement: "pwa_install" });
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setVisible(false);
      setDeferred(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Install Aura OS"
      className={cn(
        "fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[60] mx-auto max-w-md",
        "rounded-2xl border border-border/60 bg-background/95 p-4 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.75)] backdrop-blur-xl",
        className,
      )}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 rounded-lg p-1.5 text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="pr-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          Install app
        </p>
        <p className="mt-1 font-display text-[15px] font-semibold tracking-tight">
          Put Aura OS on your home screen
        </p>
        {deferred ? (
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            One tap installs Aura OS like a native app on this phone or desktop — works offline for
            the shell, opens full-screen.
          </p>
        ) : iosHint ? (
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            On iPhone: tap{" "}
            <Share className="mx-0.5 inline h-3.5 w-3.5 text-primary" aria-hidden /> Share, then{" "}
            <strong className="font-semibold text-foreground">Add to Home Screen</strong>.
          </p>
        ) : manualHint ? (
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Use your browser menu →{" "}
            <strong className="font-semibold text-foreground">Install</strong> or{" "}
            <strong className="font-semibold text-foreground">Add to Dock / Home Screen</strong>.
          </p>
        ) : null}
      </div>

      {deferred ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void install()}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <Download className="h-3.5 w-3.5" />
          {busy ? "Opening…" : "Install Aura OS"}
        </button>
      ) : null}
    </div>
  );
}
