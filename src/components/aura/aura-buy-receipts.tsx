import { useQuery } from "@tanstack/react-query";

import { AURA_BUY_LP_COPY, type AuraBuyPublicReceipt } from "@/lib/aura-buy-lp";

async function fetchAuraBuyReceipts(): Promise<AuraBuyPublicReceipt[]> {
  const res = await fetch("/api/public/aura-buy-receipts");
  const payload = (await res.json().catch(() => ({}))) as { receipts?: AuraBuyPublicReceipt[] };
  if (!res.ok) return [];
  return payload.receipts ?? [];
}

function basescanTx(hash: string): string {
  return `https://basescan.org/tx/${hash}`;
}

export function AuraBuyReceipts({ de = false }: { de?: boolean }) {
  const receipts = useQuery({
    queryKey: ["aura-buy-receipts"],
    queryFn: fetchAuraBuyReceipts,
    staleTime: 30_000,
  });

  return (
    <section id="card-book" className="mt-8">
      <h2 className="text-[15px] font-semibold">
        {de ? "Karten-Packs → offizielles Buch" : "Card packs → official book"}
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
        {de ? AURA_BUY_LP_COPY.railDe : AURA_BUY_LP_COPY.rail}
      </p>
      <p className="mt-2 text-[13px] text-muted-foreground">
        {de ? AURA_BUY_LP_COPY.receiptsDe : AURA_BUY_LP_COPY.receipts}
      </p>
      {receipts.data?.length ? (
        <ul className="mt-4 space-y-2 text-[12px] text-muted-foreground">
          {receipts.data.map((row) => {
            const swap = row.swapTxHash || row.txHash;
            return (
              <li key={row.id} className="rounded-xl border border-border/40 px-3 py-2">
                <span className="font-semibold text-foreground">${row.netUsd}</span>
                {" · "}
                {row.wallet.slice(0, 6)}…{row.wallet.slice(-4)}
                {swap ? (
                  <>
                    {" · "}
                    <a
                      href={basescanTx(swap)}
                      className="font-mono text-primary hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {swap.slice(0, 10)}…
                    </a>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-[13px] text-muted-foreground">
          {de
            ? "Noch keine erfüllten Packs. Queue bleibt bis T-0 und der veröffentlichten Pool-ID dunkel."
            : "No fulfilled packs yet. The queue stays dark until T-0 and the published pool id."}
        </p>
      )}
    </section>
  );
}
