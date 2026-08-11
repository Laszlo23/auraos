import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getDeskNetworks, setDeskNetwork } from "@/lib/desk-network.functions";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Extra query keys to invalidate after switching (e.g. treasury). */
  invalidateKeys?: string[][];
};

/**
 * Company desk chain switcher — Base / BSC / Robinhood.
 * Persists companies.desk_network; wallet + Quant use the selected chain.
 */
export function DeskChainSwitcher({ className, invalidateKeys = [] }: Props) {
  const qc = useQueryClient();
  const desks = useQuery({
    queryKey: ["desk-networks"],
    queryFn: () => getDeskNetworks(),
  });

  const setNet = useMutation({
    mutationFn: (network: string) => setDeskNetwork({ data: { network } }),
    onSuccess: async (res) => {
      toast.success(`Desk → ${res.label}`);
      await qc.invalidateQueries({ queryKey: ["desk-networks"] });
      await qc.invalidateQueries({ queryKey: ["treasury-balance"] });
      await qc.invalidateQueries({ queryKey: ["treasury"] });
      await qc.invalidateQueries({ queryKey: ["okx-status"] });
      for (const key of invalidateKeys) {
        await qc.invalidateQueries({ queryKey: key });
      }
    },
    onError: (e: Error) => toast.error(e.message || "Could not switch chain"),
  });

  const networks = desks.data?.networks ?? [];
  if (!networks.length) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Desk chain
      </span>
      <div className="flex flex-wrap gap-1.5">
        {networks.map((n) => (
          <button
            key={n.id}
            type="button"
            disabled={setNet.isPending || n.selected}
            onClick={() => setNet.mutate(n.id)}
            className={cn(
              "rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition-colors",
              n.selected
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border/50 bg-foreground/[0.03] text-muted-foreground hover:border-primary/30 hover:text-foreground",
            )}
            title={`${n.label} · chain ${n.chainId} · ${n.nativeSymbol}/${n.stableSymbol}`}
          >
            {n.label}
          </button>
        ))}
      </div>
    </div>
  );
}
