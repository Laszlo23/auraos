import type { ReactNode } from "react";
import { X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type ReadSurfaceProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  description?: string;
};

/**
 * Full-screen reading mode — distractions off; scroll only inside the reader.
 */
export function ReadSurface({
  open,
  onOpenChange,
  title,
  children,
  description,
}: ReadSurfaceProps) {
  const reduced = usePrefersReducedMotion();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={description ? undefined : undefined}
        className={cn(
          "fixed inset-0 left-0 top-0 z-[80] flex h-[100svh] max-h-[100svh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-background p-0 shadow-none [&>button]:hidden",
          reduced
            ? ""
            : "data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border/50 px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="min-w-0 pr-8">
            <DialogTitle className="text-left text-xl font-semibold leading-tight">
              {title}
            </DialogTitle>
            {description ? (
              <DialogDescription className="mt-1.5 text-left text-[13px] text-muted-foreground">
                {description}
              </DialogDescription>
            ) : (
              <DialogDescription className="sr-only">Full-screen reading</DialogDescription>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close reader"
            className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] grid h-10 w-10 place-items-center rounded-2xl bg-foreground/6 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div
          data-no-swipe
          className="min-h-0 flex-1 overflow-y-auto px-5 py-6 pb-[max(2rem,env(safe-area-inset-bottom))]"
        >
          <div className="mx-auto max-w-prose text-[15px] leading-relaxed text-foreground/90">
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
