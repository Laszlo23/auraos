import { useEffect, useState } from "react";
import { Check, Copy, Download, EyeOff, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/aura/primitives";
import { useExportSmartWalletOwnerKey } from "@/hooks/use-earn";
import { cn } from "@/lib/utils";

type Props = {
  handleId: string;
  smartWalletAddress?: string | null;
  ownerAddress?: string | null | undefined;
  className?: string | undefined;
};

/**
 * Advanced: reveal the Light Account owner EOA hex key so the founder can leave custody.
 * No mnemonic exists — only a random private key encrypted server-side.
 */
export function WalletExportPanel({
  handleId,
  smartWalletAddress,
  ownerAddress,
  className,
}: Props) {
  const exportKey = useExportSmartWalletOwnerKey();
  const [open, setOpen] = useState(false);
  const [ack, setAck] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [revealed, setRevealed] = useState<{
    privateKey: string;
    ownerAddress: string;
    smartWalletAddress: string;
    note: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#export") return;
    setOpen(true);
    window.requestAnimationFrame(() => {
      document.getElementById("export")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  useEffect(() => {
    if (!revealed) return;
    const t = window.setTimeout(() => {
      setRevealed(null);
      toast.message("Export cleared from this screen.");
    }, 90_000);
    return () => window.clearTimeout(t);
  }, [revealed]);

  const reset = () => {
    setOpen(false);
    setAck(false);
    setConfirmText("");
    setRevealed(null);
    setCopied(false);
  };

  const reveal = async () => {
    try {
      const res = await exportKey.mutateAsync({
        handleId,
        confirmation: confirmText,
      });
      setRevealed({
        privateKey: res.privateKey,
        ownerAddress: res.ownerAddress,
        smartWalletAddress: res.smartWalletAddress,
        note: res.note,
      });
      toast.success("Owner key revealed — copy it now and store offline.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not export wallet.");
    }
  };

  const copyKey = async () => {
    if (!revealed) return;
    await navigator.clipboard.writeText(revealed.privateKey);
    setCopied(true);
    toast.success("Private key copied. Clear your clipboard after saving.");
    window.setTimeout(() => setCopied(false), 2000);
  };

  const hide = () => {
    setRevealed(null);
    setConfirmText("");
    setAck(false);
    toast.message("Key hidden.");
  };

  return (
    <Panel
      label="Export wallet"
      id="export"
      className={className}
      delay={0.08}
      action={<Chip tone="gold">{open || revealed ? "Open" : "Advanced"}</Chip>}
    >
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Download the owner key that controls your Alchemy Light Account. There is no seed phrase —
        only a hex private key. Anyone with it can move your funds outside Aura.
      </p>

      {!open && !revealed ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-foreground/8 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-foreground/12 hover:text-foreground"
        >
          <Download className="h-3.5 w-3.5" />
          Start export
        </button>
      ) : null}

      {open && !revealed ? (
        <div className="mt-4 space-y-4 rounded-2xl border border-destructive/25 bg-destructive/[0.06] p-4">
          <div className="flex gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-destructive/15 text-destructive">
              <ShieldAlert className="h-4 w-4" />
            </span>
            <ul className="space-y-1.5 text-[12px] leading-relaxed text-muted-foreground">
              <li>Store the key offline. Never paste it into a website or chat.</li>
              <li>After export you still keep the same smart-wallet address on Aura.</li>
              <li>Import the owner EOA into a compatible wallet to control this Light Account.</li>
              {smartWalletAddress ? (
                <li className="font-mono text-[11px] text-foreground/80">
                  Smart wallet · {smartWalletAddress.slice(0, 8)}…{smartWalletAddress.slice(-6)}
                </li>
              ) : null}
              {ownerAddress ? (
                <li className="font-mono text-[11px] text-foreground/80">
                  Owner · {ownerAddress.slice(0, 8)}…{ownerAddress.slice(-6)}
                </li>
              ) : null}
            </ul>
          </div>

          <label className="flex cursor-pointer items-start gap-3 text-[13px] text-foreground">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              className="mt-1 accent-[hsl(var(--destructive))]"
            />
            <span>
              I understand this reveals full control of my treasury and Aura cannot reverse a leaked
              key.
            </span>
          </label>

          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Type EXPORT to continue
            </span>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="EXPORT"
              className="mt-2 w-full rounded-2xl border border-border/50 bg-background/70 px-4 py-3 font-mono text-sm uppercase outline-none focus:border-destructive/50"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                !ack || confirmText.trim().toUpperCase() !== "EXPORT" || exportKey.isPending
              }
              onClick={() => void reveal()}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] disabled:opacity-40",
                "bg-destructive/90 text-destructive-foreground",
              )}
            >
              {exportKey.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Reveal owner key
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={exportKey.isPending}
              className="rounded-2xl bg-foreground/8 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {revealed ? (
        <div className="mt-4 space-y-3 rounded-2xl border border-gold/30 bg-gold/[0.07] p-4">
          <p className="text-[12px] leading-relaxed text-muted-foreground">{revealed.note}</p>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Owner private key · clears in ~90s
            </p>
            <p className="mt-2 break-all rounded-2xl bg-background/70 px-3 py-3 font-mono text-[11px] leading-relaxed text-foreground">
              {revealed.privateKey}
            </p>
          </div>
          <div className="grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-2">
            <p>
              Owner <span className="font-mono text-foreground">{revealed.ownerAddress}</span>
            </p>
            <p>
              Smart wallet{" "}
              <span className="font-mono text-foreground">{revealed.smartWalletAddress}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyKey()}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary/14 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-primary"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy key"}
            </button>
            <button
              type="button"
              onClick={hide}
              className="inline-flex items-center gap-2 rounded-2xl bg-foreground/8 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
            >
              <EyeOff className="h-3.5 w-3.5" />
              Hide now
            </button>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
