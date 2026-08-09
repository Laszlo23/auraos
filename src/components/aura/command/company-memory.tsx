import { Link } from "@tanstack/react-router";

import { Panel } from "@/components/aura/primitives";

export type MemoryItem = {
  id: string;
  title: string;
  summary: string | null;
};

type Props = {
  facts: number;
  decisions: number;
  channels: number;
  items: MemoryItem[];
};

export function CompanyMemoryStrip({ facts, decisions, channels, items }: Props) {
  const samples = items.slice(0, 3);

  return (
    <Panel
      label="Company memory"
      delay={0.1}
      action={
        <Link
          to="/knowledge"
          className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary"
        >
          View memory
        </Link>
      }
    >
      <div className="flex flex-wrap gap-4 text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
        <span>
          <span className="num text-lg font-semibold text-foreground">{facts}</span> memories
        </span>
        <span>
          <span className="num text-lg font-semibold text-foreground">{decisions}</span> decisions
        </span>
        <span>
          <span className="num text-lg font-semibold text-foreground">{channels}</span> channels
        </span>
      </div>
      <p className="mt-3 text-[13px] text-muted-foreground">
        The company remembers what you approve — not invents what you wish were true.
      </p>
      {samples.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {samples.map((m) => (
            <li
              key={m.id}
              className="rounded-2xl border border-border/40 bg-foreground/[0.03] px-3.5 py-2.5 text-[13px] leading-snug"
            >
              <span className="font-medium text-foreground/90">{m.title}</span>
              {m.summary ? (
                <span className="mt-0.5 block text-muted-foreground">{m.summary}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-[13px] text-muted-foreground">
          No memories filed yet. Approve a plan and Atlas will start writing them down.
        </p>
      )}
    </Panel>
  );
}
