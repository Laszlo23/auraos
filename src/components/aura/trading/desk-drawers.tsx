import type { ReactNode } from "react";
import { FlaskConical, History, Sparkles, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type DeskDrawerId = "backtest" | "strategies" | "history" | null;

export function DeskDrawerShell({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto border-border/60 bg-background sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-left text-xl">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-left text-[13px]">{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="mt-2">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export function DeskFooterActions({
  onBacktest,
  onStrategies,
  onHistory,
}: {
  onBacktest: () => void;
  onStrategies: () => void;
  onHistory: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onBacktest}
        className="inline-flex items-center gap-2 rounded-2xl bg-foreground/8 px-4 py-2.5 text-xs font-semibold"
      >
        <FlaskConical className="h-3.5 w-3.5" />
        Backtest
      </button>
      <button
        type="button"
        onClick={onStrategies}
        className="inline-flex items-center gap-2 rounded-2xl bg-foreground/8 px-4 py-2.5 text-xs font-semibold"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Strategies
      </button>
      <button
        type="button"
        onClick={onHistory}
        className="inline-flex items-center gap-2 rounded-2xl bg-foreground/8 px-4 py-2.5 text-xs font-semibold"
      >
        <History className="h-3.5 w-3.5" />
        History
      </button>
    </div>
  );
}

export function ManagePositionHint({
  open,
  onOpenChange,
  onDisarm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDisarm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border/60 bg-background sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>Manage position</DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">
            Quant exits via stop and take-profit on Base. There is no one-tap market close yet —
            Disarm stops new entries while open risk runs to its exits.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              onDisarm();
              onOpenChange(false);
            }}
            className="rounded-2xl bg-destructive/18 px-4 py-2.5 text-xs font-semibold text-destructive"
          >
            Disarm Quant
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center gap-1 rounded-2xl bg-foreground/8 px-4 py-2.5 text-xs font-semibold"
          >
            <X className="h-3.5 w-3.5" />
            Keep watching
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
