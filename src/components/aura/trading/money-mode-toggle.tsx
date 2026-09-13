import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

export function MoneyModeToggle({
  practice,
  busy,
  onPractice,
  onReal,
}: {
  practice: boolean;
  busy?: boolean;
  onPractice: () => void;
  onReal: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="inline-flex rounded-2xl bg-foreground/6 p-1">
      <button
        type="button"
        disabled={busy || practice}
        onClick={onPractice}
        className={cn(
          "rounded-2xl px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50",
          practice ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
        )}
      >
        {t("moneyHub.practice")}
      </button>
      <button
        type="button"
        disabled={busy || !practice}
        onClick={onReal}
        className={cn(
          "rounded-2xl px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50",
          !practice ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
        )}
      >
        {t("moneyHub.realMoney")}
      </button>
    </div>
  );
}
