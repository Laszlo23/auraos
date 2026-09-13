import { NAV_BUTTON_VIEWS, type NavButtonView } from "@/hooks/use-nav-button-view";
import { useLocale } from "@/hooks/use-locale";
import { localizedNavHint, localizedNavLabel, type NavItem } from "@/lib/nav";
import { isPinnedNavPath } from "@/lib/os-presets";
import { cn } from "@/lib/utils";

function viewLabelKey(view: NavButtonView): string {
  switch (view) {
    case "comfortable":
      return "profile.viewComfortable";
    case "compact":
      return "profile.viewCompact";
    case "icons":
      return "profile.viewIcons";
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}

export function buttonViewLabelKey(view: NavButtonView): string {
  return viewLabelKey(view);
}

function viewHintKey(view: NavButtonView): string {
  switch (view) {
    case "comfortable":
      return "profile.viewComfortableHint";
    case "compact":
      return "profile.viewCompactHint";
    case "icons":
      return "profile.viewIconsHint";
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}

export function ButtonViewPicker({
  view,
  onChange,
}: {
  view: NavButtonView;
  onChange: (next: NavButtonView) => void;
}) {
  const { t } = useLocale();
  return (
    <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label={t("profile.buttonView")}>
      {NAV_BUTTON_VIEWS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={view === option}
          onClick={() => onChange(option)}
          className={cn(
            "rounded-2xl px-4 py-3 text-left transition-colors",
            view === option ? "bg-primary/15 text-primary" : "bg-foreground/6 text-muted-foreground",
          )}
        >
          <p className="text-[13px] font-semibold">{t(viewLabelKey(option))}</p>
          <p className="mt-1 text-[11px] opacity-80">{t(viewHintKey(option))}</p>
        </button>
      ))}
    </div>
  );
}

export function DensityPicker({
  simple,
  onChange,
}: {
  simple: boolean;
  onChange: (next: boolean) => void;
}) {
  const { t } = useLocale();
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label={t("profile.density")}>
      <button
        type="button"
        aria-pressed={simple}
        onClick={() => onChange(true)}
        className={cn(
          "rounded-2xl px-4 py-3 text-left transition-colors",
          simple ? "bg-primary/15 text-primary" : "bg-foreground/6 text-muted-foreground",
        )}
      >
        <p className="text-[13px] font-semibold">{t("profile.densitySimple")}</p>
        <p className="mt-1 text-[11px] opacity-80">{t("profile.densitySimpleHint")}</p>
      </button>
      <button
        type="button"
        aria-pressed={!simple}
        onClick={() => onChange(false)}
        className={cn(
          "rounded-2xl px-4 py-3 text-left transition-colors",
          !simple ? "bg-primary/15 text-primary" : "bg-foreground/6 text-muted-foreground",
        )}
      >
        <p className="text-[13px] font-semibold">{t("profile.densityFull")}</p>
        <p className="mt-1 text-[11px] opacity-80">{t("profile.densityFullHint")}</p>
      </button>
    </div>
  );
}

export function MenuButtonToggles({
  items,
  enabled,
  onToggle,
  disabled,
}: {
  items: NavItem[];
  enabled: Set<string>;
  onToggle: (to: string) => void;
  disabled?: boolean;
}) {
  const { locale, t } = useLocale();
  return (
    <div
      className="grid max-h-[22rem] gap-1.5 overflow-y-auto rounded-2xl border border-border/60 p-3 sm:grid-cols-2"
      role="group"
      aria-label={t("profile.buttons")}
    >
      {items.map((item) => {
        const on = enabled.has(item.to);
        const pinned = isPinnedNavPath(item.to);
        return (
          <label
            key={item.to}
            className={cn(
              "flex cursor-pointer items-start gap-2 rounded-xl px-3 py-2 text-left transition-colors",
              on ? "bg-primary/10" : "hover:bg-foreground/5",
              pinned && "cursor-default opacity-80",
            )}
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={on}
              disabled={pinned || disabled}
              onChange={() => onToggle(item.to)}
            />
            <span className="min-w-0">
              <span className="block text-[13px] font-medium">
                {localizedNavLabel(item, false, locale)}
                {pinned ? (
                  <span className="ml-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {t("profile.alwaysOn")}
                  </span>
                ) : null}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {localizedNavHint(item, locale)}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function MenuButtonPreview({
  items,
  view,
  simple,
}: {
  items: NavItem[];
  view: NavButtonView;
  simple: boolean;
}) {
  const { locale, t } = useLocale();
  return (
    <div className="rounded-2xl border border-border/60 p-3" aria-label={t("profile.preview")}>
      <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {t("profile.preview")}
      </p>
      <div
        className={cn(
          "flex flex-wrap",
          view === "comfortable" && "gap-2",
          view === "compact" && "gap-1.5",
          view === "icons" && "gap-1.5",
        )}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const label = localizedNavLabel(item, simple, locale);
          switch (view) {
            case "comfortable":
              return (
                <span
                  key={item.to}
                  className="inline-flex items-center gap-2 rounded-2xl bg-foreground/8 px-3 py-2 text-sm"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  {label}
                </span>
              );
            case "compact":
              return (
                <span
                  key={item.to}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-foreground/8 px-2 py-1 text-[12px]"
                >
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {label}
                </span>
              );
            case "icons":
              return (
                <span
                  key={item.to}
                  title={label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-foreground/8"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="sr-only">{label}</span>
                </span>
              );
            default: {
              const _exhaustive: never = view;
              return _exhaustive;
            }
          }
        })}
      </div>
    </div>
  );
}
