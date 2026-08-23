import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import {
  nicheLabel,
  TischProofMasonry,
  TischShell,
  TischStartSteps,
  TischStickyCta,
} from "@/components/aura/tisch-proof";
import { useLocale } from "@/hooks/use-locale";
import { rememberFunnel, rememberLocale } from "@/lib/attribution";
import { getPublicTischNetwork, type PublicTischProof } from "@/lib/reviews.public.functions";
import { url } from "@/lib/site";

const TITLE = "Am Tisch — Aura Local";
const DESCRIPTION =
  "Echte Bewertungen unserer Community. Zum Zeigen im Friseur, Beisl, Barbershop.";

export const Route = createFileRoute("/tisch")({
  loader: async () => {
    const { withTimeout } = await import("@/lib/timeout-helper");
    return withTimeout(getPublicTischNetwork({ data: { limit: 36 } }), 5000, []);
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: url("/tisch") },
      { property: "og:locale", content: "de_AT" },
    ],
  }),
  component: TischProspectPage,
});

function TischProspectPage() {
  const { setLocale } = useLocale();
  const proofs = Route.useLoaderData() as PublicTischProof[];
  const [niche, setNiche] = useState<string | null>(null);

  useEffect(() => {
    rememberFunnel("local");
    rememberLocale("de");
    setLocale("de");
  }, [setLocale]);

  const niches = useMemo(() => {
    const set = new Set<string>();
    for (const proof of proofs) {
      if (proof.niche) set.add(proof.niche);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "de"));
  }, [proofs]);

  const visible = niche
    ? proofs.filter((p) => (p.niche || "").toLowerCase() === niche.toLowerCase())
    : proofs;

  return (
    <TischShell kicker="Am Tisch · Wien">
      <div className="mx-auto w-full max-w-lg space-y-8 px-5 py-8">
        <header>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
            Aura Local
          </p>
          <h1 className="mt-3 font-display text-[clamp(2rem,8vw,3.2rem)] font-semibold leading-[0.98] tracking-tight">
            So sieht&apos;s bei Betrieben in Wien aus
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            Screenshots echter Gäste — von unserer Community, nicht gekauft. Zum Zeigen an der
            Theke.
          </p>
        </header>

        {niches.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setNiche(null)}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                niche === null
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/50 text-muted-foreground"
              }`}
            >
              Alle
            </button>
            {niches.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setNiche(item)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                  niche === item
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/50 text-muted-foreground"
                }`}
              >
                {nicheLabel(item)}
              </button>
            ))}
          </div>
        ) : null}

        <TischProofMasonry proofs={visible} linked />

        <TischStartSteps />
      </div>
      <TischStickyCta />
    </TischShell>
  );
}
