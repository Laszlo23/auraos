import { useState, type ReactNode } from "react";

import { ShareMoment } from "@/components/aura/share";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trackTeaser } from "@/lib/teaser-track";

/**
 * Post-win share sheet — prefilled caption + network intents.
 * Call onShared after the user opens a network or copies (honor-light).
 */
export function PostWinShareSheet({
  open,
  onOpenChange,
  title,
  description,
  url,
  text,
  placement,
  onShared,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  url: string;
  text: string;
  placement: string;
  onShared?: () => void;
  children?: ReactNode;
}) {
  const [sharedOnce, setSharedOnce] = useState(false);

  const markShared = () => {
    if (sharedOnce) return;
    setSharedOnce(true);
    trackTeaser("share", { placement: placement.slice(0, 40) });
    onShared?.();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSharedOnce(false);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md gap-0 border-border/60 bg-background p-0 sm:rounded-3xl">
        <DialogHeader className="space-y-2 border-b border-border/40 px-5 py-4 text-left">
          <DialogTitle className="font-display text-xl font-semibold tracking-tight">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div
          className="px-5 py-4"
          onClickCapture={(e) => {
            const t = e.target as HTMLElement | null;
            if (t?.closest("button")) markShared();
          }}
        >
          <ShareMoment
            url={url}
            text={text}
            title={title}
            placement={placement}
            showKit
            label="Share win"
          />
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
