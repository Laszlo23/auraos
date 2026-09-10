import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

import {
  COVENANT_OFFICIAL_DOMAINS,
  covenantVerifyItems,
} from "@/lib/community-covenant";
import { cn } from "@/lib/utils";

export function VerifyStrip({ compact = false, de = false }: { compact?: boolean; de?: boolean }) {
  const items = covenantVerifyItems();
  const [copied, setCopied] = useState<string | null>(null);

  const copyCa = async (id: string, ca: string) => {
    try {
      await navigator.clipboard.writeText(ca);
      setCopied(id);
      window.setTimeout(() => setCopied((cur) => (cur === id ? null : cur)), 1600);
    } catch {
      /* select the monospace CA manually */
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-primary/25 bg-primary/5",
        compact ? "px-4 py-3" : "px-5 py-5",
      )}
    >
      <p className="text-[15px] font-semibold">
        {de ? "Prüfen, nicht glauben" : "Verify, don’t believe"}
      </p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
        {de
          ? "Offizielle CAs nur auf diesen Domains. Wer per DM eine „neue CA“ schickt, ist nicht wir."
          : "Official CAs only on these domains. A “new CA” in a DM is not us."}{" "}
        <span className="font-mono text-[11px] text-foreground/80">{COVENANT_OFFICIAL_DOMAINS}</span>
      </p>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-border/40 bg-background/40 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-1 break-all font-mono text-[12px] text-foreground/90">{item.ca}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{item.note}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyCa(item.id, item.ca)}
                className="inline-flex items-center gap-1 rounded-full border border-border/50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] hover:border-primary/40 hover:text-primary"
              >
                {copied === item.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied === item.id
                  ? de
                    ? "Kopiert"
                    : "Copied"
                  : de
                    ? "CA kopieren"
                    : "Copy CA"}
              </button>
              <a
                href={item.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-border/50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] hover:border-primary/40 hover:text-primary"
              >
                Blockscout <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href={item.mintUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-border/50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] hover:border-primary/40 hover:text-primary"
              >
                {de ? "Mint" : "Mint"} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
