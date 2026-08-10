import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

/** Compact EN/DE toggle for headers and settings. */
export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border/50 p-0.5 text-[10px] font-semibold uppercase tracking-wider",
        className,
      )}
      role="group"
      aria-label={t("common.language")}
    >
      {(["en", "de"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={cn(
            "rounded-full px-2 py-1 transition-colors",
            locale === code
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
