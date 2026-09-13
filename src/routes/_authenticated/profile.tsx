import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import {
  ButtonViewPicker,
  buttonViewLabelKey,
  DensityPicker,
  MenuButtonPreview,
  MenuButtonToggles,
} from "@/components/aura/menu-button-studio";
import {
  ClaimOfficialHandle,
  OfficialProfileCard,
  OfficialProfileForm,
} from "@/components/aura/official-profile";
import { Chip, PageHeader, Panel, SectionTitle } from "@/components/aura/primitives";
import { useNavButtonView } from "@/hooks/use-nav-button-view";
import { useNavPrefsEditor } from "@/hooks/use-nav-prefs";
import { useMyHandle } from "@/hooks/use-identity";
import { useLocale } from "@/hooks/use-locale";
import { useSimpleMode } from "@/hooks/use-simple-mode";
import { NAV } from "@/lib/nav";

export const Route = createFileRoute("/_authenticated/profile")({
  validateSearch: (search: Record<string, unknown>): { edit?: boolean } => {
    const edit = search.edit === true || search.edit === "1" || search.edit === "true";
    return edit ? { edit: true } : {};
  },
  head: () => ({
    meta: [
      { title: "Profile — Aura OS" },
      {
        name: "description",
        content: "Edit your official founder profile and choose which menu buttons you see.",
      },
      { property: "og:title", content: "Profile — Aura OS" },
      { property: "og:description", content: "Official card, menu buttons, and button view." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MyProfilePage,
});

function MyProfilePage() {
  const { edit: startInEdit } = Route.useSearch();
  const { data: handle, isLoading } = useMyHandle();
  const { t } = useLocale();
  const { simple, setSimple } = useSimpleMode();
  const { view, setView } = useNavButtonView();
  const { enabled, toggle, saving } = useNavPrefsEditor();
  const [editing, setEditing] = useState(Boolean(startInEdit));

  const previewItems = useMemo(() => NAV.filter((item) => enabled.has(item.to)), [enabled]);

  if (isLoading) {
    return (
      <div className="max-w-3xl">
        <PageHeader eyebrow={t("profile.eyebrow")} title={t("profile.title")} />
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!handle) {
    return (
      <div className="max-w-3xl space-y-8">
        <PageHeader
          eyebrow={t("profile.eyebrow")}
          title={t("profile.title")}
          description={t("profile.description")}
        />
        <ClaimOfficialHandle onDone={() => setEditing(true)} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        eyebrow={t("profile.eyebrow")}
        title={editing ? t("profile.editTitle") : t("profile.title")}
        description={editing ? t("profile.editDescription") : t("profile.description")}
        actions={
          editing ? (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-2xl bg-foreground/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("profile.done")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-2xl bg-primary px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground"
            >
              {t("profile.edit")}
            </button>
          )
        }
      />

      <Panel label={t("profile.official")} glow>
        {editing ? (
          <OfficialProfileForm
            handle={handle}
            onSaved={() => undefined}
            onCancel={() => undefined}
          />
        ) : (
          <OfficialProfileCard
            handle={handle}
            action={
              <a
                href={`/u/${handle.handle}`}
                className="rounded-2xl bg-foreground/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("profile.viewPublic")}
              </a>
            }
          />
        )}
      </Panel>

      {editing ? (
        <>
          <Panel label={t("profile.buttonView")}>
            <SectionTitle title={t("profile.density")} hint={t("profile.densityHint")} />
            <DensityPicker simple={simple} onChange={setSimple} />
            <div className="mt-6">
              <SectionTitle title={t("profile.look")} hint={t("profile.lookHint")} />
              <ButtonViewPicker view={view} onChange={setView} />
            </div>
          </Panel>

          <Panel label={t("profile.buttons")}>
            <p className="mb-3 text-[13px] text-muted-foreground">{t("profile.buttonsHint")}</p>
            <MenuButtonToggles
              items={NAV}
              enabled={enabled}
              onToggle={(to) => void toggle(to)}
              disabled={saving}
            />
            <div className="mt-4">
              <MenuButtonPreview items={previewItems} view={view} simple={simple} />
            </div>
          </Panel>
        </>
      ) : (
        <Panel label={t("profile.buttons")}>
          <p className="mb-3 text-[13px] text-muted-foreground">{t("profile.buttonsViewHint")}</p>
          <MenuButtonPreview items={previewItems} view={view} simple={simple} />
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip tone="primary">
              {simple ? t("profile.densitySimple") : t("profile.densityFull")}
            </Chip>
            <Chip>{t(buttonViewLabelKey(view))}</Chip>
          </div>
        </Panel>
      )}

      <p className="text-[12.5px] text-muted-foreground">
        {t("profile.identityHint")}{" "}
        <Link to="/identity" className="text-foreground underline-offset-2 hover:underline">
          {t("profile.openIdentity")}
        </Link>
        .
      </p>
    </div>
  );
}
