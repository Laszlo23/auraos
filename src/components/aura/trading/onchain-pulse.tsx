export type OnchainEventLite = {
  direction: string;
  amount: number;
  asset: string;
  summary: string | null;
  created_at: string;
};

/** Honest on-chain pulse from stored whale events — never fabricates activity. */
export function OnchainPulse({ events }: { events: OnchainEventLite[] }) {
  const recent = events.slice(0, 8);
  if (recent.length === 0) {
    return (
      <div className="rounded-3xl border border-border/50 bg-foreground/[0.03] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          On-chain pulse
        </p>
        <p className="mt-3 text-sm font-semibold">On-chain data</p>
        <p className="mt-1 text-[13px] text-muted-foreground">N/A</p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          No verified whale events yet — we never invent flow.
        </p>
      </div>
    );
  }

  const buys = recent.filter((e) => /buy|inflow|long/i.test(`${e.direction} ${e.summary ?? ""}`));
  const sells = recent.filter((e) => /sell|outflow|short/i.test(`${e.direction} ${e.summary ?? ""}`));
  const line =
    sells.length > buys.length + 1
      ? "Large selling detected"
      : buys.length > sells.length + 1
        ? "Large wallet activity increasing"
        : "Whale flow neutral";

  return (
    <div className="rounded-3xl border border-border/50 bg-foreground/[0.03] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        On-chain pulse
      </p>
      <p className="mt-3 text-[15px] font-semibold leading-snug">🐋 {line}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Based on {recent.length} recent watched-wallet events in your desk.
      </p>
    </div>
  );
}
