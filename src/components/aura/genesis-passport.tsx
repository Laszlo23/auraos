import { Chip, Panel } from "@/components/aura/primitives";

/** Honest stub — Genesis = Founding Company Passport when contracts exist. */
export function GenesisPassport({
  companyName,
  slug,
  seat,
}: {
  companyName?: string | undefined;
  slug?: string | null | undefined;
  seat?: number | null | undefined;
}) {
  return (
    <Panel label="Genesis · Founding Company Passport" delay={0.06}>
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Membership utility for founding companies — not an investment product and not a promise of
        returns. Mint opens when the passport contract ships.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="glass-soft rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Company</p>
          <p className="mt-1 font-semibold">{companyName ?? "Your company"}</p>
          {slug && <p className="mt-1 font-mono text-[11px] text-primary">/company/{slug}</p>}
        </div>
        <div className="glass-soft rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Status</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip tone="gold">Roadmap</Chip>
            {seat != null && <Chip tone="primary">Seat #{seat}</Chip>}
          </div>
          <p className="mt-2 text-[12px] text-muted-foreground">
            Visual passport NFT will match graphite / cyan brand when live.
          </p>
        </div>
      </div>
    </Panel>
  );
}
