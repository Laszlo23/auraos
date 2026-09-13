import { useEffect, useState, type ReactNode } from "react";
import { AtSign, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/aura/primitives";
import { useClaimHandle, useUpdateHandle, type Handle } from "@/hooks/use-identity";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

export function ClaimOfficialHandle({ onDone }: { onDone: () => void }) {
  const { t } = useLocale();
  const claim = useClaimHandle();
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  const valid = /^[a-z0-9_]{3,20}$/.test(handle) && name.trim().length > 1;

  return (
    <Panel label={t("profile.claimTitle")} glow>
      <p className="text-[13px] leading-relaxed text-muted-foreground">{t("profile.claimBody")}</p>
      <div className="mt-5 space-y-3">
        <label className="glass-soft flex items-center gap-2 rounded-2xl px-4 py-3">
          <AtSign className="h-4 w-4 shrink-0 text-primary" />
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            placeholder={t("profile.handlePlaceholder")}
            maxLength={20}
            aria-label={t("profile.handle")}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
          <span className="shrink-0 text-[11px] text-muted-foreground">{handle.length}/20</span>
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("profile.namePlaceholder")}
          aria-label={t("profile.displayName")}
          className="glass-soft w-full rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/40"
        />
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={240}
          placeholder={t("profile.bioPlaceholder")}
          aria-label={t("profile.bio")}
          className="glass-soft w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/40"
        />
        <button
          type="button"
          disabled={!valid || claim.isPending}
          onClick={async () => {
            try {
              await claim.mutateAsync({ handle, display_name: name, bio });
              onDone();
            } catch (error) {
              toast.error(
                error instanceof Error && error.message.includes("duplicate")
                  ? t("profile.handleTaken")
                  : t("profile.claimFailed"),
              );
            }
          }}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {claim.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {t("profile.claimCta")} @{handle || t("profile.handle")}
        </button>
      </div>
    </Panel>
  );
}

export function OfficialProfileCard({
  handle,
  action,
}: {
  handle: Handle;
  action?: ReactNode;
}) {
  const { t } = useLocale();
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-primary/12 text-3xl">
        {handle.avatar || "◎"}
      </span>
      <div className="min-w-[220px] flex-1">
        <p className="text-lg font-semibold tracking-tight">{handle.display_name}</p>
        <p className="text-[13px] text-muted-foreground">@{handle.handle}</p>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          {handle.bio || t("profile.bioEmpty")}
        </p>
      </div>
      <Chip tone={handle.is_public ? "primary" : "neutral"}>
        {handle.is_public ? t("profile.public") : t("profile.private")}
      </Chip>
      {action}
    </div>
  );
}

export function OfficialProfileForm({
  handle,
  onSaved,
  onCancel,
}: {
  handle: Handle;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { t } = useLocale();
  const updateHandle = useUpdateHandle();
  const [name, setName] = useState(handle.display_name);
  const [bio, setBio] = useState(handle.bio ?? "");
  const [avatar, setAvatar] = useState(handle.avatar || "◎");
  const [isPublic, setIsPublic] = useState(handle.is_public);

  useEffect(() => {
    setName(handle.display_name);
    setBio(handle.bio ?? "");
    setAvatar(handle.avatar || "◎");
    setIsPublic(handle.is_public);
  }, [handle.display_name, handle.bio, handle.avatar, handle.is_public]);

  const valid = name.trim().length > 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="glass-soft flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl">
          <input
            value={avatar}
            onChange={(e) => setAvatar(e.target.value.slice(0, 4))}
            aria-label={t("profile.avatar")}
            className="w-10 bg-transparent text-center text-2xl outline-none"
          />
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("profile.namePlaceholder")}
          aria-label={t("profile.displayName")}
          className="glass-soft min-w-[200px] flex-1 rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      </div>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        rows={3}
        maxLength={240}
        placeholder={t("profile.bioPlaceholder")}
        aria-label={t("profile.bio")}
        className="glass-soft w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/40"
      />
      <button
        type="button"
        onClick={() => setIsPublic((v) => !v)}
        aria-pressed={isPublic}
        className={cn(
          "rounded-2xl px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-opacity hover:opacity-85",
          isPublic ? "bg-primary/14 text-primary" : "bg-foreground/8 text-muted-foreground",
        )}
      >
        {isPublic ? t("profile.public") : t("profile.private")}
      </button>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!valid || updateHandle.isPending}
          onClick={async () => {
            try {
              await updateHandle.mutateAsync({
                id: handle.id,
                display_name: name.trim(),
                bio: bio.trim() || null,
                avatar: avatar.trim() || "◎",
                is_public: isPublic,
              });
              onSaved();
              toast.success(t("profile.saved"));
            } catch {
              toast.error(t("profile.saveFailed"));
            }
          }}
          className="rounded-2xl bg-primary px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground disabled:opacity-40"
        >
          {updateHandle.isPending ? t("profile.saving") : t("profile.save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl bg-foreground/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
        >
          {t("profile.cancel")}
        </button>
      </div>
    </div>
  );
}
